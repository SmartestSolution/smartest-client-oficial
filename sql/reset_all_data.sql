-- =====================================================================
-- RESET DE DADOS — apaga TODO o conteúdo do portal, mantendo os usuários
-- (auth.users, profiles e user_roles permanecem intactos).
--
-- Como usar: Supabase → SQL Editor → cole tudo → Run.
-- ATENÇÃO: esta operação é irreversível. Faça um backup antes se precisar.
-- =====================================================================

BEGIN;

TRUNCATE TABLE
  -- Chat
  public.chat_message_reactions,
  public.chat_messages,
  public.chat_conversations,

  -- Suporte / notificações / auditoria
  public.support_tickets,
  public.notifications,
  public.audit_logs,

  -- Documentos e vídeos
  public.document_comments,
  public.documents,
  public.videos,

  -- Evoluções
  public.evolution_stage_items,
  public.evolution_stages,
  public.project_evolutions,

  -- Estrutura de projeto
  public.project_stage_items,
  public.project_stages,
  public.project_milestones,
  public.project_announcements,
  public.project_versions,
  public.dashboard_links,

  -- Templates
  public.project_template_stage_items,
  public.project_template_stages,
  public.project_template_milestones,
  public.project_templates,

  -- Vínculos, projetos e empresas
  public.project_users,
  public.client_users,
  public.projects,
  public.clients
RESTART IDENTITY CASCADE;

COMMIT;

-- Confirmação: usuários preservados
SELECT
  (SELECT count(*) FROM auth.users)        AS usuarios,
  (SELECT count(*) FROM public.profiles)   AS perfis,
  (SELECT count(*) FROM public.user_roles) AS papeis,
  (SELECT count(*) FROM public.projects)   AS projetos,
  (SELECT count(*) FROM public.clients)    AS empresas;

-- =====================================================================
-- OPCIONAL: limpar também os arquivos já enviados no Storage
-- (rode apenas se quiser apagar documentos/vídeos/anexos do bucket)
-- =====================================================================
-- DELETE FROM storage.objects WHERE bucket_id IN ('documents','videos','chat-attachments','client-assets');
