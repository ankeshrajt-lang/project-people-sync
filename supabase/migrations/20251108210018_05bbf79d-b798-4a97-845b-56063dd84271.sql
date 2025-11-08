-- Add parent task support for subtasks
ALTER TABLE public.tasks
ADD COLUMN parent_task_id uuid REFERENCES public.tasks(id) ON DELETE CASCADE;

-- Create index for better query performance
CREATE INDEX idx_tasks_parent_task_id ON public.tasks(parent_task_id);