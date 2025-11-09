import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Upload, FolderPlus, Calendar as CalendarIcon, Edit, Trash2 } from "lucide-react";
import { FileUploadDialog } from "@/components/FileUploadDialog";
import { FolderDialog } from "@/components/FolderDialog";
import { InterviewDialog } from "@/components/InterviewDialog";
import { InterviewCalendar } from "@/components/InterviewCalendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
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

export default function Resources() {
  const [isFileDialogOpen, setIsFileDialogOpen] = useState(false);
  const [isFolderDialogOpen, setIsFolderDialogOpen] = useState(false);
  const [isInterviewDialogOpen, setIsInterviewDialogOpen] = useState(false);
  const [editingInterview, setEditingInterview] = useState<any>(null);
  const queryClient = useQueryClient();

  const { data: interviews, isLoading } = useQuery({
    queryKey: ["interviews"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("interviews")
        .select(`
          *,
          team_members(name)
        `)
        .order("scheduled_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const deleteInterviewMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("interviews")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["interviews"] });
      toast.success("Interview deleted successfully");
    },
    onError: () => {
      toast.error("Failed to delete interview");
    },
  });

  const handleEditInterview = (interview: any) => {
    setEditingInterview(interview);
    setIsInterviewDialogOpen(true);
  };

  const handleInterviewDialogClose = (open: boolean) => {
    setIsInterviewDialogOpen(open);
    if (!open) {
      setEditingInterview(null);
    }
  };

  // Group interviews by date
  const interviewsByDate = interviews?.reduce((acc: any, interview: any) => {
    const pstDate = toZonedTime(new Date(interview.scheduled_at), 'America/Los_Angeles');
    const dateKey = format(pstDate, 'yyyy-MM-dd');
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(interview);
    return acc;
  }, {});

  const sortedDates = Object.keys(interviewsByDate || {}).sort();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Resources</h2>
          <p className="text-muted-foreground">Manage files, folders, and interview schedules</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setIsFolderDialogOpen(true)} variant="outline" className="gap-2">
            <FolderPlus className="h-4 w-4" />
            New Folder
          </Button>
          <Button onClick={() => setIsFileDialogOpen(true)} variant="outline" className="gap-2">
            <Upload className="h-4 w-4" />
            Upload File
          </Button>
          <Button onClick={() => setIsInterviewDialogOpen(true)} className="gap-2">
            <CalendarIcon className="h-4 w-4" />
            Schedule Interview
          </Button>
        </div>
      </div>

      <Tabs defaultValue="calendar" className="space-y-6">
        <TabsList>
          <TabsTrigger value="calendar">Calendar View</TabsTrigger>
          <TabsTrigger value="list">List View</TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="space-y-4">
          <InterviewCalendar />
        </TabsContent>

        <TabsContent value="list" className="space-y-4">
          <div>
            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              Interview Schedule (PST Timezone)
            </h3>
            
            {isLoading ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Loading interviews...</p>
              </div>
            ) : sortedDates.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">
                    No interviews scheduled. Click "Schedule Interview" to add one.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {sortedDates.map((dateKey) => {
                  const date = new Date(dateKey);
                  const dayInterviews = interviewsByDate[dateKey];
                  
                  return (
                    <div key={dateKey}>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="bg-primary/10 px-3 py-1 rounded-lg">
                          <p className="text-sm font-semibold text-primary">
                            {format(date, 'EEEE, MMMM d, yyyy')}
                          </p>
                        </div>
                        <Badge variant="outline">{dayInterviews.length} interview{dayInterviews.length !== 1 ? 's' : ''}</Badge>
                      </div>
                      
                      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                        {dayInterviews.map((interview: any) => {
                          const pstDate = toZonedTime(new Date(interview.scheduled_at), 'America/Los_Angeles');
                          const isPast = new Date() > new Date(interview.scheduled_at);
                          
                          return (
                            <Card key={interview.id} className={`hover:shadow-md transition-shadow ${isPast ? 'opacity-70' : ''}`}>
                              <CardHeader className="pb-3">
                                <div className="flex items-start justify-between gap-2">
                                  <CardTitle className="text-base line-clamp-2">{interview.title}</CardTitle>
                                  <Badge variant={isPast ? "secondary" : "default"}>
                                    {isPast ? "Past" : "Upcoming"}
                                  </Badge>
                                </div>
                              </CardHeader>
                              <CardContent>
                                <div className="space-y-2 text-sm">
                                  <div className="flex items-center gap-2 font-semibold text-primary">
                                    <CalendarIcon className="h-4 w-4" />
                                    {format(pstDate, 'h:mm a')} PST
                                  </div>
                                  {interview.team_members && (
                                    <p className="text-muted-foreground">
                                      👤 {interview.team_members.name}
                                    </p>
                                  )}
                                  {interview.interviewer_name && (
                                    <p className="text-muted-foreground">
                                      👨‍💼 Interviewer: {interview.interviewer_name}
                                    </p>
                                  )}
                                  <p className="text-muted-foreground">
                                    ⏱️ {interview.duration_minutes} minutes
                                  </p>
                                  {interview.notes && (
                                    <p className="text-xs text-muted-foreground line-clamp-2 pt-2 border-t">
                                      {interview.notes}
                                    </p>
                                  )}
                                </div>
                                <div className="flex gap-2 mt-4 pt-3 border-t">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleEditInterview(interview)}
                                    className="flex-1"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-destructive hover:text-destructive"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Delete Interview</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Are you sure you want to delete this interview? This action cannot be undone.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={() => deleteInterviewMutation.mutate(interview.id)}
                                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                        >
                                          Delete
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <FolderDialog open={isFolderDialogOpen} onOpenChange={setIsFolderDialogOpen} />
      <FileUploadDialog open={isFileDialogOpen} onOpenChange={setIsFileDialogOpen} />
      <InterviewDialog
        open={isInterviewDialogOpen}
        onOpenChange={handleInterviewDialogClose}
        interview={editingInterview}
      />
    </div>
  );
}
