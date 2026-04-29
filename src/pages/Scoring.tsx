import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Award, Minus } from "lucide-react";

function calculateMemorizationScore(maxMarks: number, deduction: number): number {
  return Math.max(0, maxMarks - deduction);
}

const Scoring = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedParticipant, setSelectedParticipant] = useState<string>("");
  const [tadCount, setTadCount] = useState(0);
  const [tilCount, setTilCount] = useState(0);
  const [tajweed, setTajweed] = useState(0);
  const [voice, setVoice] = useState(0);
  const [dressing, setDressing] = useState(0);

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("*").order("name");
      return data ?? [];
    },
  });

  const { data: participants } = useQuery({
    queryKey: ["participants", selectedCategory],
    queryFn: async () => {
      let query = supabase.from("participants").select("*, categories(*)").order("full_name");
      if (selectedCategory) query = query.eq("category_id", selectedCategory);
      const { data } = await query;
      return data ?? [];
    },
  });

  const { data: existingScore } = useQuery({
    queryKey: ["my-score", selectedParticipant, user?.id],
    queryFn: async () => {
      if (!selectedParticipant || !user) return null;
      const { data } = await supabase
        .from("scores")
        .select("*")
        .eq("participant_id", selectedParticipant)
        .eq("judge_id", user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!selectedParticipant && !!user,
  });

  const selectedPart = participants?.find((p) => p.id === selectedParticipant);
  const category = selectedPart?.categories;
  const maxMemo = category?.max_memorization ?? 20;
  const memScore = calculateMemorizationScore(maxMemo, mistakes);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!user || !selectedParticipant || !category) return;
      const total = memScore + tajweed + voice + dressing;
      const payload = {
        participant_id: selectedParticipant,
        judge_id: user.id,
        memorization_mistakes: mistakes,
        memorization_score: memScore,
        tajweed_score: tajweed,
        voice_score: voice,
        dressing_score: dressing,
        total_score: total,
      };

      if (existingScore) {
        const { error } = await supabase.from("scores").update(payload).eq("id", existingScore.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("scores").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-score"] });
      toast({ title: "Score saved successfully!" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">Score Participants</h1>
        <p className="text-muted-foreground">Select a participant and enter scores</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Filter by Category</Label>
          <Select value={selectedCategory} onValueChange={(v) => { setSelectedCategory(v); setSelectedParticipant(""); }}>
            <SelectTrigger><SelectValue placeholder="All categories" /></SelectTrigger>
            <SelectContent>
              {categories?.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Select Participant</Label>
          <Select value={selectedParticipant} onValueChange={setSelectedParticipant}>
            <SelectTrigger><SelectValue placeholder="Choose participant" /></SelectTrigger>
            <SelectContent>
              {participants?.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {selectedPart && category && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="font-heading">{selectedPart.full_name}</CardTitle>
                <CardDescription>{category.name}</CardDescription>
              </div>
              {existingScore && <Badge variant="secondary">Already scored — editing</Badge>}
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(); }} className="space-y-6">
              <div className="rounded-lg border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">Memorization (Max: {maxMemo})</Label>
                  <span className="font-heading text-2xl font-bold text-accent">{memScore}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Label>Mistakes:</Label>
                  <Button type="button" variant="outline" size="icon" onClick={() => setMistakes(Math.max(0, mistakes - 1))}><Minus className="h-4 w-4" /></Button>
                  <span className="w-12 text-center font-heading text-xl font-bold">{mistakes}</span>
                  <Button type="button" variant="outline" size="icon" onClick={() => setMistakes(mistakes + 1)}>+</Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Deductions: 1st = -0.5, 2nd = -1, 3rd+ = -2 each
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label>Tajweed (Max: {category.max_tajweed})</Label>
                  <Input type="number" min={0} max={category.max_tajweed} value={tajweed} onChange={(e) => setTajweed(+e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Voice (Max: {category.max_voice})</Label>
                  <Input type="number" min={0} max={category.max_voice} value={voice} onChange={(e) => setVoice(+e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Dressing (Max: {category.max_dressing})</Label>
                  <Input type="number" min={0} max={category.max_dressing} value={dressing} onChange={(e) => setDressing(+e.target.value)} />
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg bg-muted p-4">
                <span className="font-medium">Total Score</span>
                <span className="font-heading text-3xl font-bold">{memScore + tajweed + voice + dressing}</span>
              </div>

              <Button type="submit" className="w-full" disabled={saveMutation.isPending}>
                <Award className="mr-2 h-4 w-4" />
                {saveMutation.isPending ? "Saving..." : existingScore ? "Update Score" : "Submit Score"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Scoring;
