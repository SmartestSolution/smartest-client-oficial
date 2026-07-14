-- ============================================================
-- 1) Unifica esquema entre checklist (etapas) e suporte
--    Adiciona priority, assignee_id, description, status nos itens
-- ============================================================
ALTER TABLE public.project_stage_items
  ADD COLUMN IF NOT EXISTS priority    text NOT NULL DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS assignee_id uuid,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS status      text NOT NULL DEFAULT 'todo';

ALTER TABLE public.evolution_stage_items
  ADD COLUMN IF NOT EXISTS priority    text NOT NULL DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS assignee_id uuid,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS status      text NOT NULL DEFAULT 'todo';

-- Sincroniza status com is_completed para registros existentes
UPDATE public.project_stage_items
   SET status = CASE WHEN is_completed THEN 'done' ELSE 'todo' END
 WHERE status = 'todo';

UPDATE public.evolution_stage_items
   SET status = CASE WHEN is_completed THEN 'done' ELSE 'todo' END
 WHERE status = 'todo';

-- ============================================================
-- 2) Cliente precisa enxergar TODOS os tickets do projeto dele
--    (não só os que ele mesmo criou) -> board mostra concluídos também
-- ============================================================
DROP POLICY IF EXISTS "Users can view project tickets" ON public.support_tickets;
CREATE POLICY "Users can view project tickets"
ON public.support_tickets FOR SELECT
TO public
USING (project_id IS NOT NULL AND public.user_has_project_access(project_id));
