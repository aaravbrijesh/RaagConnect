-- Create event discussions table
CREATE TABLE IF NOT EXISTS public.event_discussions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  parent_id UUID REFERENCES public.event_discussions(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create index for faster queries
CREATE INDEX idx_event_discussions_event_id ON public.event_discussions(event_id);
CREATE INDEX idx_event_discussions_parent_id ON public.event_discussions(parent_id);

-- Enable RLS
ALTER TABLE public.event_discussions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for event discussions
CREATE POLICY "Anyone can view event discussions"
  ON public.event_discussions FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create discussions"
  ON public.event_discussions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own discussions"
  ON public.event_discussions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own discussions"
  ON public.event_discussions FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER set_updated_at_event_discussions
  BEFORE UPDATE ON public.event_discussions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.event_discussions;