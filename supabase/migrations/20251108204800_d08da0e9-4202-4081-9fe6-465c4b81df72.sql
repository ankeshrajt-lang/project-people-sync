-- Create folders table
CREATE TABLE public.folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  parent_folder_id uuid REFERENCES public.folders(id) ON DELETE CASCADE,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create access levels enum
CREATE TYPE public.access_level AS ENUM ('admin', 'manager', 'team_lead', 'team_member', 'public');

-- Create folder access control table
CREATE TABLE public.folder_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id uuid REFERENCES public.folders(id) ON DELETE CASCADE NOT NULL,
  access_level public.access_level NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create file access control table
CREATE TABLE public.file_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id uuid REFERENCES public.files(id) ON DELETE CASCADE NOT NULL,
  access_level public.access_level NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Add folder_id to files table
ALTER TABLE public.files ADD COLUMN folder_id uuid REFERENCES public.folders(id) ON DELETE SET NULL;

-- Enable RLS on new tables
ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.folder_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.file_access ENABLE ROW LEVEL SECURITY;

-- Create function to check user access level
CREATE OR REPLACE FUNCTION public.user_has_access_level(_user_id uuid, _required_level public.access_level)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
    AND (
      (role = 'admin' AND _required_level IN ('admin', 'manager', 'team_lead', 'team_member', 'public')) OR
      (role = 'manager' AND _required_level IN ('manager', 'team_lead', 'team_member', 'public')) OR
      (role = 'team_lead' AND _required_level IN ('team_lead', 'team_member', 'public')) OR
      (role = 'team_member' AND _required_level IN ('team_member', 'public'))
    )
  ) OR _required_level = 'public'
$$;

-- RLS policies for folders
CREATE POLICY "Users can view folders they have access to"
ON public.folders
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.folder_access
    WHERE folder_id = folders.id
    AND user_has_access_level(auth.uid(), access_level)
  ) OR created_by = auth.uid()
);

CREATE POLICY "Authenticated users can create folders"
ON public.folders
FOR INSERT
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own folders or admins can update all"
ON public.folders
FOR UPDATE
USING (created_by = auth.uid() OR is_admin(auth.uid()));

CREATE POLICY "Users can delete their own folders or admins can delete all"
ON public.folders
FOR DELETE
USING (created_by = auth.uid() OR is_admin(auth.uid()));

-- RLS policies for folder_access
CREATE POLICY "Users can view folder access they have permission for"
ON public.folder_access
FOR SELECT
USING (
  user_has_access_level(auth.uid(), access_level) OR
  EXISTS (SELECT 1 FROM public.folders WHERE id = folder_id AND created_by = auth.uid())
);

CREATE POLICY "Folder creators and admins can manage folder access"
ON public.folder_access
FOR ALL
USING (
  EXISTS (SELECT 1 FROM public.folders WHERE id = folder_id AND created_by = auth.uid()) OR
  is_admin(auth.uid())
);

-- RLS policies for file_access
CREATE POLICY "Users can view file access they have permission for"
ON public.file_access
FOR SELECT
USING (
  user_has_access_level(auth.uid(), access_level) OR
  EXISTS (SELECT 1 FROM public.files WHERE id = file_id AND uploaded_by = auth.uid())
);

CREATE POLICY "File uploaders and admins can manage file access"
ON public.file_access
FOR ALL
USING (
  EXISTS (SELECT 1 FROM public.files WHERE id = file_id AND uploaded_by = auth.uid()) OR
  is_admin(auth.uid())
);

-- Update files RLS to consider folder access
DROP POLICY IF EXISTS "Allow all operations on files" ON public.files;

CREATE POLICY "Users can view files they have access to"
ON public.files
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.file_access
    WHERE file_id = files.id
    AND user_has_access_level(auth.uid(), access_level)
  ) OR 
  uploaded_by = auth.uid() OR
  (folder_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.folder_access
    WHERE folder_id = files.folder_id
    AND user_has_access_level(auth.uid(), access_level)
  ))
);

CREATE POLICY "Authenticated users can upload files"
ON public.files
FOR INSERT
WITH CHECK (auth.uid() = uploaded_by);

CREATE POLICY "Users can update their own files or admins can update all"
ON public.files
FOR UPDATE
USING (uploaded_by = auth.uid() OR is_admin(auth.uid()));

CREATE POLICY "Users can delete their own files or admins can delete all"
ON public.files
FOR DELETE
USING (uploaded_by = auth.uid() OR is_admin(auth.uid()));

-- Create trigger for updating folders updated_at
CREATE TRIGGER update_folders_updated_at
BEFORE UPDATE ON public.folders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();