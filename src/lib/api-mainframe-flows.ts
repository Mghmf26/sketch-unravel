import { supabase } from '@/integrations/supabase/client';

export interface MainframeFlow {
  id: string;
  process_id: string;
  step_id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface MFFlowNode {
  id: string;
  flow_id: string;
  label: string;
  node_type: string;
  description: string | null;
  created_at: string;
}

export interface MFFlowConnection {
  id: string;
  flow_id: string;
  source_node_id: string;
  target_node_id: string;
  label: string | null;
  connection_type: string;
}

// MF Node types for the palette
export type MFNodeType =
  | 'mainframe' | 'operating-system' | 'subsystem' | 'program'
  | 'batch-job' | 'transaction' | 'database' | 'dataset'
  | 'message-queue' | 'middleware' | 'api' | 'external-system'
  | 'security' | 'monitoring';

export const MF_NODE_TYPE_META: Record<MFNodeType, { label: string; color: string; badgeBg: string }> = {
  'mainframe':       { label: 'Mainframe / LPAR',    color: '#1e40af', badgeBg: '#dbeafe' },
  'operating-system':{ label: 'Operating System',     color: '#0f766e', badgeBg: '#ccfbf1' },
  'subsystem':       { label: 'Subsystem (CICS/IMS)', color: '#7c3aed', badgeBg: '#ede9fe' },
  'program':         { label: 'Program / Module',     color: '#059669', badgeBg: '#d1fae5' },
  'batch-job':       { label: 'Batch Job',            color: '#d97706', badgeBg: '#fef3c7' },
  'transaction':     { label: 'Transaction',          color: '#dc2626', badgeBg: '#fee2e2' },
  'database':        { label: 'Database',             color: '#2563eb', badgeBg: '#dbeafe' },
  'dataset':         { label: 'Dataset / File',       color: '#ca8a04', badgeBg: '#fef9c3' },
  'message-queue':   { label: 'Message Queue / MQ',   color: '#9333ea', badgeBg: '#f3e8ff' },
  'middleware':      { label: 'Middleware',            color: '#0891b2', badgeBg: '#cffafe' },
  'api':             { label: 'API / Interface',      color: '#e11d48', badgeBg: '#ffe4e6' },
  'external-system': { label: 'External System',      color: '#64748b', badgeBg: '#f1f5f9' },
  'security':        { label: 'Security / RACF',      color: '#b91c1c', badgeBg: '#fee2e2' },
  'monitoring':      { label: 'Monitoring / Logging',  color: '#4338ca', badgeBg: '#e0e7ff' },
};

export const MF_CONNECTION_TYPES = [
  { value: 'call', label: 'Call / Execute' },
  { value: 'read-write', label: 'Read / Write' },
  { value: 'publish-consume', label: 'Publish / Consume' },
  { value: 'request-response', label: 'Request / Response' },
];

// ----- CRUD -----

export async function fetchMainframeFlows(processId?: string): Promise<MainframeFlow[]> {
  let q = supabase.from('mainframe_flows').select('*').order('created_at');
  if (processId) q = q.eq('process_id', processId);
  const { data, error } = await q;
  if (error) throw error;
  return (data || []) as MainframeFlow[];
}

export async function fetchMFFlowNodes(flowId: string): Promise<MFFlowNode[]> {
  const { data, error } = await supabase.from('mainframe_flow_nodes').select('*').eq('flow_id', flowId);
  if (error) throw error;
  return (data || []) as MFFlowNode[];
}

export async function fetchMFFlowConnections(flowId: string): Promise<MFFlowConnection[]> {
  const { data, error } = await supabase.from('mainframe_flow_connections').select('*').eq('flow_id', flowId);
  if (error) throw error;
  return (data || []) as MFFlowConnection[];
}

export async function upsertMainframeFlow(flow: Partial<MainframeFlow> & { process_id: string; step_id: string }): Promise<MainframeFlow> {
  if (flow.id) {
    const { data, error } = await supabase.from('mainframe_flows').update({
      name: flow.name, description: flow.description, updated_at: new Date().toISOString(),
    } as any).eq('id', flow.id).select().single();
    if (error) throw error;
    return data as MainframeFlow;
  }
  const { data, error } = await supabase.from('mainframe_flows').insert({
    process_id: flow.process_id, step_id: flow.step_id,
    name: flow.name || 'Mainframe Flow', description: flow.description || null,
  } as any).select().single();
  if (error) throw error;
  return data as MainframeFlow;
}

export async function deleteMainframeFlow(id: string) {
  const { error } = await supabase.from('mainframe_flows').delete().eq('id', id);
  if (error) throw error;
}

export async function saveMFFlowDiagram(flowId: string, nodes: { id: string; label: string; node_type: string; description?: string }[], connections: { id: string; source: string; target: string; label?: string; connectionType?: string }[]) {
  // Delete existing nodes (cascade deletes connections)
  await supabase.from('mainframe_flow_nodes').delete().eq('flow_id', flowId);

  if (nodes.length === 0) return;

  // Insert nodes
  const nodeInserts = nodes.map(n => ({
    id: n.id, flow_id: flowId, label: n.label, node_type: n.node_type, description: n.description || null,
  }));
  const { error: nErr } = await supabase.from('mainframe_flow_nodes').insert(nodeInserts as any);
  if (nErr) throw nErr;

  // Insert connections
  if (connections.length > 0) {
    const connInserts = connections.map(c => ({
      id: c.id, flow_id: flowId, source_node_id: c.source, target_node_id: c.target,
      label: c.label || null, connection_type: c.connectionType || 'call',
    }));
    const { error: cErr } = await supabase.from('mainframe_flow_connections').insert(connInserts as any);
    if (cErr) throw cErr;
  }
}
