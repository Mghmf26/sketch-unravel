
-- 1. Create process_raci table (process-level RACI)
CREATE TABLE public.process_raci (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  process_id uuid NOT NULL REFERENCES public.business_processes(id) ON DELETE CASCADE,
  role_name text NOT NULL,
  responsible text,
  accountable text,
  consulted text,
  informed text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Create process_raci_step_links (link RACI roles to specific steps)
CREATE TABLE public.process_raci_step_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  raci_id uuid NOT NULL REFERENCES public.process_raci(id) ON DELETE CASCADE,
  step_id uuid NOT NULL REFERENCES public.process_steps(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(raci_id, step_id)
);

-- 3. Add is_confidential to entity_attachments
ALTER TABLE public.entity_attachments ADD COLUMN is_confidential boolean NOT NULL DEFAULT false;

-- 4. RLS for process_raci
ALTER TABLE public.process_raci ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read process_raci" ON public.process_raci
  FOR SELECT TO authenticated
  USING (can_access_process(auth.uid(), process_id));

CREATE POLICY "Insert process_raci" ON public.process_raci
  FOR INSERT TO authenticated
  WITH CHECK (can_access_process(auth.uid(), process_id));

CREATE POLICY "Update process_raci" ON public.process_raci
  FOR UPDATE TO authenticated
  USING (can_access_process(auth.uid(), process_id));

CREATE POLICY "Delete process_raci" ON public.process_raci
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR can_access_process(auth.uid(), process_id));

-- 5. RLS for process_raci_step_links
ALTER TABLE public.process_raci_step_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read process_raci_step_links" ON public.process_raci_step_links
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.process_raci pr WHERE pr.id = raci_id AND can_access_process(auth.uid(), pr.process_id)));

CREATE POLICY "Insert process_raci_step_links" ON public.process_raci_step_links
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.process_raci pr WHERE pr.id = raci_id AND can_access_process(auth.uid(), pr.process_id)));

CREATE POLICY "Delete process_raci_step_links" ON public.process_raci_step_links
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.process_raci pr WHERE pr.id = raci_id AND (has_role(auth.uid(), 'admin'::app_role) OR can_access_process(auth.uid(), pr.process_id))));

-- 6. Migrate existing step_raci data to process_raci
INSERT INTO public.process_raci (id, process_id, role_name, responsible, accountable, consulted, informed, created_at)
SELECT id, process_id, role_name, responsible, accountable, consulted, informed, created_at
FROM public.step_raci;

-- 7. Create step links from old data
INSERT INTO public.process_raci_step_links (raci_id, step_id)
SELECT id, step_id FROM public.step_raci;
