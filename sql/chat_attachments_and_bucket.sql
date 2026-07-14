-- Add attachment fields to chat messages
ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS attachment_url text,
  ADD COLUMN IF NOT EXISTS attachment_name text,
  ADD COLUMN IF NOT EXISTS attachment_type text,
  ADD COLUMN IF NOT EXISTS attachment_size bigint;

-- Create chat-attachments bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-attachments', 'chat-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies on storage.objects for chat-attachments
DROP POLICY IF EXISTS "Authenticated can upload chat attachments" ON storage.objects;
CREATE POLICY "Authenticated can upload chat attachments"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'chat-attachments');

DROP POLICY IF EXISTS "Authenticated can read chat attachments" ON storage.objects;
CREATE POLICY "Authenticated can read chat attachments"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'chat-attachments');

DROP POLICY IF EXISTS "Owner can delete chat attachments" ON storage.objects;
CREATE POLICY "Owner can delete chat attachments"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'chat-attachments' AND owner = auth.uid());
