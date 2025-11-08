import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TaskFiles } from "./TaskFiles";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface TaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  members: Array<{ id: string; name: string }>;
  task?: {
    id: string;
    title: string;
    description: string | null;
    priority: string | null;
    assigned_to: string | null;
  } | null;
  currentUserId?: string | null;
  parentTaskId?: string | null;
  allTasks?: Array<{ id: string; title: string }>;
}

export function TaskDialog({ open, onOpenChange, members, task, currentUserId, parentTaskId, allTasks }: TaskDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [assignedTo, setAssignedTo] = useState<string>("unassigned");
  const [parentTask, setParentTask] = useState<string>(parentTaskId || "none");
  const [files, setFiles] = useState<FileList | null>(null);
  const queryClient = useQueryClient();
  const isEditing = !!task;

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || "");
      setPriority(task.priority || "medium");
      setAssignedTo(task.assigned_to || "unassigned");
    } else {
      resetForm();
      setParentTask(parentTaskId || "none");
    }
  }, [task, open, parentTaskId]);

  const saveTaskMutation = useMutation({
    mutationFn: async () => {
      if (isEditing) {
        // Track changes for history
        const changes = [];
        if (task.title !== title) changes.push({ field: "title", old: task.title, new: title });
        if (task.description !== description) changes.push({ field: "description", old: task.description, new: description });
        if (task.priority !== priority) changes.push({ field: "priority", old: task.priority, new: priority });
        if (task.assigned_to !== (assignedTo === "unassigned" ? null : assignedTo)) {
          changes.push({ field: "assigned_to", old: task.assigned_to, new: assignedTo === "unassigned" ? null : assignedTo });
        }

        // Update task
        const { error: updateError } = await supabase
          .from("tasks")
          .update({
            title,
            description,
            priority,
            assigned_to: assignedTo === "unassigned" ? null : assignedTo,
          })
          .eq("id", task.id);
        if (updateError) throw updateError;

        // Add history entries
        for (const change of changes) {
          await supabase.from("task_history").insert({
            task_id: task.id,
            changed_by: currentUserId,
            action: `Updated ${change.field}`,
            field_name: change.field,
            old_value: change.old?.toString() || null,
            new_value: change.new?.toString() || null,
          });
        }

        // Handle file uploads for edited task
        if (files && files.length > 0) {
          await uploadFiles(task.id);
        }
      } else {
        // Create new task
        const { data: newTask, error } = await supabase
          .from("tasks")
          .insert({
            title,
            description,
            priority,
            assigned_to: assignedTo === "unassigned" ? null : assignedTo,
            status: "active",
            parent_task_id: parentTask === "none" ? null : parentTask,
          } as any)
          .select()
          .single();
        if (error) throw error;

        // Add creation history
        await supabase.from("task_history").insert({
          task_id: newTask.id,
          changed_by: currentUserId,
          action: "Created task",
        });

        // Handle file uploads
        if (files && files.length > 0) {
          await uploadFiles(newTask.id);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["files"] });
      toast.success(isEditing ? "Task updated successfully" : "Task created successfully");
      resetForm();
      onOpenChange(false);
    },
    onError: () => {
      toast.error(isEditing ? "Failed to update task" : "Failed to create task");
    },
  });

  const uploadFiles = async (taskId: string) => {
    if (!files) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileName = `${Date.now()}-${file.name}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("project-files")
        .upload(fileName, file);

      if (uploadError) {
        console.error("Upload error:", uploadError);
        continue;
      }

      // Insert file record
      await supabase.from("files").insert({
        name: file.name,
        file_path: fileName,
        file_type: file.type,
        file_size: file.size,
        uploaded_by: currentUserId,
        task_id: taskId,
      });

      // Add history entry
      await supabase.from("task_history").insert({
        task_id: taskId,
        changed_by: currentUserId,
        action: `Attached file: ${file.name}`,
      });
    }
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setPriority("medium");
    setAssignedTo("unassigned");
    setParentTask("none");
    setFiles(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Please enter a task title");
      return;
    }
    saveTaskMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Task" : "Create New Task"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Update task details" : "Add a new task to track work for your team members."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder="Enter task title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Enter task description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="priority">Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="assigned">Assign To</Label>
              <Select value={assignedTo} onValueChange={setAssignedTo}>
                <SelectTrigger>
                  <SelectValue placeholder="Select team member" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {members.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {!isEditing && (
              <div className="grid gap-2">
                <Label htmlFor="parentTask">Parent Task (Optional)</Label>
                <Select value={parentTask} onValueChange={setParentTask}>
                  <SelectTrigger>
                    <SelectValue placeholder="No parent task" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No parent task</SelectItem>
                    {allTasks?.filter(t => !task || t.id !== task.id).map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid gap-2">
              <Label htmlFor="files">Attach Files</Label>
              <Input
                id="files"
                type="file"
                multiple
                onChange={(e) => setFiles(e.target.files)}
                className="cursor-pointer"
              />
              {files && files.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {files.length} file(s) selected
                </p>
              )}
              {isEditing && task && (
                <div className="mt-3">
                  <TaskFiles taskId={task.id} />
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saveTaskMutation.isPending}>
              {saveTaskMutation.isPending
                ? isEditing
                  ? "Updating..."
                  : "Creating..."
                : isEditing
                ? "Update Task"
                : "Create Task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
