-- Tabela de Comunicados / Changelog do Projeto
CREATE TABLE public.project_announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text NOT NULL,
  announcement_type text NOT NULL DEFAULT 'update',
  is_pinned boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.project_announcements ENABLE ROW LEVEL SECURITY;

-- Admin full access
CREATE POLICY "Admins can manage project_announcements"
ON public.project_announcements FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Clients can view announcements of their projects
CREATE POLICY "Users can view project announcements"
ON public.project_announcements FOR SELECT
TO authenticated
USING (public.user_has_project_access(project_id));

-- Auto-update updated_at
CREATE TRIGGER update_project_announcements_updated_at
  BEFORE UPDATE ON public.project_announcements
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
