import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, CheckCircle } from "lucide-react";

export default function SetupUsers() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);

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
              <li>Set a default password: <code className="bg-background px-2 py-1 rounded">Staff2025!</code></li>
              <li>Link team member records to authentication accounts</li>
              <li>Users can change their password after first login</li>
            </ul>
          </div>

          {results && (
            <div className="rounded-lg border border-border bg-card p-4 space-y-2">
              <h3 className="font-semibold flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Setup Complete
              </h3>
              <div className="text-sm space-y-1">
                <p className="font-medium">Default Password: <code className="bg-muted px-2 py-1 rounded">{results.defaultPassword}</code></p>
                <div className="mt-2">
                  <p className="font-medium mb-1">Results:</p>
                  <div className="space-y-1 max-h-60 overflow-y-auto">
                    {results.results?.map((result: any, index: number) => (
                      <div key={index} className="text-xs bg-muted/50 p-2 rounded">
                        <span className="font-medium">{result.email}</span>: {result.status}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
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
