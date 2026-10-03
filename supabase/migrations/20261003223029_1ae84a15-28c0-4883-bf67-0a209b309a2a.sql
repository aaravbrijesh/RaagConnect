-- Platform settings: only hosts and admins need to see the fee
DROP POLICY IF EXISTS "Platform settings are viewable by everyone" ON public.platform_settings;
CREATE POLICY "Hosts and admins can view platform settings" ON public.platform_settings
  FOR SELECT TO authenticated
  USING (
    private.is_admin(auth.uid())
    OR private.has_role(auth.uid(), 'organizer')
    OR private.has_role(auth.uid(), 'teacher')
    OR private.has_role(auth.uid(), 'artist')
  );

-- Volunteer signups: keep a public filled count on the role, restrict signup rows
ALTER TABLE public.event_volunteer_roles ADD COLUMN IF NOT EXISTS slots_filled integer NOT NULL DEFAULT 0;
UPDATE public.event_volunteer_roles r SET slots_filled = COALESCE((
  SELECT sum(quantity) FROM public.event_volunteer_signups s WHERE s.role_id = r.id), 0);

CREATE OR REPLACE FUNCTION public.sync_volunteer_slots_filled()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE rid uuid;
BEGIN
  rid := COALESCE(NEW.role_id, OLD.role_id);
  UPDATE public.event_volunteer_roles
     SET slots_filled = COALESCE((SELECT sum(quantity) FROM public.event_volunteer_signups WHERE role_id = rid), 0)
   WHERE id = rid;
  RETURN COALESCE(NEW, OLD);
END; $$;
REVOKE EXECUTE ON FUNCTION public.sync_volunteer_slots_filled() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER sync_volunteer_slots_filled
AFTER INSERT OR DELETE ON public.event_volunteer_signups
FOR EACH ROW EXECUTE FUNCTION public.sync_volunteer_slots_filled();

DROP POLICY IF EXISTS "Anyone can view volunteer signups" ON public.event_volunteer_signups;
CREATE POLICY "Volunteers, event owners and admins can view signups" ON public.event_volunteer_signups
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR private.is_admin(auth.uid())
    OR EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_volunteer_signups.event_id AND e.user_id = auth.uid())
  );