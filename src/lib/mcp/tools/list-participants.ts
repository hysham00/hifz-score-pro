import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauthenticated } from "../supabase";

export default defineTool({
  name: "list_participants",
  title: "List participants",
  description: "List participants, optionally filtered by category id.",
  inputSchema: {
    category_id: z.string().uuid().optional().describe("Optional category id filter"),
  },
  annotations: { readOnlyHint: true, openWorldHint: false },
  handler: async ({ category_id }, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const sb = supabaseForUser(ctx);
    let q = sb.from("participants").select("id, full_name, date_of_birth, category_id, categories(name)");
    if (category_id) q = q.eq("category_id", category_id);
    const { data, error } = await q.order("full_name");
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { participants: data ?? [] },
    };
  },
});
