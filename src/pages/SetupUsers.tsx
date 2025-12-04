import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, CheckCircle, Shield, Key, UserPlus, Eye, EyeOff, ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function SetupUsers() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [showPasswords, setShowPasswords] = useState(false);

  const handleSetup = async (reset = false) => {
    setLoading(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-users`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ reset }),
        }
      );

      const data = await response.json();

      if (data.success) {
        setResults(data);
        toast.success(reset ? "Passwords reset successfully!" : "Users created successfully!");
      } else {
        toast.error(data.error || "Failed to process users");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to process users");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-black dark:to-gray-900 p-4">
      <Card className="w-full max-w-3xl glass-card border-none shadow-2xl overflow-hidden">
        <CardHeader className="space-y-1 pb-6 border-b border-black/5 dark:border-white/5">
          <div className="flex items-center justify-between">
            <CardTitle className="text-3xl font-bold tracking-tight bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 bg-clip-text text-transparent">
              User Setup
            </CardTitle>
            <Badge variant="outline" className="px-3 py-1 text-xs font-medium uppercase tracking-wider">
              Admin Access
            </Badge>
          </div>
          <CardDescription className="text-base text-muted-foreground">
            Create or reset authentication accounts for all team members
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-black/5 dark:border-white/5 bg-white/40 dark:bg-white/5 p-4 transition-all hover:bg-white/60 dark:hover:bg-white/10">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                  <UserPlus className="h-5 w-5" />
                </div>
                <h3 className="font-semibold">Create New Users</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Set up accounts for team members without auth access
              </p>
            </div>
            <div className="rounded-xl border border-black/5 dark:border-white/5 bg-white/40 dark:bg-white/5 p-4 transition-all hover:bg-white/60 dark:hover:bg-white/10">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400">
                  <Key className="h-5 w-5" />
                </div>
                <h3 className="font-semibold">Reset All Passwords</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Generate new passwords for all existing users
              </p>
            </div>
          </div>

          {results && (
            <div className="space-y-6 animate-fade-in">
              <div className="rounded-xl bg-green-50/50 dark:bg-green-900/20 p-4 border border-green-100 dark:border-green-900/50 flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                <p className="text-green-800 dark:text-green-200 font-medium">
                  Setup completed successfully!
                </p>
              </div>

              {results.results && results.results.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-lg">User Credentials</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowPasswords(!showPasswords)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      {showPasswords ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                      {showPasswords ? "Hide" : "Show"} Passwords
                    </Button>
                  </div>
                  <div className="rounded-xl border border-black/5 dark:border-white/5 overflow-hidden bg-white/30 dark:bg-black/20">
                    <table className="w-full text-sm">
                      <thead className="bg-black/5 dark:bg-white/5">
                        <tr>
                          <th className="text-left p-4 font-medium text-muted-foreground">Name</th>
                          <th className="text-left p-4 font-medium text-muted-foreground">Email (Login ID)</th>
                          <th className="text-left p-4 font-medium text-muted-foreground">Password</th>
                          <th className="text-left p-4 font-medium text-muted-foreground">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-black/5 dark:divide-white/5">
                        {results.results.map((result: any, index: number) => (
                          <tr key={index} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                            <td className="p-4 font-medium">{result.name}</td>
                            <td className="p-4 font-mono text-muted-foreground">{result.email}</td>
                            <td className="p-4">
                              {result.password && (
                                <code className="bg-black/5 dark:bg-white/10 px-2 py-1 rounded text-xs font-mono">
                                  {showPasswords ? result.password : "••••••••"}
                                </code>
                              )}
                            </td>
                            <td className="p-4">
                              <Badge variant="outline" className={`
                                ${result.status === "created" || result.status === "reset"
                                  ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800"
                                  : result.status === "exists"
                                    ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800"
                                    : "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800"}
                              `}>
                                {result.status}
                              </Badge>
                              {result.error && <span className="text-xs text-red-500 ml-2 block mt-1">{result.error}</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between gap-4 pt-6 border-t border-black/5 dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.02]">
          <Button variant="ghost" onClick={() => window.location.href = "/auth"} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Login
          </Button>
          <div className="flex gap-3">
            <Button
              onClick={() => handleSetup(false)}
              disabled={loading}
              variant="outline"
              className="bg-white/50 dark:bg-white/5 border-black/10 dark:border-white/10 hover:bg-white/80 dark:hover:bg-white/10"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading ? "Processing..." : "Create New Users"}
            </Button>
            <Button
              onClick={() => handleSetup(true)}
              disabled={loading}
              className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading ? "Resetting..." : "Reset All Passwords"}
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
