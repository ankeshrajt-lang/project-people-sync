import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { MemberCard } from "@/components/MemberCard";
import { MemberDialog } from "@/components/MemberDialog";
import { EditMemberDialog } from "@/components/EditMemberDialog";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export default function Team() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editMember, setEditMember] = useState<any>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();

  const { data: members, isLoading } = useQuery({
    queryKey: ["team_members"],
    queryFn: async () => {
      const { data: teamMembers, error } = await supabase
        .from("team_members")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;

      // Fetch user roles separately for members with auth_user_id
      const membersWithRoles = await Promise.all(
        (teamMembers || []).map(async (member) => {
          if (member.auth_user_id) {
            const { data: roles } = await supabase
              .from("user_roles")
              .select("role")
              .eq("user_id", member.auth_user_id);
            
            return {
              ...member,
              user_roles: roles || []
            };
          }
          return {
            ...member,
            user_roles: []
          };
        })
      );

      return membersWithRoles;
    },
  });

  const deleteMemberMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("team_members")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team_members"] });
      toast.success("Team member removed successfully");
    },
    onError: () => {
      toast.error("Failed to remove team member");
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Team</h2>
          <p className="text-muted-foreground">Manage your team members</p>
        </div>
        {isAdmin && (
          <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Member
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading team members...</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {members?.map((member) => (
            <MemberCard
              key={member.id}
              member={member}
              onDelete={() => deleteMemberMutation.mutate(member.id)}
              onEdit={isAdmin ? () => {
                setEditMember(member);
                setIsEditDialogOpen(true);
              } : undefined}
            />
          ))}
          {(!members || members.length === 0) && (
            <div className="col-span-full text-center py-12">
              <p className="text-muted-foreground">
                No team members yet. Add your first team member to get started!
              </p>
            </div>
          )}
        </div>
      )}

      <MemberDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} />
      <EditMemberDialog 
        open={isEditDialogOpen} 
        onOpenChange={setIsEditDialogOpen} 
        member={editMember}
      />
    </div>
  );
}
