
-- Business processes table (replaces localStorage)
CREATE TABLE public.business_processes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  process_name TEXT NOT NULL,
  owner TEXT,
  department TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Process steps/nodes
CREATE TABLE public.process_steps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  process_id UUID NOT NULL REFERENCES public.business_processes(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'in-scope',
  description TEXT,
  position_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Step connections/edges
CREATE TABLE public.step_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  process_id UUID NOT NULL REFERENCES public.business_processes(id) ON DELETE CASCADE,
  source_step_id UUID NOT NULL REFERENCES public.process_steps(id) ON DELETE CASCADE,
  target_step_id UUID NOT NULL REFERENCES public.process_steps(id) ON DELETE CASCADE,
  label TEXT
);

-- Risks linked to steps
CREATE TABLE public.risks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  step_id UUID NOT NULL REFERENCES public.process_steps(id) ON DELETE CASCADE,
  process_id UUID NOT NULL REFERENCES public.business_processes(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  likelihood TEXT NOT NULL DEFAULT 'medium',
  impact TEXT NOT NULL DEFAULT 'medium',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Controls linked to risks
CREATE TABLE public.controls (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  risk_id UUID NOT NULL REFERENCES public.risks(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT DEFAULT 'preventive',
  effectiveness TEXT DEFAULT 'effective',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Regulations linked to steps
CREATE TABLE public.regulations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  step_id UUID NOT NULL REFERENCES public.process_steps(id) ON DELETE CASCADE,
  process_id UUID NOT NULL REFERENCES public.business_processes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  authority TEXT,
  compliance_status TEXT DEFAULT 'partial',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Incidents linked to steps
CREATE TABLE public.incidents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  step_id UUID NOT NULL REFERENCES public.process_steps(id) ON DELETE CASCADE,
  process_id UUID NOT NULL REFERENCES public.business_processes(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  severity TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'open',
  date TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Mainframe imports linked to steps
CREATE TABLE public.mainframe_imports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  step_id UUID REFERENCES public.process_steps(id) ON DELETE SET NULL,
  process_id UUID NOT NULL REFERENCES public.business_processes(id) ON DELETE CASCADE,
  source_name TEXT NOT NULL,
  source_type TEXT NOT NULL DEFAULT 'DB2',
  dataset_name TEXT,
  description TEXT,
  record_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active',
  last_sync TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- MF AI Questions linked to processes
CREATE TABLE public.mf_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  process_id UUID NOT NULL REFERENCES public.business_processes(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer TEXT,
  confidence NUMERIC DEFAULT 0,
  category TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.business_processes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.process_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.step_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.controls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.regulations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mainframe_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mf_questions ENABLE ROW LEVEL SECURITY;

-- Public access policies (matching clients table pattern)
CREATE POLICY "Allow public read" ON public.business_processes FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON public.business_processes FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON public.business_processes FOR UPDATE USING (true);
CREATE POLICY "Allow public delete" ON public.business_processes FOR DELETE USING (true);

CREATE POLICY "Allow public read" ON public.process_steps FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON public.process_steps FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON public.process_steps FOR UPDATE USING (true);
CREATE POLICY "Allow public delete" ON public.process_steps FOR DELETE USING (true);

CREATE POLICY "Allow public read" ON public.step_connections FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON public.step_connections FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON public.step_connections FOR UPDATE USING (true);
CREATE POLICY "Allow public delete" ON public.step_connections FOR DELETE USING (true);

CREATE POLICY "Allow public read" ON public.risks FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON public.risks FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON public.risks FOR UPDATE USING (true);
CREATE POLICY "Allow public delete" ON public.risks FOR DELETE USING (true);

CREATE POLICY "Allow public read" ON public.controls FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON public.controls FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON public.controls FOR UPDATE USING (true);
CREATE POLICY "Allow public delete" ON public.controls FOR DELETE USING (true);

CREATE POLICY "Allow public read" ON public.regulations FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON public.regulations FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON public.regulations FOR UPDATE USING (true);
CREATE POLICY "Allow public delete" ON public.regulations FOR DELETE USING (true);

CREATE POLICY "Allow public read" ON public.incidents FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON public.incidents FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON public.incidents FOR UPDATE USING (true);
CREATE POLICY "Allow public delete" ON public.incidents FOR DELETE USING (true);

CREATE POLICY "Allow public read" ON public.mainframe_imports FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON public.mainframe_imports FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON public.mainframe_imports FOR UPDATE USING (true);
CREATE POLICY "Allow public delete" ON public.mainframe_imports FOR DELETE USING (true);

CREATE POLICY "Allow public read" ON public.mf_questions FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON public.mf_questions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON public.mf_questions FOR UPDATE USING (true);
CREATE POLICY "Allow public delete" ON public.mf_questions FOR DELETE USING (true);

-- Updated_at triggers
CREATE TRIGGER update_business_processes_updated_at
  BEFORE UPDATE ON public.business_processes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
