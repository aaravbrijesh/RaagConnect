
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM public;
GRANT USAGE ON SCHEMA private TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION private.is_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'admin')
$$;

REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM public;
REVOKE ALL ON FUNCTION private.is_admin(uuid) FROM public;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_admin(uuid) TO anon, authenticated, service_role;

-- Rewrite policies (public + the storage payment-proofs policy) to use private helpers
DO $do$
DECLARE
  r record;
  new_qual text;
  new_check text;
  stmt text;
  roles_txt text;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
    FROM pg_policies
    WHERE (schemaname = 'public' OR (schemaname = 'storage' AND tablename = 'objects'))
      AND (COALESCE(qual,'') || COALESCE(with_check,'')) ~ '(has_role|is_admin)\('
  LOOP
    new_qual := regexp_replace(COALESCE(r.qual,''), '(public\.)?(has_role|is_admin)\(', 'private.\2(', 'g');
    new_check := regexp_replace(COALESCE(r.with_check,''), '(public\.)?(has_role|is_admin)\(', 'private.\2(', 'g');
    roles_txt := array_to_string(ARRAY(SELECT quote_ident(x) FROM unnest(r.roles) AS x), ', ');

    EXECUTE format('DROP POLICY %I ON %I.%I', r.policyname, r.schemaname, r.tablename);

    stmt := format('CREATE POLICY %I ON %I.%I AS %s FOR %s TO %s',
                   r.policyname, r.schemaname, r.tablename,
                   CASE WHEN r.permissive = 'PERMISSIVE' THEN 'PERMISSIVE' ELSE 'RESTRICTIVE' END,
                   r.cmd, roles_txt);
    IF r.qual IS NOT NULL THEN
      stmt := stmt || format(' USING (%s)', new_qual);
    END IF;
    IF r.with_check IS NOT NULL THEN
      stmt := stmt || format(' WITH CHECK (%s)', new_check);
    END IF;
    EXECUTE stmt;
  END LOOP;
END
$do$;

-- Recreate the organizer bookings view using the private helper
CREATE OR REPLACE VIEW public.bookings_organizer_view AS
SELECT id,
  event_id,
  ("left"(attendee_email, 3) || '***@'::text) || split_part(attendee_email, '@'::text, 2) AS attendee_email_masked,
  "left"(attendee_name, 1) || '***'::text AS attendee_name_masked,
  amount,
  status,
  payment_method,
  created_at,
  updated_at,
  CASE WHEN user_id = auth.uid() OR private.is_admin(auth.uid()) THEN attendee_email ELSE NULL::text END AS attendee_email,
  CASE WHEN user_id = auth.uid() OR private.is_admin(auth.uid()) THEN attendee_name ELSE NULL::text END AS attendee_name,
  CASE WHEN user_id = auth.uid() OR private.is_admin(auth.uid()) THEN proof_of_payment_url ELSE NULL::text END AS proof_of_payment_url
FROM public.bookings b;

-- Update trigger function bodies that call the old helpers
CREATE OR REPLACE FUNCTION public.log_artist_changes()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
BEGIN
  IF private.is_admin(auth.uid()) THEN RETURN COALESCE(NEW, OLD); END IF;
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_logs (user_id, action, table_name, record_id, new_data)
    VALUES (auth.uid(), 'create', 'artists', NEW.id, to_jsonb(NEW));
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_logs (user_id, action, table_name, record_id, old_data, new_data)
    VALUES (auth.uid(), 'update', 'artists', NEW.id, to_jsonb(OLD), to_jsonb(NEW));
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_logs (user_id, action, table_name, record_id, old_data)
    VALUES (auth.uid(), 'delete', 'artists', OLD.id, to_jsonb(OLD));
  END IF;
  RETURN COALESCE(NEW, OLD);
END; $function$;

CREATE OR REPLACE FUNCTION public.log_event_changes()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
BEGIN
  IF private.is_admin(auth.uid()) THEN RETURN COALESCE(NEW, OLD); END IF;
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_logs (user_id, action, table_name, record_id, new_data)
    VALUES (auth.uid(), 'create', 'events', NEW.id, to_jsonb(NEW));
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_logs (user_id, action, table_name, record_id, old_data, new_data)
    VALUES (auth.uid(), 'update', 'events', NEW.id, to_jsonb(OLD), to_jsonb(NEW));
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_logs (user_id, action, table_name, record_id, old_data)
    VALUES (auth.uid(), 'delete', 'events', OLD.id, to_jsonb(OLD));
  END IF;
  RETURN COALESCE(NEW, OLD);
END; $function$;

CREATE OR REPLACE FUNCTION public.log_booking_changes()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
DECLARE
  redacted_old JSONB;
  redacted_new JSONB;
BEGIN
  IF private.is_admin(auth.uid()) THEN RETURN COALESCE(NEW, OLD); END IF;
  IF TG_OP = 'INSERT' THEN
    redacted_new := to_jsonb(NEW) - 'proof_of_payment_url';
    INSERT INTO audit_logs (user_id, action, table_name, record_id, new_data)
    VALUES (auth.uid(), 'create', 'bookings', NEW.id, redacted_new);
  ELSIF TG_OP = 'UPDATE' THEN
    redacted_old := to_jsonb(OLD) - 'proof_of_payment_url';
    redacted_new := to_jsonb(NEW) - 'proof_of_payment_url';
    INSERT INTO audit_logs (user_id, action, table_name, record_id, old_data, new_data)
    VALUES (auth.uid(), 'update', 'bookings', NEW.id, redacted_old, redacted_new);
  ELSIF TG_OP = 'DELETE' THEN
    redacted_old := to_jsonb(OLD) - 'proof_of_payment_url';
    INSERT INTO audit_logs (user_id, action, table_name, record_id, old_data)
    VALUES (auth.uid(), 'delete', 'bookings', OLD.id, redacted_old);
  END IF;
  RETURN COALESCE(NEW, OLD);
END; $function$;

CREATE OR REPLACE FUNCTION public.log_site_content_changes()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
BEGIN
  IF private.is_admin(auth.uid()) THEN
    IF TG_OP = 'INSERT' THEN
      INSERT INTO audit_logs (user_id, action, table_name, record_id, new_data)
      VALUES (auth.uid(), 'create', 'site_content', NEW.id, to_jsonb(NEW));
    ELSIF TG_OP = 'UPDATE' THEN
      INSERT INTO audit_logs (user_id, action, table_name, record_id, old_data, new_data)
      VALUES (auth.uid(), 'update', 'site_content', NEW.id, to_jsonb(OLD), to_jsonb(NEW));
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END; $function$;

CREATE OR REPLACE FUNCTION public.prevent_self_admin_role()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
BEGIN
  IF NEW.user_id = auth.uid() AND NEW.role = 'admin' AND NOT private.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Cannot assign admin role to yourself';
  END IF;
  RETURN NEW;
END; $function$;

DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);
DROP FUNCTION IF EXISTS public.is_admin(uuid);

DO $do$
DECLARE f record;
BEGIN
  FOR f IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM public, anon, authenticated', f.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', f.sig);
  END LOOP;
END
$do$;
