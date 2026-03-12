import { supabase } from '@/integrations/supabase/client';

export interface QuestionnaireQuestion {
  id: string;
  section_number: number;
  section_name: string;
  question_number: number;
  question_text: string;
  observation_text: string | null;
  step_types: string[];
  importance_level: number;
  is_active: boolean;
  position_index: number;
  created_at: string;
  updated_at: string;
}

export interface QuestionnaireStepLink {
  id: string;
  process_id: string;
  question_id: string;
  step_id: string;
  is_relevant: boolean;
  created_at: string;
}

export async function fetchQuestions() {
  const { data } = await supabase
    .from('questionnaire_questions')
    .select('*')
    .order('position_index');
  return (data || []) as QuestionnaireQuestion[];
}

export async function fetchActiveQuestions() {
  const { data } = await supabase
    .from('questionnaire_questions')
    .select('*')
    .eq('is_active', true)
    .order('position_index');
  return (data || []) as QuestionnaireQuestion[];
}

export async function insertQuestion(q: Partial<QuestionnaireQuestion>) {
  const { data, error } = await supabase
    .from('questionnaire_questions')
    .insert(q as any)
    .select()
    .single();
  if (error) throw error;
  return data as QuestionnaireQuestion;
}

export async function updateQuestion(id: string, q: Partial<QuestionnaireQuestion>) {
  const { error } = await supabase
    .from('questionnaire_questions')
    .update(q as any)
    .eq('id', id);
  if (error) throw error;
}

export async function deleteQuestion(id: string) {
  const { error } = await supabase
    .from('questionnaire_questions')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

export async function fetchStepLinks(processId: string) {
  const { data } = await supabase
    .from('questionnaire_step_links')
    .select('*')
    .eq('process_id', processId);
  return (data || []) as QuestionnaireStepLink[];
}

export async function upsertStepLink(link: { process_id: string; question_id: string; step_id: string; is_relevant: boolean }) {
  // Try update first, then insert
  const { data: existing } = await supabase
    .from('questionnaire_step_links')
    .select('id')
    .eq('process_id', link.process_id)
    .eq('question_id', link.question_id)
    .eq('step_id', link.step_id)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from('questionnaire_step_links')
      .update({ is_relevant: link.is_relevant } as any)
      .eq('id', existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('questionnaire_step_links')
      .insert(link as any);
    if (error) throw error;
  }
}
