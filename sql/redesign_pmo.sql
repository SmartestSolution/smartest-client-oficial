-- ============================================================
-- REDESENHO PMO: Suporte com prioridade/datas + Evoluções como sub-projetos
-- ============================================================

-- 1. SUPPORT TICKETS: adicionar prioridade e datas
ALTER TABLE public.support_tickets
  ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS start_date date,
  ADD COLUMN IF NOT EXISTS end_date date;

-- 2. Remover etapas "Suporte" e "Evolução" antigas (e seus checklists em cascade)
DELETE FROM public.project_stage_items
WHERE stage_id IN (
  SELECT id FROM public.project_stages WHERE stage_name IN ('Suporte', 'Evolução')
);
DELETE FROM public.project_stages WHERE stage_name IN ('Suporte', 'Evolução');

-- 3. NOVA TABELA: project_evolutions
CREATE TABLE IF NOT EXISTS public.project_evolutions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'pending',
  start_date date,
  end_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.project_evolutions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage evolutions" ON public.project_evolutions;
CREATE POLICY "Admins manage evolutions" ON public.project_evolutions
  FOR ALL TO public USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Users view project evolutions" ON public.project_evolutions;
CREATE POLICY "Users view project evolutions" ON public.project_evolutions
  FOR SELECT TO public USING (user_has_project_access(project_id));

DROP TRIGGER IF EXISTS update_project_evolutions_updated_at ON public.project_evolutions;
CREATE TRIGGER update_project_evolutions_updated_at
  BEFORE UPDATE ON public.project_evolutions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 4. NOVA TABELA: evolution_stages (5 etapas por evolução)
CREATE TABLE IF NOT EXISTS public.evolution_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  evolution_id uuid NOT NULL REFERENCES public.project_evolutions(id) ON DELETE CASCADE,
  stage_name text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  order_index integer NOT NULL DEFAULT 0,
  started_at timestamptz,
  completed_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.evolution_stages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage evolution_stages" ON public.evolution_stages;
CREATE POLICY "Admins manage evolution_stages" ON public.evolution_stages
  FOR ALL TO public USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Users view evolution_stages" ON public.evolution_stages;
CREATE POLICY "Users view evolution_stages" ON public.evolution_stages
  FOR SELECT TO public USING (
    EXISTS (
      SELECT 1 FROM public.project_evolutions pe
      WHERE pe.id = evolution_stages.evolution_id
        AND user_has_project_access(pe.project_id)
    )
  );

DROP TRIGGER IF EXISTS update_evolution_stages_updated_at ON public.evolution_stages;
CREATE TRIGGER update_evolution_stages_updated_at
  BEFORE UPDATE ON public.evolution_stages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 5. NOVA TABELA: evolution_stage_items (checklist)
CREATE TABLE IF NOT EXISTS public.evolution_stage_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  evolution_stage_id uuid NOT NULL REFERENCES public.evolution_stages(id) ON DELETE CASCADE,
  title text NOT NULL,
  is_completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  order_index integer NOT NULL DEFAULT 0,
  document_id uuid REFERENCES public.documents(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.evolution_stage_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage evolution_stage_items" ON public.evolution_stage_items;
CREATE POLICY "Admins manage evolution_stage_items" ON public.evolution_stage_items
  FOR ALL TO public USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Users view evolution_stage_items" ON public.evolution_stage_items;
CREATE POLICY "Users view evolution_stage_items" ON public.evolution_stage_items
  FOR SELECT TO public USING (
    EXISTS (
      SELECT 1 FROM public.evolution_stages es
      JOIN public.project_evolutions pe ON pe.id = es.evolution_id
      WHERE es.id = evolution_stage_items.evolution_stage_id
        AND user_has_project_access(pe.project_id)
    )
  );

DROP TRIGGER IF EXISTS update_evolution_stage_items_updated_at ON public.evolution_stage_items;
CREATE TRIGGER update_evolution_stage_items_updated_at
  BEFORE UPDATE ON public.evolution_stage_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
