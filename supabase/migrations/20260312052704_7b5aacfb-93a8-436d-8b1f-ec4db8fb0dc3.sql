
-- Questionnaire questions managed by admins/root
CREATE TABLE public.questionnaire_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_number integer NOT NULL,
  section_name text NOT NULL,
  question_number integer NOT NULL,
  question_text text NOT NULL,
  observation_text text,
  step_types text[] NOT NULL DEFAULT '{}'::text[],
  importance_level integer NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,
  position_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Link questions to specific steps within a process
CREATE TABLE public.questionnaire_step_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  process_id uuid NOT NULL REFERENCES public.business_processes(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.questionnaire_questions(id) ON DELETE CASCADE,
  step_id uuid NOT NULL REFERENCES public.process_steps(id) ON DELETE CASCADE,
  is_relevant boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(process_id, question_id, step_id)
);

-- RLS for questionnaire_questions (readable by all authenticated, manageable by admin/root)
ALTER TABLE public.questionnaire_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read questions" ON public.questionnaire_questions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage questions" ON public.questionnaire_questions
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- RLS for questionnaire_step_links
ALTER TABLE public.questionnaire_step_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read questionnaire_step_links" ON public.questionnaire_step_links
  FOR SELECT TO authenticated USING (can_access_process(auth.uid(), process_id));

CREATE POLICY "Insert questionnaire_step_links" ON public.questionnaire_step_links
  FOR INSERT TO authenticated WITH CHECK (can_access_process(auth.uid(), process_id));

CREATE POLICY "Update questionnaire_step_links" ON public.questionnaire_step_links
  FOR UPDATE TO authenticated USING (can_access_process(auth.uid(), process_id));

CREATE POLICY "Delete questionnaire_step_links" ON public.questionnaire_step_links
  FOR DELETE TO authenticated USING (can_access_process(auth.uid(), process_id));
