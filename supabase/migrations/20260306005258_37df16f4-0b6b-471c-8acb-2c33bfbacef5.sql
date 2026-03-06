
-- Tighten INSERT policy: only allow inserts where user_id matches the authenticated user
DROP POLICY "System can insert activity_log" ON public.activity_log;
CREATE POLICY "Trigger inserts activity_log"
  ON public.activity_log FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
