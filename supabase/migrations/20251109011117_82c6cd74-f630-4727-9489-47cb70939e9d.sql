-- Drop the incorrect foreign key constraint
ALTER TABLE public.files 
DROP CONSTRAINT IF EXISTS files_uploaded_by_fkey;

-- Make uploaded_by nullable to allow uploads without linking to specific users
-- (RLS policies will handle security)
ALTER TABLE public.files 
ALTER COLUMN uploaded_by DROP NOT NULL;