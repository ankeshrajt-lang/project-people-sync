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
import { CalendarIcon } from "lucide-react";
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
  const queryClient = useQueryClient();

  const resetForm = () => {
    setEmployeeId("");
    setDate(new Date());
    setStatus("present");
    setCheckInTime("");
    setCheckOutTime("");
    setNotes("");
  };

  // Populate form when editing or reset when dialog opens/closes
  useEffect(() => {
    if (open && record) {
      // Editing mode - populate form
      setEmployeeId(record.employee_id);
      setDate(new Date(record.date));
      setStatus(record.status);
      setCheckInTime(record.check_in_time || "");
      setCheckOutTime(record.check_out_time || "");
      setNotes(record.notes || "");
    } else if (open && !record) {
      // New entry mode - reset form
      resetForm();
    }
  }, [open, record]);

  const createAttendanceMutation = useMutation({
    mutationFn: async (newAttendance: any) => {
      if (record) {
        // Update existing record
        const { error } = await supabase
          .from("attendance")
          .update({
            employee_id: newAttendance.employee_id,
            date: newAttendance.date,
            status: newAttendance.status,
            check_in_time: newAttendance.check_in_time || null,
            check_out_time: newAttendance.check_out_time || null,
            notes: newAttendance.notes || null,
          })
          .eq("id", record.id);
        if (error) throw error;
      } else {
        // Create new record
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
      resetForm();
    },
    onError: () => {
      toast.error(record ? "Failed to update attendance" : "Failed to mark attendance");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId) {
      toast.error("Please select an employee");
      return;
    }

    createAttendanceMutation.mutate({
      employee_id: employeeId,
      date: format(date, "yyyy-MM-dd"),
      status,
      check_in_time: checkInTime,
      check_out_time: checkOutTime,
      notes,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{record ? "Edit Attendance" : "Mark Attendance"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="employee">Employee *</Label>
            <Select value={employeeId} onValueChange={setEmployeeId}>
              <SelectTrigger>
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

          <div className="space-y-2">
            <Label>Date *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
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
            <Label htmlFor="status">Status *</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="checkIn">Check In Time</Label>
              <Input
                id="checkIn"
                type="time"
                value={checkInTime}
                onChange={(e) => setCheckInTime(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="checkOut">Check Out Time</Label>
              <Input
                id="checkOut"
                type="time"
                value={checkOutTime}
                onChange={(e) => setCheckOutTime(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Add any additional notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">{record ? "Update Attendance" : "Mark Attendance"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
