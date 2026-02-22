-- SECURITY FIX: Remove the self-update policy that allows privilege escalation
DROP POLICY IF EXISTS "Users can update their own role" ON public.user_roles;