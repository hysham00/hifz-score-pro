import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Trophy } from "lucide-react";

const Results = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("*").order("name");
      return data ?? [];
    },
  });

  const { data: results, isLoading } = useQuery({
    queryKey: ["results", selectedCategory],
    queryFn: async () => {
      let query = supabase.from("participants").select("*, categories(name), scores(*)");
      if (selectedCategory !== "all") {
        query = query.eq("category_id", selectedCategory);
      }
      const { data, error } = await query;
      if (error) throw error;

      // Calculate averages and rank
      const ranked = (data ?? []).map((p: any) => {
        const scores = p.scores as any[];
        if (!scores || scores.length === 0) {
          return { ...p, avgTotal: 0, avgMemo: 0, avgTajweed: 0, avgVoice: 0, avgDressing: 0, judgeCount: 0 };
        }
        const judgeCount = scores.length;
        const avgMemo = scores.reduce((s: number, sc: any) => s + Number(sc.memorization_score), 0) / judgeCount;
        const avgTajweed = scores.reduce((s: number, sc: any) => s + Number(sc.tajweed_score), 0) / judgeCount;
        const avgVoice = scores.reduce((s: number, sc: any) => s + Number(sc.voice_score), 0) / judgeCount;
        const avgDressing = scores.reduce((s: number, sc: any) => s + Number(sc.dressing_score), 0) / judgeCount;
        const avgTotal = avgMemo + avgTajweed + avgVoice + avgDressing;
        return { ...p, avgTotal, avgMemo, avgTajweed, avgVoice, avgDressing, judgeCount };
      });

      ranked.sort((a: any, b: any) => b.avgTotal - a.avgTotal);
      return ranked;
    },
  });

  const getRankBadge = (index: number) => {
    if (index === 0) return <Badge className="bg-warning text-warning-foreground"><Trophy className="mr-1 h-3 w-3" />1st</Badge>;
    if (index === 1) return <Badge variant="secondary">2nd</Badge>;
    if (index === 2) return <Badge variant="outline">3rd</Badge>;
    return <span className="text-muted-foreground">{index + 1}th</span>;
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">Results & Rankings</h1>
        <p className="text-muted-foreground">View competition results averaged across all judges</p>
      </div>

      <div className="max-w-xs space-y-2">
        <Label>Filter by Category</Label>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories?.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-heading">Rankings</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Rank</TableHead>
                <TableHead>Participant</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Memo</TableHead>
                <TableHead className="text-right">Tajweed</TableHead>
                <TableHead className="text-right">Voice</TableHead>
                <TableHead className="text-right">Dressing</TableHead>
                <TableHead className="text-right">Avg Total</TableHead>
                <TableHead className="text-right">Judges</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : results?.length === 0 ? (
                <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No results yet</TableCell></TableRow>
              ) : results?.map((r: any, i: number) => (
                <TableRow key={r.id}>
                  <TableCell>{getRankBadge(i)}</TableCell>
                  <TableCell className="font-medium">{r.full_name}</TableCell>
                  <TableCell>{r.categories?.name || "—"}</TableCell>
                  <TableCell className="text-right">{r.avgMemo.toFixed(1)}</TableCell>
                  <TableCell className="text-right">{r.avgTajweed.toFixed(1)}</TableCell>
                  <TableCell className="text-right">{r.avgVoice.toFixed(1)}</TableCell>
                  <TableCell className="text-right">{r.avgDressing.toFixed(1)}</TableCell>
                  <TableCell className="text-right font-heading font-bold">{r.avgTotal.toFixed(1)}</TableCell>
                  <TableCell className="text-right">{r.judgeCount}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default Results;
