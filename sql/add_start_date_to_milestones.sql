-- Add optional start_date to project_milestones so the agenda can mark both
-- "Início" and "Entrega" on the calendar.
ALTER TABLE public.project_milestones
  ADD COLUMN IF NOT EXISTS start_date date NULL;
