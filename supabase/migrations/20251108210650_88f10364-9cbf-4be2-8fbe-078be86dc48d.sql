-- Fix file_access RLS policy to allow inserts
DROP POLICY IF EXISTS "File uploaders and admins can manage file access" ON public.file_access;

-- Create separate policies for better control
CREATE POLICY "Users can insert file access for their files"
ON public.file_access
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.files
    WHERE files.id = file_access.file_id 
    AND files.uploaded_by = auth.uid()
  ) OR is_admin(auth.uid())
);

CREATE POLICY "Users can update file access for their files"
ON public.file_access
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.files
    WHERE files.id = file_access.file_id 
    AND files.uploaded_by = auth.uid()
  ) OR is_admin(auth.uid())
);

CREATE POLICY "Users can delete file access for their files"
ON public.file_access
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.files
    WHERE files.id = file_access.file_id 
    AND files.uploaded_by = auth.uid()
  ) OR is_admin(auth.uid())
);