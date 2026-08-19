-- 1. Guest event creation
ALTER TABLE public.events ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS guest_name text;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS guest_email text;

GRANT INSERT ON public.events TO anon;
GRANT SELECT ON public.events TO anon;

DROP POLICY IF EXISTS "Artists, organizers, and admins can create events" ON public.events;
CREATE POLICY "Members with roles can create events"
ON public.events FOR INSERT TO authenticated
WITH CHECK (
  (auth.uid() = user_id AND (
    private.has_role(auth.uid(), 'artist'::app_role)
    OR private.has_role(auth.uid(), 'organizer'::app_role)
    OR private.is_admin(auth.uid())
  ))
  OR (user_id IS NULL AND guest_email IS NOT NULL AND guest_name IS NOT NULL)
);

CREATE POLICY "Guests can create unowned events"
ON public.events FOR INSERT TO anon
WITH CHECK (user_id IS NULL AND guest_email IS NOT NULL AND guest_name IS NOT NULL);

CREATE POLICY "Users can claim guest events with their email"
ON public.events FOR UPDATE TO authenticated
USING (user_id IS NULL AND lower(guest_email) = lower(COALESCE((auth.jwt() ->> 'email'), '')))
WITH CHECK (user_id = auth.uid());

-- 2. Volunteer roles (jobs / items needed)
CREATE TABLE public.event_volunteer_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'job',
  title text NOT NULL,
  description text,
  slots_needed integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.event_volunteer_roles TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_volunteer_roles TO authenticated;
GRANT ALL ON public.event_volunteer_roles TO service_role;
ALTER TABLE public.event_volunteer_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view volunteer roles"
ON public.event_volunteer_roles FOR SELECT USING (true);

CREATE POLICY "Event owners manage volunteer roles"
ON public.event_volunteer_roles FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND (e.user_id = auth.uid() OR private.is_admin(auth.uid()))))
WITH CHECK (EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND (e.user_id = auth.uid() OR private.is_admin(auth.uid()))));

CREATE TRIGGER set_updated_at_event_volunteer_roles
BEFORE UPDATE ON public.event_volunteer_roles
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 3. Volunteer signups
CREATE TABLE public.event_volunteer_signups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id uuid NOT NULL REFERENCES public.event_volunteer_roles(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  volunteer_name text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.event_volunteer_signups TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_volunteer_signups TO authenticated;
GRANT ALL ON public.event_volunteer_signups TO service_role;
ALTER TABLE public.event_volunteer_signups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view volunteer signups"
ON public.event_volunteer_signups FOR SELECT USING (true);

CREATE POLICY "Guests can sign up to volunteer"
ON public.event_volunteer_signups FOR INSERT TO anon
WITH CHECK (user_id IS NULL AND length(volunteer_name) > 0);

CREATE POLICY "Users can sign up to volunteer"
ON public.event_volunteer_signups FOR INSERT TO authenticated
WITH CHECK ((user_id IS NULL OR user_id = auth.uid()) AND length(volunteer_name) > 0);

CREATE POLICY "Users can remove their own signup"
ON public.event_volunteer_signups FOR DELETE TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Event owners manage signups"
ON public.event_volunteer_signups FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND (e.user_id = auth.uid() OR private.is_admin(auth.uid()))));

CREATE TRIGGER set_updated_at_event_volunteer_signups
BEFORE UPDATE ON public.event_volunteer_signups
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();