-- Drop the existing INSERT policy
DROP POLICY IF EXISTS "Authenticated users can upload files" ON public.files;

-- Create a simpler INSERT policy that just requires authentication
CREATE POLICY "Authenticated users can upload files"
ON public.files FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
);