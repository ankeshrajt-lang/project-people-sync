-- Allow viewing files without uploaded_by (legacy files) or files user uploaded
DROP POLICY IF EXISTS "Users can view files they have access to" ON public.files;

CREATE POLICY "Users can view files they have access to"
ON public.files
FOR SELECT
TO authenticated
USING (
  -- User uploaded the file
  uploaded_by = auth.uid() 
  OR 
  -- File has no uploaded_by (legacy)
  uploaded_by IS NULL
  OR
  -- User has access via file_access
  EXISTS (
    SELECT 1 FROM file_access
    WHERE file_access.file_id = files.id 
    AND user_has_access_level(auth.uid(), file_access.access_level)
  )
  OR
  -- User has access via folder_access
  (
    folder_id IS NOT NULL 
    AND EXISTS (
      SELECT 1 FROM folder_access
      WHERE folder_access.folder_id = files.folder_id 
      AND user_has_access_level(auth.uid(), folder_access.access_level)
    )
  )
);