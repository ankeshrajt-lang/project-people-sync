import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Circle, Trash2, User, Edit, History, Paperclip, Plus, ListTree } from "lucide-react";
import { useState } from "react";
import { TaskHistoryDialog } from "./TaskHistoryDialog";
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

interface TaskCardProps {
  task: {
    id: string;
    title: string;
    description: string | null;
    status: string;
    priority: string | null;
    team_members: { name: string } | null;
    created_at: string;
    files?: any[];
  };
  onStatusChange: (status: string) => void;
  onDelete: () => void;
  onEdit: () => void;
  onCreateSubtask?: () => void;
  subtasksCount?: number;
  isSubtask?: boolean;
}

export function TaskCard({ task, onStatusChange, onDelete, onEdit, onCreateSubtask, subtasksCount, isSubtask }: TaskCardProps) {
  const isActive = task.status === "active";
  const [historyOpen, setHistoryOpen] = useState(false);

  const getPriorityColor = (priority: string | null) => {
    switch (priority) {
      case "high":
        return "bg-destructive text-destructive-foreground";
      case "medium":
        return "bg-warning text-warning-foreground";
      case "low":
        return "bg-success text-success-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <Card className={`hover:shadow-md transition-shadow ${isSubtask ? 'border-l-4 border-l-primary/50 bg-muted/30' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2 flex-1 min-w-0">
            {isSubtask && (
              <div className="flex flex-col items-center pt-1 flex-shrink-0">
                <div className="w-px h-4 bg-border"></div>
                <ListTree className="h-4 w-4 text-muted-foreground" />
              </div>
            )}
            <h3 className="font-semibold text-lg text-foreground line-clamp-2 flex-1">
              {task.title}
            </h3>
          </div>
          <Badge
            variant="outline"
            className={`flex-shrink-0 ${isActive ? "border-success text-success" : "border-muted-foreground text-muted-foreground"}`}
          >
            {isActive ? "Active" : "Completed"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pb-3">
        {task.description && (
          <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
            {task.description}
          </p>
        )}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {task.priority && (
              <Badge className={getPriorityColor(task.priority)}>
                {task.priority}
              </Badge>
            )}
            {task.team_members && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <User className="h-3 w-3" />
                {task.team_members.name}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {task.files && task.files.length > 0 && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Paperclip className="h-3 w-3" />
                {task.files.length}
              </div>
            )}
            {!isSubtask && subtasksCount !== undefined && subtasksCount > 0 && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <ListTree className="h-3 w-3" />
                {subtasksCount}
              </div>
            )}
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between pt-3 border-t border-border">
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onStatusChange(isActive ? "completed" : "active")}
            className="gap-2"
          >
            {isActive ? (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Complete
              </>
            ) : (
              <>
                <Circle className="h-4 w-4" />
                Reopen
              </>
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onEdit}
            className="gap-2"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setHistoryOpen(true)}
            className="gap-2"
          >
            <History className="h-4 w-4" />
          </Button>
          {!isSubtask && onCreateSubtask && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onCreateSubtask}
              className="gap-2"
              title="Create subtask"
            >
              <Plus className="h-4 w-4" />
            </Button>
          )}
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
              <Trash2 className="h-4 w-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Task</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this task? This action cannot be undone.
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
      
      <TaskHistoryDialog
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        taskId={task.id}
      />
    </Card>
  );
}
