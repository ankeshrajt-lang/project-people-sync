import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, Check, X, Calendar } from "lucide-react";
import { format } from "date-fns";

interface LeaveCardProps {
  leave: {
    id: string;
    leave_type: string;
    start_date: string;
    end_date: string;
    reason: string | null;
    status: string;
    team_members: { name: string } | null;
  };
  onStatusChange: (status: string) => void;
  onDelete: () => void;
}

export function LeaveCard({ leave, onStatusChange, onDelete }: LeaveCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-success/10 text-success border-success/20";
      case "rejected":
        return "bg-destructive/10 text-destructive border-destructive/20";
      case "pending":
        return "bg-warning/10 text-warning border-warning/20";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getLeaveTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case "sick":
        return "bg-red-500/10 text-red-500 border-red-500/20";
      case "vacation":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "personal":
        return "bg-purple-500/10 text-purple-500 border-purple-500/20";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "MMM dd, yyyy");
  };

  const getDuration = () => {
    const start = new Date(leave.start_date);
    const end = new Date(leave.end_date);
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return `${days} day${days > 1 ? 's' : ''}`;
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg mb-2">
              {leave.team_members?.name || "Unknown Employee"}
            </CardTitle>
            <div className="flex gap-2 flex-wrap">
              <Badge variant="outline" className={getLeaveTypeColor(leave.leave_type)}>
                {leave.leave_type}
              </Badge>
              <Badge variant="outline" className={getStatusColor(leave.status)}>
                {leave.status}
              </Badge>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onDelete}
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>{formatDate(leave.start_date)} - {formatDate(leave.end_date)}</span>
        </div>
        <div className="text-sm font-medium text-foreground">
          Duration: {getDuration()}
        </div>
        {leave.reason && (
          <p className="text-sm text-muted-foreground line-clamp-2">{leave.reason}</p>
        )}
        {leave.status === "pending" && (
          <div className="flex gap-2 pt-2">
            <Button
              size="sm"
              onClick={() => onStatusChange("approved")}
              className="flex-1 gap-2 bg-success hover:bg-success/90"
            >
              <Check className="h-4 w-4" />
              Approve
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => onStatusChange("rejected")}
              className="flex-1 gap-2"
            >
              <X className="h-4 w-4" />
              Reject
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
