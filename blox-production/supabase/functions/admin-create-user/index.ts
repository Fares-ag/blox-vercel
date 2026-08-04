/**
 * admin-create-user — create Auth + public.users from admin / super-admin portals.
 *
 * Caller must pass their user JWT. Only admin / super_admin may invoke.
 * Only super_admin may assign role super_admin.
 *
 * Body: { email, password, role, companyId?, firstName?, lastName?, name? }
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const ALLOWED_ROLES = new Set([
  "customer",
  "dealer_agent",
  "credit_officer",
  "finance_officer",
  "admin",
  "super_admin",
]);

const STAFF_CREATORS = new Set(["admin", "super_admin"]);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return json({ ok: true }, 200);
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const authHeader = req.headers.get("Authorization") ?? "";

  if (!authHeader.startsWith("Bearer ") || !supabaseUrl || !serviceRoleKey) {
    return json({ error: "Unauthorized" }, 401);
  }

  const userClient = createClient(supabaseUrl, anonKey || serviceRoleKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: userData, error: userError } = await userClient.auth.getUser();
  const authedUser = userData?.user;
  if (userError || !authedUser?.id) {
    return json({ error: "Unauthorized: invalid session" }, 401);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: callerRow, error: callerErr } = await admin
    .from("users")
    .select("role, email")
    .eq("id", authedUser.id)
    .maybeSingle();

  if (callerErr) {
    console.error("load caller role failed", callerErr);
    return json({ error: "Failed to verify caller" }, 500);
  }

  const callerRole = String(callerRow?.role || "").trim().toLowerCase();
  if (!STAFF_CREATORS.has(callerRole)) {
    return json({ error: "Forbidden: admin or super_admin required" }, 403);
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  const role = String(body.role || "customer").trim().toLowerCase();
  const companyIdRaw = body.companyId ?? body.company_id;
  const companyId =
    companyIdRaw === null || companyIdRaw === undefined || companyIdRaw === ""
      ? null
      : String(companyIdRaw);
  const firstName = body.firstName
    ? String(body.firstName).trim()
    : body.first_name
    ? String(body.first_name).trim()
    : "";
  const lastName = body.lastName
    ? String(body.lastName).trim()
    : body.last_name
    ? String(body.last_name).trim()
    : "";
  const name =
    (body.name ? String(body.name).trim() : "") ||
    [firstName, lastName].filter(Boolean).join(" ").trim();

  if (!email || !email.includes("@")) {
    return json({ error: "Valid email is required" }, 400);
  }
  if (password.length < 8) {
    return json({ error: "Password must be at least 8 characters" }, 400);
  }
  if (!ALLOWED_ROLES.has(role)) {
    return json({ error: `Invalid role: ${role}` }, 400);
  }
  if (role === "super_admin" && callerRole !== "super_admin") {
    return json({ error: "Only super_admin may create super_admin users" }, 403);
  }

  const userMetadata: Record<string, string> = {};
  if (name) userMetadata.name = name;
  if (firstName) userMetadata.firstName = firstName;
  if (lastName) userMetadata.lastName = lastName;

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: userMetadata,
  });

  if (createErr || !created?.user?.id) {
    const msg = createErr?.message || "Failed to create user";
    const lower = msg.toLowerCase();
    if (
      lower.includes("already") ||
      lower.includes("registered") ||
      lower.includes("exists") ||
      lower.includes("duplicate")
    ) {
      return json({ error: "A user with this email already exists" }, 409);
    }
    console.error("auth.admin.createUser failed", createErr);
    return json({ error: msg }, 400);
  }

  const newId = created.user.id;

  // Trigger inserts public.users as customer; set role/company/name immediately.
  const upsertPayload: Record<string, unknown> = {
    id: newId,
    email,
    role,
    updated_at: new Date().toISOString(),
  };
  if (companyId) upsertPayload.company_id = companyId;
  if (name) upsertPayload.name = name;
  if (firstName) upsertPayload.first_name = firstName;
  if (lastName) upsertPayload.last_name = lastName;

  // Brief retry if trigger hasn't committed yet
  let profileErr: { message?: string } | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    const { error } = await admin.from("users").upsert(upsertPayload, {
      onConflict: "id",
    });
    profileErr = error;
    if (!error) break;
    await new Promise((r) => setTimeout(r, 150 * (attempt + 1)));
  }

  if (profileErr) {
    // Fallback: update by id / email
    const { error: updErr } = await admin
      .from("users")
      .update({
        role,
        company_id: companyId,
        name: name || undefined,
        updated_at: new Date().toISOString(),
      })
      .eq("id", newId);

    if (updErr) {
      console.error("public.users role update failed", profileErr, updErr);
      return json(
        {
          error:
            "Auth user created but role update failed. Set role from Users detail.",
          id: newId,
          email,
          role: "customer",
        },
        207
      );
    }
  }

  return json({
    ok: true,
    id: newId,
    email,
    role,
    companyId,
  });
});
