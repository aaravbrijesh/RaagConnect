
-- Create classes table
CREATE TABLE public.classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  genre text NOT NULL,
  skill_level text NOT NULL DEFAULT 'all',
  class_type text NOT NULL DEFAULT 'in-person',
  location_name text,
  location_lat double precision,
  location_lng double precision,
  price numeric,
  max_capacity integer,
  contact_info text,
  image_url text,
  recurring_schedule text,
  schedule_details text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

-- Anyone can view classes
CREATE POLICY "Classes are viewable by everyone"
  ON public.classes FOR SELECT
  USING (true);

-- Artists, organizers, teachers, and admins can create classes
CREATE POLICY "Authorized users can create classes"
  ON public.classes FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND (
      has_role(auth.uid(), 'artist'::app_role)
      OR has_role(auth.uid(), 'organizer'::app_role)
      OR has_role(auth.uid(), 'teacher'::app_role)
      OR is_admin(auth.uid())
    )
  );

-- Users can update their own classes, admins can update all
CREATE POLICY "Users can update their own classes"
  ON public.classes FOR UPDATE
  USING (
    (auth.uid() = user_id AND (
      has_role(auth.uid(), 'artist'::app_role)
      OR has_role(auth.uid(), 'organizer'::app_role)
      OR has_role(auth.uid(), 'teacher'::app_role)
    ))
    OR is_admin(auth.uid())
  );

-- Users can delete their own classes, admins can delete all
CREATE POLICY "Users can delete their own classes"
  ON public.classes FOR DELETE
  USING (
    (auth.uid() = user_id AND (
      has_role(auth.uid(), 'artist'::app_role)
      OR has_role(auth.uid(), 'organizer'::app_role)
      OR has_role(auth.uid(), 'teacher'::app_role)
    ))
    OR is_admin(auth.uid())
  );

-- Trigger for updated_at
CREATE TRIGGER update_classes_updated_at
  BEFORE UPDATE ON public.classes
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
