
-- 1. Applications/Screens table linked to steps
CREATE TABLE public.step_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  step_id uuid NOT NULL REFERENCES public.process_steps(id) ON DELETE CASCADE,
  process_id uuid NOT NULL REFERENCES public.business_processes(id) ON DELETE CASCADE,
  name text NOT NULL,
  screen_name text,
  description text,
  app_type text DEFAULT 'application',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.step_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read step_applications" ON public.step_applications FOR SELECT TO authenticated
  USING (can_access_process(auth.uid(), process_id));
CREATE POLICY "Insert step_applications" ON public.step_applications FOR INSERT TO authenticated
  WITH CHECK (can_access_process(auth.uid(), process_id));
CREATE POLICY "Update step_applications" ON public.step_applications FOR UPDATE TO authenticated
  USING (can_access_process(auth.uid(), process_id));
CREATE POLICY "Delete step_applications" ON public.step_applications FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin') OR can_access_process(auth.uid(), process_id));

-- 2. Entity comments & conclusions (polymorphic)
CREATE TABLE public.entity_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,  -- 'step', 'risk', 'control', 'regulation', 'incident', 'application'
  entity_id uuid NOT NULL,
  process_id uuid NOT NULL REFERENCES public.business_processes(id) ON DELETE CASCADE,
  comment text,
  conclusion text,
  author_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.entity_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read entity_comments" ON public.entity_comments FOR SELECT TO authenticated
  USING (can_access_process(auth.uid(), process_id));
CREATE POLICY "Insert entity_comments" ON public.entity_comments FOR INSERT TO authenticated
  WITH CHECK (can_access_process(auth.uid(), process_id));
CREATE POLICY "Update entity_comments" ON public.entity_comments FOR UPDATE TO authenticated
  USING (can_access_process(auth.uid(), process_id));
CREATE POLICY "Delete entity_comments" ON public.entity_comments FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin') OR can_access_process(auth.uid(), process_id));

-- 3. Entity attachments (file uploads)
CREATE TABLE public.entity_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  process_id uuid NOT NULL REFERENCES public.business_processes(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_type text,
  file_size bigint,
  uploaded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.entity_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read entity_attachments" ON public.entity_attachments FOR SELECT TO authenticated
  USING (can_access_process(auth.uid(), process_id));
CREATE POLICY "Insert entity_attachments" ON public.entity_attachments FOR INSERT TO authenticated
  WITH CHECK (can_access_process(auth.uid(), process_id));
CREATE POLICY "Delete entity_attachments" ON public.entity_attachments FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin') OR can_access_process(auth.uid(), process_id));

-- 4. Storage bucket for entity attachments
INSERT INTO storage.buckets (id, name, public) VALUES ('entity-attachments', 'entity-attachments', true);

-- 5. Add interface_subtype to process_steps for business process input/output
ALTER TABLE public.process_steps ADD COLUMN interface_subtype text DEFAULT NULL;
