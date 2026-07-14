-- Add document_id to project_stage_items for linking documents per checklist item
ALTER TABLE public.project_stage_items
  ADD COLUMN IF NOT EXISTS document_id uuid REFERENCES public.documents(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_stage_items_document_id ON public.project_stage_items(document_id);
