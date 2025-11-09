-- Update team_members RLS policies to restrict editing to admins only
DROP POLICY IF EXISTS "Admins can update all team members" ON public.team_members;
DROP POLICY IF EXISTS "Admins can delete team members" ON public.team_members;
DROP POLICY IF EXISTS "Allow all operations on team_members" ON public.team_members;

-- Everyone can view team members
CREATE POLICY "Everyone can view team members"
ON public.team_members FOR SELECT
TO public
USING (true);

-- Only admins can insert team members
CREATE POLICY "Only admins can add team members"
ON public.team_members FOR INSERT
TO authenticated
WITH CHECK (is_admin(auth.uid()));

-- Only admins can update team members
CREATE POLICY "Only admins can update team members"
ON public.team_members FOR UPDATE
TO authenticated
USING (is_admin(auth.uid()));

-- Only admins can delete team members
CREATE POLICY "Only admins can delete team members"
ON public.team_members FOR DELETE
TO authenticated
USING (is_admin(auth.uid()));

-- Create chat groups table
CREATE TABLE public.chat_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create chat group members table
CREATE TABLE public.chat_group_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.chat_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(group_id, user_id)
);

-- Create chat messages table
CREATE TABLE public.chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.chat_groups(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on chat tables
ALTER TABLE public.chat_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Chat groups policies
CREATE POLICY "Users can view groups they are members of"
ON public.chat_groups FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.chat_group_members
    WHERE group_id = chat_groups.id
    AND user_id = auth.uid()
  )
);

CREATE POLICY "Authenticated users can create groups"
ON public.chat_groups FOR INSERT
TO authenticated
WITH CHECK (created_by = auth.uid());

CREATE POLICY "Group creators can update their groups"
ON public.chat_groups FOR UPDATE
TO authenticated
USING (created_by = auth.uid());

CREATE POLICY "Group creators can delete their groups"
ON public.chat_groups FOR DELETE
TO authenticated
USING (created_by = auth.uid());

-- Chat group members policies
CREATE POLICY "Users can view group members for their groups"
ON public.chat_group_members FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.chat_group_members cgm
    WHERE cgm.group_id = chat_group_members.group_id
    AND cgm.user_id = auth.uid()
  )
);

CREATE POLICY "Group creators can add members"
ON public.chat_group_members FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.chat_groups
    WHERE id = group_id
    AND created_by = auth.uid()
  )
);

CREATE POLICY "Group creators can remove members"
ON public.chat_group_members FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.chat_groups
    WHERE id = group_id
    AND created_by = auth.uid()
  )
);

-- Chat messages policies
CREATE POLICY "Users can view messages in their groups"
ON public.chat_messages FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.chat_group_members
    WHERE group_id = chat_messages.group_id
    AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can send messages to their groups"
ON public.chat_messages FOR INSERT
TO authenticated
WITH CHECK (
  sender_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.chat_group_members
    WHERE group_id = chat_messages.group_id
    AND user_id = auth.uid()
  )
);

-- Enable realtime for chat messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;

-- Create triggers for updated_at
CREATE TRIGGER update_chat_groups_updated_at
BEFORE UPDATE ON public.chat_groups
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();