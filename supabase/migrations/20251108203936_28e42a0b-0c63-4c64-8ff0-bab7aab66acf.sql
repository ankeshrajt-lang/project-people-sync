-- Drop the existing foreign key constraint FIRST
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_fkey;

-- Now update all user_roles to use auth_user_id from team_members
UPDATE public.user_roles ur
SET user_id = tm.auth_user_id
FROM public.team_members tm
WHERE ur.user_id = tm.id AND tm.auth_user_id IS NOT NULL;

-- Delete any user_roles that don't have a corresponding auth_user_id
DELETE FROM public.user_roles ur
WHERE NOT EXISTS (
  SELECT 1 FROM auth.users au WHERE au.id = ur.user_id
);

-- Add new foreign key constraint to auth.users
ALTER TABLE public.user_roles 
ADD CONSTRAINT user_roles_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES auth.users(id) 
ON DELETE CASCADE;