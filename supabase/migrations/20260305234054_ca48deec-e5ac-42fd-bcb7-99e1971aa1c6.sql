-- Add flow_id and flow_node_id columns to mainframe_imports
ALTER TABLE public.mainframe_imports
  ADD COLUMN IF NOT EXISTS flow_id uuid REFERENCES public.mainframe_flows(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS flow_node_id uuid REFERENCES public.mainframe_flow_nodes(id) ON DELETE SET NULL;