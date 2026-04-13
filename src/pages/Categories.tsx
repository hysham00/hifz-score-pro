import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Pencil } from "lucide-react";

const Categories = () => {
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "", description: "",
    max_memorization: 20, max_tajweed: 10, max_voice: 10, max_dressing: 10,
  });
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: categories, isLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editId) {
        const { error } = await supabase.from("categories").update(form).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("categories").insert(form);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categories"] });
      setOpen(false);
      resetForm();
      toast({ title: editId ? "Category updated" : "Category created" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categories"] });
      toast({ title: "Category deleted" });
    },
  });

  const resetForm = () => {
    setEditId(null);
    setForm({ name: "", description: "", max_memorization: 20, max_tajweed: 10, max_voice: 10, max_dressing: 10 });
  };

  const startEdit = (cat: any) => {
    setEditId(cat.id);
    setForm({
      name: cat.name, description: cat.description || "",
      max_memorization: cat.max_memorization, max_tajweed: cat.max_tajweed,
      max_voice: cat.max_voice, max_dressing: cat.max_dressing,
    });
    setOpen(true);
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold">Categories</h1>
          <p className="text-muted-foreground">Manage Hizb levels and scoring structure</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Add Category</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-heading">{editId ? "Edit" : "Add"} Category</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(); }} className="space-y-4">
              <div className="space-y-2">
                <Label>Name (e.g. Hizb 1)</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Max Memorization</Label>
                  <Input type="number" value={form.max_memorization} onChange={(e) => setForm({ ...form, max_memorization: +e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Max Tajweed</Label>
                  <Input type="number" value={form.max_tajweed} onChange={(e) => setForm({ ...form, max_tajweed: +e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Max Voice</Label>
                  <Input type="number" value={form.max_voice} onChange={(e) => setForm({ ...form, max_voice: +e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Max Dressing</Label>
                  <Input type="number" value={form.max_dressing} onChange={(e) => setForm({ ...form, max_dressing: +e.target.value })} />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Saving..." : "Save"}
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
                <TableHead>Memorization</TableHead>
                <TableHead>Tajweed</TableHead>
                <TableHead>Voice</TableHead>
                <TableHead>Dressing</TableHead>
                <TableHead>Total</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : categories?.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No categories yet</TableCell></TableRow>
              ) : categories?.map((cat) => (
                <TableRow key={cat.id}>
                  <TableCell className="font-medium">{cat.name}</TableCell>
                  <TableCell>{cat.max_memorization}</TableCell>
                  <TableCell>{cat.max_tajweed}</TableCell>
                  <TableCell>{cat.max_voice}</TableCell>
                  <TableCell>{cat.max_dressing}</TableCell>
                  <TableCell className="font-semibold">{cat.max_memorization + cat.max_tajweed + cat.max_voice + cat.max_dressing}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => startEdit(cat)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(cat.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default Categories;
