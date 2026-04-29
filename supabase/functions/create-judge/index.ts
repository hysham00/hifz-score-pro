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

    // Verify caller and check admin role
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
    const email = body?.email?.toString().trim();
    const password = body?.password?.toString();
    const full_name = body?.full_name?.toString().trim() ?? "";

    if (!email || !password || password.length < 6) {
      return json({ error: "Invalid input: email and password (min 6) required" }, 400);
    }

    // Create the judge user via Admin API (does NOT touch caller's session)
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name },
    });
    if (createErr || !created?.user) {
      return json({ error: createErr?.message ?? "Failed to create user" }, 400);
    }

    const newUserId = created.user.id;

    // Profile is auto-created by handle_new_user trigger if present; ensure it exists
    await admin
      .from("profiles")
      .upsert({ user_id: newUserId, full_name }, { onConflict: "user_id" });

    const { error: roleInsertErr } = await admin
      .from("user_roles")
      .insert({ user_id: newUserId, role: "judge" });
    if (roleInsertErr) {
      // Roll back user
      await admin.auth.admin.deleteUser(newUserId);
      return json({ error: roleInsertErr.message }, 400);
    }

    return json({ user_id: newUserId, email }, 200);
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
