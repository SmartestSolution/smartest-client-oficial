-- =============================================================
-- REGRA ÚNICA E DEFINITIVA DE ACESSO DO CLIENTE
--
-- 1) O cliente só enxerga coisas da PRÓPRIA empresa.
-- 2) O cliente só enxerga os PROJETOS SELECIONADOS para ele
--    (tabela project_users). Nenhum selecionado = não vê nada.
-- 3) Dentro dos projetos permitidos ele vê tudo: etapas, tarefas,
--    evoluções, suporte e agenda.
--
-- Este script SUBSTITUI as regras antigas e conflitantes de:
--   company_based_project_access.sql
--   project_access_v2.sql
--   projects_rls_by_profile_company.sql
-- Rode este arquivo inteiro no SQL Editor. É idempotente.
-- =============================================================

-- -------------------------------------------------------------
-- Helper 1: o usuário pertence a esta empresa?
-- (vínculo real em client_users OU nome em profiles.company)
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.user_belongs_to_client(_client_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    _client_id IS NOT NULL
    AND (
      EXISTS (
        SELECT 1 FROM public.client_users cu
        WHERE cu.user_id = auth.uid() AND cu.client_id = _client_id
      )
      OR EXISTS (
        SELECT 1
        FROM public.profiles pr
        JOIN public.clients c ON c.id = _client_id
        WHERE pr.user_id = auth.uid()
          AND pr.company IS NOT NULL
          AND lower(btrim(pr.company)) = lower(btrim(c.name))
      )
    );
$$;

-- -------------------------------------------------------------
-- Helper 2: acesso ao projeto
-- Admin vê tudo. Cliente precisa: projeto marcado para ele E
-- projeto pertencer à sua empresa.
-- -------------------------------------------------------------
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
      FROM public.project_users pu
      JOIN public.projects p ON p.id = pu.project_id
      WHERE pu.user_id = auth.uid()
        AND pu.project_id = _project_id
        AND public.user_belongs_to_client(p.client_id)
    );
$$;

GRANT EXECUTE ON FUNCTION public.user_belongs_to_client(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_can_access_project(uuid) TO authenticated;

-- =============================================================
-- PROJETOS
-- =============================================================
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.projects TO authenticated;
GRANT ALL ON public.projects TO service_role;

DROP POLICY IF EXISTS "Admins manage projects"                ON public.projects;
DROP POLICY IF EXISTS "Users view own company projects"       ON public.projects;
DROP POLICY IF EXISTS "Users view assigned projects"          ON public.projects;
DROP POLICY IF EXISTS "Users can view assigned projects"      ON public.projects;
DROP POLICY IF EXISTS "Users view their projects"             ON public.projects;
DROP POLICY IF EXISTS "Users view accessible projects"        ON public.projects;
DROP POLICY IF EXISTS "Users view projects by profile company" ON public.projects;

CREATE POLICY "Admins manage projects"
  ON public.projects FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Users view accessible projects"
  ON public.projects FOR SELECT TO authenticated
  USING (public.user_can_access_project(id));

-- project_users: o usuário precisa ler as próprias linhas
ALTER TABLE public.project_users ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.project_users TO authenticated;
GRANT ALL ON public.project_users TO service_role;

DROP POLICY IF EXISTS "Admins manage project_users"  ON public.project_users;
DROP POLICY IF EXISTS "Users read own project_users" ON public.project_users;

CREATE POLICY "Admins manage project_users"
  ON public.project_users FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Users read own project_users"
  ON public.project_users FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- =============================================================
-- EMPRESAS: só a própria
-- =============================================================
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.clients TO authenticated;
GRANT ALL ON public.clients TO service_role;

DROP POLICY IF EXISTS "Users can view own company" ON public.clients;
CREATE POLICY "Users can view own company"
  ON public.clients FOR SELECT TO authenticated
  USING (public.is_admin() OR public.user_belongs_to_client(id));

-- =============================================================
-- ETAPAS E TAREFAS DO PROJETO
-- =============================================================
ALTER TABLE public.project_stages      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_stage_items ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.project_stages, public.project_stage_items TO authenticated;
GRANT ALL ON public.project_stages, public.project_stage_items TO service_role;

DROP POLICY IF EXISTS "Users can view project stages" ON public.project_stages;
CREATE POLICY "Users can view project stages"
  ON public.project_stages FOR SELECT TO authenticated
  USING (public.user_can_access_project(project_id));

DROP POLICY IF EXISTS "Users can view project stage items" ON public.project_stage_items;
CREATE POLICY "Users can view project stage items"
  ON public.project_stage_items FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.project_stages ps
      WHERE ps.id = project_stage_items.stage_id
        AND public.user_can_access_project(ps.project_id)
    )
  );

-- =============================================================
-- EVOLUÇÕES
-- =============================================================
ALTER TABLE public.project_evolutions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evolution_stages      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evolution_stage_items ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.project_evolutions, public.evolution_stages, public.evolution_stage_items TO authenticated;
GRANT ALL ON public.project_evolutions, public.evolution_stages, public.evolution_stage_items TO service_role;

DROP POLICY IF EXISTS "Users can view project evolutions" ON public.project_evolutions;
CREATE POLICY "Users can view project evolutions"
  ON public.project_evolutions FOR SELECT TO authenticated
  USING (public.user_can_access_project(project_id));

DROP POLICY IF EXISTS "Users can view evolution stages" ON public.evolution_stages;
CREATE POLICY "Users can view evolution stages"
  ON public.evolution_stages FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.project_evolutions e
      WHERE e.id = evolution_stages.evolution_id
        AND public.user_can_access_project(e.project_id)
    )
  );

DROP POLICY IF EXISTS "Users can view evolution stage items" ON public.evolution_stage_items;
CREATE POLICY "Users can view evolution stage items"
  ON public.evolution_stage_items FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.evolution_stages s
      JOIN public.project_evolutions e ON e.id = s.evolution_id
      WHERE s.id = evolution_stage_items.evolution_stage_id
        AND public.user_can_access_project(e.project_id)
    )
  );

-- =============================================================
-- SUPORTE
-- Chamado com projeto: só se o projeto for permitido.
-- Chamado sem projeto: toda a empresa do autor enxerga.
-- =============================================================
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.support_tickets TO authenticated;
GRANT ALL ON public.support_tickets TO service_role;

DROP POLICY IF EXISTS "Users can view project tickets"            ON public.support_tickets;
DROP POLICY IF EXISTS "Users can view own tickets"                ON public.support_tickets;
DROP POLICY IF EXISTS "Users can view accessible support tickets" ON public.support_tickets;

CREATE POLICY "Users can view accessible support tickets"
  ON public.support_tickets FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR auth.uid() = user_id
    OR (project_id IS NOT NULL AND public.user_can_access_project(project_id))
    OR (
      project_id IS NULL
      AND EXISTS (
        SELECT 1
        FROM public.profiles viewer
        JOIN public.profiles creator ON creator.user_id = support_tickets.user_id
        WHERE viewer.user_id = auth.uid()
          AND viewer.company IS NOT NULL
          AND creator.company IS NOT NULL
          AND lower(btrim(viewer.company)) = lower(btrim(creator.company))
      )
    )
  );

-- =============================================================
-- AGENDA / COMPROMISSOS
-- Com projeto: só projetos permitidos.
-- Sem projeto, com empresa: só a própria empresa.
-- Sem projeto e sem empresa: apenas admin.
-- =============================================================
ALTER TABLE public.project_milestones ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.project_milestones TO authenticated;
GRANT ALL ON public.project_milestones TO service_role;

DROP POLICY IF EXISTS "Users can view company milestones" ON public.project_milestones;
CREATE POLICY "Users can view company milestones"
  ON public.project_milestones FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR (project_id IS NOT NULL AND public.user_can_access_project(project_id))
    OR (project_id IS NULL AND client_id IS NOT NULL AND public.user_belongs_to_client(client_id))
  );
