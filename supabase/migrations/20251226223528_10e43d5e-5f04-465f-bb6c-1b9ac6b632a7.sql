-- Add confirmation_type column to events table for paid events
-- This allows organizers to choose between at-the-door or online confirmation
ALTER TABLE public.events 
ADD COLUMN confirmation_type text DEFAULT 'online' 
CHECK (confirmation_type IN ('online', 'at_the_door'));