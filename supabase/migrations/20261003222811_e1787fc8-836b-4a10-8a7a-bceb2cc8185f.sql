DROP FUNCTION IF EXISTS public.claim_guest_events();

CREATE OR REPLACE FUNCTION private.is_guest_event_of_current_user(_event_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.event_guest_contacts c
    JOIN auth.users u ON u.id = auth.uid()
    WHERE c.event_id = _event_id
      AND u.email_confirmed_at IS NOT NULL
      AND c.guest_email = lower(u.email)
  )
$$;
REVOKE EXECUTE ON FUNCTION private.is_guest_event_of_current_user(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.is_guest_event_of_current_user(uuid) TO authenticated;

DROP POLICY IF EXISTS "Users can claim guest events with their email" ON public.events;
CREATE POLICY "Users can claim guest events with their email" ON public.events
  FOR UPDATE TO authenticated
  USING (user_id IS NULL AND private.is_guest_event_of_current_user(id))
  WITH CHECK (user_id = auth.uid());