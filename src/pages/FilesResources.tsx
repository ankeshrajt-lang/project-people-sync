import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Upload, Trash2, Download, Calendar as CalendarIcon, Edit } from "lucide-react";
import { FileUploadDialog } from "@/components/FileUploadDialog";
import { InterviewDialog } from "@/components/InterviewDialog";
import { InterviewCalendar } from "@/components/InterviewCalendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

export default function FilesResources() {
  const ROOT_KEY = "__root__";
  const [isFileDialogOpen, setIsFileDialogOpen] = useState(false);
  const [isInterviewDialogOpen, setIsInterviewDialogOpen] = useState(false);
  const [editingInterview, setEditingInterview] = useState<any>(null);
  const [selectedFolder, setSelectedFolder] = useState<string>("all");
  const queryClient = useQueryClient();

  // Fetch all files
  const { data: files, isLoading: filesLoading } = useQuery({
    queryKey: ["files"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("files")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch interviews
  const { data: interviews, isLoading: interviewsLoading } = useQuery({
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

  // Delete file mutation
  const deleteFileMutation = useMutation({
    mutationFn: async (file: { id: string; file_path: string }) => {
      // First delete from database
      const { error: dbError } = await supabase
        .from("files")
        .delete()
        .eq("id", file.id);

      if (dbError) {
        console.error("Database deletion error:", dbError);
        throw new Error(`Failed to delete file from database: ${dbError.message}`);
      }

      // Then delete from storage
      const { error: storageError } = await supabase.storage
        .from("project-files")
        .remove([file.file_path]);

      if (storageError) {
        console.error("Storage deletion error:", storageError);
        throw new Error(`Failed to delete file from storage: ${storageError.message}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["files"] });
      toast.success("File deleted successfully");
    },
    onError: (error: any) => {
      console.error("Delete file error:", error);
      toast.error(error.message || "Failed to delete file");
    },
  });

  // Delete interview mutation
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

  const handleDownload = async (filePath: string, fileName: string) => {
    const { data, error } = await supabase.storage
      .from("project-files")
      .download(filePath);

    if (error) {
      toast.error("Failed to download file");
      return;
    }

    const url = URL.createObjectURL(data);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "Unknown";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

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

  const extractFolder = (path: string | null | undefined) => {
    if (!path) return "";
    const parts = path.split("/");
    if (parts.length <= 1) return "";
    return parts.slice(0, -1).join("/");
  };

  const folderOptions = Array.from(
    new Set((files || []).map((file: any) => extractFolder(file.file_path)))
  )
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));
  const filteredFiles = (files || []).filter((file: any) => {
    if (selectedFolder === "all") return true;
    if (selectedFolder === ROOT_KEY) return extractFolder(file.file_path) === "";
    return extractFolder(file.file_path) === selectedFolder;
  });
  const uploadInitialFolder = selectedFolder === "all" || selectedFolder === ROOT_KEY ? "" : selectedFolder;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Files & Resources</h2>
          <p className="text-muted-foreground">Manage files and interview schedules</p>
        </div>
        <div className="flex gap-2">
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

      <Tabs defaultValue="files" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="files">Files</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="list">Interview List</TabsTrigger>
        </TabsList>

        {/* Files Tab */}
        <TabsContent value="files" className="space-y-4 mt-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <p className="text-sm text-muted-foreground">Folder</p>
              <Select value={selectedFolder} onValueChange={setSelectedFolder}>
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder="Choose folder" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All folders</SelectItem>
                  <SelectItem value={ROOT_KEY}>Root</SelectItem>
                  {folderOptions.map((folder) => (
                    <SelectItem key={folder} value={folder}>
                      {folder}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Badge variant="outline">{filteredFiles.length} file{filteredFiles.length === 1 ? "" : "s"}</Badge>
          </div>
          {filesLoading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Loading files...</p>
            </div>
          ) : !files || files.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">
                  No files uploaded yet. Click "Upload File" to add one.
                </p>
              </CardContent>
            </Card>
          ) : filteredFiles.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">
                  No files in this folder. Switch folders or upload directly here.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredFiles.map((file) => {
                const folderLabel = extractFolder(file.file_path) || "Root";
                return (
                <Card key={file.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base line-clamp-2">{file.name}</CardTitle>
                    <CardDescription className="text-xs">
                      {formatFileSize(file.file_size)}
                      {" • "}
                      {folderLabel}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <p>Type: {file.file_type || "Unknown"}</p>
                      <p>Uploaded: {format(new Date(file.created_at), "MMM d, yyyy")}</p>
                    </div>
                    <div className="flex gap-2 mt-4 pt-3 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownload(file.file_path, file.name)}
                        className="flex-1"
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Download
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete File</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{file.name}"? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteFileMutation.mutate({ id: file.id, file_path: file.file_path })}
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
          )}
        </TabsContent>

        {/* Calendar Tab */}
        <TabsContent value="calendar" className="space-y-4 mt-6">
          <InterviewCalendar />
        </TabsContent>

        {/* Interview List Tab */}
        <TabsContent value="list" className="space-y-4 mt-6">
          {interviewsLoading ? (
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
        </TabsContent>
      </Tabs>

      <FileUploadDialog
        open={isFileDialogOpen}
        onOpenChange={setIsFileDialogOpen}
        existingFolders={folderOptions}
        initialFolder={uploadInitialFolder}
      />
      <InterviewDialog
        open={isInterviewDialogOpen}
        onOpenChange={handleInterviewDialogClose}
        interview={editingInterview}
      />
    </div>
  );
}
