ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS stripe_payment_id uuid REFERENCES public.payments(id);
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS stripe_ticket_index integer;
CREATE UNIQUE INDEX IF NOT EXISTS bookings_stripe_ticket_unique ON public.bookings(stripe_payment_id, stripe_ticket_index);
ALTER TABLE public.class_bookings ADD COLUMN IF NOT EXISTS stripe_payment_id uuid REFERENCES public.payments(id);
CREATE OR REPLACE FUNCTION public.fulfill_stripe_checkout(_event_id text, _event_type text, _session_id text, _payment_intent text, _amount integer, _currency text, _booking_ids uuid[])
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p public.payments%ROWTYPE; n integer; prof record;
BEGIN
  SELECT * INTO p FROM public.payments WHERE stripe_checkout_session_id = _session_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Payment record missing'; END IF;
  IF p.gross_amount <> _amount OR lower(p.currency) <> lower(_currency) THEN RAISE EXCEPTION 'Payment amount or currency mismatch'; END IF;
  IF p.fulfilled_at IS NOT NULL THEN RETURN false; END IF;
  IF p.user_id IS NULL THEN RAISE EXCEPTION 'Buyer missing'; END IF;
  IF p.event_id IS NOT NULL THEN
    SELECT full_name, email INTO prof FROM public.profiles WHERE user_id = p.user_id;
    INSERT INTO public.bookings(event_id, user_id, attendee_name, attendee_email, amount, payment_method, status, stripe_payment_id, stripe_ticket_index)
    SELECT p.event_id, p.user_id, coalesce(prof.full_name, p.buyer_name, 'Ticket holder'), coalesce(prof.email, p.buyer_email, ''), p.gross_amount::numeric / p.quantity / 100, 'stripe', 'confirmed', p.id, i
    FROM generate_series(1, p.quantity) i;
  ELSIF p.class_id IS NOT NULL THEN
    IF coalesce(cardinality(_booking_ids), 0) <> p.quantity THEN RAISE EXCEPTION 'Class reservations missing'; END IF;
    UPDATE public.class_bookings SET status = 'confirmed', stripe_payment_id = p.id
    WHERE id = ANY(_booking_ids) AND class_id = p.class_id AND user_id = p.user_id AND status = 'pending' AND stripe_payment_id IS NULL;
    GET DIAGNOSTICS n = ROW_COUNT;
    IF n <> p.quantity THEN RAISE EXCEPTION 'Class reservation mismatch'; END IF;
  ELSE RAISE EXCEPTION 'Listing missing';
  END IF;
  UPDATE public.payments SET payment_status = 'paid', stripe_payment_intent_id = _payment_intent, fulfilled_at = now() WHERE id = p.id;
  INSERT INTO public.stripe_webhook_events(id, type) VALUES (_event_id, _event_type) ON CONFLICT (id) DO NOTHING;
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.fulfill_stripe_checkout(text, text, text, text, integer, text, uuid[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fulfill_stripe_checkout(text, text, text, text, integer, text, uuid[]) TO service_role;