import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, CheckCircle } from "lucide-react";

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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-2xl">User Setup</CardTitle>
          <CardDescription>
            Create or reset authentication accounts for all team members
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-border bg-muted/50 p-4">
            <h3 className="font-semibold mb-2">Available Actions:</h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p><strong>Create New Users:</strong> Set up accounts for team members without auth access</p>
              <p><strong>Reset All Passwords:</strong> Generate new passwords for all existing users</p>
            </div>
          </div>

          {results && (
            <div className="space-y-4">
              <div className="rounded-lg bg-green-50 dark:bg-green-950 p-4 border border-green-200 dark:border-green-800">
                <p className="text-green-800 dark:text-green-200 font-medium">
                  Setup completed successfully!
                </p>
              </div>
              
              {results.results && results.results.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">User Credentials:</h3>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowPasswords(!showPasswords)}
                    >
                      {showPasswords ? "Hide" : "Show"} Passwords
                    </Button>
                  </div>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-muted">
                        <tr>
                          <th className="text-left p-3 font-medium">Name</th>
                          <th className="text-left p-3 font-medium">Email (Login ID)</th>
                          <th className="text-left p-3 font-medium">Password</th>
                          <th className="text-left p-3 font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {results.results.map((result: any, index: number) => (
                          <tr key={index} className="border-t">
                            <td className="p-3">{result.name}</td>
                            <td className="p-3 font-mono text-sm">{result.email}</td>
                            <td className="p-3">
                              {result.password && (
                                <code className="bg-muted px-2 py-1 rounded text-sm">
                                  {showPasswords ? result.password : "••••••••"}
                                </code>
                              )}
                            </td>
                             <td className="p-3">
                              <span className={`text-sm ${
                                result.status === "created" || result.status === "reset" ? "text-green-600" : 
                                result.status === "exists" ? "text-blue-600" : 
                                "text-red-600"
                              }`}>
                                {result.status}
                                {result.error && ` - ${result.error}`}
                              </span>
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
        <CardFooter className="flex justify-between gap-2">
          <Button variant="outline" onClick={() => window.location.href = "/auth"}>
            Go to Login
          </Button>
          <div className="flex gap-2">
            <Button onClick={() => handleSetup(false)} disabled={loading} variant="secondary">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading ? "Processing..." : "Create New Users"}
            </Button>
            <Button onClick={() => handleSetup(true)} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading ? "Resetting..." : "Reset All Passwords"}
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
