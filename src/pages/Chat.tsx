import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Send, Users, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { CreateGroupDialog } from "@/components/CreateGroupDialog";

export default function Chat() {
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  // Get current user
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setCurrentUserId(session?.user?.id || null);
    });
  }, []);

  // Fetch user's groups
  const { data: groups } = useQuery({
    queryKey: ["chat_groups"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chat_groups")
        .select(`
          *,
          chat_group_members(count)
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
      
      // Get unique sender IDs
      const senderIds = [...new Set(messagesData.map(m => m.sender_id))];
      
      // Fetch team members for senders
      const { data: teamMembers, error: teamError } = await supabase
        .from("team_members")
        .select("auth_user_id, name, email")
        .in("auth_user_id", senderIds);
      
      if (teamError) throw teamError;
      
      // Map messages with sender info
      return messagesData.map(msg => ({
        ...msg,
        sender: teamMembers?.find(tm => tm.auth_user_id === msg.sender_id)
      }));
    },
  });

  // Real-time subscription for new messages
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
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedGroupId, queryClient]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Send message mutation
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
    <div className="flex h-[calc(100vh-4rem)] gap-4">
      {/* Groups List */}
      <Card className="w-80 flex flex-col">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Groups</CardTitle>
              <CardDescription>Your chat groups</CardDescription>
            </div>
            <Button size="sm" onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex-1 p-0">
          <ScrollArea className="h-full">
            <div className="space-y-1 p-4">
              {groups?.map((group) => (
                <button
                  key={group.id}
                  onClick={() => setSelectedGroupId(group.id)}
                  className={`w-full text-left p-3 rounded-lg transition-colors hover:bg-accent ${
                    selectedGroupId === group.id ? "bg-primary text-primary-foreground" : ""
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Users className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{group.name}</p>
                      {group.description && (
                        <p className="text-sm text-muted-foreground truncate">{group.description}</p>
                      )}
                    </div>
                  </div>
                </button>
              ))}
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

      <CreateGroupDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} />
    </div>
  );
}
