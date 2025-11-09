-- Drop ALL existing policies on chat_groups
DROP POLICY IF EXISTS "Authenticated users can create groups" ON public.chat_groups;
DROP POLICY IF EXISTS "Users can view groups they are members of" ON public.chat_groups;
DROP POLICY IF EXISTS "Group creators can update their groups" ON public.chat_groups;
DROP POLICY IF EXISTS "Group creators can delete their groups" ON public.chat_groups;

-- Create simple, working policies
-- Allow authenticated users to insert groups
CREATE POLICY "Anyone authenticated can create groups"
ON public.chat_groups FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow users to view groups they're members of using security definer function
CREATE POLICY "Users can view their groups"
ON public.chat_groups FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.chat_group_members
    WHERE group_id = chat_groups.id
    AND user_id = auth.uid()
  )
);

-- Allow group creators to update their groups
CREATE POLICY "Creators can update groups"
ON public.chat_groups FOR UPDATE
TO authenticated
USING (created_by = auth.uid());

-- Allow group creators to delete their groups
CREATE POLICY "Creators can delete groups"
ON public.chat_groups FOR DELETE
TO authenticated
USING (created_by = auth.uid());