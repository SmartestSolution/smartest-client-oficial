-- ============================================================
-- FASE 4A — Templates de projeto
-- ============================================================

CREATE TABLE IF NOT EXISTS public.project_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.project_template_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.project_templates(id) ON DELETE CASCADE,
  stage_name text NOT NULL,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.project_template_stage_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_stage_id uuid NOT NULL REFERENCES public.project_template_stages(id) ON DELETE CASCADE,
  title text NOT NULL,
  item_type text NOT NULL DEFAULT 'task',
  priority text NOT NULL DEFAULT 'medium',
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.project_template_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.project_templates(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  days_offset integer NOT NULL DEFAULT 0,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Grants
GRANT SELECT ON public.project_templates TO authenticated;
GRANT SELECT ON public.project_template_stages TO authenticated;
GRANT SELECT ON public.project_template_stage_items TO authenticated;
GRANT SELECT ON public.project_template_milestones TO authenticated;
GRANT ALL ON public.project_templates TO service_role;
GRANT ALL ON public.project_template_stages TO service_role;
GRANT ALL ON public.project_template_stage_items TO service_role;
GRANT ALL ON public.project_template_milestones TO service_role;
-- Admin precisa INSERT/UPDATE/DELETE
GRANT INSERT, UPDATE, DELETE ON public.project_templates TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.project_template_stages TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.project_template_stage_items TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.project_template_milestones TO authenticated;

-- RLS
ALTER TABLE public.project_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_template_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_template_stage_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_template_milestones ENABLE ROW LEVEL SECURITY;

-- Todos autenticados leem; só admin escreve
DROP POLICY IF EXISTS "Read templates" ON public.project_templates;
CREATE POLICY "Read templates" ON public.project_templates FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Admins write templates" ON public.project_templates;
CREATE POLICY "Admins write templates" ON public.project_templates FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Read template stages" ON public.project_template_stages;
CREATE POLICY "Read template stages" ON public.project_template_stages FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Admins write template stages" ON public.project_template_stages;
CREATE POLICY "Admins write template stages" ON public.project_template_stages FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Read template items" ON public.project_template_stage_items;
CREATE POLICY "Read template items" ON public.project_template_stage_items FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Admins write template items" ON public.project_template_stage_items;
CREATE POLICY "Admins write template items" ON public.project_template_stage_items FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Read template milestones" ON public.project_template_milestones;
CREATE POLICY "Read template milestones" ON public.project_template_milestones FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Admins write template milestones" ON public.project_template_milestones;
CREATE POLICY "Admins write template milestones" ON public.project_template_milestones FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

DROP TRIGGER IF EXISTS update_project_templates_updated_at ON public.project_templates;
CREATE TRIGGER update_project_templates_updated_at
  BEFORE UPDATE ON public.project_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
