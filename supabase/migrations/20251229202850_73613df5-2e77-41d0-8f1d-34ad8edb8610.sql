-- Fix OAuth role escalation vulnerability
-- Remove metadata-based role assignment and always default to 'viewer'
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Create profile
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name'
  );
  
  -- SECURITY FIX: Always assign 'viewer' role to new users
  -- Never trust metadata for role assignment as it can be manipulated in OAuth flows
  -- Users can choose their actual role (viewer/artist/organizer) through SelectRole.tsx
  -- Admin role must be assigned manually by existing admins
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'viewer'::app_role);
  
  RETURN NEW;
END;
$function$;