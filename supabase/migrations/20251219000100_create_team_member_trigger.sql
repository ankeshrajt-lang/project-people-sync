CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _role text;
BEGIN
  -- 1. Create Profile
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );

  -- 2. Check Role from Metadata
  _role := NEW.raw_user_meta_data->>'role';

  -- 3. If Employee, create Team Member entry
  IF _role = 'employee' THEN
    INSERT INTO public.team_members (
      auth_user_id,
      email,
      name,
      role,
      department
    )
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
      'Team Member', -- Default role
      'Engineering'  -- Default department
    );
  END IF;

  RETURN NEW;
END;
$$;
