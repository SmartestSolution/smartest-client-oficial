-- Add start_date and end_date to projects
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS start_date date;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS end_date date;

-- Update default stages to include Evolução and Suporte
-- These will be added to new projects via the hook
