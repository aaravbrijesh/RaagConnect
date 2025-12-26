-- Add CHECK constraints for input validation at database level

-- Events table constraints
ALTER TABLE public.events 
ADD CONSTRAINT events_title_length CHECK (length(title) <= 200);

ALTER TABLE public.events 
ADD CONSTRAINT events_notes_length CHECK (length(notes) <= 2000);

ALTER TABLE public.events 
ADD CONSTRAINT events_price_range CHECK (price IS NULL OR (price >= 0 AND price <= 10000));

ALTER TABLE public.events 
ADD CONSTRAINT events_location_name_length CHECK (location_name IS NULL OR length(location_name) <= 200);

ALTER TABLE public.events 
ADD CONSTRAINT events_payment_link_length CHECK (payment_link IS NULL OR length(payment_link) <= 500);

-- Artists table constraints
ALTER TABLE public.artists 
ADD CONSTRAINT artists_name_length CHECK (length(name) <= 100);

ALTER TABLE public.artists 
ADD CONSTRAINT artists_genre_length CHECK (length(genre) <= 100);

ALTER TABLE public.artists 
ADD CONSTRAINT artists_bio_length CHECK (bio IS NULL OR length(bio) <= 4096);

ALTER TABLE public.artists 
ADD CONSTRAINT artists_location_name_length CHECK (location_name IS NULL OR length(location_name) <= 200);

-- Bookings table constraints
ALTER TABLE public.bookings 
ADD CONSTRAINT bookings_attendee_name_length CHECK (length(attendee_name) <= 100);

ALTER TABLE public.bookings 
ADD CONSTRAINT bookings_attendee_email_length CHECK (length(attendee_email) <= 255);

ALTER TABLE public.bookings 
ADD CONSTRAINT bookings_amount_range CHECK (amount >= 0 AND amount <= 10000);

-- Event discussions constraints
ALTER TABLE public.event_discussions 
ADD CONSTRAINT event_discussions_message_length CHECK (length(message) <= 2000);

-- Event schedule constraints
ALTER TABLE public.event_schedule 
ADD CONSTRAINT event_schedule_title_length CHECK (length(title) <= 200);

ALTER TABLE public.event_schedule 
ADD CONSTRAINT event_schedule_description_length CHECK (description IS NULL OR length(description) <= 1000);

-- Profiles table constraints
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_full_name_length CHECK (full_name IS NULL OR length(full_name) <= 100);

ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_email_length CHECK (email IS NULL OR length(email) <= 255);

-- Create function to cleanup old audit logs (90 day retention)
CREATE OR REPLACE FUNCTION public.cleanup_old_audit_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.audit_logs
  WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$;

-- Update booking audit function to redact sensitive fields
CREATE OR REPLACE FUNCTION public.log_booking_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  redacted_old JSONB;
  redacted_new JSONB;
BEGIN
  -- Don't log admin actions
  IF is_admin(auth.uid()) THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Redact sensitive fields (proof_of_payment_url contains file paths)
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
END;
$$;