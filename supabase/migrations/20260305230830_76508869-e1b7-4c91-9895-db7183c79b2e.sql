
-- Mainframe Flows: one per step
CREATE TABLE public.mainframe_flows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  process_id uuid NOT NULL REFERENCES public.business_processes(id) ON DELETE CASCADE,
  step_id uuid NOT NULL REFERENCES public.process_steps(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Mainframe Flow',
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.mainframe_flows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read mainframe_flows" ON public.mainframe_flows FOR SELECT TO authenticated
  USING (can_access_process(auth.uid(), process_id));
CREATE POLICY "Insert mainframe_flows" ON public.mainframe_flows FOR INSERT TO authenticated
  WITH CHECK (can_access_process(auth.uid(), process_id));
CREATE POLICY "Update mainframe_flows" ON public.mainframe_flows FOR UPDATE TO authenticated
  USING (can_access_process(auth.uid(), process_id));
CREATE POLICY "Delete mainframe_flows" ON public.mainframe_flows FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR can_access_process(auth.uid(), process_id));

-- Mainframe Flow Nodes
CREATE TABLE public.mainframe_flow_nodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_id uuid NOT NULL REFERENCES public.mainframe_flows(id) ON DELETE CASCADE,
  label text NOT NULL,
  node_type text NOT NULL DEFAULT 'program',
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.mainframe_flow_nodes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read mf_flow_nodes" ON public.mainframe_flow_nodes FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM mainframe_flows mf WHERE mf.id = flow_id AND can_access_process(auth.uid(), mf.process_id)));
CREATE POLICY "Insert mf_flow_nodes" ON public.mainframe_flow_nodes FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM mainframe_flows mf WHERE mf.id = flow_id AND can_access_process(auth.uid(), mf.process_id)));
CREATE POLICY "Update mf_flow_nodes" ON public.mainframe_flow_nodes FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM mainframe_flows mf WHERE mf.id = flow_id AND can_access_process(auth.uid(), mf.process_id)));
CREATE POLICY "Delete mf_flow_nodes" ON public.mainframe_flow_nodes FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM mainframe_flows mf WHERE mf.id = flow_id AND can_access_process(auth.uid(), mf.process_id)));

-- Mainframe Flow Connections
CREATE TABLE public.mainframe_flow_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_id uuid NOT NULL REFERENCES public.mainframe_flows(id) ON DELETE CASCADE,
  source_node_id uuid NOT NULL REFERENCES public.mainframe_flow_nodes(id) ON DELETE CASCADE,
  target_node_id uuid NOT NULL REFERENCES public.mainframe_flow_nodes(id) ON DELETE CASCADE,
  label text,
  connection_type text DEFAULT 'call'
);

ALTER TABLE public.mainframe_flow_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read mf_flow_conns" ON public.mainframe_flow_connections FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM mainframe_flows mf WHERE mf.id = flow_id AND can_access_process(auth.uid(), mf.process_id)));
CREATE POLICY "Insert mf_flow_conns" ON public.mainframe_flow_connections FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM mainframe_flows mf WHERE mf.id = flow_id AND can_access_process(auth.uid(), mf.process_id)));
CREATE POLICY "Update mf_flow_conns" ON public.mainframe_flow_connections FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM mainframe_flows mf WHERE mf.id = flow_id AND can_access_process(auth.uid(), mf.process_id)));
CREATE POLICY "Delete mf_flow_conns" ON public.mainframe_flow_connections FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM mainframe_flows mf WHERE mf.id = flow_id AND can_access_process(auth.uid(), mf.process_id)));
