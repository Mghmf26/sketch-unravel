
-- Add engagement_mode to clients
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS engagement_mode text DEFAULT 'audit';

-- Add mf_ai_potential to business_processes
ALTER TABLE public.business_processes ADD COLUMN IF NOT EXISTS mf_ai_potential text DEFAULT 'medium';

-- Create step_raci table
CREATE TABLE IF NOT EXISTS public.step_raci (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  step_id uuid NOT NULL REFERENCES public.process_steps(id) ON DELETE CASCADE,
  process_id uuid NOT NULL REFERENCES public.business_processes(id) ON DELETE CASCADE,
  role_name text NOT NULL,
  responsible text,
  accountable text,
  consulted text,
  informed text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.step_raci ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read" ON public.step_raci FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON public.step_raci FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON public.step_raci FOR UPDATE USING (true);
CREATE POLICY "Allow public delete" ON public.step_raci FOR DELETE USING (true);

-- Add financial_impact and erm_notes to incidents
ALTER TABLE public.incidents ADD COLUMN IF NOT EXISTS financial_impact text;
ALTER TABLE public.incidents ADD COLUMN IF NOT EXISTS erm_category text;
ALTER TABLE public.incidents ADD COLUMN IF NOT EXISTS erm_notes text;
