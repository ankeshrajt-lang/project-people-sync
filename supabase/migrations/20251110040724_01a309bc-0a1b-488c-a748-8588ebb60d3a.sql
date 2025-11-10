-- Add RLS policy for deleting files from the files table
DROP POLICY IF EXISTS "Users can delete their own files" ON public.files;
CREATE POLICY "Users can delete their own files"
ON public.files
FOR DELETE
TO authenticated
USING (auth.uid() = uploaded_by);

-- Add RLS policy for deleting files from storage
DROP POLICY IF EXISTS "Users can delete their own files" ON storage.objects;
CREATE POLICY "Users can delete their own files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'project-files' AND
  auth.uid()::text = (storage.foldername(name))[1]
);