-- Create a masked view for organizers that hides sensitive attendee data
CREATE OR REPLACE VIEW public.bookings_organizer_view AS
SELECT 
  b.id,
  b.event_id,
  LEFT(b.attendee_email, 3) || '***@' || SPLIT_PART(b.attendee_email, '@', 2) as attendee_email_masked,
  LEFT(b.attendee_name, 1) || '***' as attendee_name_masked,
  b.amount,
  b.status,
  b.payment_method,
  b.created_at,
  b.updated_at,
  -- Full data only visible to the booking owner or admin
  CASE 
    WHEN b.user_id = auth.uid() OR is_admin(auth.uid()) THEN b.attendee_email 
    ELSE NULL 
  END as attendee_email,
  CASE 
    WHEN b.user_id = auth.uid() OR is_admin(auth.uid()) THEN b.attendee_name 
    ELSE NULL 
  END as attendee_name,
  CASE 
    WHEN b.user_id = auth.uid() OR is_admin(auth.uid()) THEN b.proof_of_payment_url 
    ELSE NULL 
  END as proof_of_payment_url
FROM public.bookings b;

-- Grant access to the view
GRANT SELECT ON public.bookings_organizer_view TO authenticated;