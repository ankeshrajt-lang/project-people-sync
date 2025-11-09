import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Mail, Trash2, Shield, Edit, Clock } from "lucide-react";
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
      admin: { label: "Admin", className: "bg-destructive text-destructive-foreground" },
      manager: { label: "Manager", className: "bg-primary text-primary-foreground" },
      team_lead: { label: "Team Lead", className: "bg-accent text-accent-foreground" },
      team_member: { label: "Team Member", className: "bg-muted text-muted-foreground" },
    };
    const roleConfig = config[role] || { label: role, className: "" };
    return (
      <Badge className={roleConfig.className}>
        <Shield className="h-3 w-3 mr-1" />
        {roleConfig.label}
      </Badge>
    );
  };

  const isOnline = member.last_seen && 
    (Date.now() - new Date(member.last_seen).getTime()) < 5 * 60 * 1000;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-4">
          <Avatar className="h-12 w-12">
            <AvatarImage src={member.avatar_url || undefined} alt={member.name} />
            <AvatarFallback className="bg-primary text-primary-foreground">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h3 className="font-semibold text-lg text-foreground">{member.name}</h3>
            <div className="flex items-center gap-2 mt-1">
              {member.role && (
                <p className="text-sm text-muted-foreground">{member.role}</p>
              )}
            </div>
          </div>
          {getRoleBadge(systemRole)}
        </div>
      </CardHeader>
      <CardContent className="pb-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
          <Mail className="h-4 w-4" />
          <span className="truncate">{member.email}</span>
        </div>
        {member.last_seen && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>
              Last seen {formatDistanceToNow(new Date(member.last_seen), { addSuffix: true })}
            </span>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-end gap-2 pt-3 border-t border-border">
        {onEdit && (
          <Button variant="ghost" size="sm" onClick={onEdit}>
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
        )}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
              <Trash2 className="h-4 w-4 mr-2" />
              Remove
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove Team Member</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to remove {member.name} from the team? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={onDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Remove
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardFooter>
    </Card>
  );
}
