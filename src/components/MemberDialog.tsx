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

const ROLE_OPTIONS = [
  { value: "member", label: "Member" },
  { value: "executive", label: "Executive" },
  { value: "senior", label: "Senior" },
  { value: "team_lead", label: "Team Lead" },
  { value: "manager", label: "Manager" },
  { value: "custom", label: "Custom title" },
];

interface MemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MemberDialog({ open, onOpenChange }: MemberDialogProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [roleLevel, setRoleLevel] = useState("member");
  const [customRole, setCustomRole] = useState("");
  const [systemRole, setSystemRole] = useState("team_member");
  const queryClient = useQueryClient();

  const createMemberMutation = useMutation({
    mutationFn: async () => {
      const selectedRoleLabel =
        roleLevel === "custom"
          ? customRole.trim() || "Member"
          : ROLE_OPTIONS.find((option) => option.value === roleLevel)?.label || "Member";

      // Create team member
      const { data: newMember, error } = await supabase
        .from("team_members")
        .insert({
          name,
          email,
          role: selectedRoleLabel,
        })
        .select()
        .single();
      if (error) throw error;

      // Assign system role
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert([{
          user_id: newMember.id,
          role: systemRole as "team_member" | "team_lead" | "manager" | "admin",
        }]);
      if (roleError) throw roleError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team_members"] });
      queryClient.invalidateQueries({ queryKey: ["user_roles"] });
      toast.success("Team member added successfully");
      resetForm();
      onOpenChange(false);
    },
    onError: (error: any) => {
      if (error.message?.includes("duplicate")) {
        toast.error("A member with this email already exists");
      } else {
        toast.error("Failed to add team member");
      }
    },
  });

  const resetForm = () => {
    setName("");
    setEmail("");
    setRoleLevel("member");
    setCustomRole("");
    setSystemRole("team_member");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      toast.error("Please enter name and email");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Please enter a valid email address");
      return;
    }
    if (roleLevel === "custom" && !customRole.trim()) {
      toast.error("Please provide a title for the custom role");
      return;
    }
    createMemberMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Team Member</DialogTitle>
          <DialogDescription>
            Add a new team member to your staffing agency.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                placeholder="Enter member name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="role">Role Level</Label>
              <Select value={roleLevel} onValueChange={setRoleLevel}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a level" />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {roleLevel === "custom" && (
                <Input
                  id="custom-role"
                  placeholder="Enter the title you want to display"
                  value={customRole}
                  onChange={(e) => setCustomRole(e.target.value)}
                />
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="systemRole">Permission Level</Label>
              <Select value={systemRole} onValueChange={setSystemRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="team_member">Team Member</SelectItem>
                  <SelectItem value="team_lead">Team Lead</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMemberMutation.isPending}>
              {createMemberMutation.isPending ? "Adding..." : "Add Member"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
