-- Create a table to store editable site content (like About page)
CREATE TABLE public.site_content (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  page_key text NOT NULL UNIQUE,
  title text,
  content jsonb NOT NULL DEFAULT '{}',
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

-- Enable Row Level Security
ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;

-- Anyone can view site content
CREATE POLICY "Anyone can view site content" 
ON public.site_content 
FOR SELECT 
USING (true);

-- Only admins can update site content
CREATE POLICY "Admins can update site content" 
ON public.site_content 
FOR UPDATE 
USING (is_admin(auth.uid()));

-- Only admins can insert site content
CREATE POLICY "Admins can insert site content" 
ON public.site_content 
FOR INSERT 
WITH CHECK (is_admin(auth.uid()));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_site_content_updated_at
BEFORE UPDATE ON public.site_content
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Create a trigger function to log admin edits to site content
CREATE OR REPLACE FUNCTION public.log_site_content_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only log if user is admin (admin edits should be tracked)
  IF is_admin(auth.uid()) THEN
    IF TG_OP = 'INSERT' THEN
      INSERT INTO audit_logs (user_id, action, table_name, record_id, new_data)
      VALUES (auth.uid(), 'create', 'site_content', NEW.id, to_jsonb(NEW));
    ELSIF TG_OP = 'UPDATE' THEN
      INSERT INTO audit_logs (user_id, action, table_name, record_id, old_data, new_data)
      VALUES (auth.uid(), 'update', 'site_content', NEW.id, to_jsonb(OLD), to_jsonb(NEW));
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger for logging site content changes
CREATE TRIGGER log_site_content_audit
AFTER INSERT OR UPDATE ON public.site_content
FOR EACH ROW
EXECUTE FUNCTION public.log_site_content_changes();

-- Insert default About page content
INSERT INTO public.site_content (page_key, title, content)
VALUES (
  'about',
  'About Raag Connect',
  '{
    "heroDescription": "Connecting classical music lovers with artists and events in their community",
    "missionText": "Raag Connect was created to bridge the gap between Indian classical music artists and audiences. We believe that this rich musical tradition deserves a dedicated platform where artists can showcase their talents and music lovers can discover live performances in their area.",
    "feature1Title": "Discover Events",
    "feature1Text": "Find classical music concerts and performances happening near you with our location-based event discovery.",
    "feature2Title": "Connect with Artists",
    "feature2Text": "Browse artist profiles, learn about their specializations, and follow your favorite performers.",
    "feature3Title": "Book Performances",
    "feature3Text": "Easily book tickets to events and support the artists who keep this musical tradition alive.",
    "contactEmail": "contact@raagconnect.com"
  }'::jsonb
);