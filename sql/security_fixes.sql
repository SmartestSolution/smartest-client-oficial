-- ============================================================
-- Security fixes from scan results
-- ============================================================

-- 1) Restrict notifications INSERT (was WITH CHECK true) ------
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;

-- Only admins (and service role / SECURITY DEFINER triggers which bypass RLS) can insert
CREATE POLICY "Admins can insert notifications"
  ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

-- 2) chat-attachments storage policies -----------------------
-- Path convention: {user_id}/{conversation_id}/{filename}
DROP POLICY IF EXISTS "Authenticated can upload chat attachments" ON storage.objects;
CREATE POLICY "Users upload own chat attachments"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'chat-attachments'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND EXISTS (
      SELECT 1 FROM public.chat_conversations c
      WHERE c.id::text = (storage.foldername(name))[2]
        AND (c.client_user_id = auth.uid() OR public.is_admin())
    )
  );

DROP POLICY IF EXISTS "Authenticated can read chat attachments" ON storage.objects;
CREATE POLICY "Participants read chat attachments"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'chat-attachments'
    AND (
      public.is_admin()
      OR EXISTS (
        SELECT 1 FROM public.chat_conversations c
        WHERE c.id::text = (storage.foldername(name))[2]
          AND c.client_user_id = auth.uid()
      )
    )
  );

-- 3) Support attachments: restrict reads to ticket owner or admin
DROP POLICY IF EXISTS "Users can read support attachments" ON storage.objects;
CREATE POLICY "Owners or admins read support attachments"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] = 'support'
    AND (
      public.is_admin()
      OR EXISTS (
        SELECT 1 FROM public.support_tickets t
        WHERE t.attachment_url = storage.objects.name
          AND t.user_id = auth.uid()
      )
    )
  );

-- Also restrict upload path to user's own folder under support/
DROP POLICY IF EXISTS "Users can upload support attachments" ON storage.objects;
CREATE POLICY "Users upload own support attachments"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] = 'support'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );
