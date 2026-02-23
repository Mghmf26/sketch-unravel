import { supabase } from '@/integrations/supabase/client';

// ---- Types matching Supabase tables ----

export interface BusinessProcess {
  id: string;
  client_id: string | null;
  process_name: string;
  owner: string | null;
  department: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProcessStep {
  id: string;
  process_id: string;
  label: string;
  type: string;
  description: string | null;
  position_index: number;
  created_at: string;
}

export interface Risk {
  id: string;
  step_id: string;
  process_id: string;
  description: string;
  likelihood: string;
  impact: string;
  created_at: string;
}

export interface Control {
  id: string;
  risk_id: string;
  name: string;
  description: string | null;
  type: string;
  effectiveness: string;
  created_at: string;
}

export interface Regulation {
  id: string;
  step_id: string;
  process_id: string;
  name: string;
  description: string | null;
  authority: string | null;
  compliance_status: string;
  created_at: string;
}

export interface Incident {
  id: string;
  step_id: string;
  process_id: string;
  title: string;
  description: string | null;
  severity: string;
  status: string;
  date: string;
  created_at: string;
}

export interface MainframeImport {
  id: string;
  step_id: string | null;
  process_id: string;
  source_name: string;
  source_type: string;
  dataset_name: string | null;
  description: string | null;
  record_count: number;
  status: string;
  last_sync: string | null;
  created_at: string;
}

export interface MFQuestion {
  id: string;
  process_id: string;
  question: string;
  answer: string | null;
  confidence: number;
  category: string | null;
  created_at: string;
}

export interface Client {
  id: string;
  name: string;
  industry: string | null;
  status: string;
  contact_person: string | null;
  contact_email: string | null;
}

// ---- Fetch helpers ----

export async function fetchProcesses() {
  const { data } = await supabase.from('business_processes').select('*').order('created_at', { ascending: false });
  return (data || []) as BusinessProcess[];
}

export async function fetchSteps(processId?: string) {
  let q = supabase.from('process_steps').select('*').order('position_index');
  if (processId) q = q.eq('process_id', processId);
  const { data } = await q;
  return (data || []) as ProcessStep[];
}

export async function fetchRisks(processId?: string) {
  let q = supabase.from('risks').select('*').order('created_at');
  if (processId) q = q.eq('process_id', processId);
  const { data } = await q;
  return (data || []) as Risk[];
}

export async function fetchControls(riskId?: string) {
  let q = supabase.from('controls').select('*').order('created_at');
  if (riskId) q = q.eq('risk_id', riskId);
  const { data } = await q;
  return (data || []) as Control[];
}

export async function fetchAllControls() {
  const { data } = await supabase.from('controls').select('*').order('created_at');
  return (data || []) as Control[];
}

export async function fetchRegulations(processId?: string) {
  let q = supabase.from('regulations').select('*').order('created_at');
  if (processId) q = q.eq('process_id', processId);
  const { data } = await q;
  return (data || []) as Regulation[];
}

export async function fetchIncidents(processId?: string) {
  let q = supabase.from('incidents').select('*').order('created_at', { ascending: false });
  if (processId) q = q.eq('process_id', processId);
  const { data } = await q;
  return (data || []) as Incident[];
}

export async function fetchMainframeImports(processId?: string) {
  let q = supabase.from('mainframe_imports').select('*').order('created_at', { ascending: false });
  if (processId) q = q.eq('process_id', processId);
  const { data } = await q;
  return (data || []) as MainframeImport[];
}

export async function fetchMFQuestions(processId?: string) {
  let q = supabase.from('mf_questions').select('*').order('created_at');
  if (processId) q = q.eq('process_id', processId);
  const { data } = await q;
  return (data || []) as MFQuestion[];
}

export async function fetchClients() {
  const { data } = await supabase.from('clients').select('*').order('name');
  return (data || []) as Client[];
}

// ---- Insert helpers ----

export async function insertProcess(p: Partial<BusinessProcess>) {
  const { data, error } = await supabase.from('business_processes').insert(p as any).select().single();
  if (error) throw error;
  return data as BusinessProcess;
}

export async function updateProcess(id: string, p: Partial<BusinessProcess>) {
  const { error } = await supabase.from('business_processes').update(p).eq('id', id);
  if (error) throw error;
}

export async function deleteProcess(id: string) {
  const { error } = await supabase.from('business_processes').delete().eq('id', id);
  if (error) throw error;
}

export async function insertStep(s: Partial<ProcessStep>) {
  const { data, error } = await supabase.from('process_steps').insert(s as any).select().single();
  if (error) throw error;
  return data as ProcessStep;
}

export async function deleteStep(id: string) {
  const { error } = await supabase.from('process_steps').delete().eq('id', id);
  if (error) throw error;
}

export async function insertRisk(r: Partial<Risk>) {
  const { data, error } = await supabase.from('risks').insert(r as any).select().single();
  if (error) throw error;
  return data as Risk;
}

export async function deleteRisk(id: string) {
  const { error } = await supabase.from('risks').delete().eq('id', id);
  if (error) throw error;
}

export async function insertControl(c: Partial<Control>) {
  const { data, error } = await supabase.from('controls').insert(c as any).select().single();
  if (error) throw error;
  return data as Control;
}

export async function deleteControl(id: string) {
  const { error } = await supabase.from('controls').delete().eq('id', id);
  if (error) throw error;
}

export async function insertRegulation(r: Partial<Regulation>) {
  const { data, error } = await supabase.from('regulations').insert(r as any).select().single();
  if (error) throw error;
  return data as Regulation;
}

export async function deleteRegulation(id: string) {
  const { error } = await supabase.from('regulations').delete().eq('id', id);
  if (error) throw error;
}

export async function insertIncident(i: Partial<Incident>) {
  const { data, error } = await supabase.from('incidents').insert(i as any).select().single();
  if (error) throw error;
  return data as Incident;
}

export async function deleteIncident(id: string) {
  const { error } = await supabase.from('incidents').delete().eq('id', id);
  if (error) throw error;
}

export async function updateIncident(id: string, i: Partial<Incident>) {
  const { error } = await supabase.from('incidents').update(i).eq('id', id);
  if (error) throw error;
}

export async function insertMainframeImport(m: Partial<MainframeImport>) {
  const { data, error } = await supabase.from('mainframe_imports').insert(m as any).select().single();
  if (error) throw error;
  return data as MainframeImport;
}

export async function deleteMainframeImport(id: string) {
  const { error } = await supabase.from('mainframe_imports').delete().eq('id', id);
  if (error) throw error;
}

export async function insertMFQuestion(q: Partial<MFQuestion>) {
  const { data, error } = await supabase.from('mf_questions').insert(q as any).select().single();
  if (error) throw error;
  return data as MFQuestion;
}

export async function deleteMFQuestion(id: string) {
  const { error } = await supabase.from('mf_questions').delete().eq('id', id);
  if (error) throw error;
}

// ---- Step Connections ----

export interface StepConnection {
  id: string;
  process_id: string;
  source_step_id: string;
  target_step_id: string;
  label: string | null;
}

export async function fetchStepConnections(processId?: string) {
  let q = supabase.from('step_connections').select('*');
  if (processId) q = q.eq('process_id', processId);
  const { data } = await q;
  return (data || []) as StepConnection[];
}

export async function insertStepConnection(c: Partial<StepConnection>) {
  const { data, error } = await supabase.from('step_connections').insert(c as any).select().single();
  if (error) throw error;
  return data as StepConnection;
}

export async function deleteStepConnection(id: string) {
  const { error } = await supabase.from('step_connections').delete().eq('id', id);
  if (error) throw error;
}

export async function updateStep(id: string, s: Partial<ProcessStep>) {
  const { error } = await supabase.from('process_steps').update(s).eq('id', id);
  if (error) throw error;
}
