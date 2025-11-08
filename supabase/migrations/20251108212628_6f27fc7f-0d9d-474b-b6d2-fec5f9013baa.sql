-- Fix files SELECT policy to properly handle NULL uploaded_by
DROP POLICY IF EXISTS "Users can view files they have access to" ON public.files;

CREATE POLICY "Users can view files they have access to"
ON public.files
FOR SELECT
USING (
  -- Allow viewing files uploaded by the user
  uploaded_by = auth.uid()
  OR
  -- Allow viewing files with NULL uploaded_by (legacy files)
  uploaded_by IS NULL
  OR
  -- Allow viewing files based on file_access
  EXISTS (
    SELECT 1 FROM file_access
    WHERE file_access.file_id = files.id
    AND user_has_access_level(auth.uid(), file_access.access_level)
  )
  OR
  -- Allow viewing files in folders with folder_access
  (
    folder_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM folder_access
      WHERE folder_access.folder_id = files.folder_id
      AND user_has_access_level(auth.uid(), folder_access.access_level)
    )
  )
);