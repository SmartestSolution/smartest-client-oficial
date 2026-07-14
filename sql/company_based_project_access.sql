-- =============================================================
-- Acesso a projetos baseado em EMPRESA (não mais por projeto)
-- Cada usuário passa a enxergar automaticamente todos os projetos
-- da(s) empresa(s) à(s) qual(is) está vinculado em client_users.
-- Admins continuam vendo tudo.
-- =============================================================

-- Função helper: o usuário atual tem acesso a este projeto?
CREATE OR REPLACE FUNCTION public.user_can_access_project(_project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.is_admin()
    OR EXISTS (
      SELECT 1
      FROM public.projects p
      JOIN public.client_users cu
        ON cu.client_id = p.client_id
      WHERE p.id = _project_id
        AND cu.user_id = auth.uid()
    );
$$;

GRANT EXECUTE ON FUNCTION public.user_can_access_project(uuid) TO authenticated;

-- =============================================================
-- RLS em public.projects
-- =============================================================
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.projects TO authenticated;
GRANT ALL ON public.projects TO service_role;

DROP POLICY IF EXISTS "Admins manage projects" ON public.projects;
CREATE POLICY "Admins manage projects"
  ON public.projects
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Users view own company projects" ON public.projects;
CREATE POLICY "Users view own company projects"
  ON public.projects
  FOR SELECT
  TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1
      FROM public.client_users cu
      WHERE cu.client_id = projects.client_id
        AND cu.user_id = auth.uid()
    )
  );

-- Remove política antiga baseada em project_users (se existir), pois o
-- acesso agora é automático pela empresa.
DROP POLICY IF EXISTS "Users view assigned projects" ON public.projects;
DROP POLICY IF EXISTS "Users can view assigned projects" ON public.projects;
DROP POLICY IF EXISTS "Users view their projects" ON public.projects;
