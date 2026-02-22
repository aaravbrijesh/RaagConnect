
-- Make availability_id nullable for iCal-sourced bookings
ALTER TABLE public.class_bookings ALTER COLUMN availability_id DROP NOT NULL;
