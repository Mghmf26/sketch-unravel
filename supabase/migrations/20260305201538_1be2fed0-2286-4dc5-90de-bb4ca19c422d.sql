ALTER TABLE public.step_applications
ADD COLUMN parent_id uuid NULL REFERENCES public.step_applications(id) ON DELETE CASCADE;