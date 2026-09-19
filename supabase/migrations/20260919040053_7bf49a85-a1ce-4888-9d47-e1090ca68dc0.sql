DROP VIEW public.organizer_payment_status;

CREATE TABLE public.organizer_payments_public (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  charges_enabled boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.organizer_payments_public TO anon, authenticated;
GRANT ALL ON public.organizer_payments_public TO service_role;
ALTER TABLE public.organizer_payments_public ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can see who accepts payments" ON public.organizer_payments_public FOR SELECT USING (true);

CREATE POLICY "Service role manages webhook events" ON public.stripe_webhook_events FOR ALL TO service_role USING (true) WITH CHECK (true);