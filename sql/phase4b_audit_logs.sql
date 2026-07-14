-- ============================================================
-- FASE 4B — Logs de auditoria
-- ============================================================

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  action text NOT NULL,                -- 'insert' | 'update' | 'delete' | 'download' | 'login' | ...
  resource_type text NOT NULL,         -- 'document' | 'project' | 'support_ticket' | ...
  resource_id uuid,
  project_id uuid,
  metadata jsonb DEFAULT '{}'::jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON public.audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_project ON public.audit_logs(project_id);

GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Só admin lê
DROP POLICY IF EXISTS "Admins read audit logs" ON public.audit_logs;
CREATE POLICY "Admins read audit logs" ON public.audit_logs
  FOR SELECT TO authenticated USING (is_admin());

-- Qualquer autenticado pode gravar evento em nome próprio (downloads, logins)
DROP POLICY IF EXISTS "Users insert own audit events" ON public.audit_logs;
CREATE POLICY "Users insert own audit events" ON public.audit_logs
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() OR is_admin());

-- Função genérica para triggers de auditoria
CREATE OR REPLACE FUNCTION public.audit_table_changes()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _resource_id uuid;
  _project_id uuid;
BEGIN
  _resource_id := COALESCE((NEW).id, (OLD).id);

  -- tenta capturar project_id se a tabela tiver essa coluna
  BEGIN
    _project_id := COALESCE((NEW).project_id, (OLD).project_id);
  EXCEPTION WHEN undefined_column THEN
    _project_id := NULL;
  END;

  INSERT INTO public.audit_logs (user_id, action, resource_type, resource_id, project_id, metadata)
  VALUES (
    auth.uid(),
    lower(TG_OP),
    TG_TABLE_NAME,
    _resource_id,
    _project_id,
    CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Anexa triggers nas tabelas-chave (idempotente)
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'projects','documents','project_stages','project_stage_items',
    'project_milestones','project_versions','project_evolutions',
    'support_tickets','client_users'
  ] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_audit_%I ON public.%I;', t, t);
    EXECUTE format(
      'CREATE TRIGGER trg_audit_%I AFTER INSERT OR UPDATE OR DELETE ON public.%I
       FOR EACH ROW EXECUTE FUNCTION public.audit_table_changes();', t, t);
  END LOOP;
END $$;

-- RPC para registrar download de documento a partir do client
CREATE OR REPLACE FUNCTION public.log_document_download(_document_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _project_id uuid;
BEGIN
  SELECT project_id INTO _project_id FROM public.documents WHERE id = _document_id;
  INSERT INTO public.audit_logs (user_id, action, resource_type, resource_id, project_id)
  VALUES (auth.uid(), 'download', 'document', _document_id, _project_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_document_download(uuid) TO authenticated;
