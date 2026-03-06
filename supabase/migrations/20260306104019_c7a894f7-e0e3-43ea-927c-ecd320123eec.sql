ALTER TABLE public.step_applications
  ADD COLUMN IF NOT EXISTS application_owner text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS business_analyst_business text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS business_analyst_it text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS platform text DEFAULT NULL;