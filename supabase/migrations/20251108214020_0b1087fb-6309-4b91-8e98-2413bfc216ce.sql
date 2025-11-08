-- Create interviews table
CREATE TABLE public.interviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  interviewee_id UUID REFERENCES public.team_members(id),
  interviewer_name TEXT,
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_minutes INTEGER DEFAULT 60,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.interviews ENABLE ROW LEVEL SECURITY;

-- Create policies for interviews
CREATE POLICY "Users can view all interviews"
ON public.interviews
FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can create interviews"
ON public.interviews
FOR INSERT
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own interviews or admins can update all"
ON public.interviews
FOR UPDATE
USING (auth.uid() = created_by OR is_admin(auth.uid()));

CREATE POLICY "Users can delete their own interviews or admins can delete all"
ON public.interviews
FOR DELETE
USING (auth.uid() = created_by OR is_admin(auth.uid()));

-- Create trigger for updated_at
CREATE TRIGGER update_interviews_updated_at
BEFORE UPDATE ON public.interviews
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();