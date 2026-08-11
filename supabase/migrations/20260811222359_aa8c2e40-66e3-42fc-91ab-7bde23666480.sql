ALTER TABLE public.knowledge_posts ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT true;

DROP POLICY IF EXISTS "Anyone can view knowledge posts" ON public.knowledge_posts;

CREATE POLICY "Anyone can view public knowledge posts"
ON public.knowledge_posts
FOR SELECT
USING (is_public = true);

CREATE POLICY "Users can view their own private knowledge posts"
ON public.knowledge_posts
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);