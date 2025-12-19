import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MessageSquare, ExternalLink, Save, Edit2, Users, UserX, CheckCircle, Clock } from "lucide-react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const DEFAULT_TEAMS_LINK = "https://teams.live.com/l/invite/FBAniX09HPb-_73CQE";
const STORAGE_KEY = "shree_teams_link";

export default function Team() {
    const [link, setLink] = useState(DEFAULT_TEAMS_LINK);
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(DEFAULT_TEAMS_LINK);
    const { isAdmin } = useAuth();
    const queryClient = useQueryClient();

    useEffect(() => {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            setLink(stored);
            setEditValue(stored);
        }
    }, []);

    const handleSave = () => {
        if (!editValue.trim()) {
            toast.error("Link cannot be empty");
            return;
        }
        localStorage.setItem(STORAGE_KEY, editValue);
        setLink(editValue);
        setIsEditing(false);
        toast.success("Team link updated successfully");
    };

    const handleReset = () => {
        setEditValue(link);
        setIsEditing(false);
    };

    // Fetch Team Members
    const { data: members, isLoading } = useQuery({
        queryKey: ["team_members"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("team_members")
                .select("*")
                .order("created_at", { ascending: false });
            if (error) throw error;
            return data;
        },
    });

    // Hard Delete Mutation via RPC
    const deleteMemberMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.rpc('hard_delete_team_member', {
                _member_id: id
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
        }
    });

    // Approve Member Mutation
    const approveMemberMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.rpc('approve_team_member', {
                _member_id: id
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
        }
    });

    // Filter members: non-admins only see approved members
    const visibleMembers = members?.filter(member => {
        if (isAdmin) return true; // Admins see everyone
        return member.is_approved === true; // Non-admins only see approved
    });

    return (
        <div className="space-y-8 animate-fade-in pb-10">
            {/* Link Section */}
            <section className="space-y-6">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Team & Chat</h2>
                    <p className="text-muted-foreground">
                        Access all team communication channels and resources.
                    </p>
                </div>

                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    <Card className="hover:shadow-md transition-all duration-200 border-border/50">
                        <CardHeader>
                            <div className="flex items-center gap-4">
                                <div className="p-2 bg-primary/10 rounded-lg">
                                    <MessageSquare className="h-6 w-6 text-primary" />
                                </div>
                                <div>
                                    <CardTitle className="text-xl">ShreeLLC Group Chat</CardTitle>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <CardDescription className="mb-4 text-sm">
                                Join the official team communication channel on Microsoft Teams.
                            </CardDescription>

                            <div className="space-y-4">
                                {isEditing ? (
                                    <div className="space-y-2">
                                        <Label htmlFor="teams-link">Edit Link</Label>
                                        <Input
                                            id="teams-link"
                                            value={editValue}
                                            onChange={(e) => setEditValue(e.target.value)}
                                            placeholder="https://teams..."
                                        />
                                        <div className="flex gap-2">
                                            <Button onClick={handleSave} size="sm" className="w-full">
                                                <Save className="mr-2 h-4 w-4" /> Save
                                            </Button>
                                            <Button onClick={handleReset} variant="outline" size="sm" className="w-full">
                                                Cancel
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        <div className="p-2 bg-muted rounded-md text-xs text-muted-foreground break-all font-mono">
                                            {link}
                                        </div>
                                        <div className="flex gap-2">
                                            <Button asChild className="flex-1 gap-2">
                                                <a href={link} target="_blank" rel="noopener noreferrer">
                                                    Open Chat <ExternalLink className="h-4 w-4" />
                                                </a>
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => setIsEditing(true)}
                                                title="Edit Link"
                                            >
                                                <Edit2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </section>

            {/* Team Members Section */}
            <section className="space-y-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                        <Users className="h-6 w-6 text-primary" />
                    </div>
                    <h2 className="text-2xl font-bold tracking-tight">Team Members</h2>
                </div>

                {isLoading ? (
                    <div className="text-center py-10 text-muted-foreground">Loading members...</div>
                ) : (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {visibleMembers?.map((member) => {
                            const isPending = member.is_approved === false;
                            return (
                                <Card key={member.id} className={`hover:shadow-md transition-all duration-200 border-border/50 ${isPending ? 'border-warning/50 bg-warning/5' : ''}`}>
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium">
                                            {member.name}
                                        </CardTitle>
                                        {isPending ? (
                                            <span className="text-xs bg-warning/10 text-warning px-2 py-1 rounded-full font-medium flex items-center gap-1">
                                                <Clock className="h-3 w-3" /> Pending Approval
                                            </span>
                                        ) : (
                                            <span className="text-xs bg-green-500/10 text-green-600 px-2 py-1 rounded-full font-medium flex items-center gap-1">
                                                <CheckCircle className="h-3 w-3" /> Approved
                                            </span>
                                        )}
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold">{member.role || "Team Member"}</div>
                                        <p className="text-xs text-muted-foreground mt-1 mb-4">
                                            {member.email}
                                        </p>
                                        {member.department && member.department !== 'Pending' && (
                                            <p className="text-xs text-muted-foreground">
                                                Dep: {member.department}
                                            </p>
                                        )}

                                        {isAdmin && (
                                            <div className="flex gap-2 mt-4">
                                                {isPending && (
                                                    <Button
                                                        variant="default"
                                                        size="sm"
                                                        className="flex-1"
                                                        onClick={() => approveMemberMutation.mutate(member.id)}
                                                        disabled={approveMemberMutation.isPending}
                                                    >
                                                        <CheckCircle className="h-4 w-4 mr-1" />
                                                        Approve
                                                    </Button>
                                                )}
                                                <Button
                                                    variant="destructive"
                                                    size="sm"
                                                    className={isPending ? "" : "w-full"}
                                                    onClick={() => {
                                                        if (confirm(`Are you sure you want to permanently delete ${member.name}?`)) {
                                                            deleteMemberMutation.mutate(member.id);
                                                        }
                                                    }}
                                                    disabled={deleteMemberMutation.isPending}
                                                >
                                                    <UserX className="h-4 w-4 mr-1" />
                                                    Delete
                                                </Button>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            );
                        })}
                        {(!visibleMembers || visibleMembers.length === 0) && (
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