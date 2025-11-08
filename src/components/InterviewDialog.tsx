import { useState, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";

interface InterviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  interview?: any;
}

export function InterviewDialog({ open, onOpenChange, interview }: InterviewDialogProps) {
  const [title, setTitle] = useState("");
  const [intervieweeId, setIntervieweeId] = useState<string>("");
  const [interviewerName, setInterviewerName] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [duration, setDuration] = useState("60");
  const [notes, setNotes] = useState("");
  const queryClient = useQueryClient();

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

  useEffect(() => {
    if (interview) {
      setTitle(interview.title || "");
      setIntervieweeId(interview.interviewee_id || "");
      setInterviewerName(interview.interviewer_name || "");
      
      // Convert UTC to PST for display
      const pstDate = toZonedTime(new Date(interview.scheduled_at), 'America/Los_Angeles');
      setScheduledDate(format(pstDate, 'yyyy-MM-dd'));
      setScheduledTime(format(pstDate, 'HH:mm'));
      setDuration(interview.duration_minutes?.toString() || "60");
      setNotes(interview.notes || "");
    } else {
      resetForm();
    }
  }, [interview, open]);

  const resetForm = () => {
    setTitle("");
    setIntervieweeId("");
    setInterviewerName("");
    setScheduledDate("");
    setScheduledTime("");
    setDuration("60");
    setNotes("");
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session?.user) throw new Error("Not authenticated");

      // Combine date and time in PST and convert to UTC for storage
      const pstDateTime = `${scheduledDate}T${scheduledTime}:00`;
      const pstDate = new Date(pstDateTime);
      
      // Create a date string in PST timezone
      const pstString = pstDate.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' });
      const utcDate = new Date(pstString);

      const interviewData = {
        title,
        interviewee_id: intervieweeId || null,
        interviewer_name: interviewerName,
        scheduled_at: utcDate.toISOString(),
        duration_minutes: parseInt(duration),
        notes,
        created_by: session.session.user.id,
      };

      if (interview) {
        const { error } = await supabase
          .from("interviews")
          .update(interviewData)
          .eq("id", interview.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("interviews")
          .insert(interviewData);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["interviews"] });
      toast.success(interview ? "Interview updated successfully" : "Interview scheduled successfully");
      resetForm();
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to save interview");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !scheduledDate || !scheduledTime) {
      toast.error("Please fill in required fields");
      return;
    }
    saveMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{interview ? "Edit Interview" : "Schedule Interview"}</DialogTitle>
          <DialogDescription>
            Schedule an interview with a team member. Times are in PST timezone.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Interview Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Technical Interview - Frontend Position"
                required
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="interviewee">Candidate / Interviewee</Label>
              <Select value={intervieweeId} onValueChange={setIntervieweeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select team member (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {members?.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="interviewer">Interviewer Name</Label>
              <Input
                id="interviewer"
                value={interviewerName}
                onChange={(e) => setInterviewerName(e.target.value)}
                placeholder="Enter interviewer name"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="date">Date (PST) *</Label>
                <Input
                  id="date"
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="time">Time (PST) *</Label>
                <Input
                  id="time"
                  type="time"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="duration">Duration (minutes)</Label>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="45">45 minutes</SelectItem>
                  <SelectItem value="60">1 hour</SelectItem>
                  <SelectItem value="90">1.5 hours</SelectItem>
                  <SelectItem value="120">2 hours</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any additional notes or interview details"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Saving..." : interview ? "Update" : "Schedule"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
