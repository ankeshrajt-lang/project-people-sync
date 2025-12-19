CREATE OR REPLACE FUNCTION public.soft_delete_team_member(_member_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _is_admin boolean;
BEGIN
  -- Check if caller is admin
  -- We check both possibilities:
  -- 1. user_roles.user_id matches auth.uid() directly
  -- 2. user_roles links to a team_member that has auth_user_id matching auth.uid()
  SELECT EXISTS (
    SELECT 1 
    FROM public.user_roles ur
    LEFT JOIN public.team_members tm ON tm.id = ur.user_id
    WHERE ur.role = 'admin'
    AND (
      ur.user_id = auth.uid() 
      OR 
      tm.auth_user_id = auth.uid()
    )
  ) INTO _is_admin;

  IF NOT _is_admin THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  UPDATE public.team_members
  SET department = 'Deleted'
  WHERE id = _member_id;
END;
$$;
