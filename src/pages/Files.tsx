import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Upload, Filter, FolderPlus, ArrowLeft } from "lucide-react";
import { FileCard } from "@/components/FileCard";
import { FileUploadDialog } from "@/components/FileUploadDialog";
import { FolderDialog } from "@/components/FolderDialog";
import { FolderCard } from "@/components/FolderCard";
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
  const [isFolderDialogOpen, setIsFolderDialogOpen] = useState(false);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [taskFilter, setTaskFilter] = useState<string>("all");
  const queryClient = useQueryClient();

  const { data: folders } = useQuery({
    queryKey: ["folders", currentFolderId],
    queryFn: async () => {
      let query = supabase
        .from("folders")
        .select(`
          *,
          folder_access(access_level)
        `)
        .order("created_at", { ascending: false });

      if (currentFolderId) {
        query = query.eq("parent_folder_id", currentFolderId);
      } else {
        query = query.is("parent_folder_id", null);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const { data: files, isLoading } = useQuery({
    queryKey: ["files", currentFolderId],
    queryFn: async () => {
      let query = supabase
        .from("files")
        .select(`
          *,
          file_access(access_level)
        `)
        .order("created_at", { ascending: false });

      if (currentFolderId) {
        query = query.eq("folder_id", currentFolderId);
      } else {
        query = query.is("folder_id", null);
      }

      const { data, error } = await query;
      if (error) {
        console.error("Files query error:", error);
        throw error;
      }
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

  const deleteFolderMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("folders").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["folders"] });
      toast.success("Folder deleted successfully");
    },
    onError: () => {
      toast.error("Failed to delete folder");
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
          <div className="flex items-center gap-2">
            {currentFolderId && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentFolderId(null)}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            )}
            <h2 className="text-3xl font-bold tracking-tight text-foreground">Files</h2>
          </div>
          <p className="text-muted-foreground">Manage your project documents and files</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setIsFolderDialogOpen(true)} variant="outline" className="gap-2">
            <FolderPlus className="h-4 w-4" />
            New Folder
          </Button>
          <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
            <Upload className="h-4 w-4" />
            Upload File
          </Button>
        </div>
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
          <p className="text-muted-foreground">Loading...</p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {folders?.map((folder) => (
              <FolderCard
                key={folder.id}
                folder={folder}
                onDelete={() => deleteFolderMutation.mutate(folder.id)}
                onOpen={() => setCurrentFolderId(folder.id)}
              />
            ))}
            {filteredFiles?.map((file) => (
              <FileCard
                key={file.id}
                file={file}
                onDelete={() => deleteFileMutation.mutate({ id: file.id, filePath: file.file_path })}
              />
            ))}
          </div>
          {(!folders || folders.length === 0) && (!filteredFiles || filteredFiles.length === 0) && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                No folders or files yet. Create a folder or upload your first file to get started!
              </p>
            </div>
          )}
        </>
      )}

      <FolderDialog
        open={isFolderDialogOpen}
        onOpenChange={setIsFolderDialogOpen}
        parentFolderId={currentFolderId}
      />
      <FileUploadDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        folderId={currentFolderId}
      />
    </div>
  );
}
