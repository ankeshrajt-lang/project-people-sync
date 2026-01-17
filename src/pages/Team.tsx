import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Users, UserX, CheckCircle, Clock, ShieldCheck, Sparkles, Crown, ArrowUpRight, Flame } from "lucide-react";
import { toast } from "sonner";

type TeamMember = {
  id: string;
  name: string;
  email: string;
  role: string | null;
  department?: string | null;
  is_approved?: boolean | null;
  auth_user_id?: string | null;
};

type TreeNode = TeamMember & { children: TreeNode[]; isCurrent?: boolean };

const ROLE_LADDER = [
  { id: "member", title: "Member", description: "Executes assigned application runs and keeps pipelines fresh." },
  { id: "executive", title: "Executive", description: "Owns outbound applications across LinkedIn, Dice, Indeed, Jobright." },
  { id: "senior", title: "Senior", description: "Leads sourcing pods and improves response rates." },
  { id: "team_lead", title: "Team Lead", description: "Coaches the crew and clears blockers. (Prathusha owns this seat.)" },
  { id: "manager", title: "Manager", description: "Controls promotions and access. Vijay is the only manager." },
] as const;

const MANAGER_EMAIL = "vijay@shreellc.tech";

const normalizeRole = (role?: string | null) =>
  role?.toLowerCase().replace(/\s+/g, "_").replace(/-/g, "_") || "member";

const getRoleIndex = (role?: string | null) =>
  ROLE_LADDER.findIndex((item) => item.id === normalizeRole(role));

const ORG_ASSIGNMENTS_KEY = "shree_org_assignments";

export default function Team() {
  const { isAdmin, user } = useAuth();
  const isManager = user?.email?.toLowerCase() === MANAGER_EMAIL;
  const queryClient = useQueryClient();

  const currentUserId = user?.id;
  const currentUserEmail = user?.email?.toLowerCase();
  const [orgAssignments, setOrgAssignments] = useState<Record<string, string | null>>({});

  const { data: members, isLoading } = useQuery({
    queryKey: ["team_members"],
      queryFn: async () => {
        const { data, error } = await supabase
          .from("team_members")
          .select("*")
          .order("created_at", { ascending: false });
      if (error) throw error;
      return data as TeamMember[];
    },
  });

  const currentMember = useMemo(() => {
    if (!members) return null;
    return members.find(
      (m) =>
        (m.auth_user_id && m.auth_user_id === currentUserId) ||
        (m.email && m.email.toLowerCase() === currentUserEmail)
    ) || null;
  }, [members, currentUserEmail, currentUserId]);

  const isTeamLead = useMemo(() => {
    const role = currentMember?.role || "";
    return normalizeRole(role) === "team_lead";
  }, [currentMember]);

  // Initialize org assignments from storage or defaults
  useEffect(() => {
    if (!members || members.length === 0) return;

    const stored = localStorage.getItem(ORG_ASSIGNMENTS_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === "object") {
          setOrgAssignments(parsed);
          return;
        }
      } catch (e) {
        console.warn("Failed to parse org assignments; using defaults.");
      }
    }

    const nameToId = new Map<string, string>();
    members.forEach((m) => {
      nameToId.set(m.name.toLowerCase(), m.id);
    });

    const defaults: Array<{ name: string; reportsTo: string | null }> = [
      { name: "vijay", reportsTo: null },
      { name: "prathusha", reportsTo: "vijay" },
      { name: "arjun", reportsTo: "vijay" },
      { name: "keerthi", reportsTo: "prathusha" },
      { name: "sanjana", reportsTo: "arjun" },
    ];

    const baseAssignments: Record<string, string | null> = {};
    defaults.forEach(({ name, reportsTo }) => {
      const id = nameToId.get(name);
      if (!id) return;
      const managerId = reportsTo ? nameToId.get(reportsTo) || null : null;
      baseAssignments[id] = managerId;
    });

    setOrgAssignments(baseAssignments);
    localStorage.setItem(ORG_ASSIGNMENTS_KEY, JSON.stringify(baseAssignments));
  }, [members]);

  const handleAssignmentChange = (memberId: string, managerId: string | null) => {
    const next = { ...orgAssignments, [memberId]: managerId };
    setOrgAssignments(next);
    localStorage.setItem(ORG_ASSIGNMENTS_KEY, JSON.stringify(next));
  };

  const deleteMemberMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc("hard_delete_team_member", {
        _member_id: id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team_members"] });
      toast.success("Team member deleted permanently");
    },
    onError: (error) => {
      console.error("Delete error:", error);
      toast.error("Failed to delete team member: " + error.message);
    },
  });

  const approveMemberMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc("approve_team_member", {
        _member_id: id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team_members"] });
      toast.success("Team member approved!");
    },
    onError: (error) => {
      console.error("Approve error:", error);
      toast.error("Failed to approve team member: " + error.message);
    },
  });

  const promoteMemberMutation = useMutation({
    mutationFn: async (member: TeamMember) => {
      const currentIndex = getRoleIndex(member.role);
      const resolvedIndex = currentIndex >= 0 ? currentIndex : 0;
      const nextRole = ROLE_LADDER[resolvedIndex + 1];
      if (!isManager) {
        throw new Error("Only Vijay (manager) can promote people.");
      }
      if (!nextRole) {
        throw new Error(`${member.name} is already at the top of the ladder.`);
      }

      const { error } = await supabase
        .from("team_members")
        .update({ role: nextRole.title })
        .eq("id", member.id);
      if (error) throw error;

      // Keep system roles in sync for chat permissions/badges
      if (member.auth_user_id) {
        const mappedSystemRole =
          nextRole.id === "manager"
            ? "manager"
            : nextRole.id === "team_lead"
              ? "team_lead"
              : "team_member";

        const { error: roleError } = await supabase
          .from("user_roles")
          .upsert(
            [{ user_id: member.auth_user_id, role: mappedSystemRole }],
            { onConflict: "user_id" }
          );
        if (roleError) throw roleError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team_members"] });
      queryClient.invalidateQueries({ queryKey: ["user_roles"] });
      toast.success("Promotion applied.");
    },
    onError: (error: any) => {
      toast.error(error?.message || "Promotion failed");
    },
  });

  const visibleMembers = useMemo(() => {
    if (!members) return [];
    if (isAdmin || isManager || isTeamLead) {
      // Leadership sees everyone
      return members;
    }
    // Individual contributors only see themselves (if approved or not)
    return currentMember ? [currentMember] : [];
  }, [members, isAdmin, isManager, isTeamLead, currentMember]);

  const orgNodes = useMemo<TreeNode[]>(() => {
    if (!members) return [];
    const nodes: TreeNode[] = members.map((m) => ({ ...m, children: [], isCurrent: m.id === currentMember?.id }));
    const map = new Map<string, TreeNode>();
    nodes.forEach((n) => map.set(n.id, n));
    const roots: TreeNode[] = [];

    nodes.forEach((n) => {
      const managerId = orgAssignments[n.id];
      if (managerId && map.has(managerId)) {
        map.get(managerId)!.children.push(n);
      } else {
        roots.push(n);
      }
    });

    // Keep Vijay on top if he exists
    const vijayRootIndex = roots.findIndex((r) => r.email?.toLowerCase() === MANAGER_EMAIL);
    if (vijayRootIndex > 0) {
      const [vRoot] = roots.splice(vijayRootIndex, 1);
      roots.unshift(vRoot);
    }
    return roots;
  }, [members, orgAssignments, currentMember]);

  return (
    <div className="space-y-10 animate-fade-in pb-10">
      <section className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <Card className="bg-gradient-to-br from-primary/10 via-white to-blue-50 border-primary/10 shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">ShreeLLC</p>
                <CardTitle className="text-3xl">Talent Command Center</CardTitle>
                <CardDescription className="text-base">
                  We are a consultancy built on disciplined application runs across LinkedIn, Jobright, Dice, and Indeed.
                  Track every teammate, their lane, and who can advance them.
                </CardDescription>
              </div>
              <div className="hidden md:flex items-center gap-2 text-sm bg-white/70 px-3 py-1.5 rounded-full border shadow-sm">
                <ShieldCheck className="h-4 w-4 text-primary" />
                <span>Manager-only promotions</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            {[
              { label: "Active crew", value: visibleMembers.length || 0 },
              { label: "Job boards we cover", value: "LinkedIn · Jobright · Dice · Indeed" },
              { label: "Leadership", value: "Vijay (Manager) · Prathusha (Team Lead)" },
            ].map((stat) => (
              <div key={stat.label} className="p-4 rounded-xl bg-white/70 border border-white/60 shadow-sm">
                <p className="text-xs uppercase text-muted-foreground tracking-wide">{stat.label}</p>
                <p className="text-lg font-semibold mt-1">{stat.value}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="border border-green-200 shadow-sm">
            <CardHeader className="flex flex-row items-start justify-between">
              <div>
                <CardTitle className="text-xl flex items-center gap-2">
                  <Crown className="h-5 w-5 text-amber-500" />
                  Vijay — Manager
                </CardTitle>
                <CardDescription>Only Vijay can approve or promote teammates.</CardDescription>
              </div>
              <Badge variant="secondary" className="bg-amber-50 text-amber-700">Authority</Badge>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>Promotion unlocks the next ladder step (Member → Executive → Senior → Team Lead → Manager).</p>
              <p className="flex items-center gap-2 text-foreground">
                <Sparkles className="h-4 w-4 text-primary" />
                Be consistent, deliver results, and Vijay moves you up.
              </p>
            </CardContent>
          </Card>
          <Card className="border border-purple-200 shadow-sm">
            <CardHeader className="flex flex-row items-start justify-between">
              <div>
                <CardTitle className="text-xl flex items-center gap-2">
                  <Flame className="h-5 w-5 text-purple-500" />
                  Prathusha — Team Lead
                </CardTitle>
                <CardDescription>Leads daily standups and keeps application velocity high.</CardDescription>
              </div>
              <Badge variant="secondary" className="bg-purple-50 text-purple-700">Lead</Badge>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-1">
              <p>Escalate blockers to Prathusha; she keeps the pods focused and organized.</p>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Users className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Role Ladder</h2>
            <p className="text-muted-foreground">The path from Member to Manager, inspired by FAANG-grade clarity.</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
          {ROLE_LADDER.map((step) => (
            <Card key={step.id} className="border-border/60 hover:shadow-md transition-all">
              <CardHeader className="space-y-1 pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <ArrowUpRight className="h-4 w-4 text-primary" />
                  {step.title}
                </CardTitle>
                <CardDescription>{step.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Users className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Organization Tree</h2>
            <p className="text-muted-foreground">
              Clear reporting lines. Vijay manages the map; everyone can see the tree.
            </p>
          </div>
        </div>

        <Card className="border-border/60">
          <CardContent className="pt-6">
            <div className="space-y-3">
              {orgNodes.length === 0 && (
                <p className="text-sm text-muted-foreground">No organization data yet.</p>
              )}
              {orgNodes.map((root) => (
                <OrgNode
                  key={root.id}
                  node={root}
                  depth={0}
                  allMembers={members || []}
                  assignments={orgAssignments}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Users className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Team Members</h2>
            <p className="text-muted-foreground">
              {isManager || isTeamLead
                ? "Full roster view for leadership."
                : "Your lane and progress. Promotions are handled by Vijay."}
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-10 text-muted-foreground">Loading members...</div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {visibleMembers.map((member) => {
              const isPending = member.is_approved === false;
              const roleIndex = getRoleIndex(member.role);
              const resolvedIndex = roleIndex >= 0 ? roleIndex : 0;
              const currentStep = ROLE_LADDER[resolvedIndex] || ROLE_LADDER[0];
              const nextStep = ROLE_LADDER[resolvedIndex + 1];
              const atTop = !nextStep;
              const progress = Math.round(((resolvedIndex + 1) / ROLE_LADDER.length) * 100);

              return (
                <Card
                  key={member.id}
                  className={`hover:shadow-lg transition-all duration-200 border-border/60 ${isPending ? "border-yellow-200 bg-yellow-50/70" : "bg-white/80"}`}
                >
                  <CardHeader className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <CardTitle className="text-lg">{member.name}</CardTitle>
                        <p className="text-xs text-muted-foreground">{member.email}</p>
                      </div>
                      {isPending ? (
                        <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full font-medium flex items-center gap-1">
                          <Clock className="h-3 w-3" /> Pending
                        </span>
                      ) : (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" /> Approved
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="bg-primary/10 text-primary">
                        {currentStep.title}
                      </Badge>
                      {member.department && member.department !== "Pending" && (
                        <Badge variant="outline">{member.department}</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{currentStep.description}</p>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Progress to Manager</span>
                        <span>{progress}%</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {ROLE_LADDER.map((step, index) => {
                          const isActive = index <= resolvedIndex;
                          return (
                            <div key={step.id} className="flex-1 flex items-center">
                              <div className={`h-2 rounded-full w-full ${isActive ? "bg-primary" : "bg-muted"}`} />
                              {index < ROLE_LADDER.length - 1 && <div className="w-1" />}
                            </div>
                          );
                        })}
                      </div>
                    <div className="flex justify-between text-xs">
                      <span className="font-medium">{currentStep.title}</span>
                      <span className="text-muted-foreground">
                        {atTop ? "At the peak" : `Next: ${nextStep.title}`}
                      </span>
                    </div>
                  </div>

                  {isManager && (
                    <div className="flex flex-col gap-3">
                      <div className="grid gap-2">
                        <span className="text-xs text-muted-foreground">Reports to</span>
                        <Select
                          value={orgAssignments[member.id] || "root"}
                          onValueChange={(val) => handleAssignmentChange(member.id, val === "root" ? null : val)}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select manager" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="root">No manager (top)</SelectItem>
                            {(members || [])
                              .filter((m) => m.id !== member.id)
                              .map((m) => (
                                <SelectItem key={m.id} value={m.id}>
                                  {m.name} — {m.role || "Member"}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {isPending && (
                          <Button
                            variant="default"
                            size="sm"
                            className="flex-1 min-w-[120px]"
                            onClick={() => approveMemberMutation.mutate(member.id)}
                            disabled={approveMemberMutation.isPending}
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Approve
                          </Button>
                        )}
                        {!atTop && !isPending && (
                          <Button
                            variant="secondary"
                            size="sm"
                            className="flex-1 min-w-[140px]"
                            onClick={() => promoteMemberMutation.mutate(member)}
                            disabled={promoteMemberMutation.isPending}
                          >
                            <ArrowUpRight className="h-4 w-4 mr-2" />
                            Promote to {nextStep.title}
                          </Button>
                        )}
                        <Button
                          variant="destructive"
                          size="sm"
                          className="flex-1 min-w-[120px]"
                          onClick={() => {
                            if (confirm(`Permanently delete ${member.name}?`)) {
                              deleteMemberMutation.mutate(member.id);
                            }
                          }}
                          disabled={deleteMemberMutation.isPending}
                        >
                          <UserX className="h-4 w-4 mr-2" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  )}
                  {!isManager && (
                    <p className="text-[11px] text-muted-foreground">
                      Promotions are managed by Vijay; keep your velocity up to move to {nextStep ? nextStep.title : "the top"}.
                    </p>
                  )}
                  </CardContent>
                </Card>
              );
            })}
            {visibleMembers.length === 0 && (
              <div className="col-span-full py-10 text-center text-muted-foreground bg-muted/20 rounded-lg border border-dashed">
                No team members to display.
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

type OrgNodeProps = {
  node: TreeNode;
  depth: number;
  allMembers: TeamMember[];
  assignments: Record<string, string | null>;
};

function OrgNode({ node, depth, allMembers, assignments }: OrgNodeProps) {
  const children = node.children || [];
  return (
    <div className="relative pl-0">
      {depth > 0 && (
        <>
          <div className="absolute -left-5 top-8 w-6 border-t border-dashed border-border/60" />
          <div className="absolute -left-5 top-8 bottom-0 border-l border-dashed border-border/60" />
          <div className="absolute -left-7 top-7 h-3 w-3 rounded-full bg-primary/20 border border-primary/50" />
        </>
      )}
      <div
        className={`flex flex-col gap-2 p-4 rounded-xl border ${depth === 0 ? "bg-primary/5 border-primary/20" : "bg-muted/40 border-border/60"
          }`}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold">
              {node.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <p className="font-semibold leading-tight">{node.name}</p>
              <p className="text-xs text-muted-foreground">{node.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <Badge variant="secondary" className="bg-primary/10 text-primary">
              {node.role || "Member"}
            </Badge>
            {node.isCurrent && (
              <Badge variant="outline" className="border-green-300 text-green-700">
                You
              </Badge>
            )}
          </div>
        </div>
      </div>

      {children.length > 0 && (
        <div className="pl-8 mt-3 space-y-3">
          {children.map((child) => (
            <OrgNode
              key={child.id}
              node={child as TreeNode}
              depth={depth + 1}
              allMembers={allMembers}
              assignments={assignments}
            />
          ))}
        </div>
      )}
    </div>
  );
}
