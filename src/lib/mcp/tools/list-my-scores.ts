import { defineTool } from "@lovable.dev/mcp-js";
import { supabaseForUser, unauthenticated } from "../supabase";

export default defineTool({
  name: "list_my_scores",
  title: "List my submitted scores",
  description: "List all scores submitted by the currently signed-in judge.",
  inputSchema: {},
  annotations: { readOnlyHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const { data, error } = await supabaseForUser(ctx)
      .from("scores")
      .select("id, participant_id, memorization_score, memorization_mistakes, tajweed_score, voice_score, dressing_score, total_score, updated_at, participants(full_name)")
      .eq("judge_id", ctx.getUserId())
      .order("updated_at", { ascending: false });
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { scores: data ?? [] },
    };
  },
});
