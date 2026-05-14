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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2 } from "lucide-react";

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
      // First get user_ids from user_roles table
      const { data: roleData, error: roleError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "judge");

      if (roleError) {
        console.error("Error fetching user_roles:", roleError);
        return [];
      }

      if (!roleData || roleData.length === 0) {
        return [];
      }

      const userIds = roleData.map((r) => r.user_id);

      // Then get profiles for those user_ids
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", userIds);

      if (profileError) {
        console.error("Error fetching profiles:", profileError);
      }

      // Combine the data
      return roleData.map((r) => ({
        user_id: r.user_id,
        profiles:
          profileData?.find((p) => p.user_id === r.user_id) || null,
      }));
    },
  });

  // ✅ CREATE JUDGE (server-side — does not affect admin's session)
  const createJudgeMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("create-judge", {
        body: {
          email: form.email,
          password: form.password,
          full_name: form.full_name,
        },
      });

      if (error) {
        console.error("create-judge error:", error);
        throw new Error(error.message || "Failed to create judge");
      }
      if (data?.error) {
        throw new Error(data.error);
      }
    },

    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["judges"] });
      setOpen(false);
      setForm({ email: "", password: "", full_name: "" });

      toast({
        title: "Judge created",
        description: "Share the login credentials with them.",
      });
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

  // ✅ DELETE JUDGE
  const deleteJudgeMutation = useMutation({
    mutationFn: async (user_id: string) => {
      const { data, error } = await supabase.functions.invoke("delete-judge", {
        body: { user_id },
      });
      if (error) throw new Error(error.message || "Failed to delete judge");
      if (data?.error) throw new Error(data.error);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["judges"] });
      toast({ title: "Judge removed" });
    },
    onError: (err: unknown) => {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Something went wrong",
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
          <Button variant="outline" size="sm" onClick={() => refetch()}>
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
                <TableHead className="w-24 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-8">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : error ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-8">
                    <div className="text-red-500 mb-2">
                      Error:{" "}
                      {error instanceof Error
                        ? error.message
                        : "Unknown error"}
                    </div>
                    <Button size="sm" onClick={() => refetch()}>
                      Retry
                    </Button>
                  </TableCell>
                </TableRow>
              ) : judges.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-8">
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
                    <TableCell className="text-right">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={
                              deleteJudgeMutation.isPending &&
                              deleteJudgeMutation.variables === j.user_id
                            }
                            aria-label="Remove judge"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remove this judge?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This permanently deletes{" "}
                              <strong>
                                {j.profiles?.full_name || "this judge"}
                              </strong>
                              , their login, and all scores they submitted. This
                              cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() =>
                                deleteJudgeMutation.mutate(j.user_id)
                              }
                            >
                              Remove
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
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