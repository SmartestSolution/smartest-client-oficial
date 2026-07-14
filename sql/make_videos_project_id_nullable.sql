-- Make project_id nullable on videos table to support global trainings
ALTER TABLE public.videos ALTER COLUMN project_id DROP NOT NULL;

-- Drop the existing foreign key constraint and re-create it to allow NULL
-- (Foreign keys already allow NULL by default when column is nullable, no action needed for FK)

-- Update the "Users can view public videos" policy to also include videos without a project_id (global)
-- The existing policy already works since it checks is_public = true
