
-- Activity log table
CREATE TABLE public.activity_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  user_email TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  entity_name TEXT,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for fast queries
CREATE INDEX idx_activity_log_created_at ON public.activity_log(created_at DESC);
CREATE INDEX idx_activity_log_entity_type ON public.activity_log(entity_type);
CREATE INDEX idx_activity_log_user_id ON public.activity_log(user_id);

-- Enable RLS
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read the log
CREATE POLICY "Authenticated users can read activity_log"
  ON public.activity_log FOR SELECT TO authenticated
  USING (true);

-- Only system (via triggers) can insert - use security definer function
CREATE POLICY "System can insert activity_log"
  ON public.activity_log FOR INSERT TO authenticated
  WITH CHECK (true);

-- Trigger function to log changes
CREATE OR REPLACE FUNCTION public.log_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _action TEXT;
  _entity_name TEXT;
  _user_id UUID;
  _user_email TEXT;
  _entity_id UUID;
  _details JSONB;
BEGIN
  -- Determine action
  IF TG_OP = 'INSERT' THEN _action := 'created';
  ELSIF TG_OP = 'UPDATE' THEN _action := 'updated';
  ELSIF TG_OP = 'DELETE' THEN _action := 'deleted';
  END IF;

  -- Get current user
  _user_id := auth.uid();
  _user_email := (SELECT email FROM auth.users WHERE id = _user_id);

  -- Get entity details based on table
  IF TG_OP = 'DELETE' THEN
    _entity_id := OLD.id;
    _details := to_jsonb(OLD);
  ELSE
    _entity_id := NEW.id;
    _details := to_jsonb(NEW);
  END IF;

  -- Extract a human-readable name
  _entity_name := COALESCE(
    _details->>'process_name',
    _details->>'name',
    _details->>'title',
    _details->>'label',
    _details->>'source_name',
    _details->>'description',
    _entity_id::text
  );

  -- Truncate details to avoid bloat
  IF _details IS NOT NULL THEN
    _details := jsonb_build_object(
      'table', TG_TABLE_NAME,
      'operation', TG_OP
    );
  END IF;

  INSERT INTO public.activity_log (user_id, user_email, action, entity_type, entity_id, entity_name, details)
  VALUES (_user_id, _user_email, _action, TG_TABLE_NAME, _entity_id, _entity_name, _details);

  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$;

-- Attach triggers to key tables
CREATE TRIGGER trg_activity_business_processes
  AFTER INSERT OR UPDATE OR DELETE ON public.business_processes
  FOR EACH ROW EXECUTE FUNCTION public.log_activity();

CREATE TRIGGER trg_activity_process_steps
  AFTER INSERT OR UPDATE OR DELETE ON public.process_steps
  FOR EACH ROW EXECUTE FUNCTION public.log_activity();

CREATE TRIGGER trg_activity_risks
  AFTER INSERT OR UPDATE OR DELETE ON public.risks
  FOR EACH ROW EXECUTE FUNCTION public.log_activity();

CREATE TRIGGER trg_activity_controls
  AFTER INSERT OR UPDATE OR DELETE ON public.controls
  FOR EACH ROW EXECUTE FUNCTION public.log_activity();

CREATE TRIGGER trg_activity_incidents
  AFTER INSERT OR UPDATE OR DELETE ON public.incidents
  FOR EACH ROW EXECUTE FUNCTION public.log_activity();

CREATE TRIGGER trg_activity_regulations
  AFTER INSERT OR UPDATE OR DELETE ON public.regulations
  FOR EACH ROW EXECUTE FUNCTION public.log_activity();

CREATE TRIGGER trg_activity_clients
  AFTER INSERT OR UPDATE OR DELETE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.log_activity();

CREATE TRIGGER trg_activity_mainframe_imports
  AFTER INSERT OR UPDATE OR DELETE ON public.mainframe_imports
  FOR EACH ROW EXECUTE FUNCTION public.log_activity();

CREATE TRIGGER trg_activity_mainframe_flows
  AFTER INSERT OR UPDATE OR DELETE ON public.mainframe_flows
  FOR EACH ROW EXECUTE FUNCTION public.log_activity();
