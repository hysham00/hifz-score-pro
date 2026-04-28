import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Plus } from "lucide-react";

type Judge = {
  user_id: string;
  profiles: {
    full_name: string;
  } | null;
};

const Judges = () => {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    email: "",
    password: "",
    full_name: "",
  });

  const { toast } = useToast();
  const qc = useQueryClient();

  // ✅ FETCH JUDGES
  const {
    data: judges = [],
    isLoading,
    error,
    refetch,
  } = useQuery<Judge[]>({
    queryKey: ["judges"],
    queryFn: async () => {
      const { data: roleData, error: roleError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "judge");

      if (roleError) throw roleError;

      if (!roleData || roleData.length === 0) return [];

      const userIds = roleData.map((r) => r.user_id);

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", userIds);

      if (profileError) {
        console.error(profileError);
      }

      return roleData.map((r) => ({
        user_id: r.user_id,
        profiles:
          profileData?.find((p) => p.user_id === r.user_id) || null,
      }));
    },
  });

  // ✅ CREATE JUDGE
  const createJudgeMutation = useMutation({
    mutationFn: async () => {
      const { data: authData, error: authError } =
        await supabase.auth.signUp({
          email: form.email,
          password: form.password,
          options: { data: { full_name: form.full_name } },
        });

      if (authError) throw authError;
      if (!authData?.user) throw new Error("User creation failed");

      // wait for profile trigger
      await new Promise((res) => setTimeout(res, 1000));

      const { error: roleError } = await supabase
        .from("user_roles")
        .insert({
          user_id: authData.user.id,
          role: "judge",
        });

      if (roleError) throw roleError;
    },

    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["judges"] });
      setOpen(false);
      setForm({ email: "", password: "", full_name: "" });

      toast({ title: "Judge added successfully" });
    },

    onError: (err: unknown) => {
      const message =
        err instanceof Error ? err.message : "Something went wrong";

      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    },
  });

  return (
    <div className="animate-fade-in space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold">Judges</h1>
          <p className="text-muted-foreground">
            Manage competition judges
          </p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={refetch}>
            Refresh
          </Button>

          {/* ADD JUDGE DIALOG */}
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Judge
              </Button>
            </DialogTrigger>

            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Judge</DialogTitle>
              </DialogHeader>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  createJudgeMutation.mutate();
                }}
                className="space-y-4"
              >
                <div>
                  <Label>Full Name</Label>
                  <Input
                    value={form.full_name}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        full_name: e.target.value,
                      })
                    }
                    required
                  />
                </div>

                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        email: e.target.value,
                      })
                    }
                    required
                  />
                </div>

                <div>
                  <Label>Password</Label>
                  <Input
                    type="password"
                    value={form.password}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        password: e.target.value,
                      })
                    }
                    required
                    minLength={6}
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={createJudgeMutation.isPending}
                >
                  {createJudgeMutation.isPending
                    ? "Creating..."
                    : "Add Judge"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* TABLE */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>User ID</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={2} className="text-center py-8">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : error ? (
                <TableRow>
                  <TableCell colSpan={2} className="text-center py-8">
                    <div className="text-red-500 mb-2">
                      Error:{" "}
                      {error instanceof Error
                        ? error.message
                        : "Unknown error"}
                    </div>
                    <Button size="sm" onClick={refetch}>
                      Retry
                    </Button>
                  </TableCell>
                </TableRow>
              ) : judges.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={2} className="text-center py-8">
                    No judges yet
                  </TableCell>
                </TableRow>
              ) : (
                judges.map((j) => (
                  <TableRow key={j.user_id}>
                    <TableCell>
                      {j.profiles?.full_name || "—"}
                    </TableCell>
                    <TableCell className="text-xs">
                      {j.user_id}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default Judges;