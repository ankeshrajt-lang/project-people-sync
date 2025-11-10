-- Fix storage deletion policy to allow users to delete files from public bucket
DROP POLICY IF EXISTS "Users can delete their own files" ON storage.objects;

-- Allow authenticated users to delete files from the public project-files bucket
CREATE POLICY "Allow file deletion from project-files bucket"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'project-files');