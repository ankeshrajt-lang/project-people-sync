import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus, Copy, Edit, Trash2, ExternalLink, Upload, Search, Filter, MoreHorizontal, Briefcase, User, MapPin, Calendar as CalendarIcon, Phone, Mail } from "lucide-react";
import { remoteCompanies } from "@/utils/companyData";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { ConsultantDialog } from "@/components/ConsultantDialog";
import { JobApplicationDialog } from "@/components/JobApplicationDialog";
import { toast } from "sonner";
import { format } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function Consultants() {
  const [selectedConsultantId, setSelectedConsultantId] = useState<string | null>(null);
  const [isConsultantDialogOpen, setIsConsultantDialogOpen] = useState(false);
  const [isJobDialogOpen, setIsJobDialogOpen] = useState(false);
  const [editingConsultant, setEditingConsultant] = useState<any>(null);
  const [editingJob, setEditingJob] = useState<any>(null);
  const [cloneFromId, setCloneFromId] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedJobs, setSelectedJobs] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const queryClient = useQueryClient();

  // Fetch consultants
  const { data: consultants } = useQuery({
    queryKey: ["consultants"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("consultants")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch job applications for selected consultant
  const { data: jobApplications } = useQuery({
    queryKey: ["job_applications", selectedConsultantId],
    enabled: !!selectedConsultantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("job_applications")
        .select("*")
        .eq("consultant_id", selectedConsultantId)
        .order("date_applied", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Delete consultant mutation
  const deleteConsultantMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("consultants").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["consultants"] });
      toast.success("Consultant deleted successfully");
      if (selectedConsultantId === editingConsultant?.id) {
        setSelectedConsultantId(null);
      }
    },
    onError: () => {
      toast.error("Failed to delete consultant");
    },
  });

  // Delete job application mutation
  const deleteJobMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("job_applications").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["job_applications"] });
      toast.success("Job application deleted successfully");
      setSelectedJobs(new Set());
      setSelectAll(false);
    },
    onError: () => {
      toast.error("Failed to delete job application");
    },
  });

  // Bulk delete job applications mutation
  const bulkDeleteJobsMutation = useMutation({
    mutationFn: async (jobIds: string[]) => {
      const { error } = await supabase
        .from("job_applications")
        .delete()
        .in("id", jobIds);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["job_applications"] });
      toast.success(`${selectedJobs.size} job applications deleted successfully`);
      setSelectedJobs(new Set());
      setSelectAll(false);
    },
    onError: () => {
      toast.error("Failed to delete job applications");
    },
  });

  // Update job status mutation
  const updateJobStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("job_applications")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["job_applications"] });
      toast.success("Status updated successfully");
    },
    onError: () => {
      toast.error("Failed to update status");
    },
  });

  // Clone job applications mutation
  const cloneJobsMutation = useMutation({
    mutationFn: async ({ fromId, toId }: { fromId: string; toId: string }) => {
      // Fetch source jobs
      const { data: sourceJobs, error: fetchError } = await supabase
        .from("job_applications")
        .select("*")
        .eq("consultant_id", fromId);

      if (fetchError) throw fetchError;

      // Clone jobs to target consultant
      const clonedJobs = sourceJobs?.map((job) => ({
        consultant_id: toId,
        company_name: job.company_name,
        status: job.status,
        role: job.role,
        career_url: job.career_url,
        date_applied: job.date_applied,
        resume_version: job.resume_version,
        jobs_applied_count: job.jobs_applied_count,
        employment_type: job.employment_type,
        work_type: job.work_type,
        notes: job.notes,
      }));

      const { error: insertError } = await supabase
        .from("job_applications")
        .insert(clonedJobs || []);

      if (insertError) throw insertError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["job_applications"] });
      toast.success("Job applications cloned successfully");
      setCloneFromId("");
    },
    onError: () => {
      toast.error("Failed to clone job applications");
    },
  });

  const handleEditConsultant = (consultant: any) => {
    setEditingConsultant(consultant);
    setIsConsultantDialogOpen(true);
  };

  const handleEditJob = (job: any) => {
    setEditingJob(job);
    setIsJobDialogOpen(true);
  };

  const handleConsultantDialogClose = (open: boolean) => {
    setIsConsultantDialogOpen(open);
    if (!open) {
      setEditingConsultant(null);
    }
  };

  const handleJobDialogClose = (open: boolean) => {
    setIsJobDialogOpen(open);
    if (!open) {
      setEditingJob(null);
    }
  };

  const handleClone = () => {
    if (cloneFromId && selectedConsultantId && cloneFromId !== selectedConsultantId) {
      cloneJobsMutation.mutate({ fromId: cloneFromId, toId: selectedConsultantId });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "applied":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800";
      case "in progress":
        return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800";
      case "complete":
        return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800";
      case "yettostart":
        return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-700";
      default:
        return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-700";
    }
  };

  // Bulk add companies mutation
  const bulkAddCompaniesMutation = useMutation({
    mutationFn: async () => {
      if (!selectedConsultantId) return;

      const jobsToAdd = remoteCompanies.map((company) => ({
        consultant_id: selectedConsultantId,
        company_name: company.name,
        status: "yettostart",
        career_url: company.url,
        date_applied: new Date().toISOString().split('T')[0],
      }));

      const { error } = await supabase
        .from("job_applications")
        .insert(jobsToAdd);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["job_applications"] });
      toast.success(`Added ${remoteCompanies.length} companies successfully`);
    },
    onError: () => {
      toast.error("Failed to add companies");
    },
  });

  const filteredJobs = jobApplications?.filter((job) => {
    const matchesStatus = statusFilter === "all" || job.status.toLowerCase() === statusFilter.toLowerCase();
    const matchesSearch = searchTerm === "" ||
      job.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.role?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedJobs(new Set());
      setSelectAll(false);
    } else {
      setSelectedJobs(new Set(filteredJobs?.map(job => job.id) || []));
      setSelectAll(true);
    }
  };

  const handleSelectJob = (jobId: string) => {
    const newSelected = new Set(selectedJobs);
    if (newSelected.has(jobId)) {
      newSelected.delete(jobId);
    } else {
      newSelected.add(jobId);
    }
    setSelectedJobs(newSelected);
    setSelectAll(newSelected.size === filteredJobs?.length);
  };

  const handleBulkDelete = () => {
    if (selectedJobs.size === 0) {
      toast.error("Please select at least one job application to delete");
      return;
    }
    if (confirm(`Are you sure you want to delete ${selectedJobs.size} job application(s)?`)) {
      bulkDeleteJobsMutation.mutate(Array.from(selectedJobs));
    }
  };

  const selectedConsultant = consultants?.find((c) => c.id === selectedConsultantId);

  return (
    <div className="space-y-6 h-[calc(100vh-2rem)] flex flex-col">
      <div className="flex justify-between items-center shrink-0">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 bg-clip-text text-transparent">
            Consultants
          </h2>
          <p className="text-muted-foreground">Manage consultants and track job applications</p>
        </div>
        <Button onClick={() => setIsConsultantDialogOpen(true)} className="gap-2 shadow-lg shadow-primary/20">
          <Plus className="h-4 w-4" />
          Add Consultant
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 flex-1 min-h-0">
        {/* Consultants List Sidebar */}
        <Card className="md:col-span-3 glass-card border-none shadow-xl flex flex-col overflow-hidden h-full">
          <CardHeader className="pb-4 shrink-0 border-b border-black/5 dark:border-white/5">
            <CardTitle className="text-lg">Team Members</CardTitle>
            <CardDescription>Select to view details</CardDescription>
          </CardHeader>
          <CardContent className="p-3 flex-1 overflow-y-auto space-y-2">
            {consultants?.map((consultant) => {
              const initials = consultant.name
                .split(" ")
                .map((n: string) => n[0])
                .join("")
                .toUpperCase()
                .slice(0, 2);

              return (
                <div
                  key={consultant.id}
                  className={`group p-3 rounded-xl cursor-pointer transition-all duration-200 border border-transparent ${selectedConsultantId === consultant.id
                      ? "bg-white dark:bg-white/10 shadow-md border-black/5 dark:border-white/5"
                      : "hover:bg-white/50 dark:hover:bg-white/5 hover:shadow-sm"
                    }`}
                  onClick={() => setSelectedConsultantId(consultant.id)}
                >
                  <div className="flex items-center gap-3">
                    <Avatar className={`h-10 w-10 transition-transform duration-200 ${selectedConsultantId === consultant.id ? "scale-105" : ""}`}>
                      <AvatarImage src={undefined} />
                      <AvatarFallback className={`${selectedConsultantId === consultant.id ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium truncate ${selectedConsultantId === consultant.id ? "text-primary" : "text-foreground"}`}>
                        {consultant.name}
                      </p>
                      {consultant.email && (
                        <p className="text-xs text-muted-foreground truncate">{consultant.email}</p>
                      )}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="glass-card">
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          handleEditConsultant(consultant);
                        }}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive">
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="glass-card border-none">
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Consultant</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure? This will delete all job applications for this consultant.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="border-0 bg-black/5 hover:bg-black/10">Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteConsultantMutation.mutate(consultant.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              );
            })}
            {(!consultants || consultants.length === 0) && (
              <div className="text-center py-12 text-muted-foreground text-sm flex flex-col items-center gap-2">
                <User className="h-8 w-8 opacity-20" />
                <p>No consultants yet</p>
                <Button variant="link" size="sm" onClick={() => setIsConsultantDialogOpen(true)}>
                  Add your first member
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Main Content Area */}
        <div className="md:col-span-9 h-full min-h-0 flex flex-col">
          {selectedConsultant ? (
            <Card className="glass-card border-none shadow-xl flex-1 flex flex-col overflow-hidden">
              <Tabs defaultValue="jobs" className="w-full h-full flex flex-col">
                <div className="px-6 pt-6 pb-2 shrink-0 border-b border-black/5 dark:border-white/5 flex justify-between items-center bg-white/30 dark:bg-black/20">
                  <div className="flex items-center gap-4">
                    <div>
                      <h3 className="text-2xl font-bold tracking-tight">{selectedConsultant.name}</h3>
                      <p className="text-sm text-muted-foreground flex items-center gap-2">
                        <Briefcase className="h-3 w-3" />
                        Consultant
                      </p>
                    </div>
                  </div>
                  <TabsList className="bg-black/5 dark:bg-white/10">
                    <TabsTrigger value="jobs" className="data-[state=active]:bg-white dark:data-[state=active]:bg-black/40">Job Applications</TabsTrigger>
                    <TabsTrigger value="info" className="data-[state=active]:bg-white dark:data-[state=active]:bg-black/40">Profile Info</TabsTrigger>
                  </TabsList>
                </div>

                {/* Job Applications Tab */}
                <TabsContent value="jobs" className="flex-1 overflow-hidden flex flex-col p-0 m-0 data-[state=active]:flex">
                  <div className="p-4 flex flex-wrap gap-3 items-center justify-between border-b border-black/5 dark:border-white/5 bg-white/20 dark:bg-black/10">
                    <div className="flex items-center gap-3 flex-1 min-w-[200px]">
                      <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search companies or roles..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-9 bg-white/50 dark:bg-black/20 border-0 ring-1 ring-black/5 dark:ring-white/10"
                        />
                      </div>
                      <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-[140px] bg-white/50 dark:bg-black/20 border-0 ring-1 ring-black/5 dark:ring-white/10">
                          <div className="flex items-center gap-2">
                            <Filter className="h-3.5 w-3.5" />
                            <SelectValue placeholder="Filter" />
                          </div>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Status</SelectItem>
                          <SelectItem value="yettostart">Yet to Start</SelectItem>
                          <SelectItem value="applied">Applied</SelectItem>
                          <SelectItem value="in progress">In Progress</SelectItem>
                          <SelectItem value="complete">Complete</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center gap-2">
                      {selectedJobs.size > 0 && (
                        <Button
                          onClick={handleBulkDelete}
                          disabled={bulkDeleteJobsMutation.isPending}
                          variant="destructive"
                          size="sm"
                          className="shadow-sm"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete ({selectedJobs.size})
                        </Button>
                      )}

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className="bg-white/50 dark:bg-black/20 border-0 ring-1 ring-black/5 dark:ring-white/10">
                            Actions
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="glass-card">
                          <DropdownMenuItem onClick={() => setIsJobDialogOpen(true)}>
                            <Plus className="h-4 w-4 mr-2" />
                            Add Job
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => bulkAddCompaniesMutation.mutate()} disabled={bulkAddCompaniesMutation.isPending}>
                            <Upload className="h-4 w-4 mr-2" />
                            Add All Companies
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                            <div className="flex items-center gap-2 w-full" onClick={(e) => e.stopPropagation()}>
                              <Copy className="h-4 w-4" />
                              <Select value={cloneFromId} onValueChange={(val) => {
                                setCloneFromId(val);
                                // Small timeout to allow state update before action if needed, 
                                // but here we just set ID. The user needs to click a button or we trigger immediately?
                                // Let's keep it simple: just select ID here, then have a separate button or trigger.
                                // Actually, UI-wise, a nested select is tricky.
                                // Let's revert to a simple "Clone" dialog or just keep the button outside.
                              }}>
                                <SelectTrigger className="h-8 border-0 bg-transparent p-0 focus:ring-0">
                                  <SelectValue placeholder="Clone from..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {consultants
                                    ?.filter((c) => c.id !== selectedConsultantId)
                                    .map((consultant) => (
                                      <SelectItem key={consultant.id} value={consultant.id}>
                                        {consultant.name}
                                      </SelectItem>
                                    ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </DropdownMenuItem>
                          {cloneFromId && (
                            <DropdownMenuItem onClick={handleClone}>
                              Confirm Clone
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  <div className="flex-1 overflow-auto">
                    <Table>
                      <TableHeader className="bg-black/5 dark:bg-white/5 sticky top-0 z-10 backdrop-blur-md">
                        <TableRow className="hover:bg-transparent border-b border-black/5 dark:border-white/5">
                          <TableHead className="w-[50px]">
                            <Checkbox
                              checked={selectAll}
                              onCheckedChange={handleSelectAll}
                            />
                          </TableHead>
                          <TableHead>Company</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Date Applied</TableHead>
                          <TableHead>Jobs</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredJobs?.map((job) => (
                          <TableRow key={job.id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors border-b border-black/5 dark:border-white/5">
                            <TableCell>
                              <Checkbox
                                checked={selectedJobs.has(job.id)}
                                onCheckedChange={() => handleSelectJob(job.id)}
                              />
                            </TableCell>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                {job.company_name}
                                {job.career_url && (
                                  <a
                                    href={job.career_url.startsWith('http') ? job.career_url : `https://${job.career_url}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="opacity-50 hover:opacity-100 transition-opacity"
                                  >
                                    <ExternalLink className="h-3 w-3" />
                                  </a>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Select
                                value={job.status}
                                onValueChange={(value) =>
                                  updateJobStatusMutation.mutate({ id: job.id, status: value })
                                }
                              >
                                <SelectTrigger className="w-[130px] h-8 border-0 bg-transparent p-0 focus:ring-0">
                                  <SelectValue>
                                    <Badge variant="outline" className={`${getStatusColor(job.status)} border-0`}>
                                      {job.status}
                                    </Badge>
                                  </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="yettostart">Yet to Start</SelectItem>
                                  <SelectItem value="Applied">Applied</SelectItem>
                                  <SelectItem value="In Progress">In Progress</SelectItem>
                                  <SelectItem value="Complete">Complete</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell className="text-muted-foreground">{job.role || "-"}</TableCell>
                            <TableCell className="text-muted-foreground">
                              {job.date_applied
                                ? format(new Date(job.date_applied), "MMM dd")
                                : "-"}
                            </TableCell>
                            <TableCell className="text-muted-foreground">{job.jobs_applied_count || 1}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 hover:bg-black/5 dark:hover:bg-white/10"
                                  onClick={() => handleEditJob(job)}
                                >
                                  <Edit className="h-3.5 w-3.5" />
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-red-50 dark:hover:bg-red-900/20 text-destructive/70 hover:text-destructive">
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent className="glass-card border-none">
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Delete Job Application</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure you want to delete this job application?
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel className="border-0 bg-black/5 hover:bg-black/10">Cancel</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => deleteJobMutation.mutate(job.id)}
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                      >
                                        Delete
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                        {(!filteredJobs || filteredJobs.length === 0) && (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                              <div className="flex flex-col items-center gap-2">
                                <Briefcase className="h-8 w-8 opacity-20" />
                                <p>No job applications found</p>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>

                {/* Consultant Info Tab */}
                <TabsContent value="info" className="flex-1 overflow-y-auto p-6 data-[state=active]:block">
                  <div className="grid gap-6 md:grid-cols-2 max-w-4xl mx-auto">
                    <div className="space-y-6">
                      <div className="rounded-xl border border-black/5 dark:border-white/5 bg-white/40 dark:bg-white/5 p-5">
                        <h4 className="font-semibold mb-4 flex items-center gap-2">
                          <User className="h-4 w-4 text-primary" />
                          Personal Information
                        </h4>
                        <div className="space-y-4">
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <span className="text-muted-foreground">Full Name</span>
                            <span className="col-span-2 font-medium">{selectedConsultant.full_name || "-"}</span>
                          </div>
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <span className="text-muted-foreground">Email</span>
                            <span className="col-span-2 font-medium">{selectedConsultant.email || "-"}</span>
                          </div>
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <span className="text-muted-foreground">Phone</span>
                            <span className="col-span-2 font-medium">{selectedConsultant.phone || "-"}</span>
                          </div>
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <span className="text-muted-foreground">DOB</span>
                            <span className="col-span-2 font-medium">
                              {selectedConsultant.date_of_birth
                                ? format(new Date(selectedConsultant.date_of_birth), "MMM dd, yyyy")
                                : "-"}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-xl border border-black/5 dark:border-white/5 bg-white/40 dark:bg-white/5 p-5">
                        <h4 className="font-semibold mb-4 flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-primary" />
                          Address & License
                        </h4>
                        <div className="space-y-4">
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <span className="text-muted-foreground">Address</span>
                            <span className="col-span-2 font-medium">{selectedConsultant.address || "-"}</span>
                          </div>
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <span className="text-muted-foreground">License</span>
                            <span className="col-span-2 font-medium">
                              {selectedConsultant.drivers_license_number || "-"}
                              {selectedConsultant.drivers_license_state && ` (${selectedConsultant.drivers_license_state})`}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="rounded-xl border border-black/5 dark:border-white/5 bg-white/40 dark:bg-white/5 p-5">
                        <h4 className="font-semibold mb-4 flex items-center gap-2">
                          <Briefcase className="h-4 w-4 text-primary" />
                          Credentials
                        </h4>
                        <div className="space-y-4">
                          {['LinkedIn', 'Indeed', 'Monster', 'Dice', 'ZipRecruiter'].map((platform) => {
                            const key = platform.toLowerCase();
                            return (
                              <div key={platform} className="p-3 rounded-lg bg-white/50 dark:bg-black/20 border border-black/5 dark:border-white/5">
                                <div className="flex justify-between items-center mb-2">
                                  <span className="text-sm font-semibold">{platform}</span>
                                  {selectedConsultant[`${key}_url`] && (
                                    <a href={selectedConsultant[`${key}_url`]} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">
                                      View Profile
                                    </a>
                                  )}
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                  <div>
                                    <span className="text-muted-foreground block">Username</span>
                                    <span className="font-mono">{selectedConsultant[`${key}_username`] || "-"}</span>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground block">Password</span>
                                    <span className="font-mono">{selectedConsultant[`${key}_password`] || "-"}</span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {selectedConsultant.notes && (
                        <div className="rounded-xl border border-black/5 dark:border-white/5 bg-white/40 dark:bg-white/5 p-5">
                          <h4 className="font-semibold mb-2">Notes</h4>
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{selectedConsultant.notes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </Card>
          ) : (
            <Card className="glass-card border-none shadow-xl flex-1 flex items-center justify-center text-center p-8">
              <div className="max-w-md space-y-4">
                <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                  <User className="h-10 w-10 text-primary" />
                </div>
                <h3 className="text-2xl font-bold">Select a Team Member</h3>
                <p className="text-muted-foreground">
                  Choose a consultant from the sidebar to view their profile, manage job applications, and track progress.
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>

      <ConsultantDialog
        open={isConsultantDialogOpen}
        onOpenChange={handleConsultantDialogClose}
        consultant={editingConsultant}
      />
      <JobApplicationDialog
        open={isJobDialogOpen}
        onOpenChange={handleJobDialogClose}
        consultantId={selectedConsultantId}
        jobApplication={editingJob}
      />
    </div>
  );
}