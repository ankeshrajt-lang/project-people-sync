-- Create consultants table to store consultant information
CREATE TABLE public.consultants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  linkedin_url TEXT,
  indeed_url TEXT,
  monster_url TEXT,
  dice_url TEXT,
  ziprecruiter_url TEXT,
  date_of_birth DATE,
  drivers_license_number TEXT,
  drivers_license_state TEXT,
  drivers_license_expiry DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create job_applications table to track applications
CREATE TABLE public.job_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  consultant_id UUID NOT NULL REFERENCES public.consultants(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Applied',
  role TEXT,
  career_url TEXT,
  date_applied DATE,
  resume_version TEXT,
  jobs_applied_count INTEGER DEFAULT 1,
  employment_type TEXT,
  work_type TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.consultants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;

-- Create simple policies for authenticated users
CREATE POLICY "Authenticated users can manage consultants"
ON public.consultants FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Authenticated users can manage job applications"
ON public.job_applications FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Create triggers for updated_at
CREATE TRIGGER update_consultants_updated_at
BEFORE UPDATE ON public.consultants
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_job_applications_updated_at
BEFORE UPDATE ON public.job_applications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();