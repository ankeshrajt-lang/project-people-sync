import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckSquare, Users, FolderOpen, Clock } from "lucide-react";

export default function Dashboard() {
  const { data: tasks } = useQuery({
    queryKey: ["tasks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*");
      if (error) throw error;
      return data;
    },
  });

  const { data: members } = useQuery({
    queryKey: ["team_members"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_members")
        .select("*");
      if (error) throw error;
      return data;
    },
  });

  const { data: files } = useQuery({
    queryKey: ["files"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("files")
        .select("*");
      if (error) throw error;
      return data;
    },
  });

  const activeTasks = tasks?.filter((task) => task.status === "active").length || 0;
  const totalTasks = tasks?.length || 0;
  const totalMembers = members?.length || 0;
  const totalFiles = files?.length || 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h2>
        <p className="text-muted-foreground">Overview of your staffing agency operations</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Tasks</CardTitle>
            <Clock className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{activeTasks}</div>
            <p className="text-xs text-muted-foreground">
              {totalTasks - activeTasks} completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
            <CheckSquare className="h-4 w-4 text-secondary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{totalTasks}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Team Members</CardTitle>
            <Users className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{totalMembers}</div>
            <p className="text-xs text-muted-foreground">Active members</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Files Stored</CardTitle>
            <FolderOpen className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{totalFiles}</div>
            <p className="text-xs text-muted-foreground">Total documents</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="col-span-full lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {tasks?.slice(0, 5).map((task) => (
                <div key={task.id} className="flex items-center">
                  <div
                    className={`mr-3 h-2 w-2 rounded-full ${
                      task.status === "active" ? "bg-success" : "bg-muted-foreground"
                    }`}
                  />
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium leading-none text-foreground">
                      {task.title}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {task.status === "active" ? "In Progress" : "Completed"}
                    </p>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {new Date(task.created_at).toLocaleDateString()}
                  </div>
                </div>
              ))}
              {(!tasks || tasks.length === 0) && (
                <p className="text-sm text-muted-foreground">No tasks yet. Create your first task!</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Stats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Task Completion</span>
                <span className="text-sm font-medium text-foreground">
                  {totalTasks > 0 ? Math.round(((totalTasks - activeTasks) / totalTasks) * 100) : 0}%
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-success transition-all"
                  style={{
                    width: `${totalTasks > 0 ? ((totalTasks - activeTasks) / totalTasks) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
