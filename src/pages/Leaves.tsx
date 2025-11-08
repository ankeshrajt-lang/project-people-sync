import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus, Filter } from "lucide-react";
import { LeaveCard } from "@/components/LeaveCard";
import { LeaveDialog } from "@/components/LeaveDialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

export default function Leaves() {
  const [filter, setFilter] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: leaves, isLoading } = useQuery({
    queryKey: ["leave_requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leave_requests")
        .select("*, team_members(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: members } = useQuery({
    queryKey: ["team_members"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_members")
        .select("*");
      if (error) throw error;
      return data;
    },
  });

  const updateLeaveMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("leave_requests")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leave_requests"] });
      toast.success("Leave request updated successfully");
    },
    onError: () => {
      toast.error("Failed to update leave request");
    },
  });

  const deleteLeaveMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("leave_requests")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leave_requests"] });
      toast.success("Leave request deleted successfully");
    },
    onError: () => {
      toast.error("Failed to delete leave request");
    },
  });

  const filteredLeaves = leaves?.filter((leave) => {
    if (filter === "all") return true;
    return leave.status === filter;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Leave Tracker</h2>
          <p className="text-muted-foreground">Manage employee leave requests</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          New Leave Request
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <Filter className="h-5 w-5 text-muted-foreground" />
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Requests</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading leave requests...</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredLeaves?.map((leave) => (
            <LeaveCard
              key={leave.id}
              leave={leave}
              onStatusChange={(status) => updateLeaveMutation.mutate({ id: leave.id, status })}
              onDelete={() => deleteLeaveMutation.mutate(leave.id)}
            />
          ))}
          {(!filteredLeaves || filteredLeaves.length === 0) && (
            <div className="col-span-full text-center py-12">
              <p className="text-muted-foreground">
                No leave requests found. Create your first leave request to get started!
              </p>
            </div>
          )}
        </div>
      )}

      <LeaveDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        members={members || []}
      />
    </div>
  );
}
