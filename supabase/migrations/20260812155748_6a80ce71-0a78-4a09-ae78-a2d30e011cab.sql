DROP POLICY IF EXISTS "Users can update their own classes" ON public.classes;
DROP POLICY IF EXISTS "Users can delete their own classes" ON public.classes;

CREATE POLICY "Owners and admins can update classes"
ON public.classes FOR UPDATE TO authenticated
USING (auth.uid() = user_id OR private.is_admin(auth.uid()))
WITH CHECK (auth.uid() = user_id OR private.is_admin(auth.uid()));

CREATE POLICY "Owners and admins can delete classes"
ON public.classes FOR DELETE TO authenticated
USING (auth.uid() = user_id OR private.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Class owners and admins can delete availability" ON public.class_availability;
CREATE POLICY "Class owners and admins can delete availability"
ON public.class_availability FOR DELETE TO authenticated
USING (
  private.is_admin(auth.uid())
  OR EXISTS (SELECT 1 FROM public.classes c WHERE c.id = class_availability.class_id AND c.user_id = auth.uid())
);

DROP POLICY IF EXISTS "Class owners and admins can delete bookings" ON public.class_bookings;
CREATE POLICY "Class owners and admins can delete bookings"
ON public.class_bookings FOR DELETE TO authenticated
USING (
  private.is_admin(auth.uid())
  OR EXISTS (SELECT 1 FROM public.classes c WHERE c.id = class_bookings.class_id AND c.user_id = auth.uid())
);

DROP POLICY IF EXISTS "Class owners and admins can delete announcements" ON public.class_announcements;
CREATE POLICY "Class owners and admins can delete announcements"
ON public.class_announcements FOR DELETE TO authenticated
USING (
  private.is_admin(auth.uid())
  OR EXISTS (SELECT 1 FROM public.classes c WHERE c.id = class_announcements.class_id AND c.user_id = auth.uid())
);

DROP POLICY IF EXISTS "Class owners and admins can delete private settings" ON public.class_private_settings;
CREATE POLICY "Class owners and admins can delete private settings"
ON public.class_private_settings FOR DELETE TO authenticated
USING (
  private.is_admin(auth.uid())
  OR EXISTS (SELECT 1 FROM public.classes c WHERE c.id = class_private_settings.class_id AND c.user_id = auth.uid())
);