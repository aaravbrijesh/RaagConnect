-- Add flyer_url and notes columns to events table
ALTER TABLE public.events 
ADD COLUMN flyer_url text,
ADD COLUMN notes text;