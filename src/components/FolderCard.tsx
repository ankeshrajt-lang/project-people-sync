import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Folder, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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

interface FolderCardProps {
  folder: {
    id: string;
    name: string;
    created_at: string;
    folder_access?: Array<{ access_level: string }>;
  };
  onDelete: () => void;
  onOpen: () => void;
}

export function FolderCard({ folder, onDelete, onOpen }: FolderCardProps) {
  const getAccessLevelLabel = (level: string) => {
    const labels: Record<string, string> = {
      public: "Public",
      team_member: "Team Member",
      team_lead: "Team Lead",
      manager: "Manager",
      admin: "Admin",
    };
    return labels[level] || level;
  };

  const getAccessLevelColor = (level: string) => {
    const colors: Record<string, string> = {
      public: "bg-green-500/10 text-green-700 dark:text-green-400",
      team_member: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
      team_lead: "bg-purple-500/10 text-purple-700 dark:text-purple-400",
      manager: "bg-orange-500/10 text-orange-700 dark:text-orange-400",
      admin: "bg-red-500/10 text-red-700 dark:text-red-400",
    };
    return colors[level] || "bg-gray-500/10 text-gray-700 dark:text-gray-400";
  };

  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={onOpen}>
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Folder className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground truncate">{folder.name}</h3>
            <p className="text-xs text-muted-foreground">
              {new Date(folder.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pb-3">
        <div className="flex flex-wrap gap-2">
          {folder.folder_access?.map((access, index) => (
            <Badge
              key={index}
              variant="outline"
              className={getAccessLevelColor(access.access_level)}
            >
              {getAccessLevelLabel(access.access_level)}
            </Badge>
          ))}
        </div>
      </CardContent>
      <CardFooter className="flex gap-2 pt-3 border-t border-border">
        <AlertDialog>
          <AlertDialogTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
              <Trash2 className="h-4 w-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Folder</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{folder.name}"? All files in this folder will also be deleted. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardFooter>
    </Card>
  );
}