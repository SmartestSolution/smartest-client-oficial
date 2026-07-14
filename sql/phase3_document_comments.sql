-- ============================================================
-- FASE 3 — Comentários em documentos (threads)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.document_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  parent_id uuid REFERENCES public.document_comments(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_document_comments_document ON public.document_comments(document_id);
CREATE INDEX IF NOT EXISTS idx_document_comments_parent ON public.document_comments(parent_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.document_comments TO authenticated;
GRANT ALL ON public.document_comments TO service_role;

ALTER TABLE public.document_comments ENABLE ROW LEVEL SECURITY;

-- Ver comentários se tem acesso ao projeto do documento
DROP POLICY IF EXISTS "View comments by project access" ON public.document_comments;
CREATE POLICY "View comments by project access" ON public.document_comments
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.documents d
      WHERE d.id = document_comments.document_id
        AND public.user_has_project_access(d.project_id)
    )
  );

-- Inserir como si mesmo, com acesso ao projeto
DROP POLICY IF EXISTS "Insert own comments" ON public.document_comments;
CREATE POLICY "Insert own comments" ON public.document_comments
  FOR INSERT TO authenticated WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.documents d
      WHERE d.id = document_comments.document_id
        AND public.user_has_project_access(d.project_id)
    )
  );

-- Editar/excluir só o próprio (admin sempre)
DROP POLICY IF EXISTS "Update own comments" ON public.document_comments;
CREATE POLICY "Update own comments" ON public.document_comments
  FOR UPDATE TO authenticated USING (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Delete own comments" ON public.document_comments;
CREATE POLICY "Delete own comments" ON public.document_comments
  FOR DELETE TO authenticated USING (user_id = auth.uid() OR public.is_admin());

DROP TRIGGER IF EXISTS update_document_comments_updated_at ON public.document_comments;
CREATE TRIGGER update_document_comments_updated_at
  BEFORE UPDATE ON public.document_comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Notificação: avisa o autor do comentário-pai quando há resposta
CREATE OR REPLACE FUNCTION public.notify_on_document_comment_reply()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _parent_user uuid;
  _doc_name text;
  _project_id uuid;
BEGIN
  IF NEW.parent_id IS NULL THEN RETURN NEW; END IF;

  SELECT user_id INTO _parent_user FROM public.document_comments WHERE id = NEW.parent_id;
  IF _parent_user IS NULL OR _parent_user = NEW.user_id THEN RETURN NEW; END IF;

  SELECT name, project_id INTO _doc_name, _project_id
  FROM public.documents WHERE id = NEW.document_id;

  INSERT INTO public.notifications (user_id, project_id, title, message, notification_type, link)
  VALUES (
    _parent_user, _project_id,
    'Nova resposta no comentário',
    'Responderam seu comentário no documento "' || COALESCE(_doc_name,'') || '".',
    'document',
    '/projeto/' || _project_id || '/documentos'
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_document_comment_reply ON public.document_comments;
CREATE TRIGGER trg_notify_document_comment_reply
  AFTER INSERT ON public.document_comments
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_document_comment_reply();

ALTER PUBLICATION supabase_realtime ADD TABLE public.document_comments;
