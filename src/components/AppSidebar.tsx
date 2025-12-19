import { LayoutDashboard, CheckSquare, Users, FolderOpen, UserCheck, Briefcase, Settings, HelpCircle, ChevronRight } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const items = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Tasks", url: "/tasks", icon: CheckSquare },
  { title: "Team & Chat", url: "/team", icon: Users },
  { title: "Attendance", url: "/attendance", icon: UserCheck },
  { title: "Consultants", url: "/consultants", icon: Briefcase },
  { title: "Files & Resources", url: "/files", icon: FolderOpen },
];

export function AppSidebar() {
  const { open } = useSidebar();
  const location = useLocation();

  return (
    <Sidebar className="border-r border-black/5 dark:border-white/5 bg-white/50 dark:bg-black/50 backdrop-blur-xl" collapsible="icon">
      <SidebarContent className="pt-4">
        <div className={`px-4 mb-6 flex items-center ${open ? "justify-start" : "justify-center"}`}>
          <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center shadow-lg shadow-primary/30 shrink-0">
            <Briefcase className="h-4 w-4 text-white" />
          </div>
          {open && (
            <div className="ml-3 animate-fade-in">
              <h2 className="font-bold text-lg tracking-tight">PeopleSync</h2>
              <p className="text-xs text-muted-foreground">Manager Workspace</p>
            </div>
          )}
        </div>

        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 mb-2">
            Main Menu
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="px-2 space-y-1">
              {items.map((item) => {
                const isExternal = item.url.startsWith("http");

                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild tooltip={item.title} className="rounded-lg transition-all duration-200 hover:bg-black/5 dark:hover:bg-white/10">
                      {isExternal ? (
                        <a href={item.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 w-full p-2 text-foreground/80 hover:text-primary">
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                        </a>
                      ) : (
                        <NavLink
                          to={item.url}
                          end={item.url === "/"}
                          className="flex items-center gap-3 w-full p-2"
                          activeClassName="bg-primary/10 text-primary font-semibold shadow-sm"
                        >
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                        </NavLink>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-black/5 dark:border-white/5">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton className="rounded-lg hover:bg-black/5 dark:hover:bg-white/10">
              <Settings className="h-4 w-4" />
              <span>Settings</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton className="rounded-lg hover:bg-black/5 dark:hover:bg-white/10">
              <HelpCircle className="h-4 w-4" />
              <span>Help & Support</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
