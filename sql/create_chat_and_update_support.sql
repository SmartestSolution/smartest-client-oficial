-- Add project_id to support_tickets
ALTER TABLE public.support_tickets
  ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL;

-- Create chat_conversations table
CREATE TABLE IF NOT EXISTS public.chat_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  client_user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(project_id, client_user_id)
);

ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage chat_conversations" ON public.chat_conversations
  FOR ALL TO public USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Users can view own conversations" ON public.chat_conversations
  FOR SELECT TO public USING (client_user_id = auth.uid());

CREATE POLICY "Users can create own conversations" ON public.chat_conversations
  FOR INSERT TO public WITH CHECK (client_user_id = auth.uid());

-- Create chat_messages table
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  content text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage chat_messages" ON public.chat_messages
  FOR ALL TO public USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Users can view own conversation messages" ON public.chat_messages
  FOR SELECT TO public 
  USING (EXISTS (
    SELECT 1 FROM public.chat_conversations c 
    WHERE c.id = chat_messages.conversation_id AND c.client_user_id = auth.uid()
  ));

CREATE POLICY "Users can insert own conversation messages" ON public.chat_messages
  FOR INSERT TO public 
  WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.chat_conversations c 
      WHERE c.id = chat_messages.conversation_id AND c.client_user_id = auth.uid()
    )
  );

-- Enable realtime for chat_messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;

-- Update trigger for chat_conversations
CREATE TRIGGER update_chat_conversations_updated_at
  BEFORE UPDATE ON public.chat_conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
