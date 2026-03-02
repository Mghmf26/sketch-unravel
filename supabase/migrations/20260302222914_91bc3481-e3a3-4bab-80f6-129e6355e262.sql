
-- Step 1: Expand the app_role enum with new roles
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'team_coordinator';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'team_participant';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'client_coordinator';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'client_participant';
