import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { ToolContext } from "@lovable.dev/mcp-js";
import type { Database } from "../../integrations/supabase/types";

export function supabaseForUser(ctx: ToolContext): SupabaseClient<Database> {
  const url = process.env.SUPABASE_URL!;
  const anon =
    process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY!;
  return createClient<Database>(url, anon, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function unauthenticated() {
  return {
    content: [{ type: "text" as const, text: "Not authenticated" }],
    isError: true,
  };
}
