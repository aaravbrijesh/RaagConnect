-- Teacher availability slots (recurring weekly schedule)
CREATE TABLE public.class_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  day_of_week integer NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  slot_duration_minutes integer NOT NULL DEFAULT 60,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.class_availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view class availability"
ON public.class_availability FOR SELECT USING (true);

CREATE POLICY "Class owners can manage availability"
ON public.class_availability FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Class owners can update availability"
ON public.class_availability FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Class owners can delete availability"
ON public.class_availability FOR DELETE
USING (auth.uid() = user_id);

CREATE TRIGGER update_class_availability_updated_at
BEFORE UPDATE ON public.class_availability
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Student bookings for class time slots
CREATE TABLE public.class_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  availability_id uuid NOT NULL REFERENCES public.class_availability(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  student_name text NOT NULL,
  student_email text NOT NULL,
  booking_date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  status text NOT NULL DEFAULT 'confirmed',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.class_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own bookings"
ON public.class_bookings FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Class owners can view bookings for their classes"
ON public.class_bookings FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.classes
  WHERE classes.id = class_bookings.class_id
  AND classes.user_id = auth.uid()
));

CREATE POLICY "Authenticated users can create bookings"
ON public.class_bookings FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bookings"
ON public.class_bookings FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Class owners can update bookings"
ON public.class_bookings FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.classes
  WHERE classes.id = class_bookings.class_id
  AND classes.user_id = auth.uid()
));

CREATE POLICY "Users can delete their own bookings"
ON public.class_bookings FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all class bookings"
ON public.class_bookings FOR SELECT
USING (is_admin(auth.uid()));

CREATE TRIGGER update_class_bookings_updated_at
BEFORE UPDATE ON public.class_bookings
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();