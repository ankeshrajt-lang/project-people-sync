import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Download, Trash2, Eye, Link2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

interface FileCardProps {
  file: {
    id: string;
    name: string;
    file_path: string;
    file_type: string;
    file_size: number | null;
    team_members: { name: string } | null;
    tasks?: { title: string; id: string } | null;
    created_at: string;
  };
  onDelete: () => void;
}

export function FileCard({ file, onDelete }: FileCardProps) {
  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "Unknown size";
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
  };

  const handleDownload = async () => {
    const { data, error } = await supabase.storage
      .from("project-files")
      .download(file.file_path);

    if (error) {
      toast.error("Failed to download file");
      return;
    }

    const url = URL.createObjectURL(data);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleView = () => {
    const { data } = supabase.storage
      .from("project-files")
      .getPublicUrl(file.file_path);

    if (data.publicUrl) {
      window.open(data.publicUrl, "_blank");
    }
  };

  const isPDF = file.file_type === "application/pdf";

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <FileText className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground truncate">{file.name}</h3>
            <p className="text-xs text-muted-foreground">
              {formatFileSize(file.file_size)}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pb-3">
        <div className="space-y-2 text-sm">
          {file.team_members && (
            <p className="text-muted-foreground">
              Uploaded by <span className="text-foreground">{file.team_members.name}</span>
            </p>
          )}
          {file.tasks && (
            <div className="flex items-center gap-2">
              <Link2 className="h-3 w-3 text-muted-foreground" />
              <Badge variant="outline" className="text-xs">
                {file.tasks.title}
              </Badge>
            </div>
          )}
          <p className="text-muted-foreground">
            {new Date(file.created_at).toLocaleDateString()}
          </p>
        </div>
      </CardContent>
      <CardFooter className="flex gap-2 pt-3 border-t border-border">
        {isPDF && (
          <Button variant="outline" size="sm" onClick={handleView} className="flex-1 gap-2">
            <Eye className="h-4 w-4" />
            View
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={handleDownload} className="flex-1 gap-2">
          <Download className="h-4 w-4" />
          Download
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
              <Trash2 className="h-4 w-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete File</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{file.name}"? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={onDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardFooter>
    </Card>
  );
}
