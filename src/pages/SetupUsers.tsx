import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, CheckCircle } from "lucide-react";

export default function SetupUsers() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [showPasswords, setShowPasswords] = useState(false);

  const handleSetup = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-users`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const data = await response.json();

      if (data.success) {
        setResults(data);
        toast.success("Users created successfully!");
      } else {
        toast.error(data.error || "Failed to create users");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to create users");
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
            Create authentication accounts for all team members
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-border bg-muted/50 p-4">
            <h3 className="font-semibold mb-2">What this will do:</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Create login accounts for all team members in the database</li>
              <li>Generate unique passwords for each user</li>
              <li>Link team member records to authentication accounts</li>
              <li>Users can change their password after first login</li>
            </ul>
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
                                result.status === "created" ? "text-green-600" : 
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
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={() => window.location.href = "/auth"}>
            Go to Login
          </Button>
          <Button onClick={handleSetup} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {loading ? "Setting up..." : "Create User Accounts"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
