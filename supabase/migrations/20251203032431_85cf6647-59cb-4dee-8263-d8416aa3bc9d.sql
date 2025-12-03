-- Allow users to insert their own role if they don't have one yet (for OAuth users)
CREATE POLICY "Users can insert their own role if none exists"
ON public.user_roles
FOR INSERT
WITH CHECK (
  auth.uid() = user_id 
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid()
  )
);