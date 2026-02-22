
-- Add class_mode column: '1-on-1' or 'group'
ALTER TABLE public.classes ADD COLUMN class_mode text NOT NULL DEFAULT '1-on-1';

-- Add class_announcements table for teacher-to-student communication
CREATE TABLE public.class_announcements (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  message text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.class_announcements ENABLE ROW LEVEL SECURITY;

-- Anyone can view announcements for classes they can see
CREATE POLICY "Anyone can view class announcements"
ON public.class_announcements FOR SELECT
USING (true);

-- Only class owners can create announcements
CREATE POLICY "Class owners can create announcements"
ON public.class_announcements FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (SELECT 1 FROM classes WHERE classes.id = class_announcements.class_id AND classes.user_id = auth.uid())
);

-- Only class owners can update their announcements
CREATE POLICY "Class owners can update announcements"
ON public.class_announcements FOR UPDATE
USING (
  auth.uid() = user_id AND
  EXISTS (SELECT 1 FROM classes WHERE classes.id = class_announcements.class_id AND classes.user_id = auth.uid())
);

-- Only class owners can delete their announcements
CREATE POLICY "Class owners can delete announcements"
ON public.class_announcements FOR DELETE
USING (
  auth.uid() = user_id AND
  EXISTS (SELECT 1 FROM classes WHERE classes.id = class_announcements.class_id AND classes.user_id = auth.uid())
);

-- Add recurring flag to class_bookings
ALTER TABLE public.class_bookings ADD COLUMN is_recurring boolean NOT NULL DEFAULT false;

-- Add group class schedule fields
ALTER TABLE public.classes ADD COLUMN group_schedule_day integer;
ALTER TABLE public.classes ADD COLUMN group_schedule_time time without time zone;
ALTER TABLE public.classes ADD COLUMN group_schedule_end_time time without time zone;
