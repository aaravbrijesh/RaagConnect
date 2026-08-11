
-- slugify helper
CREATE OR REPLACE FUNCTION public.slugify(_txt text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT COALESCE(NULLIF(trim(both '-' from regexp_replace(lower(_txt), '[^a-z0-9]+', '-', 'g')), ''), 'item')
$$;

ALTER TABLE public.events ADD COLUMN IF NOT EXISTS slug text;
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS slug text;
ALTER TABLE public.artists ADD COLUMN IF NOT EXISTS slug text;

CREATE OR REPLACE FUNCTION public.unique_slug(_table text, _base text, _id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  candidate text;
  n int := 1;
  taken boolean;
BEGIN
  candidate := _base;
  LOOP
    EXECUTE format('SELECT EXISTS (SELECT 1 FROM public.%I WHERE slug = $1 AND ($2 IS NULL OR id <> $2))', _table)
      INTO taken USING candidate, _id;
    EXIT WHEN NOT taken;
    n := n + 1;
    candidate := _base || '-' || n::text;
  END LOOP;
  RETURN candidate;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_event_slug()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.slug IS NULL OR (TG_OP = 'UPDATE' AND NEW.title IS DISTINCT FROM OLD.title AND NEW.slug = OLD.slug) THEN
    NEW.slug := public.unique_slug('events', public.slugify(NEW.title), NEW.id);
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.set_class_slug()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.slug IS NULL OR (TG_OP = 'UPDATE' AND NEW.title IS DISTINCT FROM OLD.title AND NEW.slug = OLD.slug) THEN
    NEW.slug := public.unique_slug('classes', public.slugify(NEW.title), NEW.id);
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.set_artist_slug()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.slug IS NULL OR (TG_OP = 'UPDATE' AND NEW.name IS DISTINCT FROM OLD.name AND NEW.slug = OLD.slug) THEN
    NEW.slug := public.unique_slug('artists', public.slugify(NEW.name), NEW.id);
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS set_slug_events ON public.events;
CREATE TRIGGER set_slug_events BEFORE INSERT OR UPDATE ON public.events
FOR EACH ROW EXECUTE FUNCTION public.set_event_slug();

DROP TRIGGER IF EXISTS set_slug_classes ON public.classes;
CREATE TRIGGER set_slug_classes BEFORE INSERT OR UPDATE ON public.classes
FOR EACH ROW EXECUTE FUNCTION public.set_class_slug();

DROP TRIGGER IF EXISTS set_slug_artists ON public.artists;
CREATE TRIGGER set_slug_artists BEFORE INSERT OR UPDATE ON public.artists
FOR EACH ROW EXECUTE FUNCTION public.set_artist_slug();

-- backfill
ALTER TABLE public.events DISABLE TRIGGER audit_event_changes;
ALTER TABLE public.artists DISABLE TRIGGER audit_artist_changes;
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id, title FROM public.events WHERE slug IS NULL ORDER BY created_at LOOP
    UPDATE public.events SET slug = public.unique_slug('events', public.slugify(r.title), r.id) WHERE id = r.id;
  END LOOP;
  FOR r IN SELECT id, title FROM public.classes WHERE slug IS NULL ORDER BY created_at LOOP
    UPDATE public.classes SET slug = public.unique_slug('classes', public.slugify(r.title), r.id) WHERE id = r.id;
  END LOOP;
  FOR r IN SELECT id, name AS title FROM public.artists WHERE slug IS NULL ORDER BY created_at LOOP
    UPDATE public.artists SET slug = public.unique_slug('artists', public.slugify(r.title), r.id) WHERE id = r.id;
  END LOOP;
END $$;
ALTER TABLE public.events ENABLE TRIGGER audit_event_changes;
ALTER TABLE public.artists ENABLE TRIGGER audit_artist_changes;

CREATE UNIQUE INDEX IF NOT EXISTS events_slug_key ON public.events (slug);
CREATE UNIQUE INDEX IF NOT EXISTS classes_slug_key ON public.classes (slug);
CREATE UNIQUE INDEX IF NOT EXISTS artists_slug_key ON public.artists (slug);

ALTER TABLE public.knowledge_posts ALTER COLUMN is_public SET DEFAULT false;
