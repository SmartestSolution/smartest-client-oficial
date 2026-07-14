-- SLA por cliente (em horas) por prioridade
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS sla_high_hours integer NOT NULL DEFAULT 4,
  ADD COLUMN IF NOT EXISTS sla_medium_hours integer NOT NULL DEFAULT 12,
  ADD COLUMN IF NOT EXISTS sla_low_hours integer NOT NULL DEFAULT 24;
