import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Trophy, Download, Printer } from "lucide-react";

const COLUMNS = ["Rank", "Participant", "School", "LGA", "State", "Memo", "Tajweed", "Voice", "Dressing", "Avg Total", "Judges"];

const rowValues = (r: any, i: number) => [
  String(i + 1),
  r.full_name,
  r.school || "-",
  r.lga || "-",
  r.state || "-",
  r.avgMemo.toFixed(1),
  r.avgTajweed.toFixed(1),
  r.avgVoice.toFixed(1),
  r.avgDressing.toFixed(1),
  r.avgTotal.toFixed(1),
  String(r.judgeCount),
];

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

  // Group results per category so each category has its own result sheet
  const groups = (() => {
    const map = new Map<string, { id: string; name: string; rows: any[] }>();
    (results ?? []).forEach((r: any) => {
      const id = r.category_id || "__none";
      const name = r.categories?.name || "Uncategorized";
      if (!map.has(id)) map.set(id, { id, name, rows: [] });
      map.get(id)!.rows.push(r);
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  })();

  const downloadCsv = (group: { name: string; rows: any[] }) => {
    const esc = (v: string) => `"${String(v).replace(/"/g, '""')}"`;
    const csv = [COLUMNS.map(esc).join(","), ...group.rows.map((r, i) => rowValues(r, i).map(esc).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${group.name.replace(/[^a-z0-9]+/gi, "_")}_results.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const printGroup = (group: { name: string; rows: any[] }) => {
    const head = COLUMNS.map((c) => `<th>${c}</th>`).join("");
    const body = group.rows
      .map((r, i) => `<tr>${rowValues(r, i).map((v) => `<td>${v}</td>`).join("")}</tr>`)
      .join("");
    const html = `<!doctype html><html><head><title>${group.name} Results</title>
      <style>
        body{font-family:system-ui,sans-serif;padding:24px;color:#111}
        h1{font-size:20px;margin:0 0 4px}
        p{margin:0 0 16px;color:#555;font-size:13px}
        table{width:100%;border-collapse:collapse;font-size:12px}
        th,td{border:1px solid #ccc;padding:6px 8px;text-align:left}
        th{background:#f2f4f8}
      </style></head><body>
      <h1>${group.name} — Competition Results</h1>
      <p>Musabaqa Management System · Generated ${new Date().toLocaleString()}</p>
      <table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>
      <script>window.onload=function(){window.print()}<\/script>
      </body></html>`;
    const w = window.open("", "_blank", "width=1000,height=700");
    if (!w) return;
    w.document.write(html);
    w.document.close();
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">Results &amp; Rankings</h1>
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

      {isLoading ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">Loading...</CardContent></Card>
      ) : groups.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">No results yet</CardContent></Card>
      ) : (
        groups.map((group) => (
          <Card key={group.id}>
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
              <CardTitle className="font-heading">{group.name}</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => downloadCsv(group)}>
                  <Download className="mr-2 h-4 w-4" />Download
                </Button>
                <Button variant="outline" size="sm" onClick={() => printGroup(group)}>
                  <Printer className="mr-2 h-4 w-4" />Print
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Rank</TableHead>
                    <TableHead>Participant</TableHead>
                    <TableHead>School</TableHead>
                    <TableHead>LGA</TableHead>
                    <TableHead>State</TableHead>
                    <TableHead className="text-right">Memo</TableHead>
                    <TableHead className="text-right">Tajweed</TableHead>
                    <TableHead className="text-right">Voice</TableHead>
                    <TableHead className="text-right">Dressing</TableHead>
                    <TableHead className="text-right">Avg Total</TableHead>
                    <TableHead className="text-right">Judges</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {group.rows.map((r: any, i: number) => (
                    <TableRow key={r.id}>
                      <TableCell>{getRankBadge(i)}</TableCell>
                      <TableCell className="font-medium">{r.full_name}</TableCell>
                      <TableCell>{r.school || "—"}</TableCell>
                      <TableCell>{r.lga || "—"}</TableCell>
                      <TableCell>{r.state || "—"}</TableCell>
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
        ))
      )}
    </div>
  );
};

export default Results;
