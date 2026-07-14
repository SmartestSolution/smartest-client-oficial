-- ============================================================
-- 1) Datas opcionais nos itens de checklist (etapas e evoluções)
-- ============================================================
ALTER TABLE public.project_stage_items
  ADD COLUMN IF NOT EXISTS start_date date,
  ADD COLUMN IF NOT EXISTS end_date date;

ALTER TABLE public.evolution_stage_items
  ADD COLUMN IF NOT EXISTS start_date date,
  ADD COLUMN IF NOT EXISTS end_date date;

-- ============================================================
-- 2) Suporte estilo Jira (por projeto)
-- ============================================================
ALTER TABLE public.support_tickets
  ADD COLUMN IF NOT EXISTS start_at timestamptz,
  ADD COLUMN IF NOT EXISTS end_at timestamptz,
  ADD COLUMN IF NOT EXISTS assignee_id uuid,
  ADD COLUMN IF NOT EXISTS ticket_type text NOT NULL DEFAULT 'task',
  ADD COLUMN IF NOT EXISTS resolution_notes text;

-- Migra valores existentes de start_date/end_date (date) para start_at/end_at (timestamptz)
UPDATE public.support_tickets
   SET start_at = COALESCE(start_at, (start_date::timestamp AT TIME ZONE 'UTC'))
 WHERE start_date IS NOT NULL AND start_at IS NULL;

UPDATE public.support_tickets
   SET end_at = COALESCE(end_at, (end_date::timestamp AT TIME ZONE 'UTC'))
 WHERE end_date IS NOT NULL AND end_at IS NULL;

-- Statuses passam a usar: 'todo' | 'in_progress' | 'review' | 'done'
-- Mantemos 'open' / 'answered' / 'closed' como aliases para compatibilidade
UPDATE public.support_tickets SET status = 'todo'        WHERE status = 'open';
UPDATE public.support_tickets SET status = 'in_progress' WHERE status = 'answered';
UPDATE public.support_tickets SET status = 'done'        WHERE status = 'closed';

-- Índices úteis
CREATE INDEX IF NOT EXISTS idx_support_tickets_project_id ON public.support_tickets(project_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status     ON public.support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_assignee   ON public.support_tickets(assignee_id);
