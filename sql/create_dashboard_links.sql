-- Create dashboard_links table for quick access to BI dashboards
CREATE TABLE public.dashboard_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  url text NOT NULL,
  platform text NOT NULL DEFAULT 'other', -- power_bi, looker, metabase, tableau, google_data_studio, other
  description text,
  icon_url text,
  order_index integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.dashboard_links ENABLE ROW LEVEL SECURITY;

-- Admins can manage all links
CREATE POLICY "Admins can manage dashboard_links"
ON public.dashboard_links FOR ALL
TO public
USING (is_admin());

-- Users can view active links of their projects
CREATE POLICY "Users can view dashboard links"
ON public.dashboard_links FOR SELECT
TO public
USING (is_active = true AND user_has_project_access(project_id));

-- Trigger to update updated_at
CREATE TRIGGER update_dashboard_links_updated_at
  BEFORE UPDATE ON public.dashboard_links
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
