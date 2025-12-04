import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Mail, Trash2, Shield, Edit, Clock, MoreHorizontal } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface MemberCardProps {
  member: {
    id: string;
    name: string;
    email: string;
    role: string | null;
    avatar_url: string | null;
    last_seen: string | null;
    user_roles?: Array<{ role: string }>;
  };
  onDelete: () => void;
  onEdit?: () => void;
}

export function MemberCard({ member, onDelete, onEdit }: MemberCardProps) {
  const initials = member.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const systemRole = member.user_roles?.[0]?.role;
  const getRoleBadge = (role?: string) => {
    if (!role) return null;
    const config: Record<string, { label: string; className: string }> = {
      admin: { label: "Admin", className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800" },
      manager: { label: "Manager", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800" },
      team_lead: { label: "Team Lead", className: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-800" },
      team_member: { label: "Team Member", className: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-700" },
    };
    const roleConfig = config[role] || { label: role, className: "bg-gray-100 text-gray-700" };
    return (
      <Badge variant="outline" className={`${roleConfig.className} font-medium px-2.5 py-0.5 rounded-full text-xs border`}>
        {roleConfig.label}
      </Badge>
    );
  };

  const isOnline = member.last_seen &&
    (Date.now() - new Date(member.last_seen).getTime()) < 5 * 60 * 1000;

  return (
    <Card className="group relative overflow-hidden border-0 bg-white/50 dark:bg-gray-900/40 backdrop-blur-xl shadow-sm hover:shadow-xl transition-all duration-300 rounded-2xl">
      <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent dark:from-white/5 dark:to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      <CardContent className="p-6 flex flex-col items-center text-center relative z-10">
        <div className="absolute top-4 right-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-black/5 dark:hover:bg-white/10">
                <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40 glass-card">
              {onEdit && (
                <DropdownMenuItem onClick={onEdit} className="cursor-pointer">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Profile
                </DropdownMenuItem>
              )}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive cursor-pointer">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Remove
                  </DropdownMenuItem>
                </AlertDialogTrigger>
                <AlertDialogContent className="glass-card border-none">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Remove Team Member</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to remove {member.name} from the team? This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="border-0 bg-black/5 hover:bg-black/10">Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={onDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Remove
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="relative mb-4">
          <Avatar className="h-24 w-24 ring-4 ring-white dark:ring-gray-800 shadow-lg transition-transform duration-300 group-hover:scale-105">
            <AvatarImage src={member.avatar_url || undefined} alt={member.name} className="object-cover" />
            <AvatarFallback className="text-2xl bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 text-gray-600 dark:text-gray-300">
              {initials}
            </AvatarFallback>
          </Avatar>
          {isOnline && (
            <span className="absolute bottom-1 right-1 w-5 h-5 bg-green-500 border-4 border-white dark:border-gray-900 rounded-full shadow-sm" />
          )}
        </div>

        <h3 className="font-semibold text-lg text-foreground tracking-tight mb-1">{member.name}</h3>

        <div className="flex flex-col items-center gap-2 mb-4">
          {member.role && (
            <p className="text-sm text-muted-foreground font-medium">{member.role}</p>
          )}
          {getRoleBadge(systemRole)}
        </div>

        <div className="w-full pt-4 border-t border-black/5 dark:border-white/5 flex flex-col gap-2">
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Mail className="h-3.5 w-3.5" />
            <span className="truncate max-w-[180px]">{member.email}</span>
          </div>

          {member.last_seen && (
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground/70">
              <Clock className="h-3 w-3" />
              <span>
                {isOnline ? "Active now" : formatDistanceToNow(new Date(member.last_seen), { addSuffix: true })}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
