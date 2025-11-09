import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { Clock, User } from "lucide-react";

const PST_TIMEZONE = "America/Los_Angeles";

export function InterviewCalendar() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  const { data: interviews } = useQuery({
    queryKey: ["interviews"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("interviews")
        .select(`
          *,
          team_members!interviews_interviewee_id_fkey(name, email)
        `)
        .order("scheduled_at", { ascending: true });

      if (error) throw error;
      return data || [];
    },
  });

  // Get interviews for selected date
  const selectedDateInterviews = interviews?.filter((interview) => {
    const interviewDate = new Date(interview.scheduled_at);
    return (
      selectedDate &&
      interviewDate.getFullYear() === selectedDate.getFullYear() &&
      interviewDate.getMonth() === selectedDate.getMonth() &&
      interviewDate.getDate() === selectedDate.getDate()
    );
  });

  // Get dates that have interviews
  const interviewDates = interviews?.map((interview) => new Date(interview.scheduled_at)) || [];

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Interview Calendar</CardTitle>
          <CardDescription>Select a date to view scheduled interviews</CardDescription>
        </CardHeader>
        <CardContent>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            className="rounded-md border"
            modifiers={{
              interview: interviewDates,
            }}
            modifiersClassNames={{
              interview: "bg-primary text-primary-foreground font-bold",
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            {selectedDate ? format(selectedDate, "MMMM d, yyyy") : "Select a date"}
          </CardTitle>
          <CardDescription>
            {selectedDateInterviews && selectedDateInterviews.length > 0
              ? `${selectedDateInterviews.length} interview(s) scheduled`
              : "No interviews scheduled"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {selectedDateInterviews?.map((interview) => (
              <Card key={interview.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-base">{interview.title}</CardTitle>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        {formatInTimeZone(
                          new Date(interview.scheduled_at),
                          PST_TIMEZONE,
                          "h:mm a zzz"
                        )}
                        <Badge variant="outline">{interview.duration_minutes} min</Badge>
                      </div>
                    </div>
                    <Badge
                      variant={
                        interview.status === "completed"
                          ? "default"
                          : interview.status === "cancelled"
                          ? "destructive"
                          : "secondary"
                      }
                    >
                      {interview.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Interviewee:</span>
                    {interview.team_members?.name || "N/A"}
                  </div>
                  {interview.interviewer_name && (
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Interviewer:</span>
                      {interview.interviewer_name}
                    </div>
                  )}
                  {interview.notes && (
                    <p className="text-sm text-muted-foreground mt-2">{interview.notes}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
