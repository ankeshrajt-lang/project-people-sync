-- Fix RLS policies to restrict access to group members only

-- Drop the overly permissive policies
DROP POLICY IF EXISTS "Authenticated users can do everything with groups" ON public.chat_groups;
DROP POLICY IF EXISTS "Authenticated users can manage messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Authenticated users can manage group members" ON public.chat_group_members;

-- Chat Groups Policies
-- Users can only view groups they are members of
CREATE POLICY "Users can view groups they are members of"
ON public.chat_groups
FOR SELECT
USING (
  is_group_member(auth.uid(), id) OR 
  is_admin(auth.uid())
);

-- Any authenticated user can create a group
CREATE POLICY "Authenticated users can create groups"
ON public.chat_groups
FOR INSERT
WITH CHECK (auth.uid() = created_by);

-- Only group creators can update their groups
CREATE POLICY "Group creators can update their groups"
ON public.chat_groups
FOR UPDATE
USING (
  is_group_creator(auth.uid(), id) OR 
  is_admin(auth.uid())
);

-- Only group creators can delete their groups
CREATE POLICY "Group creators can delete their groups"
ON public.chat_groups
FOR DELETE
USING (
  is_group_creator(auth.uid(), id) OR 
  is_admin(auth.uid())
);

-- Chat Messages Policies
-- Users can only view messages in groups they are members of
CREATE POLICY "Users can view messages in their groups"
ON public.chat_messages
FOR SELECT
USING (
  is_group_member(auth.uid(), group_id) OR 
  is_admin(auth.uid())
);

-- Users can only send messages to groups they are members of
CREATE POLICY "Group members can send messages"
ON public.chat_messages
FOR INSERT
WITH CHECK (
  is_group_member(auth.uid(), group_id) AND
  auth.uid() = sender_id
);

-- Users can update their own messages in groups they are members of
CREATE POLICY "Users can update their own messages"
ON public.chat_messages
FOR UPDATE
USING (
  auth.uid() = sender_id AND
  is_group_member(auth.uid(), group_id)
);

-- Users can delete their own messages or admins can delete any
CREATE POLICY "Users can delete their own messages"
ON public.chat_messages
FOR DELETE
USING (
  auth.uid() = sender_id OR 
  is_admin(auth.uid())
);

-- Chat Group Members Policies
-- Users can view members of groups they belong to
CREATE POLICY "Users can view members of their groups"
ON public.chat_group_members
FOR SELECT
USING (
  is_group_member(auth.uid(), group_id) OR 
  is_admin(auth.uid())
);

-- Group creators can add members to their groups
CREATE POLICY "Group creators can add members"
ON public.chat_group_members
FOR INSERT
WITH CHECK (
  is_group_creator(auth.uid(), group_id) OR 
  is_admin(auth.uid())
);

-- Group creators can update member details
CREATE POLICY "Group creators can update members"
ON public.chat_group_members
FOR UPDATE
USING (
  is_group_creator(auth.uid(), group_id) OR 
  is_admin(auth.uid())
);

-- Group creators can remove members
CREATE POLICY "Group creators can remove members"
ON public.chat_group_members
FOR DELETE
USING (
  is_group_creator(auth.uid(), group_id) OR 
  is_admin(auth.uid())
);