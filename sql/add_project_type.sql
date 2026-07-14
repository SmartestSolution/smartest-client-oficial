-- Adiciona o tipo do projeto: BI, Automação ou SQL
-- Rode no SQL Editor do Supabase

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'project_type' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.project_type AS ENUM ('bi', 'automation', 'sql');
  END IF;
END$$;

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS project_type public.project_type NOT NULL DEFAULT 'bi';

CREATE INDEX IF NOT EXISTS idx_projects_project_type
  ON public.projects (project_type);
