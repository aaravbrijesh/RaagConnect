-- Class bookings: users can't self-confirm paid classes
DROP POLICY IF EXISTS "Authenticated users can create bookings" ON public.class_bookings;
ALTER TABLE public.class_bookings ALTER COLUMN status SET DEFAULT 'pending';
CREATE POLICY "Authenticated users can create bookings" ON public.class_bookings
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id AND (
    status = 'pending'
    OR (status = 'confirmed' AND EXISTS (
      SELECT 1 FROM public.classes c WHERE c.id = class_id
        AND COALESCE(c.price_cents, 0) = 0 AND COALESCE(c.price, 0) = 0))
  )
);

-- Events: remove guest contact columns entirely; guest contacts live in event_guest_contacts
DROP TRIGGER IF EXISTS stash_event_guest_contact ON public.events;
DROP FUNCTION IF EXISTS public.stash_event_guest_contact();
DROP POLICY IF EXISTS "Guests can create unowned events" ON public.events;
DROP POLICY IF EXISTS "Members with roles can create events" ON public.events;
CREATE POLICY "Guests can create unowned events" ON public.events
FOR INSERT TO anon WITH CHECK (user_id IS NULL);
CREATE POLICY "Members with roles can create events" ON public.events
FOR INSERT TO authenticated WITH CHECK (
  ((auth.uid() = user_id) AND (private.has_role(auth.uid(), 'artist'::app_role) OR private.has_role(auth.uid(), 'organizer'::app_role) OR private.is_admin(auth.uid())))
  OR (user_id IS NULL)
);
ALTER TABLE public.events DROP COLUMN IF EXISTS guest_name;
ALTER TABLE public.events DROP COLUMN IF EXISTS guest_email;

GRANT INSERT ON public.event_guest_contacts TO anon, authenticated;
CREATE POLICY "Guests can attach contact to their unowned event" ON public.event_guest_contacts
FOR INSERT TO anon, authenticated
WITH CHECK (
  length(guest_email) BETWEEN 3 AND 320
  AND (guest_name IS NULL OR length(guest_name) <= 200)
  AND EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND e.user_id IS NULL
              AND e.created_at > now() - interval '10 minutes')
);