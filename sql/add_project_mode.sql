-- Modalidade de execução do projeto, separada da categoria BI/Automação/SQL.
-- Projetos existentes são classificados como padrão.
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS project_mode text NOT NULL DEFAULT 'standard';

ALTER TABLE public.projects
  DROP CONSTRAINT IF EXISTS projects_project_mode_check;

ALTER TABLE public.projects
  ADD CONSTRAINT projects_project_mode_check
  CHECK (project_mode IN ('standard', 'retroactive', 'custom'));

CREATE INDEX IF NOT EXISTS idx_projects_project_mode
  ON public.projects (project_mode);
