-- =============================================================
-- Central de Trabalho para clientes
-- Clientes leem tarefas dos projetos permitidos e podem alterar
-- somente a prioridade por uma função controlada.
-- =============================================================

ALTER TABLE public.project_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_stage_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.project_stages TO authenticated;
GRANT SELECT ON public.project_stage_items TO authenticated;
GRANT SELECT ON public.support_tickets TO authenticated;
GRANT ALL ON public.project_stages, public.project_stage_items, public.support_tickets TO service_role;

DROP POLICY IF EXISTS "Users can view project stages" ON public.project_stages;
CREATE POLICY "Users can view project stages"
ON public.project_stages FOR SELECT TO authenticated
USING (public.user_can_access_project(project_id));

DROP POLICY IF EXISTS "Users can view project stage items" ON public.project_stage_items;
CREATE POLICY "Users can view project stage items"
ON public.project_stage_items FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.project_stages ps
    WHERE ps.id = project_stage_items.stage_id
      AND public.user_can_access_project(ps.project_id)
  )
);

DROP POLICY IF EXISTS "Users can view project tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Users can view own tickets" ON public.support_tickets;
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
        AND lower(btrim(viewer.company)) = lower(btrim(creator.company))
    )
  )
);

CREATE OR REPLACE FUNCTION public.request_work_item_priority(
  _source text,
  _item_id uuid,
  _priority text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  IF _priority NOT IN ('urgent', 'high', 'medium', 'low') THEN
    RAISE EXCEPTION 'Prioridade inválida';
  END IF;

  IF _source = 'project' THEN
    UPDATE public.project_stage_items item
       SET priority = _priority,
           updated_at = now()
     WHERE item.id = _item_id
       AND EXISTS (
         SELECT 1
         FROM public.project_stages stage
         WHERE stage.id = item.stage_id
           AND public.user_can_access_project(stage.project_id)
       );
  ELSIF _source = 'support' THEN
    UPDATE public.support_tickets ticket
       SET priority = _priority,
           updated_at = now()
     WHERE ticket.id = _item_id
       AND (
         public.is_admin()
         OR ticket.user_id = auth.uid()
         OR (ticket.project_id IS NOT NULL AND public.user_can_access_project(ticket.project_id))
         OR (
           ticket.project_id IS NULL
           AND EXISTS (
             SELECT 1
             FROM public.profiles viewer
             JOIN public.profiles creator ON creator.user_id = ticket.user_id
             WHERE viewer.user_id = auth.uid()
               AND viewer.company IS NOT NULL
               AND lower(btrim(viewer.company)) = lower(btrim(creator.company))
           )
         )
       );
  ELSE
    RAISE EXCEPTION 'Origem inválida';
  END IF;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Atividade não encontrada ou sem permissão';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.request_work_item_priority(text, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_work_item_priority(text, uuid, text) TO authenticated;