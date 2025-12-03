-- Create junction table for event-artists many-to-many relationship
CREATE TABLE public.event_artists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  artist_id UUID NOT NULL REFERENCES public.artists(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(event_id, artist_id)
);

-- Enable RLS
ALTER TABLE public.event_artists ENABLE ROW LEVEL SECURITY;

-- Anyone can view event-artist relationships
CREATE POLICY "Anyone can view event artists"
ON public.event_artists
FOR SELECT
USING (true);

-- Event owners can manage artists for their events
CREATE POLICY "Event owners can manage event artists"
ON public.event_artists
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM events
    WHERE events.id = event_artists.event_id
    AND (events.user_id = auth.uid() OR is_admin(auth.uid()))
  )
);

-- Create index for performance
CREATE INDEX idx_event_artists_event_id ON public.event_artists(event_id);
CREATE INDEX idx_event_artists_artist_id ON public.event_artists(artist_id);