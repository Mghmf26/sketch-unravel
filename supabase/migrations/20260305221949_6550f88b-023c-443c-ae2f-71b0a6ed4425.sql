
-- Add step_type column to process_steps
ALTER TABLE public.process_steps ADD COLUMN step_type text DEFAULT NULL;

-- Create risk_matrices table
CREATE TABLE public.risk_matrices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  process_id uuid NOT NULL REFERENCES public.business_processes(id) ON DELETE CASCADE,
  matrix_type text NOT NULL DEFAULT 'user-defined',
  name text NOT NULL DEFAULT 'Risk Matrix',
  description text,
  impact_levels text[] NOT NULL DEFAULT ARRAY['VL','L','M','H','VH'],
  frequency_levels text[] NOT NULL DEFAULT ARRAY['VL','L','M','H','VH'],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(process_id)
);

-- Create risk_matrix_cells table
CREATE TABLE public.risk_matrix_cells (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  matrix_id uuid NOT NULL REFERENCES public.risk_matrices(id) ON DELETE CASCADE,
  impact_level text NOT NULL,
  frequency_level text NOT NULL,
  acceptable boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(matrix_id, impact_level, frequency_level)
);

-- Enable RLS
ALTER TABLE public.risk_matrices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_matrix_cells ENABLE ROW LEVEL SECURITY;

-- RLS for risk_matrices
CREATE POLICY "Read risk_matrices" ON public.risk_matrices FOR SELECT TO authenticated
  USING (can_access_process(auth.uid(), process_id));
CREATE POLICY "Insert risk_matrices" ON public.risk_matrices FOR INSERT TO authenticated
  WITH CHECK (can_access_process(auth.uid(), process_id));
CREATE POLICY "Update risk_matrices" ON public.risk_matrices FOR UPDATE TO authenticated
  USING (can_access_process(auth.uid(), process_id));
CREATE POLICY "Delete risk_matrices" ON public.risk_matrices FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR can_access_process(auth.uid(), process_id));

-- RLS for risk_matrix_cells (via matrix -> process)
CREATE POLICY "Read risk_matrix_cells" ON public.risk_matrix_cells FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.risk_matrices rm WHERE rm.id = matrix_id AND can_access_process(auth.uid(), rm.process_id)));
CREATE POLICY "Insert risk_matrix_cells" ON public.risk_matrix_cells FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.risk_matrices rm WHERE rm.id = matrix_id AND can_access_process(auth.uid(), rm.process_id)));
CREATE POLICY "Update risk_matrix_cells" ON public.risk_matrix_cells FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.risk_matrices rm WHERE rm.id = matrix_id AND can_access_process(auth.uid(), rm.process_id)));
CREATE POLICY "Delete risk_matrix_cells" ON public.risk_matrix_cells FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.risk_matrices rm WHERE rm.id = matrix_id AND can_access_process(auth.uid(), rm.process_id)));
