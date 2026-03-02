
-- Helper function: check if user can access a client
CREATE OR REPLACE FUNCTION public.can_access_client(_user_id uuid, _client_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    -- Admins can access everything
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'admin')
    OR
    -- Users assigned to this client
    EXISTS (SELECT 1 FROM public.client_assignments WHERE user_id = _user_id AND client_id = _client_id)
$$;

-- Helper: check if user can access a process (via its client_id)
CREATE OR REPLACE FUNCTION public.can_access_process(_user_id uuid, _process_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'admin')
    OR
    EXISTS (
      SELECT 1 FROM public.business_processes bp
      JOIN public.client_assignments ca ON ca.client_id = bp.client_id
      WHERE bp.id = _process_id AND ca.user_id = _user_id
    )
    OR
    -- Processes with no client are visible to all authenticated users
    EXISTS (SELECT 1 FROM public.business_processes WHERE id = _process_id AND client_id IS NULL)
$$;

-- ============ UPDATE RLS POLICIES ============

-- BUSINESS_PROCESSES: restrict by client assignment
DROP POLICY IF EXISTS "Allow public read" ON public.business_processes;
DROP POLICY IF EXISTS "Allow public insert" ON public.business_processes;
DROP POLICY IF EXISTS "Allow public update" ON public.business_processes;
DROP POLICY IF EXISTS "Allow public delete" ON public.business_processes;

CREATE POLICY "Read own client processes" ON public.business_processes
  FOR SELECT USING (
    public.can_access_client(auth.uid(), client_id) OR client_id IS NULL
  );

CREATE POLICY "Insert processes" ON public.business_processes
  FOR INSERT WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR public.can_access_client(auth.uid(), client_id)
  );

CREATE POLICY "Update own client processes" ON public.business_processes
  FOR UPDATE USING (
    public.has_role(auth.uid(), 'admin')
    OR public.can_access_client(auth.uid(), client_id)
  );

CREATE POLICY "Delete own client processes" ON public.business_processes
  FOR DELETE USING (
    public.has_role(auth.uid(), 'admin')
  );

-- PROCESS_STEPS
DROP POLICY IF EXISTS "Allow public read" ON public.process_steps;
DROP POLICY IF EXISTS "Allow public insert" ON public.process_steps;
DROP POLICY IF EXISTS "Allow public update" ON public.process_steps;
DROP POLICY IF EXISTS "Allow public delete" ON public.process_steps;

CREATE POLICY "Read steps" ON public.process_steps
  FOR SELECT USING (public.can_access_process(auth.uid(), process_id));
CREATE POLICY "Insert steps" ON public.process_steps
  FOR INSERT WITH CHECK (public.can_access_process(auth.uid(), process_id));
CREATE POLICY "Update steps" ON public.process_steps
  FOR UPDATE USING (public.can_access_process(auth.uid(), process_id));
CREATE POLICY "Delete steps" ON public.process_steps
  FOR DELETE USING (public.has_role(auth.uid(), 'admin') OR public.can_access_process(auth.uid(), process_id));

-- RISKS
DROP POLICY IF EXISTS "Allow public read" ON public.risks;
DROP POLICY IF EXISTS "Allow public insert" ON public.risks;
DROP POLICY IF EXISTS "Allow public update" ON public.risks;
DROP POLICY IF EXISTS "Allow public delete" ON public.risks;

CREATE POLICY "Read risks" ON public.risks
  FOR SELECT USING (public.can_access_process(auth.uid(), process_id));
CREATE POLICY "Insert risks" ON public.risks
  FOR INSERT WITH CHECK (public.can_access_process(auth.uid(), process_id));
CREATE POLICY "Update risks" ON public.risks
  FOR UPDATE USING (public.can_access_process(auth.uid(), process_id));
CREATE POLICY "Delete risks" ON public.risks
  FOR DELETE USING (public.has_role(auth.uid(), 'admin') OR public.can_access_process(auth.uid(), process_id));

-- CONTROLS
DROP POLICY IF EXISTS "Allow public read" ON public.controls;
DROP POLICY IF EXISTS "Allow public insert" ON public.controls;
DROP POLICY IF EXISTS "Allow public update" ON public.controls;
DROP POLICY IF EXISTS "Allow public delete" ON public.controls;

CREATE POLICY "Read controls" ON public.controls
  FOR SELECT USING (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.risks r WHERE r.id = risk_id AND public.can_access_process(auth.uid(), r.process_id)
    )
  );
CREATE POLICY "Insert controls" ON public.controls
  FOR INSERT WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.risks r WHERE r.id = risk_id AND public.can_access_process(auth.uid(), r.process_id)
    )
  );
CREATE POLICY "Update controls" ON public.controls
  FOR UPDATE USING (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.risks r WHERE r.id = risk_id AND public.can_access_process(auth.uid(), r.process_id)
    )
  );
CREATE POLICY "Delete controls" ON public.controls
  FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- REGULATIONS
DROP POLICY IF EXISTS "Allow public read" ON public.regulations;
DROP POLICY IF EXISTS "Allow public insert" ON public.regulations;
DROP POLICY IF EXISTS "Allow public update" ON public.regulations;
DROP POLICY IF EXISTS "Allow public delete" ON public.regulations;

CREATE POLICY "Read regulations" ON public.regulations
  FOR SELECT USING (public.can_access_process(auth.uid(), process_id));
CREATE POLICY "Insert regulations" ON public.regulations
  FOR INSERT WITH CHECK (public.can_access_process(auth.uid(), process_id));
CREATE POLICY "Update regulations" ON public.regulations
  FOR UPDATE USING (public.can_access_process(auth.uid(), process_id));
CREATE POLICY "Delete regulations" ON public.regulations
  FOR DELETE USING (public.has_role(auth.uid(), 'admin') OR public.can_access_process(auth.uid(), process_id));

-- INCIDENTS
DROP POLICY IF EXISTS "Allow public read" ON public.incidents;
DROP POLICY IF EXISTS "Allow public insert" ON public.incidents;
DROP POLICY IF EXISTS "Allow public update" ON public.incidents;
DROP POLICY IF EXISTS "Allow public delete" ON public.incidents;

CREATE POLICY "Read incidents" ON public.incidents
  FOR SELECT USING (public.can_access_process(auth.uid(), process_id));
CREATE POLICY "Insert incidents" ON public.incidents
  FOR INSERT WITH CHECK (public.can_access_process(auth.uid(), process_id));
CREATE POLICY "Update incidents" ON public.incidents
  FOR UPDATE USING (public.can_access_process(auth.uid(), process_id));
CREATE POLICY "Delete incidents" ON public.incidents
  FOR DELETE USING (public.has_role(auth.uid(), 'admin') OR public.can_access_process(auth.uid(), process_id));

-- STEP_CONNECTIONS
DROP POLICY IF EXISTS "Allow public read" ON public.step_connections;
DROP POLICY IF EXISTS "Allow public insert" ON public.step_connections;
DROP POLICY IF EXISTS "Allow public update" ON public.step_connections;
DROP POLICY IF EXISTS "Allow public delete" ON public.step_connections;

CREATE POLICY "Read connections" ON public.step_connections
  FOR SELECT USING (public.can_access_process(auth.uid(), process_id));
CREATE POLICY "Insert connections" ON public.step_connections
  FOR INSERT WITH CHECK (public.can_access_process(auth.uid(), process_id));
CREATE POLICY "Update connections" ON public.step_connections
  FOR UPDATE USING (public.can_access_process(auth.uid(), process_id));
CREATE POLICY "Delete connections" ON public.step_connections
  FOR DELETE USING (public.can_access_process(auth.uid(), process_id));

-- STEP_RACI
DROP POLICY IF EXISTS "Allow public read" ON public.step_raci;
DROP POLICY IF EXISTS "Allow public insert" ON public.step_raci;
DROP POLICY IF EXISTS "Allow public update" ON public.step_raci;
DROP POLICY IF EXISTS "Allow public delete" ON public.step_raci;

CREATE POLICY "Read raci" ON public.step_raci
  FOR SELECT USING (public.can_access_process(auth.uid(), process_id));
CREATE POLICY "Insert raci" ON public.step_raci
  FOR INSERT WITH CHECK (public.can_access_process(auth.uid(), process_id));
CREATE POLICY "Update raci" ON public.step_raci
  FOR UPDATE USING (public.can_access_process(auth.uid(), process_id));
CREATE POLICY "Delete raci" ON public.step_raci
  FOR DELETE USING (public.can_access_process(auth.uid(), process_id));

-- MAINFRAME_IMPORTS
DROP POLICY IF EXISTS "Allow public read" ON public.mainframe_imports;
DROP POLICY IF EXISTS "Allow public insert" ON public.mainframe_imports;
DROP POLICY IF EXISTS "Allow public update" ON public.mainframe_imports;
DROP POLICY IF EXISTS "Allow public delete" ON public.mainframe_imports;

CREATE POLICY "Read imports" ON public.mainframe_imports
  FOR SELECT USING (public.can_access_process(auth.uid(), process_id));
CREATE POLICY "Insert imports" ON public.mainframe_imports
  FOR INSERT WITH CHECK (public.can_access_process(auth.uid(), process_id));
CREATE POLICY "Update imports" ON public.mainframe_imports
  FOR UPDATE USING (public.can_access_process(auth.uid(), process_id));
CREATE POLICY "Delete imports" ON public.mainframe_imports
  FOR DELETE USING (public.has_role(auth.uid(), 'admin') OR public.can_access_process(auth.uid(), process_id));

-- MF_QUESTIONS
DROP POLICY IF EXISTS "Allow public read" ON public.mf_questions;
DROP POLICY IF EXISTS "Allow public insert" ON public.mf_questions;
DROP POLICY IF EXISTS "Allow public update" ON public.mf_questions;
DROP POLICY IF EXISTS "Allow public delete" ON public.mf_questions;

CREATE POLICY "Read questions" ON public.mf_questions
  FOR SELECT USING (public.can_access_process(auth.uid(), process_id));
CREATE POLICY "Insert questions" ON public.mf_questions
  FOR INSERT WITH CHECK (public.can_access_process(auth.uid(), process_id));
CREATE POLICY "Update questions" ON public.mf_questions
  FOR UPDATE USING (public.can_access_process(auth.uid(), process_id));
CREATE POLICY "Delete questions" ON public.mf_questions
  FOR DELETE USING (public.can_access_process(auth.uid(), process_id));

-- CLIENTS: users can only see clients they're assigned to
DROP POLICY IF EXISTS "Allow public read access to clients" ON public.clients;
DROP POLICY IF EXISTS "Allow public insert access to clients" ON public.clients;
DROP POLICY IF EXISTS "Allow public update access to clients" ON public.clients;
DROP POLICY IF EXISTS "Allow public delete access to clients" ON public.clients;

CREATE POLICY "Read assigned clients" ON public.clients
  FOR SELECT USING (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (SELECT 1 FROM public.client_assignments ca WHERE ca.client_id = id AND ca.user_id = auth.uid())
  );
CREATE POLICY "Insert clients" ON public.clients
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Update clients" ON public.clients
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Delete clients" ON public.clients
  FOR DELETE USING (public.has_role(auth.uid(), 'admin'));
