-- =============================================================
-- Central de Trabalho: clientes enxergam TODAS as tarefas e
-- projetos da sua empresa (profiles.company = clients.name).
-- Complementa sql/client_work_center_access.sql cobrindo as
-- evoluções, que estavam sem política de leitura.
-- =============================================================

ALTER TABLE public.project_evolutions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evolution_stages     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evolution_stage_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients              ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.project_evolutions, public.evolution_stages, public.evolution_stage_items TO authenticated;
GRANT SELECT ON public.clients TO authenticated;
GRANT ALL ON public.project_evolutions, public.evolution_stages, public.evolution_stage_items TO service_role;

-- Evoluções dos projetos da empresa
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

-- Empresa do próprio usuário (para exibir o nome do cliente na Central)
DROP POLICY IF EXISTS "Users can view own company" ON public.clients;
CREATE POLICY "Users can view own company"
ON public.clients FOR SELECT TO authenticated
USING (
  public.is_admin()
  OR EXISTS (
    SELECT 1 FROM public.profiles pr
    WHERE pr.user_id = auth.uid()
      AND pr.company IS NOT NULL
      AND lower(btrim(pr.company)) = lower(btrim(clients.name))
  )
);

-- Compromissos de agenda (reuniões/consultorias) da empresa
ALTER TABLE public.project_milestones ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.project_milestones TO authenticated;
GRANT ALL ON public.project_milestones TO service_role;

DROP POLICY IF EXISTS "Users can view company milestones" ON public.project_milestones;
CREATE POLICY "Users can view company milestones"
ON public.project_milestones FOR SELECT TO authenticated
USING (
  public.is_admin()
  OR (project_id IS NOT NULL AND public.user_can_access_project(project_id))
  OR (
    client_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.clients c
      JOIN public.profiles pr ON pr.user_id = auth.uid()
      WHERE c.id = project_milestones.client_id
        AND pr.company IS NOT NULL
        AND lower(btrim(pr.company)) = lower(btrim(c.name))
    )
  )
);

-- Suporte: cliente enxerga todos os chamados da sua empresa
DROP POLICY IF EXISTS "Users can view accessible support tickets" ON public.support_tickets;
CREATE POLICY "Users can view accessible support tickets"
ON public.support_tickets FOR SELECT TO authenticated
USING (
  public.is_admin()
  OR auth.uid() = user_id
  OR (project_id IS NOT NULL AND public.user_can_access_project(project_id))
  OR EXISTS (
    SELECT 1
    FROM public.profiles viewer
    JOIN public.profiles creator ON creator.user_id = support_tickets.user_id
    WHERE viewer.user_id = auth.uid()
      AND viewer.company IS NOT NULL
      AND creator.company IS NOT NULL
      AND lower(btrim(viewer.company)) = lower(btrim(creator.company))
  )
);
