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
    <div className="space-y-6">
      {/* Large Calendar Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Interview Calendar</CardTitle>
          <CardDescription>Click on a date to view scheduled interviews (PST timezone)</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            className="rounded-md border-2 scale-125 pointer-events-auto"
            modifiers={{
              interview: interviewDates,
            }}
            modifiersClassNames={{
              interview: "bg-primary text-primary-foreground font-bold ring-2 ring-primary ring-offset-2",
            }}
          />
        </CardContent>
      </Card>

      {/* Interviews for Selected Date */}
      {selectedDate && (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">
              {format(selectedDate, "EEEE, MMMM d, yyyy")}
            </CardTitle>
            <CardDescription>
              {selectedDateInterviews && selectedDateInterviews.length > 0
                ? `${selectedDateInterviews.length} interview${selectedDateInterviews.length > 1 ? 's' : ''} scheduled`
                : "No interviews scheduled for this date"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {selectedDateInterviews && selectedDateInterviews.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {selectedDateInterviews.map((interview) => {
                  const isPast = new Date(interview.scheduled_at) < new Date();
                  return (
                    <Card key={interview.id} className={`hover:shadow-md transition-shadow ${isPast ? 'opacity-70' : ''}`}>
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-2">
                          <CardTitle className="text-base line-clamp-2">{interview.title}</CardTitle>
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
                      <CardContent className="space-y-3">
                        <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                          <Clock className="h-4 w-4" />
                          {formatInTimeZone(
                            new Date(interview.scheduled_at),
                            PST_TIMEZONE,
                            "h:mm a"
                          )} - {formatInTimeZone(
                            new Date(new Date(interview.scheduled_at).getTime() + (interview.duration_minutes || 60) * 60000),
                            PST_TIMEZONE,
                            "h:mm a"
                          )} PST
                          <Badge variant="outline" className="ml-auto">{interview.duration_minutes} min</Badge>
                        </div>

                        <div className="space-y-2 text-sm text-muted-foreground border-t pt-3">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            <span className="font-medium">Interviewee:</span>
                            <span className="truncate">{interview.team_members?.name || "N/A"}</span>
                          </div>
                          {interview.interviewer_name && (
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4" />
                              <span className="font-medium">Interviewer:</span>
                              <span className="truncate">{interview.interviewer_name}</span>
                            </div>
                          )}
                        </div>

                        {interview.notes && (
                          <p className="text-xs text-muted-foreground line-clamp-3 border-t pt-2">
                            {interview.notes}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>No interviews scheduled for this date.</p>
                <p className="text-sm mt-2">Click "Schedule Interview" to add one.</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
