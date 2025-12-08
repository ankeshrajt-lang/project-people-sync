-- Add reminder_sent column to interviews table
ALTER TABLE public.interviews 
ADD COLUMN IF NOT EXISTS reminder_sent boolean NOT NULL DEFAULT false;