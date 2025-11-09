-- Drop the problematic policies
DROP POLICY IF EXISTS "Users can view group members for their groups" ON public.chat_group_members;
DROP POLICY IF EXISTS "Group creators can add members" ON public.chat_group_members;
DROP POLICY IF EXISTS "Group creators can remove members" ON public.chat_group_members;
DROP POLICY IF EXISTS "Users can view messages in their groups" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can send messages to their groups" ON public.chat_messages;

-- Create a security definer function to check group membership
CREATE OR REPLACE FUNCTION public.is_group_member(_user_id uuid, _group_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.chat_group_members
    WHERE user_id = _user_id
      AND group_id = _group_id
  )
$$;

-- Create a security definer function to check if user is group creator
CREATE OR REPLACE FUNCTION public.is_group_creator(_user_id uuid, _group_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.chat_groups
    WHERE id = _group_id
      AND created_by = _user_id
  )
$$;

-- Recreate chat_group_members policies using security definer functions
CREATE POLICY "Users can view group members for their groups"
ON public.chat_group_members FOR SELECT
TO authenticated
USING (public.is_group_member(auth.uid(), group_id));

CREATE POLICY "Group creators can add members"
ON public.chat_group_members FOR INSERT
TO authenticated
WITH CHECK (public.is_group_creator(auth.uid(), group_id));

CREATE POLICY "Group creators can remove members"
ON public.chat_group_members FOR DELETE
TO authenticated
USING (public.is_group_creator(auth.uid(), group_id));

-- Recreate chat_messages policies using security definer function
CREATE POLICY "Users can view messages in their groups"
ON public.chat_messages FOR SELECT
TO authenticated
USING (public.is_group_member(auth.uid(), group_id));

CREATE POLICY "Users can send messages to their groups"
ON public.chat_messages FOR INSERT
TO authenticated
WITH CHECK (
  sender_id = auth.uid()
  AND public.is_group_member(auth.uid(), group_id)
);

-- Add last_seen to chat_group_members table
ALTER TABLE public.chat_group_members ADD COLUMN IF NOT EXISTS last_seen TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Create a function to update last seen
CREATE OR REPLACE FUNCTION public.update_last_seen(_group_id uuid, _user_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.chat_group_members
  SET last_seen = now()
  WHERE group_id = _group_id
    AND user_id = _user_id
$$;