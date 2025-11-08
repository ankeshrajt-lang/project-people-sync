import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Download, Paperclip, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface TaskFilesProps {
  taskId: string;
  compact?: boolean;
}

export function TaskFiles({ taskId, compact = false }: TaskFilesProps) {
  const { data: files, isLoading } = useQuery({
    queryKey: ["task-files", taskId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("files")
        .select(`
          *,
          file_access(access_level)
        `)
        .eq("task_id", taskId);
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) return <p className="text-xs text-muted-foreground">Loading files...</p>;
  if (!files || files.length === 0) return null;

  const handleDownload = async (filePath: string, fileName: string) => {
    const { data, error } = await supabase.storage
      .from("project-files")
      .download(filePath);

    if (error) {
      console.error("Download error:", error);
      return;
    }

    const url = URL.createObjectURL(data);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getAccessLevelColor = (level: string) => {
    switch (level) {
      case "public":
        return "bg-success/10 text-success border-success/20";
      case "team_member":
        return "bg-primary/10 text-primary border-primary/20";
      case "team_lead":
        return "bg-warning/10 text-warning border-warning/20";
      case "manager":
        return "bg-orange-500/10 text-orange-500 border-orange-500/20";
      case "admin":
        return "bg-destructive/10 text-destructive border-destructive/20";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  if (compact) {
    return (
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <Paperclip className="h-3 w-3" />
        {files.length}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium flex items-center gap-2">
        <Paperclip className="h-4 w-4" />
        Attached Files ({files.length})
      </p>
      <div className="space-y-2">
        {files.map((file) => {
          const fileAccess = Array.isArray(file.file_access) 
            ? file.file_access[0] 
            : file.file_access;
          const accessLevel = fileAccess?.access_level;

          return (
            <div
              key={file.id}
              className="flex items-center justify-between gap-2 p-2 rounded-md border bg-card hover:bg-accent/50 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{file.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-xs text-muted-foreground">
                    {(file.file_size / 1024).toFixed(1)} KB
                  </p>
                  {accessLevel && (
                    <Badge variant="outline" className={`text-xs ${getAccessLevelColor(accessLevel)}`}>
                      {accessLevel.replace("_", " ")}
                    </Badge>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDownload(file.file_path, file.name)}
                className="flex-shrink-0"
              >
                <Download className="h-4 w-4" />
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
