import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus, Filter } from "lucide-react";
import { TaskCard } from "@/components/TaskCard";
import { TaskDialog } from "@/components/TaskDialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

export default function Tasks() {
  const [filter, setFilter] = useState<string>("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);
  const [parentTaskId, setParentTaskId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: tasks, isLoading } = useQuery({
    queryKey: ["tasks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select(`
          *,
          team_members(name, id),
          files(id, name, file_path)
        `)
        .order("created_at", { ascending: false });
      if (error) throw error;
      
      // Group tasks by parent-child relationship
      const parentTasks = data?.filter(t => !t.parent_task_id) || [];
      const childTasks = data?.filter(t => t.parent_task_id) || [];
      
      return parentTasks.map(parent => ({
        ...parent,
        subtasks: childTasks.filter(child => child.parent_task_id === parent.id)
      }));
    },
  });

  const { data: members } = useQuery({
    queryKey: ["team_members"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_members")
        .select(`
          *,
          user_roles(role)
        `);
      if (error) throw error;
      // Transform the data to handle array vs single object
      return data?.map(member => ({
        ...member,
        user_roles: Array.isArray(member.user_roles) ? member.user_roles : member.user_roles ? [member.user_roles] : []
      }));
    },
  });

  const { data: roles } = useQuery({
    queryKey: ["user_roles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("*");
      if (error) throw error;
      return data;
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("tasks")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Task updated successfully");
    },
    onError: () => {
      toast.error("Failed to update task");
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("tasks")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Task deleted successfully");
    },
    onError: () => {
      toast.error("Failed to delete task");
    },
  });

  const filteredTasks = tasks?.filter((task) => {
    // Filter by status - check parent and subtasks
    const statusMatches = filter === "all" || 
      task.status === filter || 
      (task.subtasks && task.subtasks.some((st: any) => st.status === filter));
    
    if (!statusMatches) return false;
    
    // Filter by role - check parent and subtasks
    if (roleFilter !== "all") {
      const parentMember = task.team_members ? members?.find(m => m.id === task.team_members?.id) : null;
      const parentRole = parentMember?.user_roles?.[0]?.role;
      const parentMatches = parentRole === roleFilter;
      
      const subtaskMatches = task.subtasks && task.subtasks.some((st: any) => {
        const stMember = st.team_members ? members?.find(m => m.id === st.team_members?.id) : null;
        const stRole = stMember?.user_roles?.[0]?.role;
        return stRole === roleFilter;
      });
      
      if (!parentMatches && !subtaskMatches) return false;
    }
    
    return true;
  }).map(task => ({
    ...task,
    // Filter subtasks if needed
    subtasks: task.subtasks?.filter((st: any) => {
      // Apply status filter to subtasks
      if (filter !== "all" && st.status !== filter) return false;
      
      // Apply role filter to subtasks
      if (roleFilter !== "all") {
        const stMember = st.team_members ? members?.find(m => m.id === st.team_members?.id) : null;
        const stRole = stMember?.user_roles?.[0]?.role;
        if (stRole !== roleFilter) return false;
      }
      
      return true;
    })
  }));

  const handleEdit = (task: any) => {
    setEditingTask({
      id: task.id,
      title: task.title,
      description: task.description,
      priority: task.priority,
      assigned_to: task.assigned_to,
    });
    setIsDialogOpen(true);
  };

  const handleDialogClose = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      setEditingTask(null);
      setParentTaskId(null);
    }
  };

  const handleCreateSubtask = (taskId: string) => {
    setParentTaskId(taskId);
    setIsDialogOpen(true);
  };

  // Flatten tasks for the task selector
  const allTasksList = tasks?.flatMap(t => [
    { id: t.id, title: t.title },
    ...(t.subtasks?.map((st: any) => ({ id: st.id, title: `${t.title} > ${st.title}` })) || [])
  ]) || [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Tasks</h2>
          <p className="text-muted-foreground">Manage and track all project tasks</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          New Task
        </Button>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <Filter className="h-5 w-5 text-muted-foreground" />
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tasks</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="team_member">Team Member</SelectItem>
            <SelectItem value="team_lead">Team Lead</SelectItem>
            <SelectItem value="manager">Manager</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading tasks...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredTasks?.map((task) => (
            <div key={task.id} className="space-y-2">
              <TaskCard
                task={task}
                onStatusChange={(status) => updateTaskMutation.mutate({ id: task.id, status })}
                onDelete={() => deleteTaskMutation.mutate(task.id)}
                onEdit={() => handleEdit(task)}
                onCreateSubtask={() => handleCreateSubtask(task.id)}
                subtasksCount={task.subtasks?.length || 0}
              />
              {task.subtasks && task.subtasks.length > 0 && (
                <div className="ml-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {task.subtasks.map((subtask: any) => (
                    <TaskCard
                      key={subtask.id}
                      task={subtask}
                      onStatusChange={(status) => updateTaskMutation.mutate({ id: subtask.id, status })}
                      onDelete={() => deleteTaskMutation.mutate(subtask.id)}
                      onEdit={() => handleEdit(subtask)}
                      isSubtask
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
          {(!filteredTasks || filteredTasks.length === 0) && (
            <div className="col-span-full text-center py-12">
              <p className="text-muted-foreground">
                No tasks found. Create your first task to get started!
              </p>
            </div>
          )}
        </div>
      )}

      <TaskDialog
        open={isDialogOpen}
        onOpenChange={handleDialogClose}
        members={members || []}
        task={editingTask}
        currentUserId={members?.[0]?.id}
        parentTaskId={parentTaskId}
        allTasks={allTasksList}
      />
    </div>
  );
}
