-- 1. Add is_approved column to team_members for admin approval
ALTER TABLE public.team_members ADD COLUMN IF NOT EXISTS is_approved boolean DEFAULT false;

-- 2. Update handle_new_user function to create team member for employees
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _role text;
BEGIN
  -- 1. Create Profile (Standard)
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );

  -- 2. Check Role from Metadata
  _role := NEW.raw_user_meta_data->>'role';

  -- 3. If Employee, create Team Member entry (pending approval)
  IF _role = 'employee' THEN
    INSERT INTO public.team_members (
      auth_user_id,
      email,
      name,
      role,
      department,
      is_approved
    )
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
      'Team Member',
      'Pending',
      false
    );
  END IF;

  RETURN NEW;
END;
$$;

-- 3. Create trigger if not exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Replace soft delete with hard delete function
DROP FUNCTION IF EXISTS public.soft_delete_team_member(uuid);

CREATE OR REPLACE FUNCTION public.hard_delete_team_member(_member_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _is_admin boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 
    FROM public.user_roles ur
    WHERE ur.role = 'admin'
    AND ur.user_id = auth.uid()
  ) INTO _is_admin;

  IF NOT _is_admin THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  DELETE FROM public.team_members WHERE id = _member_id;
END;
$$;

-- 5. Create function to approve team member
CREATE OR REPLACE FUNCTION public.approve_team_member(_member_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _is_admin boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 
    FROM public.user_roles ur
    WHERE ur.role = 'admin'
    AND ur.user_id = auth.uid()
  ) INTO _is_admin;

  IF NOT _is_admin THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  UPDATE public.team_members 
  SET is_approved = true, department = 'Engineering'
  WHERE id = _member_id;
END;
$$;