-- Update events table for hybrid payment system
ALTER TABLE public.events DROP COLUMN IF EXISTS paypal_handle;
ALTER TABLE public.events ADD COLUMN use_stripe_checkout BOOLEAN DEFAULT false;
ALTER TABLE public.events ADD COLUMN payment_link TEXT;
ALTER TABLE public.events ADD COLUMN stripe_product_id TEXT;
ALTER TABLE public.events ADD COLUMN stripe_price_id TEXT;

-- Update bookings table for proof of payment
ALTER TABLE public.bookings DROP COLUMN IF EXISTS paypal_order_id;
ALTER TABLE public.bookings DROP COLUMN IF EXISTS paypal_payer_id;
ALTER TABLE public.bookings ADD COLUMN payment_method TEXT NOT NULL DEFAULT 'direct';
ALTER TABLE public.bookings ADD COLUMN proof_of_payment_url TEXT;

-- Add policy for organizers to view bookings for their events
CREATE POLICY "Organizers can view bookings for their events" 
ON public.bookings 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.events 
    WHERE events.id = bookings.event_id 
    AND events.user_id = auth.uid()
  )
);

-- Add policy for organizers to update booking status
CREATE POLICY "Organizers can update bookings for their events" 
ON public.bookings 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.events 
    WHERE events.id = bookings.event_id 
    AND events.user_id = auth.uid()
  )
);