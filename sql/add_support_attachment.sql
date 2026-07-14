-- Add attachment_url column to support_tickets
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS attachment_url text DEFAULT NULL;

-- Storage policy: allow authenticated users to upload to support folder in documents bucket
CREATE POLICY "Users can upload support attachments"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = 'support'
  AND auth.role() = 'authenticated'
);

-- Storage policy: allow users to read support attachments
CREATE POLICY "Users can read support attachments"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = 'support'
  AND auth.role() = 'authenticated'
);

-- Storage policy: allow admins to delete support attachments
CREATE POLICY "Admins can delete support attachments"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = 'support'
  AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);
