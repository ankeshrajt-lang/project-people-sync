import { useState, useEffect } from "react";
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

interface EditMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: {
    id: string;
    name: string;
    email: string;
    role: string | null;
    department: string | null;
    user_roles?: Array<{ role: string }>;
  } | null;
}

export function EditMemberDialog({ open, onOpenChange, member }: EditMemberDialogProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [roleLevel, setRoleLevel] = useState("member");
  const [customRole, setCustomRole] = useState("");
  const [department, setDepartment] = useState("");
  const [systemRole, setSystemRole] = useState("team_member");
  const queryClient = useQueryClient();

  const resolveRoleLevel = (value: string | null) => {
    if (!value) return "member";
    const normalized = value.toLowerCase().replace(/[\s-_]+/g, "_");
    const match = ROLE_OPTIONS.find(
      (option) =>
        option.value !== "custom" &&
        (option.label.toLowerCase() === normalized || option.value === normalized)
    );
    return match ? match.value : "custom";
  };

  useEffect(() => {
    if (member) {
      setName(member.name);
      setEmail(member.email);
      setRoleLevel(resolveRoleLevel(member.role));
      setCustomRole(member.role || "");
      setDepartment(member.department || "");
      setSystemRole(member.user_roles?.[0]?.role || "team_member");
    }
  }, [member]);

  const updateMemberMutation = useMutation({
    mutationFn: async () => {
      if (!member) return;

      const roleLabel =
        roleLevel === "custom"
          ? (customRole.trim() || "Member")
          : ROLE_OPTIONS.find((option) => option.value === roleLevel)?.label || "Member";

      // Update team member
      const { error } = await supabase
        .from("team_members")
        .update({
          name,
          email,
          role: roleLabel,
          department: department || null,
        })
        .eq("id", member.id);
      if (error) throw error;

      // Update system role
      const { error: roleError } = await supabase
        .from("user_roles")
        .update({ role: systemRole as "team_member" | "team_lead" | "manager" | "admin" })
        .eq("user_id", member.id);
      if (roleError) throw roleError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team_members"] });
      queryClient.invalidateQueries({ queryKey: ["user_roles"] });
      toast.success("Team member updated successfully");
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error("Failed to update team member");
      console.error(error);
    },
  });

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
    updateMemberMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Team Member</DialogTitle>
          <DialogDescription>
            Update team member information and permissions.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                placeholder="Enter member name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                placeholder="Enter email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-role">Role Level</Label>
              <Select value={roleLevel} onValueChange={setRoleLevel}>
                <SelectTrigger>
                  <SelectValue />
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
                  id="edit-custom-role"
                  placeholder="Enter the title you want to display"
                  value={customRole}
                  onChange={(e) => setCustomRole(e.target.value)}
                />
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-department">Department (Optional)</Label>
              <Input
                id="edit-department"
                placeholder="e.g., Engineering, Marketing"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-systemRole">Permission Level</Label>
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
            <Button type="submit" disabled={updateMemberMutation.isPending}>
              {updateMemberMutation.isPending ? "Updating..." : "Update Member"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
