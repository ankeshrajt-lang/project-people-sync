-- Drop the problematic folders SELECT policy
DROP POLICY IF EXISTS "Users can view folders they have access to" ON public.folders;

-- Create security definer function to check folder access
CREATE OR REPLACE FUNCTION public.user_can_view_folder(_user_id uuid, _folder_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM folders
    WHERE id = _folder_id
    AND (
      created_by = _user_id
      OR is_admin(_user_id)
      OR EXISTS (
        SELECT 1 FROM folder_access
        WHERE folder_id = _folder_id
        AND user_has_access_level(_user_id, access_level)
      )
    )
  )
$$;

-- Recreate folders SELECT policy with security definer function
CREATE POLICY "Users can view folders they have access to"
ON public.folders
FOR SELECT
USING (user_can_view_folder(auth.uid(), id));