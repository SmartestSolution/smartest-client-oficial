-- Create project_stage_items table for checklist items per stage
CREATE TABLE public.project_stage_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_id uuid NOT NULL REFERENCES public.project_stages(id) ON DELETE CASCADE,
  title text NOT NULL,
  is_completed boolean NOT NULL DEFAULT false,
  completed_at timestamp with time zone,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.project_stage_items ENABLE ROW LEVEL SECURITY;

-- Admins can manage all items
CREATE POLICY "Admins can manage project_stage_items"
ON public.project_stage_items FOR ALL
TO public
USING (is_admin());

-- Users can view items of stages they have access to
CREATE POLICY "Users can view project stage items"
ON public.project_stage_items FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 FROM public.project_stages ps
    WHERE ps.id = project_stage_items.stage_id
    AND user_has_project_access(ps.project_id)
  )
);

-- Trigger to update updated_at
CREATE TRIGGER update_project_stage_items_updated_at
  BEFORE UPDATE ON public.project_stage_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
