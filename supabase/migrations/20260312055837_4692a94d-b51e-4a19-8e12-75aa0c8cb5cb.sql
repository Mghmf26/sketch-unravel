-- Allow all authenticated users to update questionnaire_questions (for step_types and importance_level)
CREATE POLICY "Authenticated can update questions"
ON public.questionnaire_questions
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);