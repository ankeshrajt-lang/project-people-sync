-- Remove all files from storage first
DELETE FROM storage.objects WHERE bucket_id = 'project-files';

-- Drop the complex folder and access tables
DROP TABLE IF EXISTS public.file_access CASCADE;
DROP TABLE IF EXISTS public.folder_access CASCADE;
DROP TABLE IF EXISTS public.folders CASCADE;

-- Drop the complex functions we don't need
DROP FUNCTION IF EXISTS public.user_can_view_file(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.user_can_view_folder(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.user_has_access_level(uuid, access_level) CASCADE;

-- Simplify the files table - remove folder references
ALTER TABLE public.files DROP COLUMN IF EXISTS folder_id CASCADE;

-- Drop existing RLS policies on files
DROP POLICY IF EXISTS "Users can view files they have access to" ON public.files;
DROP POLICY IF EXISTS "Authenticated users can upload files" ON public.files;
DROP POLICY IF EXISTS "Users can update their own files or admins can update all" ON public.files;
DROP POLICY IF EXISTS "Users can delete their own files or admins can delete all" ON public.files;

-- Create simple RLS policies - everyone can view, authenticated can upload/manage their own
CREATE POLICY "Anyone can view all files"
ON public.files FOR SELECT
TO public
USING (true);

CREATE POLICY "Authenticated users can upload files"
ON public.files FOR INSERT
TO authenticated
WITH CHECK (uploaded_by = auth.uid());

CREATE POLICY "Users can update their own files"
ON public.files FOR UPDATE
TO authenticated
USING (uploaded_by = auth.uid());

CREATE POLICY "Users can delete their own files"
ON public.files FOR DELETE
TO authenticated
USING (uploaded_by = auth.uid());