import { supabase } from '@/integrations/supabase/client';

export interface StepApplication {
  id: string;
  step_id: string;
  process_id: string;
  name: string;
  screen_name: string | null;
  description: string | null;
  app_type: string;
  parent_id: string | null;
  application_owner: string | null;
  business_analyst_business: string | null;
  business_analyst_it: string | null;
  platform: string | null;
  created_at: string;
}

export async function fetchStepApplications(processId?: string) {
  let q = supabase.from('step_applications').select('*').order('created_at');
  if (processId) q = q.eq('process_id', processId);
  const { data } = await q;
  return (data || []) as StepApplication[];
}

export async function insertStepApplication(a: Partial<StepApplication>) {
  const { data, error } = await supabase.from('step_applications').insert(a as any).select().single();
  if (error) throw error;
  return data as StepApplication;
}

export async function updateStepApplication(id: string, a: Partial<StepApplication>) {
  const { error } = await supabase.from('step_applications').update(a).eq('id', id);
  if (error) throw error;
}

export async function deleteStepApplication(id: string) {
  const { error } = await supabase.from('step_applications').delete().eq('id', id);
  if (error) throw error;
}
