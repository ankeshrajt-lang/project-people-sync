-- Drop and recreate the chat_groups INSERT policy to be simpler
DROP POLICY IF EXISTS "Authenticated users can create groups" ON public.chat_groups;

-- Allow any authenticated user to create groups
-- The created_by field will be set by the application
CREATE POLICY "Authenticated users can create groups"
ON public.chat_groups FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);