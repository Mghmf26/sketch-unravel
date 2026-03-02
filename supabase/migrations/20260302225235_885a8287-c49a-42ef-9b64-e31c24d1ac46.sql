
-- User permissions table for per-user page/module/process restrictions
-- Only applies to participants; admins & coordinators are exempt
CREATE TABLE public.user_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  allowed_pages text[] NOT NULL DEFAULT ARRAY['dashboard','processes','clients','analysis','data-entry','upload','incidents','risks-controls','regulations','controls','mainframe-imports','visual-analytics','ai-reports','client-reports'],
  allowed_modules text[] NOT NULL DEFAULT ARRAY['steps','risks','controls','regulations','incidents','raci','imports','ai'],
  excluded_process_ids uuid[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

-- Admins can manage all permissions
CREATE POLICY "Admins manage permissions"
  ON public.user_permissions FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Users can read their own permissions
CREATE POLICY "Users read own permissions"
  ON public.user_permissions FOR SELECT
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_user_permissions_updated_at
  BEFORE UPDATE ON public.user_permissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Helper function to check if user is a participant role
CREATE OR REPLACE FUNCTION public.is_participant(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('team_participant', 'client_participant')
  )
$$;

-- Update can_access_process to respect excluded_process_ids
CREATE OR REPLACE FUNCTION public.can_access_process(_user_id uuid, _process_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    -- Admins always have access
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'admin')
    OR (
      (
        -- User assigned to the process's client
        EXISTS (
          SELECT 1 FROM public.business_processes bp
          JOIN public.client_assignments ca ON ca.client_id = bp.client_id
          WHERE bp.id = _process_id AND ca.user_id = _user_id
        )
        OR
        -- Processes with no client are visible to all authenticated users
        EXISTS (SELECT 1 FROM public.business_processes WHERE id = _process_id AND client_id IS NULL)
      )
      AND
      -- Process is NOT in user's exclusion list (only for participants)
      NOT EXISTS (
        SELECT 1 FROM public.user_permissions up
        WHERE up.user_id = _user_id
          AND _process_id = ANY(up.excluded_process_ids)
      )
    )
$$;

-- Auto-create permissions row when a new user is created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _invitation RECORD;
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email));

  SELECT * INTO _invitation FROM public.invitations
    WHERE email = NEW.email AND status = 'pending' AND expires_at > now()
    ORDER BY created_at DESC LIMIT 1;

  IF _invitation.id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, _invitation.role);
    UPDATE public.invitations SET status = 'accepted', accepted_at = now() WHERE id = _invitation.id;
    IF _invitation.client_id IS NOT NULL THEN
      INSERT INTO public.client_assignments (user_id, client_id, assigned_by)
      VALUES (NEW.id, _invitation.client_id, _invitation.invited_by);
    END IF;
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  END IF;

  -- Create default permissions
  INSERT INTO public.user_permissions (user_id) VALUES (NEW.id);

  RETURN NEW;
END;
$$;
