CREATE TABLE public.platform_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  platform_fee_percent numeric NOT NULL DEFAULT 5 CHECK (platform_fee_percent >= 0 AND platform_fee_percent <= 100),
  default_currency text NOT NULL DEFAULT 'usd',
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.platform_settings (id) VALUES (true);
GRANT SELECT ON public.platform_settings TO anon, authenticated;
GRANT ALL ON public.platform_settings TO service_role;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Platform settings are viewable by everyone" ON public.platform_settings FOR SELECT USING (true);
CREATE POLICY "Admins can update platform settings" ON public.platform_settings FOR UPDATE TO authenticated USING (private.is_admin(auth.uid())) WITH CHECK (private.is_admin(auth.uid()));

CREATE TABLE public.organizer_payment_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_account_id text NOT NULL UNIQUE,
  onboarding_complete boolean NOT NULL DEFAULT false,
  charges_enabled boolean NOT NULL DEFAULT false,
  payouts_enabled boolean NOT NULL DEFAULT false,
  requirements_due boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.organizer_payment_accounts TO authenticated;
GRANT ALL ON public.organizer_payment_accounts TO service_role;
ALTER TABLE public.organizer_payment_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners and admins can view payment accounts" ON public.organizer_payment_accounts
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR private.is_admin(auth.uid()));
CREATE TRIGGER set_updated_at_organizer_payment_accounts BEFORE UPDATE ON public.organizer_payment_accounts
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE VIEW public.organizer_payment_status
WITH (security_invoker = false) AS
  SELECT user_id, charges_enabled FROM public.organizer_payment_accounts;
GRANT SELECT ON public.organizer_payment_status TO anon, authenticated;

CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  buyer_email text,
  buyer_name text,
  organizer_id uuid NOT NULL,
  event_id uuid REFERENCES public.events(id) ON DELETE SET NULL,
  class_id uuid REFERENCES public.classes(id) ON DELETE SET NULL,
  quantity integer NOT NULL DEFAULT 1,
  stripe_checkout_session_id text UNIQUE,
  stripe_payment_intent_id text,
  stripe_connected_account_id text NOT NULL,
  gross_amount integer NOT NULL,
  platform_fee integer NOT NULL,
  platform_fee_percent numeric NOT NULL,
  currency text NOT NULL DEFAULT 'usd',
  payment_status text NOT NULL DEFAULT 'pending',
  refund_status text NOT NULL DEFAULT 'none',
  refunded_amount integer NOT NULL DEFAULT 0,
  fulfilled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (event_id IS NOT NULL OR class_id IS NOT NULL)
);
CREATE INDEX idx_payments_organizer ON public.payments(organizer_id);
CREATE INDEX idx_payments_user ON public.payments(user_id);
GRANT SELECT ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Buyers can view their own payments" ON public.payments
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Organizers can view their sales" ON public.payments
  FOR SELECT TO authenticated USING (auth.uid() = organizer_id);
CREATE POLICY "Admins can view all payments" ON public.payments
  FOR SELECT TO authenticated USING (private.is_admin(auth.uid()));
CREATE TRIGGER set_updated_at_payments BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TABLE public.stripe_webhook_events (
  id text PRIMARY KEY,
  type text NOT NULL,
  processed_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.stripe_webhook_events TO service_role;
ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.events ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'usd';
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS price_cents integer;
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'usd';
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS price_cents integer;

ALTER TABLE public.events DISABLE TRIGGER audit_event_changes;
UPDATE public.events SET price_cents = ROUND(price * 100) WHERE price IS NOT NULL AND price_cents IS NULL;
ALTER TABLE public.events ENABLE TRIGGER audit_event_changes;
UPDATE public.classes SET price_cents = ROUND(price * 100) WHERE price IS NOT NULL AND price_cents IS NULL;