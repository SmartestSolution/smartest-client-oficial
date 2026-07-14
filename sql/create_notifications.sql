-- Tabela de notificações
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  notification_type text NOT NULL DEFAULT 'info', -- 'document', 'support', 'stage', 'version', 'info'
  is_read boolean NOT NULL DEFAULT false,
  link text, -- optional link to navigate to
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications"
  ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_is_read ON public.notifications(user_id, is_read);

-- Tabela de versões do projeto
CREATE TABLE public.project_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  version_number text NOT NULL, -- e.g. "1.0.0", "2.1.0"
  title text NOT NULL,
  description text,
  release_notes text, -- changelog em markdown
  released_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.project_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage project_versions"
  ON public.project_versions FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Users can view project versions"
  ON public.project_versions FOR SELECT TO authenticated
  USING (user_has_project_access(project_id));

CREATE TRIGGER update_project_versions_updated_at
  BEFORE UPDATE ON public.project_versions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Adicionar versionamento de documentos
ALTER TABLE public.documents 
  ADD COLUMN version integer NOT NULL DEFAULT 1,
  ADD COLUMN parent_document_id uuid REFERENCES public.documents(id) ON DELETE SET NULL;

-- Trigger: notificar usuários quando documento é criado
CREATE OR REPLACE FUNCTION public.notify_on_document_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _project_name text;
  _cu record;
BEGIN
  SELECT name INTO _project_name FROM projects WHERE id = NEW.project_id;
  
  FOR _cu IN 
    SELECT cu.user_id FROM client_users cu
    JOIN projects p ON p.client_id = cu.client_id
    WHERE p.id = NEW.project_id
  LOOP
    INSERT INTO notifications (user_id, project_id, title, message, notification_type, link)
    VALUES (
      _cu.user_id,
      NEW.project_id,
      'Novo documento disponível',
      'O documento "' || NEW.name || '" foi adicionado ao projeto ' || _project_name || '.',
      'document',
      '/projeto/' || NEW.project_id || '/documentos'
    );
  END LOOP;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_document_insert_notify
  AFTER INSERT ON public.documents
  FOR EACH ROW EXECUTE FUNCTION notify_on_document_insert();

-- Trigger: notificar usuário quando suporte é respondido
CREATE OR REPLACE FUNCTION public.notify_on_support_response()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF OLD.admin_response IS NULL AND NEW.admin_response IS NOT NULL THEN
    INSERT INTO notifications (user_id, title, message, notification_type, link)
    VALUES (
      NEW.user_id,
      'Resposta no suporte',
      'Seu ticket "' || NEW.subject || '" foi respondido.',
      'support',
      '/suporte'
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_support_response_notify
  AFTER UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION notify_on_support_response();

-- Trigger: notificar quando versão do projeto é publicada
CREATE OR REPLACE FUNCTION public.notify_on_version_release()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _project_name text;
  _cu record;
BEGIN
  SELECT name INTO _project_name FROM projects WHERE id = NEW.project_id;
  
  FOR _cu IN 
    SELECT cu.user_id FROM client_users cu
    JOIN projects p ON p.client_id = cu.client_id
    WHERE p.id = NEW.project_id
  LOOP
    INSERT INTO notifications (user_id, project_id, title, message, notification_type, link)
    VALUES (
      _cu.user_id,
      NEW.project_id,
      'Nova versão: ' || NEW.version_number,
      'O projeto ' || _project_name || ' foi atualizado para a versão ' || NEW.version_number || '.',
      'version',
      '/projeto/' || NEW.project_id || '/versoes'
    );
  END LOOP;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_version_release_notify
  AFTER INSERT ON public.project_versions
  FOR EACH ROW EXECUTE FUNCTION notify_on_version_release();

-- Trigger: notificar quando etapa do projeto muda de status
CREATE OR REPLACE FUNCTION public.notify_on_stage_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _project_name text;
  _cu record;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'completed' THEN
    SELECT name INTO _project_name FROM projects WHERE id = NEW.project_id;
    
    FOR _cu IN 
      SELECT cu.user_id FROM client_users cu
      JOIN projects p ON p.client_id = cu.client_id
      WHERE p.id = NEW.project_id
    LOOP
      INSERT INTO notifications (user_id, project_id, title, message, notification_type, link)
      VALUES (
        _cu.user_id,
        NEW.project_id,
        'Etapa concluída: ' || NEW.stage_name,
        'A etapa "' || NEW.stage_name || '" do projeto ' || _project_name || ' foi concluída.',
        'stage',
        '/projeto/' || NEW.project_id || '/progresso'
      );
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_stage_update_notify
  AFTER UPDATE ON public.project_stages
  FOR EACH ROW EXECUTE FUNCTION notify_on_stage_update();
