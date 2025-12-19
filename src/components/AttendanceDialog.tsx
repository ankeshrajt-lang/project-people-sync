import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Briefcase } from "lucide-react";
import { cn } from "@/lib/utils";

interface AttendanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  members: any[];
  record?: any;
}

export function AttendanceDialog({ open, onOpenChange, members, record }: AttendanceDialogProps) {
  const [employeeId, setEmployeeId] = useState("");
  const [date, setDate] = useState<Date>(new Date());
  const [status, setStatus] = useState("present");
  const [checkInTime, setCheckInTime] = useState("");
  const [checkOutTime, setCheckOutTime] = useState("");
  const [notes, setNotes] = useState("");
  const [jobsApplied, setJobsApplied] = useState(0);
  const queryClient = useQueryClient();

  const resetForm = () => {
    setEmployeeId("");
    setDate(new Date());
    setStatus("present");
    setCheckInTime("");
    setCheckOutTime("");
    setNotes("");
    setJobsApplied(0);
  };

  // Determine effective jobsApplied and cleaned notes
  const parseJobsFromNotes = (notesStr: string | null) => {
    if (!notesStr) return { count: 0, cleanNotes: "" };

    const matches = [...notesStr.matchAll(/Jobs Applied:\s*(\d+)/gi)];
    if (matches.length > 0) {
      const lastMatch = matches[matches.length - 1];
      return {
        count: parseInt(lastMatch[1], 10),
        // Remove ALL instances to clean it up
        cleanNotes: notesStr.replace(/Jobs Applied:\s*\d+/gi, "").trim()
      };
    }
    return { count: 0, cleanNotes: notesStr };
  };

  // Populate form when editing or reset when dialog opens/closes
  useEffect(() => {
    if (open) {
      if (record) {
        // Editing mode - populate form
        setEmployeeId(record.employee_id);
        setDate(new Date(record.date));
        setStatus(record.status);
        setCheckInTime(record.check_in_time || "");
        setCheckOutTime(record.check_out_time || "");

        const { count, cleanNotes } = parseJobsFromNotes(record.notes);
        setNotes(cleanNotes);
        setJobsApplied(count);
      } else {
        // New entry mode - reset form
        resetForm();
      }
    }
  }, [open, record]);

  const createAttendanceMutation = useMutation({
    mutationFn: async (newAttendance: any) => {
      if (record?.id) {
        // ✅ UPDATE: do NOT change employee_id or date (avoids unique constraint issues)
        const { error } = await supabase
          .from("attendance")
          .update({
            status: newAttendance.status,
            check_in_time: newAttendance.check_in_time || null,
            check_out_time: newAttendance.check_out_time || null,
            notes: newAttendance.notes || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", record.id);

        if (error) throw error;
      } else {
        // ✅ INSERT: new attendance
        const { error } = await supabase
          .from("attendance")
          .insert({
            employee_id: newAttendance.employee_id,
            date: newAttendance.date,
            status: newAttendance.status,
            check_in_time: newAttendance.check_in_time || null,
            check_out_time: newAttendance.check_out_time || null,
            notes: newAttendance.notes || null,
          });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
      toast.success(record ? "Attendance updated successfully" : "Attendance marked successfully");
      onOpenChange(false);
    },
    onError: (error: any) => {
      const message =
        error?.message ||
        error?.cause?.message ||
        "Failed to save attendance. Please try again.";
      toast.error(message);
    },
  });



  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId) {
      toast.error("Please select an employee");
      return;
    }

    // Append jobs applied to notes
    // Append jobs applied to notes if greater than 0
    let finalNotes = notes.trim();
    if (jobsApplied > 0) {
      finalNotes = finalNotes
        ? `${finalNotes}\nJobs Applied: ${jobsApplied}`
        : `Jobs Applied: ${jobsApplied}`;
    }

    createAttendanceMutation.mutate({
      employee_id: employeeId,
      date: format(date, "yyyy-MM-dd"),
      status,
      check_in_time: checkInTime,
      check_out_time: checkOutTime,
      notes: finalNotes,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] glass-card border-none shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold tracking-tight">
            {record ? "Edit Attendance" : "Mark Attendance"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          <div className="space-y-2">
            <Label htmlFor="employee" className="text-sm font-medium text-muted-foreground">Employee *</Label>
            <Select value={employeeId} onValueChange={setEmployeeId}>
              <SelectTrigger className="h-11 bg-white/50 dark:bg-black/20 border-0 ring-1 ring-black/5 dark:ring-white/10 focus:ring-2 focus:ring-primary/20 transition-all">
                <SelectValue placeholder="Select employee" />
              </SelectTrigger>
              <SelectContent>
                {members.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal h-11 bg-white/50 dark:bg-black/20 border-0 ring-1 ring-black/5 dark:ring-white/10 hover:bg-white/80 dark:hover:bg-black/40",
                      !date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(date) => date && setDate(date)}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status" className="text-sm font-medium text-muted-foreground">Status *</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="h-11 bg-white/50 dark:bg-black/20 border-0 ring-1 ring-black/5 dark:ring-white/10 focus:ring-2 focus:ring-primary/20 transition-all">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="present">Present</SelectItem>
                  <SelectItem value="absent">Absent</SelectItem>
                  <SelectItem value="late">Late</SelectItem>
                  <SelectItem value="half-day">Half Day</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="checkIn" className="text-sm font-medium text-muted-foreground">Check In Time</Label>
              <Input
                id="checkIn"
                type="time"
                value={checkInTime}
                onChange={(e) => setCheckInTime(e.target.value)}
                className="h-11 bg-white/50 dark:bg-black/20 border-0 ring-1 ring-black/5 dark:ring-white/10 focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="checkOut" className="text-sm font-medium text-muted-foreground">Check Out Time</Label>
              <Input
                id="checkOut"
                type="time"
                value={checkOutTime}
                onChange={(e) => setCheckOutTime(e.target.value)}
                className="h-11 bg-white/50 dark:bg-black/20 border-0 ring-1 ring-black/5 dark:ring-white/10 focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="jobsApplied" className="text-sm font-medium text-muted-foreground">Jobs Applied</Label>
            <div className="relative">
              <Briefcase className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
              <Input
                id="jobsApplied"
                type="number"
                value={jobsApplied}
                onChange={(e) => setJobsApplied(parseInt(e.target.value) || 0)}
                className="pl-10 h-11 bg-white/50 dark:bg-black/20 border-0 ring-1 ring-black/5 dark:ring-white/10 focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes" className="text-sm font-medium text-muted-foreground">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Add any additional notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="resize-none bg-white/50 dark:bg-black/20 border-0 ring-1 ring-black/5 dark:ring-white/10 focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="h-11 px-6 border-0 ring-1 ring-black/5 dark:ring-white/10 hover:bg-muted/50"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="h-11 px-6 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              {record ? "Update Attendance" : "Mark Attendance"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
