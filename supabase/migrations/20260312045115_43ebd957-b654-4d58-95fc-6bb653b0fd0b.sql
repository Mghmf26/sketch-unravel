
-- Add new fields to controls table
ALTER TABLE public.controls ADD COLUMN IF NOT EXISTS automation_level text DEFAULT NULL;
ALTER TABLE public.controls ADD COLUMN IF NOT EXISTS frequency text DEFAULT NULL;
ALTER TABLE public.controls ADD COLUMN IF NOT EXISTS last_tested text DEFAULT NULL;

-- Add new fields to incidents table
ALTER TABLE public.incidents ADD COLUMN IF NOT EXISTS owner_department text DEFAULT NULL;
ALTER TABLE public.incidents ADD COLUMN IF NOT EXISTS money_loss_amount text DEFAULT NULL;
ALTER TABLE public.incidents ADD COLUMN IF NOT EXISTS loss_threshold text DEFAULT NULL;
ALTER TABLE public.incidents ADD COLUMN IF NOT EXISTS root_cause text DEFAULT NULL;
