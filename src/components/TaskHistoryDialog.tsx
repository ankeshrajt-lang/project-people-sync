import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { Clock, User } from "lucide-react";

interface TaskHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskId: string;
}

export function TaskHistoryDialog({ open, onOpenChange, taskId }: TaskHistoryDialogProps) {
  const { data: history, isLoading } = useQuery({
    queryKey: ["task_history", taskId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("task_history")
        .select("*, team_members(name)")
        .eq("task_id", taskId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Task History</DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-[400px] pr-4">
          {isLoading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Loading history...</p>
            </div>
          ) : history && history.length > 0 ? (
            <div className="space-y-4">
              {history.map((entry) => (
                <div
                  key={entry.id}
                  className="border-l-2 border-primary/30 pl-4 pb-4 relative"
                >
                  <div className="absolute -left-[9px] top-0 h-4 w-4 rounded-full bg-primary" />
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-3 w-3 text-muted-foreground" />
                      <span className="font-medium">{entry.team_members?.name || "Unknown"}</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {format(new Date(entry.created_at), "MMM dd, HH:mm")}
                    </div>
                  </div>
                  <p className="text-sm text-foreground mb-1">
                    <span className="font-semibold">{entry.action}</span>
                  </p>
                  {entry.field_name && (
                    <div className="text-sm text-muted-foreground">
                      <span className="font-medium">{entry.field_name}: </span>
                      {entry.old_value && (
                        <span className="line-through text-destructive">
                          {entry.old_value}
                        </span>
                      )}
                      {entry.old_value && entry.new_value && " → "}
                      {entry.new_value && (
                        <span className="text-success">{entry.new_value}</span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No history available</p>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
