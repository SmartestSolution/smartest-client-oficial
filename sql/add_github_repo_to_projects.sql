-- Conecta cada projeto a um repositório do GitHub (documentos)
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS github_repo text,   -- formato: owner/repositorio
  ADD COLUMN IF NOT EXISTS github_path text,   -- pasta do projeto dentro do repositório (opcional)
  ADD COLUMN IF NOT EXISTS github_branch text; -- branch (opcional, padrão do repositório)
