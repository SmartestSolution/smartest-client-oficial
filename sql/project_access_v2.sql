-- =============================================================
-- Acesso a projetos v2
-- Regras:
--   - Admin vê tudo.
--   - Se o usuário tem QUALQUER linha em project_users, ele passa a ver
--     APENAS os projetos listados ali (restrição por projeto).
--   - Caso contrário, ele vê todos os projetos da(s) empresa(s) às
--     quais está vinculado em client_users.
-- =============================================================

CREATE OR REPLACE FUNCTION public.user_can_access_project(_project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.is_admin()
    OR (
      -- Se existe restrição por projeto, precisa estar na lista.
      EXISTS (SELECT 1 FROM public.project_users pu WHERE pu.user_id = auth.uid())
      AND EXISTS (
        SELECT 1 FROM public.project_users pu
        WHERE pu.user_id = auth.uid() AND pu.project_id = _project_id
      )
    )
    OR (
      -- Sem restrição por projeto: acesso via empresa.
      NOT EXISTS (SELECT 1 FROM public.project_users pu WHERE pu.user_id = auth.uid())
      AND EXISTS (
        SELECT 1
        FROM public.projects p
        JOIN public.client_users cu ON cu.client_id = p.client_id
        WHERE p.id = _project_id AND cu.user_id = auth.uid()
      )
    );
$$;

GRANT EXECUTE ON FUNCTION public.user_can_access_project(uuid) TO authenticated;

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.projects TO authenticated;
GRANT ALL ON public.projects TO service_role;

DROP POLICY IF EXISTS "Admins manage projects"          ON public.projects;
DROP POLICY IF EXISTS "Users view own company projects" ON public.projects;
DROP POLICY IF EXISTS "Users view assigned projects"    ON public.projects;
DROP POLICY IF EXISTS "Users view their projects"       ON public.projects;

CREATE POLICY "Admins manage projects"
  ON public.projects FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Users view accessible projects"
  ON public.projects FOR SELECT TO authenticated
  USING (public.user_can_access_project(id));

-- project_users precisa ser lido pelo próprio usuário para a função funcionar
ALTER TABLE public.project_users ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_users TO authenticated;
GRANT ALL ON public.project_users TO service_role;

DROP POLICY IF EXISTS "Admins manage project_users"     ON public.project_users;
DROP POLICY IF EXISTS "Users read own project_users"    ON public.project_users;

CREATE POLICY "Admins manage project_users"
  ON public.project_users FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Users read own project_users"
  ON public.project_users FOR SELECT TO authenticated
  USING (user_id = auth.uid());
