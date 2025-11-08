import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Upload, Filter } from "lucide-react";
import { FileCard } from "@/components/FileCard";
import { FileUploadDialog } from "@/components/FileUploadDialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

export default function Files() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [taskFilter, setTaskFilter] = useState<string>("all");
  const queryClient = useQueryClient();

  const { data: files, isLoading } = useQuery({
    queryKey: ["files"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("files")
        .select(`
          *,
          team_members(name),
          tasks(title, id)
        `)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const filteredFiles = files?.filter((file) => {
    if (taskFilter === "all") return true;
    if (taskFilter === "no-task") return !file.task_id;
    return file.task_id === taskFilter;
  });

  const { data: tasks } = useQuery({
    queryKey: ["tasks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("id, title");
      if (error) throw error;
      return data;
    },
  });

  const deleteFileMutation = useMutation({
    mutationFn: async ({ id, filePath }: { id: string; filePath: string }) => {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from("project-files")
        .remove([filePath]);
      
      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from("files")
        .delete()
        .eq("id", id);
      
      if (dbError) throw dbError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["files"] });
      toast.success("File deleted successfully");
    },
    onError: () => {
      toast.error("Failed to delete file");
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Files</h2>
          <p className="text-muted-foreground">Manage your project documents and files</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
          <Upload className="h-4 w-4" />
          Upload File
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <Filter className="h-5 w-5 text-muted-foreground" />
        <Select value={taskFilter} onValueChange={setTaskFilter}>
          <SelectTrigger className="w-[240px]">
            <SelectValue placeholder="Filter by task" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Files</SelectItem>
            <SelectItem value="no-task">Files without task</SelectItem>
            {tasks?.map((task) => (
              <SelectItem key={task.id} value={task.id}>
                {task.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading files...</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredFiles?.map((file) => (
            <FileCard
              key={file.id}
              file={file}
              onDelete={() => deleteFileMutation.mutate({ id: file.id, filePath: file.file_path })}
            />
          ))}
          {(!filteredFiles || filteredFiles.length === 0) && (
            <div className="col-span-full text-center py-12">
              <p className="text-muted-foreground">
                No files yet. Upload your first file to get started!
              </p>
            </div>
          )}
        </div>
      )}

      <FileUploadDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} />
    </div>
  );
}
