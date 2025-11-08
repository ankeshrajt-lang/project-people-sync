-- Drop and recreate the INSERT policy for files
DROP POLICY IF EXISTS "Authenticated users can upload files" ON public.files;

-- Create a proper INSERT policy that allows authenticated users to upload files
CREATE POLICY "Authenticated users can upload files"
ON public.files
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  AND (uploaded_by = auth.uid() OR uploaded_by IS NULL)
);