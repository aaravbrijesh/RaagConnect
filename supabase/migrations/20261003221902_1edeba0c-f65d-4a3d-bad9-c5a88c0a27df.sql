DROP POLICY IF EXISTS "Users can insert their own role if none exists" ON public.user_roles;
CREATE POLICY "Users can add their own host profiles" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND role IN ('viewer','artist','organizer','teacher'));
CREATE POLICY "Users can remove their own host profiles" ON public.user_roles
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id AND role IN ('artist','organizer','teacher'));
GRANT INSERT, DELETE ON public.user_roles TO authenticated;