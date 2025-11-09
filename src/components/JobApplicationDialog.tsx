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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface JobApplicationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  consultantId: string | null;
  jobApplication?: any;
}

export function JobApplicationDialog({
  open,
  onOpenChange,
  consultantId,
  jobApplication,
}: JobApplicationDialogProps) {
  const [companyName, setCompanyName] = useState("");
  const [status, setStatus] = useState("Applied");
  const [role, setRole] = useState("");
  const [careerUrl, setCareerUrl] = useState("");
  const [dateApplied, setDateApplied] = useState("");
  const [resumeVersion, setResumeVersion] = useState("");
  const [jobsAppliedCount, setJobsAppliedCount] = useState("1");
  const [employmentType, setEmploymentType] = useState("");
  const [workType, setWorkType] = useState("");
  const [notes, setNotes] = useState("");
  const queryClient = useQueryClient();

  useEffect(() => {
    if (open && jobApplication) {
      setCompanyName(jobApplication.company_name || "");
      setStatus(jobApplication.status || "Applied");
      setRole(jobApplication.role || "");
      setCareerUrl(jobApplication.career_url || "");
      setDateApplied(jobApplication.date_applied || "");
      setResumeVersion(jobApplication.resume_version || "");
      setJobsAppliedCount(String(jobApplication.jobs_applied_count || 1));
      setEmploymentType(jobApplication.employment_type || "");
      setWorkType(jobApplication.work_type || "");
      setNotes(jobApplication.notes || "");
    } else if (open && !jobApplication) {
      resetForm();
    }
  }, [open, jobApplication]);

  const resetForm = () => {
    setCompanyName("");
    setStatus("Applied");
    setRole("");
    setCareerUrl("");
    setDateApplied("");
    setResumeVersion("");
    setJobsAppliedCount("1");
    setEmploymentType("");
    setWorkType("");
    setNotes("");
  };

  const saveJobMutation = useMutation({
    mutationFn: async () => {
      const jobData = {
        consultant_id: consultantId,
        company_name: companyName.trim(),
        status: status,
        role: role.trim() || null,
        career_url: careerUrl.trim() || null,
        date_applied: dateApplied || null,
        resume_version: resumeVersion.trim() || null,
        jobs_applied_count: parseInt(jobsAppliedCount) || 1,
        employment_type: employmentType.trim() || null,
        work_type: workType.trim() || null,
        notes: notes.trim() || null,
      };

      if (jobApplication) {
        const { error } = await supabase
          .from("job_applications")
          .update(jobData)
          .eq("id", jobApplication.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("job_applications").insert(jobData);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["job_applications"] });
      toast.success(jobApplication ? "Job updated" : "Job added");
      onOpenChange(false);
      resetForm();
    },
    onError: () => {
      toast.error(jobApplication ? "Failed to update job" : "Failed to add job");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim()) {
      toast.error("Company name is required");
      return;
    }
    if (!consultantId) {
      toast.error("No consultant selected");
      return;
    }
    saveJobMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{jobApplication ? "Edit Job Application" : "Add Job Application"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="companyName">Company Name *</Label>
              <Input
                id="companyName"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g., Snowflake"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Applied">Applied</SelectItem>
                  <SelectItem value="In Progress">In Progress</SelectItem>
                  <SelectItem value="Complete">Complete</SelectItem>
                  <SelectItem value="Rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Input
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="e.g., Senior Java Developer"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dateApplied">Date Applied</Label>
              <Input
                id="dateApplied"
                type="date"
                value={dateApplied}
                onChange={(e) => setDateApplied(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="careerUrl">Career URL</Label>
            <Input
              id="careerUrl"
              value={careerUrl}
              onChange={(e) => setCareerUrl(e.target.value)}
              placeholder="https://company.com/careers"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="resumeVersion">Resume Version</Label>
              <Input
                id="resumeVersion"
                value={resumeVersion}
                onChange={(e) => setResumeVersion(e.target.value)}
                placeholder="e.g., v2"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="jobsAppliedCount">Jobs Applied Count</Label>
              <Input
                id="jobsAppliedCount"
                type="number"
                value={jobsAppliedCount}
                onChange={(e) => setJobsAppliedCount(e.target.value)}
                min="1"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="employmentType">Employment Type</Label>
              <Input
                id="employmentType"
                value={employmentType}
                onChange={(e) => setEmploymentType(e.target.value)}
                placeholder="e.g., Full-time, Contract"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="workType">Work Type</Label>
              <Input
                id="workType"
                value={workType}
                onChange={(e) => setWorkType(e.target.value)}
                placeholder="e.g., Remote, Hybrid, On-site"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional information..."
              rows={3}
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saveJobMutation.isPending}>
              {jobApplication ? "Update" : "Add"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}