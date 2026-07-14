-- Create storage bucket for videos
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('videos', 'videos', false, 524288000) -- 500MB limit
ON CONFLICT (id) DO NOTHING;

-- RLS policies for videos bucket
CREATE POLICY "Admins can upload videos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'videos' AND
  public.is_admin()
);

CREATE POLICY "Admins can update videos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'videos' AND
  public.is_admin()
);

CREATE POLICY "Admins can delete videos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'videos' AND
  public.is_admin()
);

CREATE POLICY "Users can view videos of their projects"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'videos' AND
  (
    public.is_admin() OR
    EXISTS (
      SELECT 1 FROM public.videos v
      JOIN public.projects p ON p.id = v.project_id
      JOIN public.client_users cu ON cu.client_id = p.client_id
      WHERE cu.user_id = auth.uid()
      AND v.video_url LIKE '%' || storage.objects.name || '%'
    )
  )
);