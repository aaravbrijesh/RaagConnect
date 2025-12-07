-- Create event_schedule table for storing event schedule items
CREATE TABLE public.event_schedule (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  time TIME NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.event_schedule ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view event schedules" 
ON public.event_schedule 
FOR SELECT 
USING (true);

CREATE POLICY "Event owners can manage schedules" 
ON public.event_schedule 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM events 
    WHERE events.id = event_schedule.event_id 
    AND (events.user_id = auth.uid() OR is_admin(auth.uid()))
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_event_schedule_updated_at
BEFORE UPDATE ON public.event_schedule
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();