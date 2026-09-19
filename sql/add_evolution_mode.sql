-- Modalidades de evolução: padrão (estrutura completa) ou personalizada (estrutura livre).
ALTER TABLE public.project_evolutions
  ADD COLUMN IF NOT EXISTS evolution_mode text NOT NULL DEFAULT 'standard';

ALTER TABLE public.project_evolutions
  DROP CONSTRAINT IF EXISTS project_evolutions_evolution_mode_check;

ALTER TABLE public.project_evolutions
  ADD CONSTRAINT project_evolutions_evolution_mode_check
  CHECK (evolution_mode IN ('standard', 'custom'));

CREATE INDEX IF NOT EXISTS idx_project_evolutions_mode
  ON public.project_evolutions(evolution_mode);