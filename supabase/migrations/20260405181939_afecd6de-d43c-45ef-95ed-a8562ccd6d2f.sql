
-- Create knowledge_posts table
CREATE TABLE public.knowledge_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  image_url TEXT,
  audio_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.knowledge_posts ENABLE ROW LEVEL SECURITY;

-- Anyone can view knowledge posts
CREATE POLICY "Anyone can view knowledge posts"
ON public.knowledge_posts FOR SELECT
TO public
USING (true);

-- Authenticated users can create posts
CREATE POLICY "Authenticated users can create knowledge posts"
ON public.knowledge_posts FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can update their own posts
CREATE POLICY "Users can update their own knowledge posts"
ON public.knowledge_posts FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Users can delete their own posts
CREATE POLICY "Users can delete their own knowledge posts"
ON public.knowledge_posts FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Add updated_at trigger
CREATE TRIGGER handle_knowledge_posts_updated_at
  BEFORE UPDATE ON public.knowledge_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Create storage bucket for knowledge media
INSERT INTO storage.buckets (id, name, public)
VALUES ('knowledge-media', 'knowledge-media', true);

-- Storage policies for knowledge-media bucket
CREATE POLICY "Anyone can view knowledge media"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'knowledge-media');

CREATE POLICY "Authenticated users can upload knowledge media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'knowledge-media');

CREATE POLICY "Users can delete their own knowledge media"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'knowledge-media' AND (storage.foldername(name))[1] = auth.uid()::text);
