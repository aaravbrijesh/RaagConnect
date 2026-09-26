-- 1. Fix role assignment at signup: honour the self-selected role, never admin
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  requested text;
  final_role public.app_role;
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');

  requested := lower(coalesce(NEW.raw_user_meta_data->>'role', 'viewer'));

  -- Only self-service roles are allowed. 'admin' can never be self-assigned.
  IF requested IN ('artist', 'organizer', 'teacher') THEN
    final_role := requested::public.app_role;
  ELSE
    final_role := 'viewer'::public.app_role;
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, final_role);

  RETURN NEW;
END;
$function$;

-- 2. Organizer payment method preferences
CREATE TABLE IF NOT EXISTS public.organizer_payment_methods (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  accept_card boolean NOT NULL DEFAULT true,
  accept_cash boolean NOT NULL DEFAULT false,
  venmo text,
  cashapp text,
  zelle text,
  paypal text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.organizer_payment_methods TO authenticated;
GRANT SELECT ON public.organizer_payment_methods TO anon;
GRANT ALL ON public.organizer_payment_methods TO service_role;

ALTER TABLE public.organizer_payment_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Payment options are viewable by everyone"
  ON public.organizer_payment_methods FOR SELECT
  USING (true);

CREATE POLICY "Organizers manage their own payment options"
  ON public.organizer_payment_methods FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Organizers update their own payment options"
  ON public.organizer_payment_methods FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Organizers delete their own payment options"
  ON public.organizer_payment_methods FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER set_updated_at_organizer_payment_methods
  BEFORE UPDATE ON public.organizer_payment_methods
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();