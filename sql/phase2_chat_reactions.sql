-- ============================================================
-- FASE 2 — Reações em mensagens de chat
-- (Presença online/ausente é 100% Realtime, não precisa de SQL)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.chat_message_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  emoji text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (message_id, user_id, emoji)
);

-- Grants obrigatórios (PostgREST)
GRANT SELECT, INSERT, DELETE ON public.chat_message_reactions TO authenticated;
GRANT ALL ON public.chat_message_reactions TO service_role;

ALTER TABLE public.chat_message_reactions ENABLE ROW LEVEL SECURITY;

-- Participantes da conversa podem ver as reações
DROP POLICY IF EXISTS "Participants view reactions" ON public.chat_message_reactions;
CREATE POLICY "Participants view reactions" ON public.chat_message_reactions
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.chat_messages m
      JOIN public.chat_conversations c ON c.id = m.conversation_id
      WHERE m.id = chat_message_reactions.message_id
        AND (c.client_user_id = auth.uid() OR public.is_admin())
    )
  );

-- Usuário só insere reação em nome próprio e em conversa que participa
DROP POLICY IF EXISTS "Users add own reactions" ON public.chat_message_reactions;
CREATE POLICY "Users add own reactions" ON public.chat_message_reactions
  FOR INSERT TO authenticated WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.chat_messages m
      JOIN public.chat_conversations c ON c.id = m.conversation_id
      WHERE m.id = chat_message_reactions.message_id
        AND (c.client_user_id = auth.uid() OR public.is_admin())
    )
  );

-- Usuário só remove a própria reação
DROP POLICY IF EXISTS "Users remove own reactions" ON public.chat_message_reactions;
CREATE POLICY "Users remove own reactions" ON public.chat_message_reactions
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Habilita Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_message_reactions;
