import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import { FileCard } from "@/components/FileCard";
import { FileUploadDialog } from "@/components/FileUploadDialog";
import { toast } from "sonner";

export default function Files() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: files, isLoading } = useQuery({
    queryKey: ["files"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("files")
        .select("*, team_members(name)")
        .order("created_at", { ascending: false });
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

      {isLoading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading files...</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {files?.map((file) => (
            <FileCard
              key={file.id}
              file={file}
              onDelete={() => deleteFileMutation.mutate({ id: file.id, filePath: file.file_path })}
            />
          ))}
          {(!files || files.length === 0) && (
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
