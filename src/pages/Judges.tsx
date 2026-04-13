import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2 } from "lucide-react";

const Judges = () => {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", full_name: "" });
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: judges, isLoading } = useQuery({
    queryKey: ["judges"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("user_id, profiles(full_name, user_id)")
        .eq("role", "judge");
      if (error) throw error;
      return data;
    },
  });

  const createJudgeMutation = useMutation({
    mutationFn: async () => {
      // Sign up the judge
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: { data: { full_name: form.full_name } },
      });
      if (authError) throw authError;
      if (!authData.user) throw new Error("Failed to create user");

      // Assign judge role
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert({ user_id: authData.user.id, role: "judge" as any });
      if (roleError) throw roleError;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["judges"] });
      setOpen(false);
      setForm({ email: "", password: "", full_name: "" });
      toast({ title: "Judge added successfully" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold">Judges</h1>
          <p className="text-muted-foreground">Manage competition judges</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Add Judge</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-heading">Add Judge</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); createJudgeMutation.mutate(); }} className="space-y-4">
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Password</Label>
                <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={6} />
              </div>
              <Button type="submit" className="w-full" disabled={createJudgeMutation.isPending}>
                {createJudgeMutation.isPending ? "Creating..." : "Add Judge"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

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
                <TableRow><TableCell colSpan={2} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : judges?.length === 0 ? (
                <TableRow><TableCell colSpan={2} className="text-center py-8 text-muted-foreground">No judges yet</TableCell></TableRow>
              ) : judges?.map((j: any) => (
                <TableRow key={j.user_id}>
                  <TableCell className="font-medium">{j.profiles?.full_name || "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{j.user_id}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default Judges;
