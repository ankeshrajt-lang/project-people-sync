-- First, ensure the storage bucket exists and is public
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('project-files', 'project-files', true, 52428800, NULL)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Drop existing storage policies
DROP POLICY IF EXISTS "Anyone can view files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload files to project-files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own files" ON storage.objects;

-- Create simple storage policies
CREATE POLICY "Anyone can view project files"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'project-files');

CREATE POLICY "Authenticated users can upload to project-files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'project-files');

CREATE POLICY "Users can delete their own uploaded files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'project-files' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Simplify the files table INSERT policy
DROP POLICY IF EXISTS "Authenticated users can upload files" ON public.files;

CREATE POLICY "Authenticated users can upload files"
ON public.files FOR INSERT
TO authenticated
WITH CHECK (uploaded_by = auth.uid());