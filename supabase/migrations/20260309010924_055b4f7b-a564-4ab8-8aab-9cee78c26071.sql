
-- Allow admins to manage class_availability for any user
DROP POLICY IF EXISTS "Class owners can manage availability" ON public.class_availability;
CREATE POLICY "Class owners can manage availability" ON public.class_availability
FOR INSERT WITH CHECK (auth.uid() = user_id OR is_admin(auth.uid()));

DROP POLICY IF EXISTS "Class owners can update availability" ON public.class_availability;
CREATE POLICY "Class owners can update availability" ON public.class_availability
FOR UPDATE USING (auth.uid() = user_id OR is_admin(auth.uid()));

DROP POLICY IF EXISTS "Class owners can delete availability" ON public.class_availability;
CREATE POLICY "Class owners can delete availability" ON public.class_availability
FOR DELETE USING (auth.uid() = user_id OR is_admin(auth.uid()));
