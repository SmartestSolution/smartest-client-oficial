-- Add content_type column to videos table to support both videos and PDFs
ALTER TABLE public.videos 
ADD COLUMN content_type text NOT NULL DEFAULT 'video';

-- Add check constraint for valid content types
ALTER TABLE public.videos 
ADD CONSTRAINT videos_content_type_check 
CHECK (content_type IN ('video', 'pdf'));

-- Update column comment
COMMENT ON COLUMN public.videos.content_type IS 'Type of training content: video or pdf';