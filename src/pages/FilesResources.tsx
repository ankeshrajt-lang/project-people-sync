import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Upload, Trash2, Download, Calendar as CalendarIcon, Edit, MoreVertical, FolderSymlink, FolderPlus } from "lucide-react";
import { FileUploadDialog } from "@/components/FileUploadDialog";
import { InterviewDialog } from "@/components/InterviewDialog";
import { InterviewCalendar } from "@/components/InterviewCalendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { cn } from "@/lib/utils";

export default function FilesResources() {
  const ROOT_KEY = "__root__";
  const [isFileDialogOpen, setIsFileDialogOpen] = useState(false);
  const [isInterviewDialogOpen, setIsInterviewDialogOpen] = useState(false);
  const [editingInterview, setEditingInterview] = useState<any>(null);
  const [selectedFolder, setSelectedFolder] = useState<string>("all");
  const [isMoveDialogOpen, setIsMoveDialogOpen] = useState(false);
  const [fileToMove, setFileToMove] = useState<any>(null);
  const [targetFolder, setTargetFolder] = useState<string>("");
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderColor, setNewFolderColor] = useState("sky");
  const [customFolders, setCustomFolders] = useState<Record<string, string>>({});
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

  const normalizeFolderPath = (folder: string) =>
    folder
      .replace(/\\/g, "/")
      .split("/")
      .map((part) => part.trim())
      .filter(Boolean)
      .join("/");
  const normalizeStoragePath = (path?: string | null) => {
    if (!path) return "";
    return path.replace(/^\/+/, "").replace(/\/{2,}/g, "/").trim();
  };
  const folderColorOptions = [
    { id: "sky", label: "Sky", dot: "bg-sky-500", bg: "bg-sky-100", border: "border-sky-200", text: "text-sky-900" },
    { id: "emerald", label: "Emerald", dot: "bg-emerald-500", bg: "bg-emerald-100", border: "border-emerald-200", text: "text-emerald-900" },
    { id: "amber", label: "Amber", dot: "bg-amber-500", bg: "bg-amber-100", border: "border-amber-200", text: "text-amber-900" },
    { id: "violet", label: "Violet", dot: "bg-violet-500", bg: "bg-violet-100", border: "border-violet-200", text: "text-violet-900" },
    { id: "gray", label: "Gray", dot: "bg-gray-500", bg: "bg-gray-100", border: "border-gray-200", text: "text-gray-900" },
  ];
  const getDeterministicColorId = (name: string) => {
    if (!name) return "gray";
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = (hash << 5) - hash + name.charCodeAt(i);
      hash |= 0;
    }
    const idx = Math.abs(hash) % folderColorOptions.length;
    return folderColorOptions[idx].id;
  };
  const colorStyles = folderColorOptions.reduce<Record<string, { dot: string; bg: string; border: string; text: string }>>(
    (acc, opt) => {
      acc[opt.id] = { dot: opt.dot, bg: opt.bg, border: opt.border, text: opt.text };
      return acc;
    },
    {}
  );

  // Delete file mutation
  const deleteFileMutation = useMutation({
    mutationFn: async (file: { id: string; file_path: string }) => {
      const storagePath = normalizeStoragePath(file.file_path);
      if (!storagePath) throw new Error("Missing file path");
      const { error: storageError } = await supabase.storage
        .from("project-files")
        .remove([storagePath]);

      if (storageError) {
        console.error("Storage deletion error:", storageError);
        throw new Error(`Failed to delete file from storage: ${storageError.message}`);
      }

      const { error: dbError } = await supabase
        .from("files")
        .delete()
        .eq("id", file.id);

      if (dbError) {
        console.error("Database deletion error:", dbError);
        throw new Error(`Failed to delete file from database: ${dbError.message}`);
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

  const moveFileMutation = useMutation({
    mutationFn: async ({ file, folder }: { file: any; folder: string }) => {
      const cleanedFolder = normalizeFolderPath(folder);
      const rawPath = file.file_path || "";
      const normalizedPath = normalizeStoragePath(rawPath);
      const fileNameFromRecord =
        (normalizedPath || rawPath || file.name || "")
          .split("/")
          .filter(Boolean)
          .pop() || "";
      const candidates = Array.from(
        new Set(
          [
            rawPath,
            rawPath.trim(),
            rawPath.replace(/^\/+/, ""),
            normalizedPath,
            fileNameFromRecord,
            (file.name || "").trim(),
          ].filter(Boolean)
        )
      );

      const fileName = fileNameFromRecord || file.name || "";
      const finalFileName = fileName.trim();
      const newPath = cleanedFolder
        ? `${cleanedFolder}/${finalFileName}`
        : finalFileName;

      if (!finalFileName) throw new Error("File name is missing");
      if (!candidates.length) throw new Error("File path is missing");
      if (candidates.some((c) => normalizeStoragePath(c) === normalizeStoragePath(newPath))) return;

      let usedSource: string | null = null;
      let lastError: any = null;
      for (const candidate of candidates) {
        const cleanedCandidate = normalizeStoragePath(candidate);
        if (!cleanedCandidate) continue;
        const { error } = await supabase.storage
          .from("project-files")
          .copy(cleanedCandidate, newPath);
        if (!error) {
          usedSource = cleanedCandidate;
          break;
        }
        lastError = error;
      }
      if (!usedSource) {
        throw lastError || new Error("Failed to move file: source not found");
      }

      const { error: dbError } = await supabase
        .from("files")
        .update({ file_path: newPath })
        .eq("id", file.id);

      if (dbError) {
        await supabase.storage.from("project-files").remove([newPath]).catch(() => {});
        throw dbError;
      }

      const { error: deleteError } = await supabase.storage
        .from("project-files")
        .remove([usedSource]);

      if (deleteError) {
        console.error("Cleanup old file error:", deleteError);
        toast.warning("Moved, but could not delete old file");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["files"] });
      toast.success("File moved successfully");
      setIsMoveDialogOpen(false);
      setFileToMove(null);
      setTargetFolder("");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to move file");
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

  const handleDownload = async (filePath: string | null | undefined, fileName: string) => {
    const raw = filePath || "";
    const cleaned = normalizeStoragePath(raw);
    const candidates = Array.from(
      new Set(
        [
          raw,
          raw.trim(),
          raw.replace(/^\/+/, ""),
          cleaned,
        ].filter(Boolean)
      )
    );

    if (!candidates.length) {
      toast.error("File path is missing");
      return;
    }

    let blob: Blob | null = null;
    let lastError: any = null;
    for (const candidate of candidates) {
      const path = normalizeStoragePath(candidate);
      if (!path) continue;
      const { data, error } = await supabase.storage
        .from("project-files")
        .download(path);
      if (!error && data) {
        blob = data;
        break;
      }
      lastError = error;
    }

    if (!blob) {
      toast.error(`Failed to download file${lastError?.message ? `: ${lastError.message}` : ""}`);
      return;
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName || candidates[0].split("/").pop() || "download";
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
    const cleaned = normalizeStoragePath(path);
    if (!cleaned) return "";
    const parts = cleaned.split("/");
    if (parts.length <= 1) return "";
    return parts.slice(0, -1).join("/");
  };

  const folderCounts: Record<string, number> = (files || []).reduce((acc: Record<string, number>, file: any) => {
    const folderName = normalizeFolderPath(extractFolder(file.file_path));
    acc[folderName] = (acc[folderName] || 0) + 1;
    return acc;
  }, {});

  const allFolderNames = Array.from(
    new Set([
      ...Object.keys(folderCounts),
      ...Object.keys(customFolders),
      normalizeFolderPath(targetFolder),
    ])
  )
    .filter((name) => name !== undefined && name !== null)
    .sort((a, b) => a.localeCompare(b));

  const folderOptions = allFolderNames;

  const getFolderColorId = (name: string) => {
    return customFolders[name] || getDeterministicColorId(name);
  };

  const folderCards = [
    {
      name: "all",
      label: "All",
      count: files?.length || 0,
      colorId: "gray",
    },
    {
      name: ROOT_KEY,
      label: "Root",
      count: folderCounts[""] || 0,
      colorId: "gray",
    },
    ...allFolderNames
      .filter((name) => name)
      .map((name) => ({
        name,
        label: name,
        count: folderCounts[name] || 0,
        colorId: getFolderColorId(name),
      })),
  ];
  const filteredFiles = (files || []).filter((file: any) => {
    if (selectedFolder === "all") return true;
    const fileFolder = normalizeFolderPath(extractFolder(file.file_path));
    if (selectedFolder === ROOT_KEY) return fileFolder === "";
    const targetFolder = normalizeFolderPath(selectedFolder);
    return fileFolder === targetFolder;
  });
  const uploadInitialFolder = selectedFolder === "all" || selectedFolder === ROOT_KEY ? "" : selectedFolder;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Files & Resources</h2>
          <p className="text-muted-foreground">Manage files and interview schedules</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button onClick={() => setIsCreateFolderOpen(true)} variant="secondary" className="gap-2">
            <FolderPlus className="h-4 w-4" />
            Create Folder
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

      <Tabs defaultValue="files" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="files">Files</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="list">Interview List</TabsTrigger>
        </TabsList>

        {/* Files Tab */}
        <TabsContent value="files" className="space-y-4 mt-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="text-sm font-semibold text-muted-foreground">Folders</h3>
              <Badge variant="outline">{filteredFiles.length} file{filteredFiles.length === 1 ? "" : "s"} shown</Badge>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {folderCards.map((folder) => {
                const style = colorStyles[folder.colorId] || colorStyles.gray;
                const isActive =
                  (folder.name === "all" && selectedFolder === "all") ||
                  (folder.name === ROOT_KEY && selectedFolder === ROOT_KEY) ||
                  (folder.name !== "all" && folder.name !== ROOT_KEY && selectedFolder === folder.name);
                return (
                  <button
                    key={folder.name}
                    onClick={() => setSelectedFolder(folder.name)}
                    className={cn(
                      "text-left rounded-lg border p-4 transition hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2",
                      style.bg,
                      style.border,
                      style.text,
                      isActive ? "ring-2 ring-offset-2 ring-primary" : ""
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className={cn("h-2.5 w-2.5 rounded-full", style.dot)} />
                        <span className="font-semibold">{folder.label}</span>
                      </div>
                      <span className="text-xs font-medium">{folder.count} file{folder.count === 1 ? "" : "s"}</span>
                    </div>
                  </button>
                );
              })}
            </div>
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
                const filePath = normalizeStoragePath(file.file_path);
                const folderLabel = extractFolder(filePath) || "Root";
                return (
                <Card key={file.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <CardTitle className="text-base line-clamp-2">{file.name}</CardTitle>
                        <CardDescription className="text-xs">
                          {formatFileSize(file.file_size)}
                          {" • "}
                          {folderLabel}
                        </CardDescription>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            className="gap-2"
                            onClick={() => {
                              setFileToMove(file);
                              setTargetFolder(extractFolder(file.file_path) || "");
                              setIsMoveDialogOpen(true);
                            }}
                          >
                            <FolderSymlink className="h-4 w-4" />
                            Move to folder
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
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

      <Dialog open={isMoveDialogOpen} onOpenChange={setIsMoveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Move file</DialogTitle>
            <DialogDescription>
              Choose a destination folder. Enter a new folder path to create it on move (use "/" for nesting).
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!fileToMove) return;
              moveFileMutation.mutate({ file: fileToMove, folder: targetFolder });
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="target-folder">Folder</Label>
              <div className="flex gap-2">
                <Input
                  id="target-folder"
                  list="move-folder-suggestions"
                  placeholder="e.g. proposals/2025"
                  value={targetFolder}
                  onChange={(e) => setTargetFolder(e.target.value)}
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    const cleaned = normalizeFolderPath(targetFolder);
                    if (!cleaned) {
                      toast.error("Enter a folder name first");
                      return;
                    }
                    if (!customFolders[cleaned]) {
                      setCustomFolders((prev) => ({ ...prev, [cleaned]: getDeterministicColorId(cleaned) }));
                    }
                    setTargetFolder(cleaned);
                    toast.success("Folder added");
                  }}
                  className="whitespace-nowrap"
                >
                  Create folder
                </Button>
              </div>
              <datalist id="move-folder-suggestions">
                {folderOptions.map((folder) => (
                  <option key={folder} value={folder} />
                ))}
              </datalist>
              <p className="text-xs text-muted-foreground">
                Leave blank for root. Folders are created automatically when you move the file.
              </p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsMoveDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={moveFileMutation.isPending}>
                {moveFileMutation.isPending ? "Moving..." : "Move file"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isCreateFolderOpen} onOpenChange={setIsCreateFolderOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Folder</DialogTitle>
            <DialogDescription>Pick a name and color for your new folder tile.</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const cleaned = normalizeFolderPath(newFolderName);
              if (!cleaned) {
                toast.error("Folder name cannot be empty");
                return;
              }
              setCustomFolders((prev) => ({ ...prev, [cleaned]: newFolderColor }));
              setSelectedFolder(cleaned);
              setTargetFolder(cleaned);
              setIsCreateFolderOpen(false);
              setNewFolderName("");
              setNewFolderColor("sky");
              toast.success("Folder ready");
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="folder-name">Folder name</Label>
              <Input
                id="folder-name"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="e.g. Ankesh_Oracle"
              />
            </div>
            <div className="space-y-2">
              <Label>Folder color</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {folderColorOptions.map((opt) => (
                  <button
                    type="button"
                    key={opt.id}
                    onClick={() => setNewFolderColor(opt.id)}
                    className={cn(
                      "flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition",
                      opt.bg,
                      opt.border,
                      opt.text,
                      newFolderColor === opt.id ? "ring-2 ring-offset-2 ring-primary" : ""
                    )}
                  >
                    <span className={cn("h-3 w-3 rounded-full", opt.dot)} />
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreateFolderOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Save</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

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
