-- Add password fields to consultants table for tracking login credentials
ALTER TABLE public.consultants
ADD COLUMN linkedin_username text,
ADD COLUMN linkedin_password text,
ADD COLUMN indeed_username text,
ADD COLUMN indeed_password text,
ADD COLUMN monster_username text,
ADD COLUMN monster_password text,
ADD COLUMN dice_username text,
ADD COLUMN dice_password text,
ADD COLUMN ziprecruiter_username text,
ADD COLUMN ziprecruiter_password text;

-- Add last_seen tracking to team_members
ALTER TABLE public.team_members
ADD COLUMN last_seen timestamp with time zone DEFAULT now();

-- Create function to update last_seen
CREATE OR REPLACE FUNCTION public.update_team_member_last_seen()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.team_members
  SET last_seen = now()
  WHERE auth_user_id = auth.uid();
END;
$$;