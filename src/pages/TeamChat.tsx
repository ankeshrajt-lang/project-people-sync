import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus, Send, Users as UsersIcon, MessageCircle, Edit, Trash2 } from "lucide-react";
import { MemberCard } from "@/components/MemberCard";
import { MemberDialog } from "@/components/MemberDialog";
import { EditMemberDialog } from "@/components/EditMemberDialog";
import { CreateGroupDialog } from "@/components/CreateGroupDialog";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
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

export default function TeamChat() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editMember, setEditMember] = useState<any>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isGroupDialogOpen, setIsGroupDialogOpen] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();

  // Get current user
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setCurrentUserId(session?.user?.id || null);
    });
  }, []);

  // Fetch team members
  const { data: members, isLoading: membersLoading } = useQuery({
    queryKey: ["team_members"],
    queryFn: async () => {
      const { data: teamMembers, error } = await supabase
        .from("team_members")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;

      const authUserIds = teamMembers?.map(m => m.auth_user_id).filter(Boolean) || [];
      
      if (authUserIds.length === 0) {
        return teamMembers?.map(m => ({ ...m, user_roles: [] })) || [];
      }

      const { data: allRoles } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", authUserIds);

      const rolesMap = new Map<string, Array<{ role: string }>>();
      allRoles?.forEach(r => {
        if (!rolesMap.has(r.user_id)) {
          rolesMap.set(r.user_id, []);
        }
        rolesMap.get(r.user_id)?.push({ role: r.role });
      });

      return teamMembers?.map(member => ({
        ...member,
        user_roles: member.auth_user_id ? (rolesMap.get(member.auth_user_id) || []) : []
      })) || [];
    },
  });

  // Fetch chat groups
  const { data: groups } = useQuery({
    queryKey: ["chat_groups"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chat_groups")
        .select(`
          *,
          chat_group_members(
            user_id,
            last_seen
          )
        `)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch messages for selected group
  const { data: messages } = useQuery({
    queryKey: ["chat_messages", selectedGroupId],
    enabled: !!selectedGroupId,
    queryFn: async () => {
      const { data: messagesData, error: messagesError } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("group_id", selectedGroupId)
        .order("created_at", { ascending: true });
      
      if (messagesError) throw messagesError;
      
      const senderIds = [...new Set(messagesData.map(m => m.sender_id))];
      
      const { data: teamMembers, error: teamError } = await supabase
        .from("team_members")
        .select("auth_user_id, name, email")
        .in("auth_user_id", senderIds);
      
      if (teamError) throw teamError;
      
      return messagesData.map(msg => ({
        ...msg,
        sender: teamMembers?.find(tm => tm.auth_user_id === msg.sender_id)
      }));
    },
  });

  // Update last seen when viewing a group
  useEffect(() => {
    if (!selectedGroupId || !currentUserId) return;

    const updateLastSeen = async () => {
      await supabase.rpc('update_last_seen', {
        _group_id: selectedGroupId,
        _user_id: currentUserId
      });
    };
    
    updateLastSeen();
    const interval = setInterval(updateLastSeen, 30000);
    
    return () => clearInterval(interval);
  }, [selectedGroupId, currentUserId]);

  // Real-time subscription for messages
  useEffect(() => {
    if (!selectedGroupId) return;

    const channel = supabase
      .channel("chat_messages")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `group_id=eq.${selectedGroupId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["chat_messages", selectedGroupId] });
          queryClient.invalidateQueries({ queryKey: ["chat_groups"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedGroupId, queryClient]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const deleteMemberMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("team_members").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team_members"] });
      toast.success("Team member removed successfully");
    },
    onError: () => {
      toast.error("Failed to remove team member");
    },
  });

  const deleteGroupMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("chat_groups").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat_groups"] });
      toast.success("Group deleted successfully");
      setSelectedGroupId(null);
    },
    onError: () => {
      toast.error("Failed to delete group");
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async () => {
      if (!message.trim() || !selectedGroupId || !currentUserId) return;

      const { error } = await supabase.from("chat_messages").insert({
        group_id: selectedGroupId,
        sender_id: currentUserId,
        message: message.trim(),
      });

      if (error) throw error;
    },
    onSuccess: () => {
      setMessage("");
      queryClient.invalidateQueries({ queryKey: ["chat_messages", selectedGroupId] });
    },
    onError: () => {
      toast.error("Failed to send message");
    },
  });

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessageMutation.mutate();
  };

  const selectedGroup = groups?.find((g) => g.id === selectedGroupId);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Team & Chat</h2>
          <p className="text-muted-foreground">Manage team members and communicate</p>
        </div>
      </div>

      <Tabs defaultValue="team" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="team">Team Members</TabsTrigger>
          <TabsTrigger value="chat">Group Chat</TabsTrigger>
        </TabsList>

        {/* Team Members Tab */}
        <TabsContent value="team" className="space-y-4 mt-6">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">Manage your team members</p>
            {isAdmin && (
              <Button onClick={() => setIsDialogOpen(true)} size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Add Member
              </Button>
            )}
          </div>

          {membersLoading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Loading team members...</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {members?.map((member) => (
                <MemberCard
                  key={member.id}
                  member={member}
                  onDelete={() => deleteMemberMutation.mutate(member.id)}
                  onEdit={isAdmin ? () => {
                    setEditMember(member);
                    setIsEditDialogOpen(true);
                  } : undefined}
                />
              ))}
              {(!members || members.length === 0) && (
                <div className="col-span-full text-center py-12">
                  <p className="text-muted-foreground">
                    No team members yet. Add your first team member to get started!
                  </p>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        {/* Chat Tab */}
        <TabsContent value="chat" className="mt-6">
          <div className="flex h-[calc(100vh-16rem)] gap-4">
            {/* Groups List */}
            <Card className="w-80 flex flex-col">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Groups</CardTitle>
                    <CardDescription>Your chat groups</CardDescription>
                  </div>
                  <Button size="sm" onClick={() => setIsGroupDialogOpen(true)}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="flex-1 p-0">
                <ScrollArea className="h-full">
                  <div className="space-y-1 p-4">
                    {groups?.map((group) => {
                      const members = group.chat_group_members || [];
                      const onlineCount = members.filter((m: any) => {
                        if (!m.last_seen) return false;
                        const lastSeenTime = new Date(m.last_seen).getTime();
                        const now = Date.now();
                        return (now - lastSeenTime) < 60000;
                      }).length;

                      return (
                        <div key={group.id} className="relative group">
                          <button
                            onClick={() => setSelectedGroupId(group.id)}
                            className={`w-full text-left p-3 rounded-lg transition-colors hover:bg-accent ${
                              selectedGroupId === group.id ? "bg-primary text-primary-foreground" : ""
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                <UsersIcon className="h-5 w-5" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                  <p className="font-medium truncate">{group.name}</p>
                                  {onlineCount > 0 && (
                                    <span className="flex-shrink-0 inline-flex items-center gap-1 text-xs bg-green-500 text-white px-2 py-0.5 rounded-full">
                                      <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                                      {onlineCount}
                                    </span>
                                  )}
                                </div>
                                {group.description && (
                                  <p className="text-sm text-muted-foreground truncate">{group.description}</p>
                                )}
                              </div>
                            </div>
                          </button>
                          {selectedGroupId === group.id && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Group</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete this group? All messages will be permanently removed.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => deleteGroupMutation.mutate(group.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      );
                    })}
                    {(!groups || groups.length === 0) && (
                      <div className="text-center py-8 text-muted-foreground">
                        <MessageCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No groups yet</p>
                        <p className="text-xs">Create your first group to start chatting</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Chat Area */}
            <Card className="flex-1 flex flex-col">
              {selectedGroup ? (
                <>
                  <CardHeader className="border-b">
                    <CardTitle>{selectedGroup.name}</CardTitle>
                    {selectedGroup.description && (
                      <CardDescription>{selectedGroup.description}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="flex-1 p-0 flex flex-col">
                    <ScrollArea className="flex-1 p-4">
                      <div className="space-y-4">
                        {messages?.map((msg) => {
                          const isOwnMessage = msg.sender_id === currentUserId;
                          return (
                            <div
                              key={msg.id}
                              className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}
                            >
                              <div
                                className={`max-w-[70%] rounded-lg p-3 ${
                                  isOwnMessage
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-muted"
                                }`}
                              >
                                {!isOwnMessage && (
                                  <p className="text-xs font-semibold mb-1">
                                    {msg.sender?.name || msg.sender?.email || "Unknown"}
                                  </p>
                                )}
                                <p className="text-sm break-words">{msg.message}</p>
                                <p className={`text-xs mt-1 ${isOwnMessage ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                                  {format(new Date(msg.created_at), "HH:mm")}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                        <div ref={messagesEndRef} />
                      </div>
                    </ScrollArea>
                    <form onSubmit={handleSendMessage} className="p-4 border-t flex gap-2">
                      <Input
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Type a message..."
                        className="flex-1"
                      />
                      <Button type="submit" disabled={!message.trim() || sendMessageMutation.isPending}>
                        <Send className="h-4 w-4" />
                      </Button>
                    </form>
                  </CardContent>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <MessageCircle className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <p>Select a group to start chatting</p>
                  </div>
                </div>
              )}
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <MemberDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} />
      <EditMemberDialog 
        open={isEditDialogOpen} 
        onOpenChange={setIsEditDialogOpen} 
        member={editMember}
      />
      <CreateGroupDialog open={isGroupDialogOpen} onOpenChange={setIsGroupDialogOpen} />
    </div>
  );
}