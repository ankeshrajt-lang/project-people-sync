import { ReactNode } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Button } from "@/components/ui/button";
import { LogOut, Bell, Search } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    toast.success("Logged out successfully");
    navigate("/auth");
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-gray-50 to-gray-100 dark:from-black dark:to-gray-900">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-16 border-b border-black/5 dark:border-white/5 bg-white/70 dark:bg-black/70 backdrop-blur-xl sticky top-0 z-50 flex items-center justify-between px-6 transition-all duration-200">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="h-9 w-9 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg transition-colors" />
              <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground bg-black/5 dark:bg-white/10 px-3 py-1.5 rounded-md">
                <Search className="h-4 w-4" />
                <span>Search...</span>
                <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                  <span className="text-xs">⌘</span>K
                </kbd>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" className="h-9 w-9 hover:bg-black/5 dark:hover:bg-white/10 rounded-full">
                <Bell className="h-4 w-4" />
              </Button>
              <div className="h-6 w-px bg-black/10 dark:bg-white/10" />
              <div className="flex items-center gap-3">
                <div className="text-right hidden md:block">
                  <p className="text-sm font-medium leading-none">{user?.email?.split('@')[0] || 'User'}</p>
                  <p className="text-xs text-muted-foreground">Admin</p>
                </div>
                <Avatar className="h-9 w-9 ring-2 ring-white dark:ring-black shadow-sm cursor-pointer hover:scale-105 transition-transform">
                  <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.email}`} />
                  <AvatarFallback>U</AvatarFallback>
                </Avatar>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleLogout}
                  className="h-9 w-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full transition-colors"
                  title="Logout"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </header>
          <main className="flex-1 p-6 overflow-auto">
            <div className="max-w-7xl mx-auto animate-fade-in">
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
