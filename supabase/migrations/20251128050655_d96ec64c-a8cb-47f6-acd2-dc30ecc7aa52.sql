-- Fix critical security issue: Profiles table exposes all user emails publicly
-- Remove the overly permissive policy that allows anyone to read all profiles

DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

-- Allow users to view only their own profile
CREATE POLICY "Users can view their own profile" 
ON public.profiles
FOR SELECT 
USING (auth.uid() = user_id);

-- Allow admins to view all profiles (needed for admin dashboard)
CREATE POLICY "Admins can view all profiles" 
ON public.profiles
FOR SELECT 
USING (is_admin(auth.uid()));