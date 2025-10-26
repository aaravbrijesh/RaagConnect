-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('viewer', 'artist', 'organizer', 'admin');

-- Create user_roles table (CRITICAL: roles must be in separate table for security)
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(user_id, role)
);

-- Create profiles table for user information
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  email TEXT,
  full_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check user role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Security definer function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'admin'
  )
$$;

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert roles"
  ON public.user_roles FOR INSERT
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update roles"
  ON public.user_roles FOR UPDATE
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete roles"
  ON public.user_roles FOR DELETE
  USING (public.is_admin(auth.uid()));

-- RLS Policies for profiles
CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Trigger for profiles updated_at
CREATE TRIGGER set_updated_at_profiles
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create profile
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name'
  );
  
  -- Assign viewer role by default
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'viewer');
  
  RETURN NEW;
END;
$$;

-- Trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Update artists table to link to profiles
ALTER TABLE public.artists DROP CONSTRAINT IF EXISTS artists_user_id_fkey;
ALTER TABLE public.artists ADD CONSTRAINT artists_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Update RLS policies for artists (artists and organizers can create)
DROP POLICY IF EXISTS "Users can create their own artists" ON public.artists;
CREATE POLICY "Artists and organizers can create profiles"
  ON public.artists FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND 
    (public.has_role(auth.uid(), 'artist') OR 
     public.has_role(auth.uid(), 'organizer') OR 
     public.is_admin(auth.uid()))
  );

DROP POLICY IF EXISTS "Users can update their own artists" ON public.artists;
CREATE POLICY "Artists can update their own profiles"
  ON public.artists FOR UPDATE
  USING (
    (auth.uid() = user_id AND 
     (public.has_role(auth.uid(), 'artist') OR 
      public.has_role(auth.uid(), 'organizer'))) OR
    public.is_admin(auth.uid())
  );

DROP POLICY IF EXISTS "Users can delete their own artists" ON public.artists;
CREATE POLICY "Artists can delete their own profiles"
  ON public.artists FOR DELETE
  USING (
    (auth.uid() = user_id AND 
     (public.has_role(auth.uid(), 'artist') OR 
      public.has_role(auth.uid(), 'organizer'))) OR
    public.is_admin(auth.uid())
  );

-- Update RLS policies for events
DROP POLICY IF EXISTS "Users can create their own events" ON public.events;
CREATE POLICY "Artists, organizers, and admins can create events"
  ON public.events FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND 
    (public.has_role(auth.uid(), 'artist') OR 
     public.has_role(auth.uid(), 'organizer') OR 
     public.is_admin(auth.uid()))
  );

DROP POLICY IF EXISTS "Users can update their own events" ON public.events;
CREATE POLICY "Users can update their own events or admins can update all"
  ON public.events FOR UPDATE
  USING (
    (auth.uid() = user_id AND 
     (public.has_role(auth.uid(), 'artist') OR 
      public.has_role(auth.uid(), 'organizer'))) OR
    public.is_admin(auth.uid())
  );

DROP POLICY IF EXISTS "Users can delete their own events" ON public.events;
CREATE POLICY "Users can delete their own events or admins can delete all"
  ON public.events FOR DELETE
  USING (
    (auth.uid() = user_id AND 
     (public.has_role(auth.uid(), 'artist') OR 
      public.has_role(auth.uid(), 'organizer'))) OR
    public.is_admin(auth.uid())
  );