import { defineTool } from "@lovable.dev/mcp-js";
import { supabaseForUser, unauthenticated } from "../supabase";

export default defineTool({
  name: "list_categories",
  title: "List categories",
  description: "List all Musabaqa competition categories with their max scores.",
  inputSchema: {},
  annotations: { readOnlyHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const { data, error } = await supabaseForUser(ctx)
      .from("categories")
      .select("id, name, description, max_memorization, max_tajweed, max_voice, max_dressing")
      .order("name");
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { categories: data ?? [] },
    };
  },
});
