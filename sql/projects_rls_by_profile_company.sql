-- =============================================================
-- RLS de projetos baseada em profiles.company
-- O usuário vê os projetos cujo cliente (clients.name) bate com
-- o campo company do seu profile. Admins veem tudo.
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
    OR EXISTS (
      SELECT 1
      FROM public.projects p
      JOIN public.clients   c ON c.id = p.client_id
      JOIN public.profiles  pr ON pr.user_id = auth.uid()
      WHERE p.id = _project_id
        AND pr.company IS NOT NULL
        AND lower(btrim(pr.company)) = lower(btrim(c.name))
    );
$$;

GRANT EXECUTE ON FUNCTION public.user_can_access_project(uuid) TO authenticated;

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.projects TO authenticated;
GRANT ALL    ON public.projects TO service_role;

DROP POLICY IF EXISTS "Admins manage projects"          ON public.projects;
DROP POLICY IF EXISTS "Users view own company projects" ON public.projects;
DROP POLICY IF EXISTS "Users view assigned projects"    ON public.projects;
DROP POLICY IF EXISTS "Users can view assigned projects" ON public.projects;
DROP POLICY IF EXISTS "Users view their projects"       ON public.projects;

CREATE POLICY "Admins manage projects"
  ON public.projects
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Users view projects by profile company"
  ON public.projects
  FOR SELECT
  TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1
      FROM public.clients  c
      JOIN public.profiles pr ON pr.user_id = auth.uid()
      WHERE c.id = projects.client_id
        AND pr.company IS NOT NULL
        AND lower(btrim(pr.company)) = lower(btrim(c.name))
    )
  );
