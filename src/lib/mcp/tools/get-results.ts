import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauthenticated } from "../supabase";

export default defineTool({
  name: "get_results",
  title: "Get results and rankings",
  description:
    "Compute average total scores per participant, optionally filtered by category, ranked highest first.",
  inputSchema: {
    category_id: z.string().uuid().optional().describe("Optional category id filter"),
  },
  annotations: { readOnlyHint: true, openWorldHint: false },
  handler: async ({ category_id }, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const sb = supabaseForUser(ctx);
    let pq = sb.from("participants").select("id, full_name, category_id, categories(name)");
    if (category_id) pq = pq.eq("category_id", category_id);
    const { data: participants, error: pErr } = await pq;
    if (pErr) return { content: [{ type: "text", text: pErr.message }], isError: true };

    const ids = (participants ?? []).map((p) => p.id);
    if (ids.length === 0) {
      return { content: [{ type: "text", text: "[]" }], structuredContent: { results: [] } };
    }
    const { data: scores, error: sErr } = await sb
      .from("scores")
      .select("participant_id, total_score")
      .in("participant_id", ids);
    if (sErr) return { content: [{ type: "text", text: sErr.message }], isError: true };

    const map = new Map<string, { sum: number; count: number }>();
    for (const s of scores ?? []) {
      const cur = map.get(s.participant_id) ?? { sum: 0, count: 0 };
      cur.sum += Number(s.total_score) || 0;
      cur.count += 1;
      map.set(s.participant_id, cur);
    }
    const results = (participants ?? [])
      .map((p) => {
        const agg = map.get(p.id);
        const average = agg && agg.count ? agg.sum / agg.count : 0;
        return {
          participant_id: p.id,
          full_name: p.full_name,
          category: (p as any).categories?.name ?? null,
          judges_scored: agg?.count ?? 0,
          average_score: Number(average.toFixed(2)),
        };
      })
      .sort((a, b) => b.average_score - a.average_score)
      .map((r, i) => ({ rank: i + 1, ...r }));

    return {
      content: [{ type: "text", text: JSON.stringify(results) }],
      structuredContent: { results },
    };
  },
});
