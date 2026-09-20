-- Agenda geral: projeto e empresa opcionais, com isolamento por empresa.
ALTER TABLE public.project_milestones
  ALTER COLUMN project_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_project_milestones_client_id
  ON public.project_milestones(client_id);

GRANT SELECT ON public.project_milestones TO authenticated;
GRANT ALL ON public.project_milestones TO service_role;

CREATE OR REPLACE FUNCTION public.sync_milestone_client()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _project_client_id uuid;
BEGIN
  IF NEW.project_id IS NOT NULL THEN
    SELECT client_id INTO _project_client_id
    FROM public.projects
    WHERE id = NEW.project_id;

    IF _project_client_id IS NULL THEN
      RAISE EXCEPTION 'Projeto inválido';
    END IF;

    NEW.client_id := _project_client_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_milestone_client_trigger ON public.project_milestones;
CREATE TRIGGER sync_milestone_client_trigger
  BEFORE INSERT OR UPDATE OF project_id, client_id
  ON public.project_milestones
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_milestone_client();

UPDATE public.project_milestones milestone
SET client_id = project.client_id
FROM public.projects project
WHERE milestone.project_id = project.id
  AND milestone.client_id IS DISTINCT FROM project.client_id;

ALTER TABLE public.project_milestones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage project_milestones" ON public.project_milestones;
DROP POLICY IF EXISTS "Users can view project milestones" ON public.project_milestones;
DROP POLICY IF EXISTS "Admins manage project milestones" ON public.project_milestones;
DROP POLICY IF EXISTS "Users view accessible milestones" ON public.project_milestones;

CREATE POLICY "Admins manage project milestones"
  ON public.project_milestones
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Users view accessible milestones"
  ON public.project_milestones
  FOR SELECT
  TO authenticated
  USING (
    public.is_admin()
    OR (project_id IS NOT NULL AND public.user_can_access_project(project_id))
    OR (
      project_id IS NULL
      AND client_id IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.clients client
        JOIN public.profiles profile ON profile.user_id = auth.uid()
        WHERE client.id = project_milestones.client_id
          AND profile.company IS NOT NULL
          AND lower(btrim(profile.company)) = lower(btrim(client.name))
      )
    )
  );
