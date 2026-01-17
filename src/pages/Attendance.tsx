import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash2, ChevronLeft, ChevronRight, Clock, Crown, NotebookPen, Target } from "lucide-react";
import { AttendanceDialog } from "@/components/AttendanceDialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, differenceInMinutes, differenceInDays, parseISO, subMonths, addMonths } from "date-fns";
import { useAuth } from "@/hooks/useAuth";

export default function Attendance() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [deleteRecordId, setDeleteRecordId] = useState<string | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [browseMonth, setBrowseMonth] = useState<Date>(new Date());
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [logRecord, setLogRecord] = useState<any | null>(null);

  const { data: members } = useQuery({
    queryKey: ["team_members"],
    queryFn: async () => {
      const { data, error } = await supabase.from("team_members").select("*");
      if (error) throw error;
      return data;
    },
  });

  const { data: todayAttendance } = useQuery({
    queryKey: ["attendance", "today"],
    queryFn: async () => {
      const today = format(new Date(), "yyyy-MM-dd");
      const { data, error } = await supabase
        .from("attendance")
        .select("*, team_members(name)")
        .eq("date", today);
      if (error) throw error;
      return data;
    },
  });

  const { data: weekAttendance } = useQuery({
    queryKey: ["attendance", "week"],
    queryFn: async () => {
      const start = format(startOfWeek(new Date()), "yyyy-MM-dd");
      const end = format(endOfWeek(new Date()), "yyyy-MM-dd");
      const { data, error } = await supabase
        .from("attendance")
        .select("*, team_members(name)")
        .gte("date", start)
        .lte("date", end);
      if (error) throw error;
      return data;
    },
  });

  const { data: monthAttendance } = useQuery({
    queryKey: ["attendance", "month"],
    queryFn: async () => {
      const start = format(startOfMonth(new Date()), "yyyy-MM-dd");
      const end = format(endOfMonth(new Date()), "yyyy-MM-dd");
      const { data, error } = await supabase
        .from("attendance")
        .select("*, team_members(name)")
        .gte("date", start)
        .lte("date", end);
      if (error) throw error;
      return data;
    },
  });

  const { data: browseMonthAttendance } = useQuery({
    queryKey: ["attendance", "browse", format(browseMonth, "yyyy-MM")],
    queryFn: async () => {
      const start = format(startOfMonth(browseMonth), "yyyy-MM-dd");
      const end = format(endOfMonth(browseMonth), "yyyy-MM-dd");
      const { data, error } = await supabase
        .from("attendance")
        .select("*, team_members(name)")
        .gte("date", start)
        .lte("date", end);
      if (error) throw error;
      return data;
    },
  });

  const { data: jobApplications } = useQuery({
    queryKey: ["job_applications_for_attendance"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("job_applications")
        .select("date_applied, jobs_applied_count");
      if (error) throw error;
      return data;
    },
  });

  // Create a map of date -> total jobs applied
  const jobsAppliedByDate = (jobApplications || []).reduce((acc, app) => {
    if (app.date_applied) {
      const dateKey = app.date_applied;
      acc[dateKey] = (acc[dateKey] || 0) + (app.jobs_applied_count || 1);
    }
    return acc;
  }, {} as Record<string, number>);

  const getJobsAppliedForDate = (date: string) => {
    return jobsAppliedByDate[date] || 0;
  };

  const getCleanNotes = (notes: string | null) => {
    if (!notes) return "-";
    return notes.replace(/Jobs Applied:\s*\d+/gi, "").trim() || "-";
  };

  type SessionLog = { in: string; out?: string; jobs?: number };

  const parseSessions = (notes: string | null): SessionLog[] => {
    if (!notes) return [];
    try {
      const parsed = JSON.parse(notes);
      if (Array.isArray(parsed?.sessions)) {
        return parsed.sessions.filter((s) => s && s.in);
      }
    } catch (e) {
      // fallback to legacy text notes
    }
    return [];
  };

  const serializeSessions = (sessions: SessionLog[]) => JSON.stringify({ sessions });

  const getJobsAppliedFromNotes = (notes: string | null) => {
    const sessions = parseSessions(notes);
    if (sessions.length > 0) {
      return sessions.reduce((sum, s) => sum + (s.jobs || 0), 0);
    }
    if (!notes) return 0;
    const matches = [...notes.matchAll(/Jobs Applied:\s*(\d+)/gi)];
    if (matches.length > 0) {
      const lastMatch = matches[matches.length - 1];
      return parseInt(lastMatch[1], 10);
    }
    return 0;
  };

  const getStatusBadge = (status?: string | null) => {
    const safeStatus = status || "unknown";
    const config: Record<string, { variant: "default" | "destructive" | "outline" | "secondary"; className: string }> = {
      present: { variant: "default", className: "bg-success text-success-foreground border-0" },
      absent: { variant: "destructive", className: "bg-destructive text-destructive-foreground" },
      late: { variant: "secondary", className: "bg-warning text-warning-foreground" },
      "half-day": { variant: "outline", className: "bg-accent/10 text-accent border-accent/20" },
      unknown: { variant: "outline", className: "bg-muted/50 text-muted-foreground border-muted/80" },
    };
    const statusConfig = config[safeStatus] || config.unknown;
    return (
      <Badge variant={statusConfig.variant} className={statusConfig.className}>
        {safeStatus.charAt(0).toUpperCase() + safeStatus.slice(1)}
      </Badge>
    );
  };

  const formatTime = (time: string | null) => {
    if (!time) return "-";
    try {
      const [hours, minutes] = time.split(":");
      const date = new Date();
      date.setHours(parseInt(hours), parseInt(minutes));
      return format(date, "hh:mm a");
    } catch (e) {
      return time;
    }
  };

  const calculateHoursNumber = (checkIn: string | null, checkOut: string | null) => {
    if (!checkIn || !checkOut) return 0;
    try {
      const [inHour, inMin] = checkIn.split(":").map(Number);
      const [outHour, outMin] = checkOut.split(":").map(Number);
      const inDate = new Date();
      inDate.setHours(inHour, inMin, 0, 0);
      const outDate = new Date();
      outDate.setHours(outHour, outMin, 0, 0);
      const diffMins = differenceInMinutes(outDate, inDate);
      return diffMins > 0 ? diffMins / 60 : 0;
    } catch (e) {
      return 0;
    }
  };

  const calculateTotalHours = (checkIn: string | null, checkOut: string | null, notes?: string | null) => {
    const sessions = parseSessions(notes || null);
    if (sessions.length > 0) {
      const total = sessions.reduce((sum, s) => {
        if (!s.in || !s.out) return sum;
        return sum + calculateHoursNumber(s.in, s.out);
      }, 0);
      if (total <= 0) return "-";
      const hours = Math.floor(total);
      const minutes = Math.round((total - hours) * 60);
      return `${hours}h ${minutes}m`;
    }

    if (!checkIn || !checkOut) return "-";

    try {
      const [inHour, inMin] = checkIn.split(":").map(Number);
      const [outHour, outMin] = checkOut.split(":").map(Number);

      const inDate = new Date();
      inDate.setHours(inHour, inMin, 0, 0);

      const outDate = new Date();
      outDate.setHours(outHour, outMin, 0, 0);

      const diffMins = differenceInMinutes(outDate, inDate);

      if (diffMins < 0) return "-";

      const hours = Math.floor(diffMins / 60);
      const minutes = diffMins % 60;

      return `${hours}h ${minutes}m`;
    } catch (error) {
      return "-";
    }
  };

  const getTopPerformer = (attendance: any[]) => {
    if (!attendance || attendance.length === 0) return null;
    const totals = new Map<string, number>();
    attendance.forEach((record) => {
      const sessions = parseSessions(record.notes);
      if (sessions.length > 0) {
        const hours = sessions.reduce((sum, s) => {
          if (!s.in || !s.out) return sum;
          return sum + calculateHoursNumber(s.in, s.out);
        }, 0);
        const prev = totals.get(record.employee_id) || 0;
        totals.set(record.employee_id, prev + hours);
        return;
      }
      const hours = calculateHoursNumber(record.check_in_time, record.check_out_time);
      if (hours <= 0) return;
      const prev = totals.get(record.employee_id) || 0;
      totals.set(record.employee_id, prev + hours);
    });

    let bestId: string | null = null;
    let bestHours = 0;
    totals.forEach((hrs, id) => {
      if (hrs > bestHours) {
        bestHours = hrs;
        bestId = id;
      }
    });

    if (!bestId) return null;
    const name = memberMap.get(bestId)?.name || "Top performer";
    return { name, hours: bestHours };
  };

  const getTopJobsPerformer = (attendance: any[]) => {
    if (!attendance || attendance.length === 0) return null;
    const totals = new Map<string, number>();
    attendance.forEach((record) => {
      const jobs = getJobsAppliedFromNotes(record.notes);
      if (jobs <= 0) return;
      const prev = totals.get(record.employee_id) || 0;
      totals.set(record.employee_id, prev + jobs);
    });
    let bestId: string | null = null;
    let bestJobs = 0;
    totals.forEach((jobs, id) => {
      if (jobs > bestJobs) {
        bestJobs = jobs;
        bestId = id;
      }
    });
    if (!bestId) return null;
    const name = memberMap.get(bestId)?.name || "Top performer";
    return { name, jobs: bestJobs };
  };

  const deleteAttendanceMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("attendance").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
      toast.success("Attendance record deleted");
      setDeleteRecordId(null);
    },
    onError: () => {
      toast.error("Failed to delete attendance record");
    },
  });

  const handleEdit = (record: any) => {
    setEditingRecord(record);
    setIsDialogOpen(true);
  };

  const handleDialogClose = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      setEditingRecord(null);
    }
  };

  const filterAttendance = (attendance: any[]) => {
    if (!attendance) return [];

    let filtered = [...attendance];

    if (selectedEmployee !== "all") {
      filtered = filtered.filter(a => a.employee_id === selectedEmployee);
    }

    if (selectedStatus !== "all") {
      filtered = filtered.filter(a => a.status === selectedStatus);
    }

    // Sort by date descending (most recent first)
    filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return filtered;
  };

  const updateDefaultTimesMutation = useMutation({
    mutationFn: async (records: any[]) => {
      const updates = records.map(record =>
        supabase
          .from("attendance")
          .update({
            check_in_time: record.check_in_time || "10:00:00",
            check_out_time: record.check_out_time || "18:00:00",
            status: "present",
          })
          .eq("id", record.id)
      );
      await Promise.all(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
    },
  });

  useEffect(() => {
  const checkAndUpdateTimes = async () => {
      const allAttendance = [
        ...(todayAttendance || []),
        ...(weekAttendance || []),
        ...(monthAttendance || []),
        ...(browseMonthAttendance || [])
      ];

      const computeAutoCheckout = (checkInTime: string | null) => {
        if (!checkInTime) return "18:00:00";
        const [h, m] = checkInTime.split(":").map(Number);
        const auto = new Date();
        auto.setHours(h + 8, m, 0, 0); // default 8h after check-in
        const hours = auto.getHours().toString().padStart(2, "0");
        const mins = auto.getMinutes().toString().padStart(2, "0");
        return `${hours}:${mins}:00`;
      };

      const recordsNeedingUpdate = allAttendance.filter(record => {
        const isPresent = record.status === "present";
        const missingBoth = isPresent && !record.check_in_time && !record.check_out_time;
        const missingCheckout = isPresent && record.check_in_time && !record.check_out_time;
        const isOld = differenceInDays(new Date(), parseISO(record.date)) >= 1;
        return missingBoth || (missingCheckout && isOld);
      });

      const uniqueRecords = recordsNeedingUpdate.filter(
        (record, index, self) =>
          index === self.findIndex(r => r.id === record.id)
      );

      if (uniqueRecords.length > 0) {
        const payload = uniqueRecords.map((record) => ({
          ...record,
          check_in_time: record.check_in_time || "10:00:00",
          check_out_time: record.check_out_time || computeAutoCheckout(record.check_in_time || "10:00:00"),
          status: "present",
        }));
        updateDefaultTimesMutation.mutate(payload);
      }
    };

    checkAndUpdateTimes();
  }, [todayAttendance, weekAttendance, monthAttendance, browseMonthAttendance]);

  const memberMap = useMemo(() => {
    const map = new Map<string, any>();
    (members || []).forEach((m) => map.set(m.id, m));
    return map;
  }, [members]);

  const currentMemberId = useMemo(() => {
    if (!members || !user) return null;
    const byAuth = members.find((m: any) => m.auth_user_id && m.auth_user_id === user.id);
    if (byAuth) return byAuth.id;
    const byEmail = members.find((m: any) => m.email && m.email.toLowerCase() === user.email?.toLowerCase());
    return byEmail ? byEmail.id : null;
  }, [members, user]);

  const todayRecordForUser = useMemo(() => {
    if (!currentMemberId) return null;
    return (todayAttendance || []).find((r) => r.employee_id === currentMemberId) || null;
  }, [todayAttendance, currentMemberId]);

  const todaySessionsForUser = useMemo(() => parseSessions(todayRecordForUser?.notes || null), [todayRecordForUser]);
  const hasOpenSession = useMemo(() => todaySessionsForUser.some((s) => !s.out), [todaySessionsForUser]);

  const calculateStats = (attendance: any[]) => {
    const present = attendance?.filter((a) => a.status === "present").length || 0;
    const absent = attendance?.filter((a) => a.status === "absent").length || 0;
    const late = attendance?.filter((a) => a.status === "late").length || 0;
    const total = attendance?.length || 0;
    const percentage = total > 0 ? ((present / total) * 100).toFixed(1) : "0";

    // Calculate total hours worked (prefer session logs; fallback to single span)
    const totalHours =
      attendance?.reduce((sum, record) => {
        const sessions = parseSessions(record.notes);
        if (sessions.length > 0) {
          const sessionHours = sessions.reduce((s, sess) => {
            if (!sess.in || !sess.out) return s;
            return s + calculateHoursNumber(sess.in, sess.out);
          }, 0);
          return sum + sessionHours;
        }
        if (record.check_in_time && record.check_out_time) {
          try {
            const [inHour, inMin] = record.check_in_time.split(":").map(Number);
            const [outHour, outMin] = record.check_out_time.split(":").map(Number);

            const inDate = new Date();
            inDate.setHours(inHour, inMin, 0, 0);

            const outDate = new Date();
            outDate.setHours(outHour, outMin, 0, 0);

            const diffMins = differenceInMinutes(outDate, inDate);

            if (diffMins > 0) {
              return sum + diffMins / 60;
            }
          } catch (error) {
            return sum;
          }
        }
        return sum;
      }, 0) || 0;

    return { present, absent, late, total, percentage, totalHours };
  };

  const checkInMutation = useMutation({
    mutationFn: async () => {
      if (!currentMemberId) throw new Error("No team member linked to your account.");
      const today = format(new Date(), "yyyy-MM-dd");
      const checkIn = format(new Date(), "HH:mm");
      const { data: existing } = await supabase
        .from("attendance")
        .select("id, notes, check_in_time")
        .eq("employee_id", currentMemberId)
        .eq("date", today)
        .maybeSingle();

      const sessions = parseSessions(existing?.notes || null);
      sessions.push({ in: `${checkIn}:00` });
      const firstCheckIn = existing?.check_in_time
        ? (existing.check_in_time < checkIn ? existing.check_in_time : checkIn)
        : checkIn;
      const payload = {
        employee_id: currentMemberId,
        date: today,
        status: "present",
        check_in_time: firstCheckIn,
        check_out_time: null, // mark active session
        notes: serializeSessions(sessions),
      };

      if (existing?.id) {
        const { error } = await supabase.from("attendance").update(payload).eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("attendance").insert(payload);
        if (error) throw error;
      }
    },
    onMutate: () => setIsCheckingIn(true),
    onSettled: () => setIsCheckingIn(false),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance"], exact: false });
      toast.success("Checked in");
    },
    onError: (error: any) => {
      toast.error(error?.message || "Check-in failed");
    },
  });

  const checkOutMutation = useMutation({
    mutationFn: async () => {
      if (!currentMemberId) throw new Error("No team member linked to your account.");
      const today = format(new Date(), "yyyy-MM-dd");
      const checkOut = format(new Date(), "HH:mm");
      const { data: existing, error: fetchErr } = await supabase
        .from("attendance")
        .select("id, notes, check_in_time, check_out_time")
        .eq("employee_id", currentMemberId)
        .eq("date", today)
        .maybeSingle();
      if (fetchErr) throw fetchErr;
      if (!existing?.id) throw new Error("No check-in found for today.");

      const sessions = parseSessions(existing.notes || null);
      const openIndex = sessions.map((s) => (s.out ? 1 : 0)).lastIndexOf(0);
      const openSession = openIndex >= 0 ? sessions[openIndex] : null;
      const jobsInput = window.prompt("Jobs applied in this session? (optional number)", "0");
      const jobsNumber = jobsInput ? parseInt(jobsInput, 10) || 0 : 0;
      if (openSession) {
        sessions[openIndex] = { ...openSession, out: `${checkOut}:00`, jobs: jobsNumber };
      } else {
        sessions.push({ in: `${existing.check_in_time || checkOut}:00`, out: `${checkOut}:00`, jobs: jobsNumber });
      }

      const { error } = await supabase
        .from("attendance")
        .update({
          check_out_time: checkOut,
          status: "present",
          notes: serializeSessions(sessions),
        })
        .eq("id", existing.id);
      if (error) throw error;
    },
    onMutate: () => setIsCheckingOut(true),
    onSettled: () => setIsCheckingOut(false),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance"], exact: false });
      toast.success("Checked out");
    },
    onError: (error: any) => {
      toast.error(error?.message || "Check-out failed");
    },
  });

  return (
    <div className="space-y-8 animate-fade-in pb-10">
      <section className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <Card className="bg-gradient-to-br from-primary/10 via-white to-blue-50 border-primary/10 shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">ShreeLLC</p>
                <CardTitle className="text-3xl">Attendance Command</CardTitle>
                <CardDescription className="text-base">
                  Check-in, check-out, and keep your hours tight. Top performers surface automatically by hours worked.
                </CardDescription>
              </div>
              <div className="hidden md:flex items-center gap-2 text-sm bg-white/70 px-3 py-1.5 rounded-full border shadow-sm">
                <Clock className="h-4 w-4 text-primary" />
                <span>Real-time check-in/out</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            {(() => {
              const stats = calculateStats(todayAttendance || []);
              return (
                <>
                  <div className="p-4 rounded-xl bg-white/70 border border-white/60 shadow-sm">
                    <p className="text-xs uppercase text-muted-foreground tracking-wide">Today Hours</p>
                    <p className="text-lg font-semibold mt-1">{stats.totalHours.toFixed(1)}h</p>
                  </div>
                  <div className="p-4 rounded-xl bg-white/70 border border-white/60 shadow-sm">
                    <p className="text-xs uppercase text-muted-foreground tracking-wide">Present</p>
                    <p className="text-lg font-semibold mt-1 text-success">{stats.present}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-white/70 border border-white/60 shadow-sm">
                    <p className="text-xs uppercase text-muted-foreground tracking-wide">Attendance Rate</p>
                    <p className="text-lg font-semibold mt-1">{stats.percentage}%</p>
                  </div>
                </>
              );
            })()}
          </CardContent>
        </Card>

        <Card className="border border-primary/20 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Quick Check</CardTitle>
            <CardDescription>
              Check-in/out for today. Your times auto-fill the attendance sheet.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium">Current status</p>
                <p className="text-xs text-muted-foreground">
                  {hasOpenSession
                    ? `Checked in at ${formatTime(todaySessionsForUser.find((s) => !s.out)?.in?.slice(0, 5) || todayRecordForUser?.check_in_time || null)}`
                    : todaySessionsForUser.length > 0
                      ? `Last checkout at ${formatTime(todaySessionsForUser[todaySessionsForUser.length - 1]?.out?.slice(0, 5) || todayRecordForUser?.check_out_time || null)}`
                      : "Not checked in yet"}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                className="flex-1 min-w-[140px]"
                onClick={() => checkInMutation.mutate()}
                disabled={!currentMemberId || isCheckingIn || hasOpenSession}
              >
                Check in
              </Button>
              <Button
                variant="secondary"
                className="flex-1 min-w-[140px]"
                onClick={() => checkOutMutation.mutate()}
                disabled={
                  !currentMemberId ||
                  !hasOpenSession ||
                  isCheckingOut
                }
              >
                Check out
              </Button>
            </div>
            {!currentMemberId && (
              <p className="text-xs text-destructive">
                No team member linked to your account. Ask manager to link your profile.
              </p>
            )}
          </CardContent>
        </Card>
      </section>

      <Card className="border-border/50">
        <CardContent className="pt-6 space-y-4">
          <div className="flex flex-wrap items-center gap-3 justify-between">
            <div className="text-sm text-muted-foreground">Filter attendance by person or status.</div>
            <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Manual entry
            </Button>
          </div>
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by employee" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Employees</SelectItem>
                  {members?.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 min-w-[200px]">
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="present">Present</SelectItem>
                  <SelectItem value="absent">Absent</SelectItem>
                  <SelectItem value="late">Late</SelectItem>
                  <SelectItem value="half-day">Half Day</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="today" className="w-full">
        <TabsList className="grid w-full max-w-lg grid-cols-4 h-11 bg-muted/50 p-1">
          <TabsTrigger value="today" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">Today</TabsTrigger>
          <TabsTrigger value="week" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">This Week</TabsTrigger>
          <TabsTrigger value="month" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">This Month</TabsTrigger>
          <TabsTrigger value="prevMonth" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">Browse</TabsTrigger>
        </TabsList>

        <TabsContent value="today" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-5">
            {(() => {
              const filteredData = filterAttendance(todayAttendance || []);
              const stats = calculateStats(filteredData);
              return (
                <>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats.total}</div>
                    </CardContent>
                  </Card>
                  <Card className="border-success/20 bg-success/5">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Present</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-success">{stats.present}</div>
                    </CardContent>
                  </Card>
                  <Card className="border-destructive/20 bg-destructive/5">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Absent</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-destructive">{stats.absent}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Attendance Rate</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats.percentage}%</div>
                    </CardContent>
                  </Card>
                  <Card className="border-primary/20 bg-primary/5">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Total Hours</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-primary">{stats.totalHours.toFixed(1)}h</div>
                    </CardContent>
                  </Card>
                </>
              );
            })()}
          </div>

          <Card className="border-border/50 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-xl">Today's Attendance</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Check In</TableHead>
                    <TableHead>Check Out</TableHead>
                    <TableHead>Hours Worked</TableHead>
                    <TableHead>Jobs Applied</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filterAttendance(todayAttendance || [])?.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium">{record.team_members?.name}</TableCell>
                      <TableCell>{getStatusBadge(record.status)}</TableCell>
                      <TableCell>{formatTime(record.check_in_time)}</TableCell>
                      <TableCell>{formatTime(record.check_out_time)}</TableCell>
                      <TableCell className="font-medium text-primary">
                        {calculateTotalHours(record.check_in_time, record.check_out_time, record.notes)}
                      </TableCell>
                      <TableCell className="font-medium text-primary">
                        {getJobsAppliedFromNotes(record.notes)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        <Button variant="ghost" size="sm" className="gap-1" onClick={() => setLogRecord(record)}>
                          <NotebookPen className="h-4 w-4" />
                          Log
                        </Button>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(record)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteRecordId(record.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filterAttendance(todayAttendance || []).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                        No attendance records for today
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="week" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-6">
            {(() => {
              const filteredData = filterAttendance(weekAttendance || []);
              const stats = calculateStats(filteredData);
              const top = getTopPerformer(filteredData);
              const topJobs = getTopJobsPerformer(filteredData);
              return (
                <>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Total Records</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats.total}</div>
                    </CardContent>
                  </Card>
                  <Card className="border-success/20 bg-success/5">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Present</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-success">{stats.present}</div>
                    </CardContent>
                  </Card>
                  <Card className="border-destructive/20 bg-destructive/5">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Absent</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-destructive">{stats.absent}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Weekly Rate</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats.percentage}%</div>
                    </CardContent>
                  </Card>
                  <Card className="border-primary/20 bg-primary/5">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Total Hours</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-primary">{stats.totalHours.toFixed(1)}h</div>
                    </CardContent>
                  </Card>
                  <Card className="border-amber-200 bg-amber-50">
                    <CardHeader className="pb-2 flex flex-row items-center justify-between">
                      <div>
                        <CardTitle className="text-sm font-medium text-muted-foreground">Top Performer</CardTitle>
                        <p className="text-xs text-muted-foreground">This week</p>
                      </div>
                      <Crown className="h-5 w-5 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-lg font-semibold">{top?.name || "No data"}</div>
                      <p className="text-sm text-muted-foreground">
                        {top ? `${top.hours.toFixed(1)}h worked` : "Hours will appear once logged"}
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="border-blue-200 bg-blue-50">
                    <CardHeader className="pb-2 flex flex-row items-center justify-between">
                      <div>
                        <CardTitle className="text-sm font-medium text-muted-foreground">Top Jobs Applied</CardTitle>
                        <p className="text-xs text-muted-foreground">This week</p>
                      </div>
                      <Target className="h-5 w-5 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-lg font-semibold">{topJobs?.name || "No data"}</div>
                      <p className="text-sm text-muted-foreground">
                        {topJobs ? `${topJobs.jobs} jobs applied` : "Jobs will appear once logged"}
                      </p>
                    </CardContent>
                  </Card>
                </>
              );
            })()}
          </div>

          <Card className="border-border/50 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-xl">This Week's Attendance</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Employee</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Check In</TableHead>
                    <TableHead>Check Out</TableHead>
                    <TableHead>Hours Worked</TableHead>
                    <TableHead>Jobs Applied</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filterAttendance(weekAttendance || [])?.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>{format(new Date(record.date), "MMM dd, yyyy")}</TableCell>
                      <TableCell className="font-medium">{record.team_members?.name}</TableCell>
                      <TableCell>{getStatusBadge(record.status)}</TableCell>
                      <TableCell>{formatTime(record.check_in_time)}</TableCell>
                      <TableCell>{formatTime(record.check_out_time)}</TableCell>
                      <TableCell className="font-medium text-primary">
                        {calculateTotalHours(record.check_in_time, record.check_out_time, record.notes)}
                      </TableCell>
                      <TableCell className="font-medium text-primary">
                        {getJobsAppliedFromNotes(record.notes)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(record)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteRecordId(record.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setLogRecord(record)}
                          >
                            <NotebookPen className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filterAttendance(weekAttendance || []).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                        No attendance records for this week
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="month" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-6">
            {(() => {
              const filteredData = filterAttendance(monthAttendance || []);
              const stats = calculateStats(filteredData);
              const top = getTopPerformer(filteredData);
              const topJobs = getTopJobsPerformer(filteredData);
              return (
                <>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Total Records</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats.total}</div>
                    </CardContent>
                  </Card>
                  <Card className="border-success/20 bg-success/5">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Present</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-success">{stats.present}</div>
                    </CardContent>
                  </Card>
                  <Card className="border-destructive/20 bg-destructive/5">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Absent</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-destructive">{stats.absent}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Monthly Rate</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats.percentage}%</div>
                    </CardContent>
                  </Card>
                  <Card className="border-primary/20 bg-primary/5">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Total Hours</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-primary">{stats.totalHours.toFixed(1)}h</div>
                    </CardContent>
                  </Card>
                  <Card className="border-amber-200 bg-amber-50">
                    <CardHeader className="pb-2 flex flex-row items-center justify-between">
                      <div>
                        <CardTitle className="text-sm font-medium text-muted-foreground">Top Performer</CardTitle>
                        <p className="text-xs text-muted-foreground">This month</p>
                      </div>
                      <Crown className="h-5 w-5 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-lg font-semibold">{top?.name || "No data"}</div>
                      <p className="text-sm text-muted-foreground">
                        {top ? `${top.hours.toFixed(1)}h worked` : "Hours will appear once logged"}
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="border-blue-200 bg-blue-50">
                    <CardHeader className="pb-2 flex flex-row items-center justify-between">
                      <div>
                        <CardTitle className="text-sm font-medium text-muted-foreground">Top Jobs Applied</CardTitle>
                        <p className="text-xs text-muted-foreground">This month</p>
                      </div>
                      <Target className="h-5 w-5 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-lg font-semibold">{topJobs?.name || "No data"}</div>
                      <p className="text-sm text-muted-foreground">
                        {topJobs ? `${topJobs.jobs} jobs applied` : "Jobs will appear once logged"}
                      </p>
                    </CardContent>
                  </Card>
                </>
              );
            })()}
          </div>

          <Card className="border-border/50 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-xl">This Month's Attendance</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Employee</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Check In</TableHead>
                    <TableHead>Check Out</TableHead>
                    <TableHead>Hours Worked</TableHead>
                    <TableHead>Jobs Applied</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filterAttendance(monthAttendance || [])?.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>{format(new Date(record.date), "MMM dd, yyyy")}</TableCell>
                      <TableCell className="font-medium">{record.team_members?.name}</TableCell>
                      <TableCell>{getStatusBadge(record.status)}</TableCell>
                      <TableCell>{formatTime(record.check_in_time)}</TableCell>
                      <TableCell>{formatTime(record.check_out_time)}</TableCell>
                      <TableCell className="font-medium text-primary">
                        {calculateTotalHours(record.check_in_time, record.check_out_time, record.notes)}
                      </TableCell>
                      <TableCell className="font-medium text-primary">
                        {getJobsAppliedFromNotes(record.notes)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(record)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteRecordId(record.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setLogRecord(record)}
                          >
                            <NotebookPen className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filterAttendance(monthAttendance || []).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                        No attendance records for this month
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="prevMonth" className="space-y-4">
          <div className="flex items-center justify-center gap-4 mb-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setBrowseMonth(subMonths(browseMonth, 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h3 className="text-lg font-semibold min-w-[180px] text-center">
              {format(browseMonth, "MMMM yyyy")}
            </h3>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setBrowseMonth(addMonths(browseMonth, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-6">
            {(() => {
              const filteredData = filterAttendance(browseMonthAttendance || []);
              const stats = calculateStats(filteredData);
              const top = getTopPerformer(filteredData);
              const topJobs = getTopJobsPerformer(filteredData);
              return (
                <>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Total Records</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats.total}</div>
                    </CardContent>
                  </Card>
                  <Card className="border-success/20 bg-success/5">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Present</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-success">{stats.present}</div>
                    </CardContent>
                  </Card>
                  <Card className="border-destructive/20 bg-destructive/5">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Absent</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-destructive">{stats.absent}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Monthly Rate</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats.percentage}%</div>
                    </CardContent>
                  </Card>
                  <Card className="border-primary/20 bg-primary/5">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Total Hours</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-primary">{stats.totalHours.toFixed(1)}h</div>
                    </CardContent>
                  </Card>
                  <Card className="border-amber-200 bg-amber-50">
                    <CardHeader className="pb-2 flex flex-row items-center justify-between">
                      <div>
                        <CardTitle className="text-sm font-medium text-muted-foreground">Top Performer</CardTitle>
                        <p className="text-xs text-muted-foreground">{format(browseMonth, "MMMM yyyy")}</p>
                      </div>
                      <Crown className="h-5 w-5 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-lg font-semibold">{top?.name || "No data"}</div>
                      <p className="text-sm text-muted-foreground">
                        {top ? `${top.hours.toFixed(1)}h worked` : "Hours will appear once logged"}
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="border-blue-200 bg-blue-50">
                    <CardHeader className="pb-2 flex flex-row items-center justify-between">
                      <div>
                        <CardTitle className="text-sm font-medium text-muted-foreground">Top Jobs Applied</CardTitle>
                        <p className="text-xs text-muted-foreground">{format(browseMonth, "MMMM yyyy")}</p>
                      </div>
                      <Target className="h-5 w-5 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-lg font-semibold">{topJobs?.name || "No data"}</div>
                      <p className="text-sm text-muted-foreground">
                        {topJobs ? `${topJobs.jobs} jobs applied` : "Jobs will appear once logged"}
                      </p>
                    </CardContent>
                  </Card>
                </>
              );
            })()}
          </div>

          <Card className="border-border/50 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-xl">Attendance for {format(browseMonth, "MMMM yyyy")}</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Employee</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Check In</TableHead>
                    <TableHead>Check Out</TableHead>
                    <TableHead>Hours Worked</TableHead>
                    <TableHead>Jobs Applied</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filterAttendance(browseMonthAttendance || [])?.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>{format(new Date(record.date), "MMM dd, yyyy")}</TableCell>
                      <TableCell className="font-medium">{record.team_members?.name}</TableCell>
                      <TableCell>{getStatusBadge(record.status)}</TableCell>
                      <TableCell>{formatTime(record.check_in_time)}</TableCell>
                      <TableCell>{formatTime(record.check_out_time)}</TableCell>
                      <TableCell className="font-medium text-primary">
                        {calculateTotalHours(record.check_in_time, record.check_out_time, record.notes)}
                      </TableCell>
                      <TableCell className="font-medium text-accent">
                        {getJobsAppliedFromNotes(record.notes)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(record)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteRecordId(record.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setLogRecord(record)}
                          >
                            <NotebookPen className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filterAttendance(browseMonthAttendance || []).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                        No attendance records for {format(browseMonth, "MMMM yyyy")}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <AttendanceDialog
        open={isDialogOpen}
        onOpenChange={handleDialogClose}
        members={members || []}
        record={editingRecord}
      />

      <AlertDialog open={!!logRecord} onOpenChange={(open) => !open && setLogRecord(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Check-in / Check-out log</AlertDialogTitle>
            <AlertDialogDescription>
              Full session history for {logRecord?.team_members?.name || "this record"}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 max-h-64 overflow-auto">
            {parseSessions(logRecord?.notes || null).map((s, idx) => (
              <div key={idx} className="flex items-center justify-between rounded-md border border-border/60 px-3 py-2">
                <div className="text-sm">
                  <div className="font-medium">Session {idx + 1}</div>
                  <div className="text-xs text-muted-foreground">
                    In: {formatTime(s.in?.slice(0, 5) || null)} — Out: {formatTime(s.out?.slice(0, 5) || null)}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  Jobs: {s.jobs ?? 0}
                </div>
              </div>
            ))}
            {parseSessions(logRecord?.notes || null).length === 0 && (
              <p className="text-sm text-muted-foreground">No sessions logged.</p>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Close</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteRecordId} onOpenChange={(open) => !open && setDeleteRecordId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Attendance Record</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this attendance record? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteRecordId && deleteAttendanceMutation.mutate(deleteRecordId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
