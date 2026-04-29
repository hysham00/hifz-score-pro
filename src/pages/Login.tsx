import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BookOpen } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Hardcoded coordinator account. Created automatically on first load.
const ADMIN_EMAIL = "admin@musabaqa.com";
const ADMIN_PASSWORD = "Admin@12345";
const ADMIN_NAME = "Coordinator";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const bootstrapped = useRef(false);

  // Try to bootstrap the admin account once. Safe if it already exists.
  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;
    (async () => {
      try {
        const { data, error } = await supabase.auth.signUp({
          email: ADMIN_EMAIL,
          password: ADMIN_PASSWORD,
          options: { data: { full_name: ADMIN_NAME } },
        });
        if (error) return; // Likely already exists
        if (data.user) {
          await supabase.from("user_roles").insert({
            user_id: data.user.id,
            role: "admin",
          });
          // Sign out the auto-created session so the user logs in manually
          await supabase.auth.signOut();
        }
      } catch {
        /* noop */
      }
    })();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await signIn(email, password);
      navigate("/dashboard");
    } catch (error: any) {
      toast({
        title: "Login failed",
        description: error.message || "Invalid email or password",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary">
            <BookOpen className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="font-heading text-3xl font-bold text-foreground">Musabaqa</h1>
          <p className="mt-2 text-muted-foreground">Qur'anic Competition Management System</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-xl">Sign In</CardTitle>
            <CardDescription>Enter your credentials to access the system</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Signing in..." : "Sign In"}
              </Button>
            </form>

            <div className="mt-6 space-y-3 text-sm">
              <div className="rounded-md border border-border bg-muted/40 p-3">
                <p className="font-medium text-foreground">Coordinator (Admin) credentials</p>
                <p className="mt-1 text-muted-foreground">
                  Email: <span className="font-mono">{ADMIN_EMAIL}</span>
                </p>
                <p className="text-muted-foreground">
                  Password: <span className="font-mono">{ADMIN_PASSWORD}</span>
                </p>
              </div>
              <p className="text-center text-muted-foreground">
                Judges: use the credentials provided by your coordinator.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;
