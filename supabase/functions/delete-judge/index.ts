import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ??
      Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims?.sub) {
      return json({ error: "Unauthorized" }, 401);
    }
    const callerId = claimsData.claims.sub as string;

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { data: roleRow, error: roleErr } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId)
      .eq("role", "admin")
      .maybeSingle();
    if (roleErr || !roleRow) {
      return json({ error: "Forbidden: admin only" }, 403);
    }

    const body = await req.json().catch(() => null);
    const user_id = body?.user_id?.toString();
    if (!user_id) {
      return json({ error: "Invalid input: user_id required" }, 400);
    }

    if (user_id === callerId) {
      return json({ error: "You cannot remove yourself" }, 400);
    }

    // Confirm target is a judge
    const { data: targetRole } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", user_id)
      .eq("role", "judge")
      .maybeSingle();
    if (!targetRole) {
      return json({ error: "User is not a judge" }, 400);
    }

    // Clean up related rows (scores, role, profile), then delete the user
    await admin.from("scores").delete().eq("judge_id", user_id);
    await admin.from("user_roles").delete().eq("user_id", user_id).eq("role", "judge");
    await admin.from("profiles").delete().eq("user_id", user_id);

    const { error: delErr } = await admin.auth.admin.deleteUser(user_id);
    if (delErr) {
      return json({ error: delErr.message }, 400);
    }

    return json({ success: true }, 200);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
