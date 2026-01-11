-- Add ticket capacity and price tiers to events table
ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS ticket_capacity integer,
ADD COLUMN IF NOT EXISTS price_tiers jsonb DEFAULT '[]'::jsonb;

-- Add comment for clarity
COMMENT ON COLUMN public.events.ticket_capacity IS 'Maximum number of tickets that can be sold (null = unlimited)';
COMMENT ON COLUMN public.events.price_tiers IS 'Array of price tiers: [{name, price, quantity, startDate, endDate}]';