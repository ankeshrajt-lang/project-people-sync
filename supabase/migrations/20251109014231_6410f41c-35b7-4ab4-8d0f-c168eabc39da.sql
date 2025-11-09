-- Simplify ALL chat and attendance policies - make them fully accessible

-- Drop all existing chat_groups policies
DROP POLICY IF EXISTS "Anyone authenticated can create groups" ON public.chat_groups;
DROP POLICY IF EXISTS "Users can view their groups" ON public.chat_groups;
DROP POLICY IF EXISTS "Creators can update groups" ON public.chat_groups;
DROP POLICY IF EXISTS "Creators can delete groups" ON public.chat_groups;

-- Drop all existing chat_group_members policies
DROP POLICY IF EXISTS "Users can view group members for their groups" ON public.chat_group_members;
DROP POLICY IF EXISTS "Group creators can add members" ON public.chat_group_members;
DROP POLICY IF EXISTS "Group creators can remove members" ON public.chat_group_members;

-- Drop all existing chat_messages policies
DROP POLICY IF EXISTS "Users can view messages in their groups" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can send messages to their groups" ON public.chat_messages;

-- Drop all existing attendance policies
DROP POLICY IF EXISTS "Allow all operations on attendance" ON public.attendance;

-- Create simple, permissive policies

-- CHAT GROUPS - Allow all operations for authenticated users
CREATE POLICY "Authenticated users can do everything with groups"
ON public.chat_groups FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- CHAT GROUP MEMBERS - Allow all operations for authenticated users
CREATE POLICY "Authenticated users can manage group members"
ON public.chat_group_members FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- CHAT MESSAGES - Allow all operations for authenticated users
CREATE POLICY "Authenticated users can manage messages"
ON public.chat_messages FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- ATTENDANCE - Allow all operations for authenticated users
CREATE POLICY "Authenticated users can manage attendance"
ON public.attendance FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);