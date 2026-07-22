import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauthenticated } from "../supabase";

export default defineTool({
  name: "submit_score",
  title: "Submit a score",
  description:
    "Submit or update the signed-in judge's score for a participant. total_score = memorization + tajweed + voice + dressing.",
  inputSchema: {
    participant_id: z.string().uuid(),
    memorization_score: z.number().min(0),
    memorization_mistakes: z.number().int().min(0).default(0),
    tajweed_score: z.number().min(0),
    voice_score: z.number().min(0),
    dressing_score: z.number().min(0),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const total =
      input.memorization_score + input.tajweed_score + input.voice_score + input.dressing_score;
    const sb = supabaseForUser(ctx);
    const { data, error } = await sb
      .from("scores")
      .upsert(
        {
          judge_id: ctx.getUserId(),
          participant_id: input.participant_id,
          memorization_score: input.memorization_score,
          memorization_mistakes: input.memorization_mistakes,
          tajweed_score: input.tajweed_score,
          voice_score: input.voice_score,
          dressing_score: input.dressing_score,
          total_score: total,
        },
        { onConflict: "judge_id,participant_id" },
      )
      .select()
      .single();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { score: data },
    };
  },
});
