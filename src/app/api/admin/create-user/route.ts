import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request): Promise<Response> {
  const SUPABASE_URL = process.env.SUPABASE_URL as string;
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY as string;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({ error: "Server not configured: missing Supabase environment variables." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabaseAnon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const authHeader = req.headers.get("authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
  }
  const token = authHeader.replace("Bearer ", "");

  const { data: caller, error: callerErr } = await supabaseAnon.auth.getUser(token);
  if (callerErr || !caller?.user) {
    return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401, headers: { "Content-Type": "application/json" } });
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), { status: 400, headers: { "Content-Type": "application/json" } });
  }

  const { first_name, last_name, email, password, role } = body as {
    first_name?: string;
    last_name?: string;
    email?: string;
    password?: string;
    role?: string;
  };

  if (!first_name || !last_name || !email || !password || !role) {
    return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400, headers: { "Content-Type": "application/json" } });
  }

  const { data: callerProfile } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", caller.user.id)
    .maybeSingle();

  const callerRole = (callerProfile?.role || "").toLowerCase();
  const allowed = ["owner", "manager", "dev"];
  if (!allowed.includes(callerRole)) {
    return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { "Content-Type": "application/json" } });
  }

  const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { first_name, last_name, must_change_password: true },
  });

  if (createErr || !created?.user?.id) {
    return new Response(JSON.stringify({ error: createErr?.message || "Failed to create user" }), { status: 400, headers: { "Content-Type": "application/json" } });
  }

  const newUserId = created.user.id;

  await supabaseAdmin
    .from("profiles")
    .update({ role, updated_at: new Date().toISOString() })
    .eq("id", newUserId);

  return new Response(JSON.stringify({ id: newUserId }), { status: 200, headers: { "Content-Type": "application/json" } });
}