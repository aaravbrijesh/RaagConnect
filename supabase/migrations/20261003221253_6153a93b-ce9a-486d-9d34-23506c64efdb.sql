CREATE TABLE public.raag_detections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  raag_name text NOT NULL,
  confidence text NOT NULL,
  analysis text NOT NULL,
  result jsonb NOT NULL DEFAULT '{}'::jsonb,
  source text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.raag_detections TO authenticated;
GRANT ALL ON public.raag_detections TO service_role;
ALTER TABLE public.raag_detections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own detections" ON public.raag_detections FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own detections" ON public.raag_detections FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own detections" ON public.raag_detections FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX raag_detections_user_created ON public.raag_detections(user_id, created_at DESC);