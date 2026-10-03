-- 1. Private store for guest organizer contact details
CREATE TABLE public.event_guest_contacts (
  event_id uuid PRIMARY KEY REFERENCES public.events(id) ON DELETE CASCADE,
  guest_name text,
  guest_email text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.event_guest_contacts TO service_role;
ALTER TABLE public.event_guest_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view guest contacts" ON public.event_guest_contacts
  FOR SELECT TO authenticated USING (private.is_admin(auth.uid()));
GRANT SELECT ON public.event_guest_contacts TO authenticated;

INSERT INTO public.event_guest_contacts (event_id, guest_name, guest_email)
SELECT id, guest_name, guest_email FROM public.events WHERE guest_email IS NOT NULL
ON CONFLICT DO NOTHING;
UPDATE public.events SET guest_email = NULL, guest_name = NULL WHERE guest_email IS NOT NULL OR guest_name IS NOT NULL;

-- 2. Move guest details off the public events row on insert/update
CREATE OR REPLACE FUNCTION public.stash_event_guest_contact()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.guest_email IS NOT NULL AND NEW.user_id IS NULL THEN
    INSERT INTO public.event_guest_contacts (event_id, guest_name, guest_email)
    VALUES (NEW.id, left(NEW.guest_name, 200), lower(left(NEW.guest_email, 320)))
    ON CONFLICT (event_id) DO UPDATE SET guest_name = EXCLUDED.guest_name, guest_email = EXCLUDED.guest_email;
  END IF;
  NEW.guest_email := NULL;
  NEW.guest_name := NULL;
  RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.stash_event_guest_contact() FROM PUBLIC, anon, authenticated;

-- BEFORE trigger needs NEW.id; events.id has a default so it is set before BEFORE triggers run
CREATE TRIGGER stash_event_guest_contact
BEFORE INSERT OR UPDATE OF guest_email, guest_name ON public.events
FOR EACH ROW EXECUTE FUNCTION public.stash_event_guest_contact();

-- The contact row references events(id) which doesn't exist yet in a BEFORE INSERT; make FK deferrable
ALTER TABLE public.event_guest_contacts DROP CONSTRAINT event_guest_contacts_event_id_fkey;
ALTER TABLE public.event_guest_contacts ADD CONSTRAINT event_guest_contacts_event_id_fkey
  FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;

-- 3. Claim guest events for the signed-in user's verified email
CREATE OR REPLACE FUNCTION public.claim_guest_events()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_email text;
  n integer;
BEGIN
  IF auth.uid() IS NULL THEN RETURN 0; END IF;
  SELECT lower(email) INTO v_email FROM auth.users
   WHERE id = auth.uid() AND email_confirmed_at IS NOT NULL;
  IF v_email IS NULL THEN RETURN 0; END IF;
  UPDATE public.events e SET user_id = auth.uid()
    FROM public.event_guest_contacts c
   WHERE c.event_id = e.id AND e.user_id IS NULL AND c.guest_email = v_email;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END; $$;
REVOKE EXECUTE ON FUNCTION public.claim_guest_events() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_guest_events() TO authenticated;

-- 4. Bind authenticated uploads to the uploader's own folder
DROP POLICY IF EXISTS "Authenticated users can upload artist images" ON storage.objects;
CREATE POLICY "Authenticated users can upload artist images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'artist-images' AND (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS "Authenticated users can upload event images" ON storage.objects;
CREATE POLICY "Authenticated users can upload event images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'event-images' AND (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS "Authenticated users can upload knowledge media" ON storage.objects;
CREATE POLICY "Authenticated users can upload knowledge media" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'knowledge-media' AND (storage.foldername(name))[1] = auth.uid()::text);