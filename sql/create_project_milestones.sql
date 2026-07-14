-- Create project_milestones table for delivery schedule / roadmap
CREATE TABLE public.project_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  milestone_type text NOT NULL DEFAULT 'entrega', -- entrega, reuniao, marco
  due_date date NOT NULL,
  status text NOT NULL DEFAULT 'pending', -- pending, in_progress, completed, cancelled
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.project_milestones ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Admins can manage project_milestones"
  ON public.project_milestones FOR ALL TO public
  USING (is_admin());

CREATE POLICY "Users can view project milestones"
  ON public.project_milestones FOR SELECT TO public
  USING (user_has_project_access(project_id));

-- Trigger for updated_at
CREATE TRIGGER update_project_milestones_updated_at
  BEFORE UPDATE ON public.project_milestones
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
