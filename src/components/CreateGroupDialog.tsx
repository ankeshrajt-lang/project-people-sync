import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";

interface CreateGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateGroupDialog({ open, onOpenChange }: CreateGroupDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const queryClient = useQueryClient();

  // Fetch team members
  const { data: teamMembers } = useQuery({
    queryKey: ["team_members"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_members")
        .select("id, name, email, auth_user_id");
      if (error) throw error;
      return data;
    },
  });

  const createGroupMutation = useMutation({
    mutationFn: async () => {
      // Get current user
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        console.error("Session error:", sessionError);
        throw new Error("Failed to get session");
      }
      if (!session?.user) {
        throw new Error("Not authenticated. Please log in again.");
      }

      console.log("Creating group as user:", session.user.id);

      // Create group
      const { data: group, error: groupError } = await supabase
        .from("chat_groups")
        .insert({
          name: name.trim(),
          description: description.trim() || null,
          created_by: session.user.id,
        })
        .select()
        .single();

      if (groupError) {
        console.error("Group creation error:", groupError);
        throw groupError;
      }

      console.log("Group created:", group);

      // Add creator as member automatically, plus selected members
      const membersToAdd = [session.user.id, ...selectedMembers];
      const uniqueMembers = [...new Set(membersToAdd)];

      console.log("Adding members:", uniqueMembers);

      const { error: membersError } = await supabase
        .from("chat_group_members")
        .insert(
          uniqueMembers.map((userId) => ({
            group_id: group.id,
            user_id: userId,
          }))
        );

      if (membersError) {
        console.error("Members error:", membersError);
        throw membersError;
      }

      return group;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat_groups"] });
      toast.success("Group created successfully");
      resetForm();
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create group");
    },
  });

  const resetForm = () => {
    setName("");
    setDescription("");
    setSelectedMembers([]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Please enter a group name");
      return;
    }
    createGroupMutation.mutate();
  };

  const toggleMember = (userId: string) => {
    setSelectedMembers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create Group</DialogTitle>
          <DialogDescription>
            Create a new chat group and add team members
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Group Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter group name"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter group description"
                rows={3}
              />
            </div>
            <div className="grid gap-2">
              <Label>Add Members</Label>
              <ScrollArea className="h-[200px] border rounded-md p-4">
                <div className="space-y-3">
                  {teamMembers?.map((member) => (
                    <div key={member.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={member.id}
                        checked={selectedMembers.includes(member.auth_user_id || "")}
                        onCheckedChange={() => toggleMember(member.auth_user_id || "")}
                        disabled={!member.auth_user_id}
                      />
                      <label
                        htmlFor={member.id}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {member.name}
                        <span className="text-xs text-muted-foreground ml-2">
                          {member.email}
                        </span>
                      </label>
                    </div>
                  ))}
                  {(!teamMembers || teamMembers.length === 0) && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No team members found
                    </p>
                  )}
                </div>
              </ScrollArea>
              <p className="text-xs text-muted-foreground">
                {selectedMembers.length} member(s) selected
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createGroupMutation.isPending}>
              {createGroupMutation.isPending ? "Creating..." : "Create Group"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
