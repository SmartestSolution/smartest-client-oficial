-- ============================================================
-- Ajuste do projeto "Operacional" (projeto retroativo):
-- todas as tarefas e etapas concluídas DENTRO do prazo,
-- sem nenhum dia de atraso.
--
-- Ajuste o filtro de nome abaixo se o projeto tiver outro título.
-- ============================================================

DO $$
DECLARE
  v_project_id uuid;
  v_start date;
  v_end   date;
BEGIN
  SELECT id, start_date, end_date
    INTO v_project_id, v_start, v_end
    FROM public.projects
   WHERE name ILIKE '%Operacional%'
   ORDER BY created_at
   LIMIT 1;

  IF v_project_id IS NULL THEN
    RAISE EXCEPTION 'Projeto Operacional não encontrado';
  END IF;

  -- 1) Itens do checklist: concluídos, e concluídos até o prazo planejado
  UPDATE public.project_stage_items i
     SET is_completed = true,
         status       = 'done',
         completed_at = LEAST(
             COALESCE(i.end_date, v_end),
             COALESCE(v_end, i.end_date)
           )::timestamp AT TIME ZONE 'UTC'
   FROM public.project_stages s
  WHERE i.stage_id = s.id
    AND s.project_id = v_project_id;

  -- 2) Etapas: concluídas na data de término planejada (nunca depois do fim do projeto)
  UPDATE public.project_stages s
     SET status = 'completed',
         started_at = COALESCE(s.started_at, v_start::timestamp AT TIME ZONE 'UTC'),
         completed_at = LEAST(
             COALESCE(s.completed_at, v_end::timestamp AT TIME ZONE 'UTC'),
             (v_end::timestamp AT TIME ZONE 'UTC')
           )
   WHERE s.project_id = v_project_id;

  -- 3) Marcos / agenda dentro do prazo
  UPDATE public.project_milestones m
     SET status = 'completed'
   WHERE m.project_id = v_project_id;

  -- 4) Chamados de suporte do projeto encerrados dentro do prazo
  UPDATE public.support_tickets t
     SET status = 'done',
         end_at = LEAST(COALESCE(t.end_at, v_end::timestamp AT TIME ZONE 'UTC'),
                        v_end::timestamp AT TIME ZONE 'UTC')
   WHERE t.project_id = v_project_id;

  -- 5) Projeto concluído
  UPDATE public.projects
     SET status = 'completed'
   WHERE id = v_project_id;
END $$;
