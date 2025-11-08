-- Create role enum
CREATE TYPE public.app_role AS ENUM ('team_member', 'team_lead', 'manager');

-- Create user_roles table for proper role management
CREATE TABLE public.user_roles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.team_members(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'team_member',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create policy for user_roles
CREATE POLICY "Allow all operations on user_roles" 
ON public.user_roles 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
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
      AND role = _role
  )
$$;

-- Create task_history table for audit trail
CREATE TABLE public.task_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id uuid REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
  changed_by uuid REFERENCES public.team_members(id) ON DELETE SET NULL,
  action text NOT NULL,
  field_name text,
  old_value text,
  new_value text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on task_history
ALTER TABLE public.task_history ENABLE ROW LEVEL SECURITY;

-- Create policy for task_history
CREATE POLICY "Allow all operations on task_history" 
ON public.task_history 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Add task_id to files table
ALTER TABLE public.files 
ADD COLUMN task_id uuid REFERENCES public.tasks(id) ON DELETE SET NULL;

-- Add role column to team_members
ALTER TABLE public.team_members 
ADD COLUMN department text;