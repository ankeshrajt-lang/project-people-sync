-- Make sure the files table RLS allows authenticated users to insert with their own user_id
DROP POLICY IF EXISTS "Authenticated users can upload files" ON public.files;

CREATE POLICY "Authenticated users can upload files"
ON public.files
FOR INSERT
TO authenticated
WITH CHECK (uploaded_by = auth.uid());