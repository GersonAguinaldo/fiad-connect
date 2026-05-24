-- Targeting columns on events
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS target_categories text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS target_membership_types text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS target_cities text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS target_countries text[] NOT NULL DEFAULT '{}';

-- Resources table
CREATE TABLE IF NOT EXISTS public.event_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'file', -- file | url
  category text NOT NULL DEFAULT 'autre', -- pdf | video | audio | image | autre
  title text NOT NULL,
  url text,
  storage_path text,
  mime_type text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.event_resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Resources viewable by authenticated"
  ON public.event_resources FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins insert resources"
  ON public.event_resources FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins update resources"
  ON public.event_resources FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins delete resources"
  ON public.event_resources FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_event_resources_event ON public.event_resources(event_id);

-- Storage bucket for event resources (public read for simplicity)
INSERT INTO storage.buckets (id, name, public)
VALUES ('event-resources', 'event-resources', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Event resources public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'event-resources');

CREATE POLICY "Admins upload event resources"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'event-resources' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins update event resources"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'event-resources' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins delete event resources"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'event-resources' AND has_role(auth.uid(), 'admin'::app_role));