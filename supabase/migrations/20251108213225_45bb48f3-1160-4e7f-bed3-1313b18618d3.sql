-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view files they have access to" ON public.files;
DROP POLICY IF EXISTS "Users can view file access they have permission for" ON public.file_access;
DROP POLICY IF EXISTS "Users can view folder access they have permission for" ON public.folder_access;

-- Create security definer functions to avoid recursion
CREATE OR REPLACE FUNCTION public.user_can_view_file(_user_id uuid, _file_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM files
    WHERE id = _file_id
    AND (
      uploaded_by = _user_id
      OR uploaded_by IS NULL
      OR EXISTS (
        SELECT 1 FROM file_access
        WHERE file_id = _file_id
        AND user_has_access_level(_user_id, access_level)
      )
      OR (
        folder_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM folder_access
          WHERE folder_id = files.folder_id
          AND user_has_access_level(_user_id, access_level)
        )
      )
    )
  )
$$;

-- Recreate files SELECT policy with security definer function
CREATE POLICY "Users can view files they have access to"
ON public.files
FOR SELECT
USING (user_can_view_file(auth.uid(), id));

-- Recreate file_access SELECT policy - allow viewing if user can see the file or is the uploader
CREATE POLICY "Users can view file access they have permission for"
ON public.file_access
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM files
    WHERE files.id = file_access.file_id
    AND (files.uploaded_by = auth.uid() OR is_admin(auth.uid()))
  )
);

-- Recreate folder_access SELECT policy - allow viewing if user created the folder or is admin
CREATE POLICY "Users can view folder access they have permission for"
ON public.folder_access
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM folders
    WHERE folders.id = folder_access.folder_id
    AND (folders.created_by = auth.uid() OR is_admin(auth.uid()))
  )
);