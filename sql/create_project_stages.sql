-- Create project_stages table for tracking project progress
CREATE TABLE public.project_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  stage_name text NOT NULL,
  status text NOT NULL DEFAULT 'pending', -- pending, in_progress, completed
  order_index integer NOT NULL DEFAULT 0,
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.project_stages ENABLE ROW LEVEL SECURITY;

-- Admins can manage all stages
CREATE POLICY "Admins can manage project_stages"
ON public.project_stages FOR ALL
TO public
USING (is_admin());

-- Users can view stages of their projects
CREATE POLICY "Users can view project stages"
ON public.project_stages FOR SELECT
TO public
USING (user_has_project_access(project_id));

-- Trigger to update updated_at
CREATE TRIGGER update_project_stages_updated_at
  BEFORE UPDATE ON public.project_stages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default stages for existing projects
INSERT INTO public.project_stages (project_id, stage_name, order_index, status)
SELECT p.id, s.stage_name, s.order_index, 'pending'
FROM public.projects p
CROSS JOIN (
  VALUES 
    ('Levantamento', 0),
    ('Modelagem', 1),
    ('Desenvolvimento', 2),
    ('Homologação', 3),
    ('Produção', 4)
) AS s(stage_name, order_index);
