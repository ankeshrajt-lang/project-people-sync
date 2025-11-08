import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface FileUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folderId?: string | null;
}

export function FileUploadDialog({ open, onOpenChange, folderId }: FileUploadDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [accessLevel, setAccessLevel] = useState<string>("team_member");
  const queryClient = useQueryClient();

  const uploadFileMutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("No file selected");

      // Check authentication FIRST
      const { data: session } = await supabase.auth.getSession();
      if (!session.session?.user) throw new Error("Not authenticated");

      const fileExt = file.name.split(".").pop();
      // Sanitize filename: remove spaces and special characters
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const fileName = `${Date.now()}-${sanitizedName}`;
      const filePath = fileName;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("project-files")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Save metadata to database
      const { data: fileRecord, error: dbError } = await supabase.from("files").insert({
        name: file.name,
        file_path: filePath,
        file_type: file.type,
        file_size: file.size,
        folder_id: folderId,
        uploaded_by: session.session.user.id,
      }).select().single();

      if (dbError) throw dbError;

      // Create file access
      const { error: accessError } = await supabase
        .from("file_access")
        .insert({
          file_id: fileRecord.id,
          access_level: accessLevel,
        } as any);

      if (accessError) throw accessError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["files"] });
      toast.success("File uploaded successfully");
      resetForm();
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to upload file");
    },
  });

  const resetForm = () => {
    setFile(null);
    setAccessLevel("team_member");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast.error("Please select a file");
      return;
    }
    uploadFileMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Upload File</DialogTitle>
          <DialogDescription>
            Upload a document or file to your project storage.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="file">File</Label>
              <Input
                id="file"
                type="file"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
              {file && (
                <p className="text-sm text-muted-foreground">
                  Selected: {file.name} ({(file.size / 1024).toFixed(1)} KB)
                </p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="access">Access Level</Label>
              <Select value={accessLevel} onValueChange={setAccessLevel}>
                <SelectTrigger>
                  <SelectValue placeholder="Select access level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">Public - Everyone can access</SelectItem>
                  <SelectItem value="team_member">Team Member - All team members</SelectItem>
                  <SelectItem value="team_lead">Team Lead - Team leads and above</SelectItem>
                  <SelectItem value="manager">Manager - Managers and admins</SelectItem>
                  <SelectItem value="admin">Admin - Admins only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={uploadFileMutation.isPending || !file}>
              {uploadFileMutation.isPending ? "Uploading..." : "Upload"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
