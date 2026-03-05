-- Create page_visibility table for root to hide pages from roles
CREATE TABLE IF NOT EXISTS public.page_visibility (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_slug text NOT NULL,
  hidden_from_roles text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(page_slug)
);

ALTER TABLE public.page_visibility ENABLE ROW LEVEL SECURITY;

-- Only root can manage page visibility
CREATE POLICY "Root can manage page_visibility" ON public.page_visibility
FOR ALL TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'root')
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'root')
);

-- All authenticated users can read page visibility (to check what's hidden)
CREATE POLICY "Authenticated can read page_visibility" ON public.page_visibility
FOR SELECT TO authenticated
USING (true);

-- Update has_role to also treat 'root' as having admin powers
CREATE OR REPLACE FUNCTION public.is_root(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'root'
  )
$$;

-- Update can_access_client to also allow root
CREATE OR REPLACE FUNCTION public.can_access_client(_user_id uuid, _client_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('admin', 'root'))
    OR
    EXISTS (SELECT 1 FROM public.client_assignments WHERE user_id = _user_id AND client_id = _client_id)
$$;

-- Update can_access_process to also allow root
CREATE OR REPLACE FUNCTION public.can_access_process(_user_id uuid, _process_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('admin', 'root'))
    OR (
      (
        EXISTS (
          SELECT 1 FROM public.business_processes bp
          JOIN public.client_assignments ca ON ca.client_id = bp.client_id
          WHERE bp.id = _process_id AND ca.user_id = _user_id
        )
        OR
        EXISTS (SELECT 1 FROM public.business_processes WHERE id = _process_id AND client_id IS NULL)
      )
      AND
      NOT EXISTS (
        SELECT 1 FROM public.user_permissions up
        WHERE up.user_id = _user_id
          AND _process_id = ANY(up.excluded_process_ids)
      )
    )
$$;
