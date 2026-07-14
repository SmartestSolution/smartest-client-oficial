-- Add is_public column to documents and videos
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false;
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false;

-- Users can view public documents (any authenticated user)
CREATE POLICY "Users can view public documents"
ON public.documents FOR SELECT
USING (is_public = true AND EXISTS (
  SELECT 1 FROM public.client_users WHERE client_users.user_id = auth.uid()
));

-- Users can view public videos (any authenticated user)
CREATE POLICY "Users can view public videos"
ON public.videos FOR SELECT
USING (is_public = true AND EXISTS (
  SELECT 1 FROM public.client_users WHERE client_users.user_id = auth.uid()
));

-- Users can view their own uploaded documents (private)
CREATE POLICY "Users can view own uploaded documents"
ON public.documents FOR SELECT
USING (uploaded_by = auth.uid());

-- Users can view their own uploaded videos (private)
CREATE POLICY "Users can view own uploaded videos"
ON public.videos FOR SELECT
USING (uploaded_by = auth.uid());
