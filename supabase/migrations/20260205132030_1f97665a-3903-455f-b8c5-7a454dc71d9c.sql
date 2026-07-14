-- Add customization fields to clients table
ALTER TABLE public.clients
ADD COLUMN logo_url text,
ADD COLUMN sidebar_color text DEFAULT '#1A1F2C';

-- Add avatar_url to profiles table
ALTER TABLE public.profiles
ADD COLUMN avatar_url text;

-- Create a storage bucket for client logos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('client-assets', 'client-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Create a storage bucket for user avatars
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for client-assets bucket (public read, admin write)
CREATE POLICY "Public can view client assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'client-assets');

CREATE POLICY "Admins can upload client assets"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'client-assets' AND public.is_admin());

CREATE POLICY "Admins can update client assets"
ON storage.objects FOR UPDATE
USING (bucket_id = 'client-assets' AND public.is_admin());

CREATE POLICY "Admins can delete client assets"
ON storage.objects FOR DELETE
USING (bucket_id = 'client-assets' AND public.is_admin());

-- RLS policies for avatars bucket (users can manage their own, admins can manage all)
CREATE POLICY "Public can view avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload own avatar"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update own avatar"
ON storage.objects FOR UPDATE
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own avatar"
ON storage.objects FOR DELETE
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);