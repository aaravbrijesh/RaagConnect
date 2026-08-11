-- 1. Move ical_url out of the publicly readable classes table
CREATE TABLE IF NOT EXISTS public.class_private_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL UNIQUE REFERENCES public.classes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  ical_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.class_private_settings TO authenticated;
GRANT ALL ON public.class_private_settings TO service_role;

ALTER TABLE public.class_private_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners and admins can view class private settings"
ON public.class_private_settings FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

CREATE POLICY "Owners and admins can insert class private settings"
ON public.class_private_settings FOR INSERT TO authenticated
WITH CHECK (
  public.is_admin(auth.uid())
  OR (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.classes c WHERE c.id = class_id AND c.user_id = auth.uid()))
);

CREATE POLICY "Owners and admins can update class private settings"
ON public.class_private_settings FOR UPDATE TO authenticated
USING (auth.uid() = user_id OR public.is_admin(auth.uid()))
WITH CHECK (auth.uid() = user_id OR public.is_admin(auth.uid()));

CREATE POLICY "Owners and admins can delete class private settings"
ON public.class_private_settings FOR DELETE TO authenticated
USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

CREATE TRIGGER set_updated_at_class_private_settings
BEFORE UPDATE ON public.class_private_settings
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

INSERT INTO public.class_private_settings (class_id, user_id, ical_url)
SELECT c.id, c.user_id, c.ical_url FROM public.classes c
WHERE c.ical_url IS NOT NULL
ON CONFLICT (class_id) DO NOTHING;

ALTER TABLE public.classes DROP COLUMN IF EXISTS ical_url;

-- 2. Prevent self-assignment of admin on initial role insert
DROP POLICY IF EXISTS "Users can insert their own role if none exists" ON public.user_roles;
CREATE POLICY "Users can insert their own role if none exists"
ON public.user_roles FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND role <> 'admin'::app_role
  AND NOT EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid())
);

-- 3. Revoke API EXECUTE on SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.cleanup_old_audit_logs() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_updated_at() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_artist_changes() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_booking_changes() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_event_changes() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_site_content_changes() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.prevent_self_admin_role() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_artist_slug() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_class_slug() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_event_slug() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.unique_slug(text, text, uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM anon;