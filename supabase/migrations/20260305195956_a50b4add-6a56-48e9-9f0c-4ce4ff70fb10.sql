
ALTER TABLE public.clients
ADD COLUMN engagement_period_start date NULL,
ADD COLUMN engagement_period_end date NULL,
ADD COLUMN report_issuance_date date NULL,
ADD COLUMN entity_type text NULL DEFAULT 'private';
