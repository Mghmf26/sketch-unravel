import { supabase } from '@/integrations/supabase/client';

export interface ProcessRaci {
  id: string;
  process_id: string;
  role_name: string;
  responsible: string | null;
  accountable: string | null;
  consulted: string | null;
  informed: string | null;
  job_title: string | null;
  job_description: string | null;
  function_dept: string | null;
  sub_function: string | null;
  seniority: string | null;
  tenure: string | null;
  grade: string | null;
  fte: number | null;
  salary: number | null;
  manager_status: string | null;
  span_of_control: number | null;
  created_at: string;
}

export interface ProcessRaciStepLink {
  id: string;
  raci_id: string;
  step_id: string;
  created_at: string;
}

export async function fetchProcessRaci(processId: string) {
  const { data } = await supabase.from('process_raci').select('*').eq('process_id', processId).order('created_at');
  return (data || []) as ProcessRaci[];
}

export async function insertProcessRaci(r: Partial<ProcessRaci>) {
  const { data, error } = await supabase.from('process_raci').insert(r as any).select().single();
  if (error) throw error;
  return data as ProcessRaci;
}

export async function updateProcessRaci(id: string, r: Partial<ProcessRaci>) {
  const { error } = await supabase.from('process_raci').update(r as any).eq('id', id);
  if (error) throw error;
}

export async function deleteProcessRaci(id: string) {
  const { error } = await supabase.from('process_raci').delete().eq('id', id);
  if (error) throw error;
}

export async function fetchRaciStepLinks(processId: string) {
  const { data } = await supabase
    .from('process_raci_step_links')
    .select('*, process_raci!inner(process_id)')
    .eq('process_raci.process_id', processId);
  return (data || []).map((d: any) => ({ id: d.id, raci_id: d.raci_id, step_id: d.step_id, created_at: d.created_at })) as ProcessRaciStepLink[];
}

export async function insertRaciStepLink(raciId: string, stepId: string) {
  const { data, error } = await supabase.from('process_raci_step_links').insert({ raci_id: raciId, step_id: stepId } as any).select().single();
  if (error) throw error;
  return data as ProcessRaciStepLink;
}

export async function deleteRaciStepLink(id: string) {
  const { error } = await supabase.from('process_raci_step_links').delete().eq('id', id);
  if (error) throw error;
}
