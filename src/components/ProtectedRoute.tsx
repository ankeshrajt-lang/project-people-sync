import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Clock, LogOut } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading, isApproved, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Block unapproved employees
  if (isApproved === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="mx-auto w-16 h-16 bg-warning/10 rounded-full flex items-center justify-center mb-6">
            <Clock className="h-8 w-8 text-warning" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Pending Approval</h1>
          <p className="text-muted-foreground mb-6">
            Your account is awaiting approval from an administrator. 
            You will be able to access the system once your account has been approved.
          </p>
          <p className="text-sm text-muted-foreground mb-6">
            Please contact your administrator if you have any questions.
          </p>
          <Button 
            variant="outline" 
            onClick={async () => {
              await signOut();
              navigate("/auth");
            }}
            className="gap-2"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}