-- Add item_type to checklist items (similar to support_tickets.ticket_type)
-- Values used in UI: 'task' | 'development' | 'meeting' | 'review' | 'other'
ALTER TABLE public.project_stage_items
  ADD COLUMN IF NOT EXISTS item_type text NOT NULL DEFAULT 'task';

ALTER TABLE public.evolution_stage_items
  ADD COLUMN IF NOT EXISTS item_type text NOT NULL DEFAULT 'task';
