import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus, Copy, Edit, Trash2, ExternalLink, Upload } from "lucide-react";
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
import { ConsultantDialog } from "@/components/ConsultantDialog";
import { JobApplicationDialog } from "@/components/JobApplicationDialog";
import { toast } from "sonner";
import { format } from "date-fns";

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
        return "bg-blue-500";
      case "in progress":
        return "bg-yellow-500";
      case "complete":
        return "bg-green-500";
      case "yettostart":
        return "bg-gray-500";
      default:
        return "bg-gray-500";
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
    if (statusFilter === "all") return true;
    return job.status.toLowerCase() === statusFilter.toLowerCase();
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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Consultants</h2>
          <p className="text-muted-foreground">Track consultant details and job applications</p>
        </div>
        <Button onClick={() => setIsConsultantDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Consultant
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Consultants List */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Consultants</CardTitle>
            <CardDescription>Select to view details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {consultants?.map((consultant) => (
              <div
                key={consultant.id}
                className={`group p-3 rounded-lg cursor-pointer transition-colors hover:bg-accent ${
                  selectedConsultantId === consultant.id ? "bg-primary text-primary-foreground" : ""
                }`}
                onClick={() => setSelectedConsultantId(consultant.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{consultant.name}</p>
                    {consultant.email && (
                      <p className="text-xs opacity-80 truncate">{consultant.email}</p>
                    )}
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditConsultant(consultant);
                      }}
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Consultant</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure? This will delete all job applications for this consultant.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteConsultantMutation.mutate(consultant.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </div>
            ))}
            {(!consultants || consultants.length === 0) && (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No consultants yet. Add one to get started.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Consultant Details & Job Applications */}
        <div className="md:col-span-3">
          {selectedConsultant ? (
            <Tabs defaultValue="jobs" className="w-full">
              <TabsList className="grid w-full max-w-md grid-cols-2">
                <TabsTrigger value="jobs">Job Applications</TabsTrigger>
                <TabsTrigger value="info">Consultant Info</TabsTrigger>
              </TabsList>

              {/* Job Applications Tab */}
              <TabsContent value="jobs" className="space-y-4 mt-6">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    <h3 className="text-xl font-semibold">{selectedConsultant.name} - Job Applications</h3>
                    <Badge variant="outline">{filteredJobs?.length || 0} jobs</Badge>
                  </div>
                  <div className="flex gap-2">
                    {selectedJobs.size > 0 && (
                      <Button
                        onClick={handleBulkDelete}
                        disabled={bulkDeleteJobsMutation.isPending}
                        variant="destructive"
                        size="sm"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Selected ({selectedJobs.size})
                      </Button>
                    )}
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-[150px]">
                        <SelectValue placeholder="Filter status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="yettostart">Yet to Start</SelectItem>
                        <SelectItem value="applied">Applied</SelectItem>
                        <SelectItem value="in progress">In Progress</SelectItem>
                        <SelectItem value="complete">Complete</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="flex items-center gap-2">
                      <Select value={cloneFromId} onValueChange={setCloneFromId}>
                        <SelectTrigger className="w-[180px]">
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
                      <Button
                        onClick={handleClone}
                        disabled={!cloneFromId}
                        variant="outline"
                        size="sm"
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Clone
                      </Button>
                    </div>
                    <Button onClick={() => setIsJobDialogOpen(true)} size="sm" variant="outline">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Job
                    </Button>
                    <Button 
                      onClick={() => bulkAddCompaniesMutation.mutate()} 
                      size="sm"
                      disabled={bulkAddCompaniesMutation.isPending}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Add All Companies
                    </Button>
                  </div>
                </div>

                <Card>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
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
                          <TableHead>Jobs Applied</TableHead>
                          <TableHead>Employment</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredJobs?.map((job) => (
                          <TableRow key={job.id}>
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
                                  >
                                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground hover:text-primary" />
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
                                <SelectTrigger className="w-[140px]">
                                  <SelectValue>
                                    <Badge className={getStatusColor(job.status)}>
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
                            <TableCell>{job.role || "-"}</TableCell>
                            <TableCell>
                              {job.date_applied
                                ? format(new Date(job.date_applied), "MMM dd, yyyy")
                                : "-"}
                            </TableCell>
                            <TableCell>{job.jobs_applied_count || 1}</TableCell>
                            <TableCell>{job.employment_type || "-"}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleEditJob(job)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon">
                                      <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Delete Job Application</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure you want to delete this job application?
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
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
                            <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                              No job applications yet. Add one to get started.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Consultant Info Tab */}
              <TabsContent value="info" className="space-y-4 mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>{selectedConsultant.name}</CardTitle>
                    <CardDescription>Consultant Information</CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-4 md:grid-cols-2">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Full Name</p>
                      <p className="text-sm">{selectedConsultant.full_name || "-"}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Email</p>
                      <p className="text-sm">{selectedConsultant.email || "-"}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Phone</p>
                      <p className="text-sm">{selectedConsultant.phone || "-"}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Address</p>
                      <p className="text-sm">{selectedConsultant.address || "-"}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Date of Birth</p>
                      <p className="text-sm">
                        {selectedConsultant.date_of_birth
                          ? format(new Date(selectedConsultant.date_of_birth), "MMM dd, yyyy")
                          : "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Driver's License</p>
                      <p className="text-sm">
                        {selectedConsultant.drivers_license_number || "-"}
                        {selectedConsultant.drivers_license_state && ` (${selectedConsultant.drivers_license_state})`}
                      </p>
                    </div>
                    <div className="md:col-span-2">
                      <p className="text-sm font-medium text-muted-foreground mb-2">Online Profiles</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedConsultant.linkedin_url && (
                          <a
                            href={selectedConsultant.linkedin_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-primary hover:underline"
                          >
                            LinkedIn
                          </a>
                        )}
                        {selectedConsultant.indeed_url && (
                          <a
                            href={selectedConsultant.indeed_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-primary hover:underline"
                          >
                            Indeed
                          </a>
                        )}
                        {selectedConsultant.monster_url && (
                          <a
                            href={selectedConsultant.monster_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-primary hover:underline"
                          >
                            Monster
                          </a>
                        )}
                        {selectedConsultant.dice_url && (
                          <a
                            href={selectedConsultant.dice_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-primary hover:underline"
                          >
                            Dice
                          </a>
                        )}
                        {selectedConsultant.ziprecruiter_url && (
                          <a
                            href={selectedConsultant.ziprecruiter_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-primary hover:underline"
                          >
                            ZipRecruiter
                          </a>
                        )}
                        {!selectedConsultant.linkedin_url &&
                          !selectedConsultant.indeed_url &&
                          !selectedConsultant.monster_url &&
                          !selectedConsultant.dice_url &&
                          !selectedConsultant.ziprecruiter_url && <span className="text-sm">-</span>}
                      </div>
                    </div>
                    {selectedConsultant.notes && (
                      <div className="md:col-span-2">
                        <p className="text-sm font-medium text-muted-foreground">Notes</p>
                        <p className="text-sm">{selectedConsultant.notes}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          ) : (
            <Card className="h-[500px] flex items-center justify-center">
              <CardContent>
                <p className="text-muted-foreground text-center">
                  Select a consultant to view details and job applications
                </p>
              </CardContent>
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