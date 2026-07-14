-- Add recurrence column to project_milestones for recurring events
ALTER TABLE public.project_milestones
  ADD COLUMN IF NOT EXISTS recurrence text DEFAULT NULL;

-- Values: NULL (one-time), 'weekly', 'monthly'
COMMENT ON COLUMN public.project_milestones.recurrence IS 'Recurrence pattern: null=one-time, weekly, monthly';
