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

interface FolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parentFolderId?: string | null;
}

export function FolderDialog({ open, onOpenChange, parentFolderId }: FolderDialogProps) {
  const [name, setName] = useState("");
  const [accessLevel, setAccessLevel] = useState<string>("team_member");
  const queryClient = useQueryClient();

  const createFolderMutation = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error("Folder name is required");

      const { data: session } = await supabase.auth.getSession();
      if (!session.session?.user) throw new Error("Not authenticated");

      // Create folder
      const { data: folder, error: folderError } = await supabase
        .from("folders")
        .insert({
          name: name.trim(),
          parent_folder_id: parentFolderId,
          created_by: session.session.user.id,
        })
        .select()
        .single();

      if (folderError) throw folderError;

      // Create folder access
      const { error: accessError } = await supabase
        .from("folder_access")
        .insert({
          folder_id: folder.id,
          access_level: accessLevel,
        } as any);

      if (accessError) throw accessError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["folders"] });
      toast.success("Folder created successfully");
      resetForm();
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create folder");
    },
  });

  const resetForm = () => {
    setName("");
    setAccessLevel("team_member");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createFolderMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Folder</DialogTitle>
          <DialogDescription>
            Create a folder to organize files with specific access permissions.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Folder Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter folder name"
              />
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
            <Button type="submit" disabled={createFolderMutation.isPending}>
              {createFolderMutation.isPending ? "Creating..." : "Create Folder"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}