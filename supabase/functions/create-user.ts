import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

const supabaseAnon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders })
  }

  const authHeader = req.headers.get("Authorization")
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } })
  }
  const token = authHeader.replace("Bearer ", "")

  // Identify caller
  const { data: caller, error: callerErr } = await supabaseAnon.auth.getUser(token)
  if (callerErr || !caller?.user) {
    return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } })
  }

  // Check role permission
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", caller.user.id)
    .maybeSingle()

  const role = (profile?.role || "").toLowerCase()
  if (!["owner", "manager", "dev"].includes(role)) {
    return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } })
  }

  let payload: { first_name?: string; last_name?: string; email?: string; password?: string; role?: string } = {}
  try {
    payload = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } })
  }

  const { first_name, last_name, email, password, role: newRole } = payload
  if (!first_name || !last_name || !email || !password || !newRole) {
    return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } })
  }

  // Create auth user with must_change_password flag and names in metadata
  const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    user_metadata: { first_name, last_name, must_change_password: true },
    email_confirm: true,
  })

  if (createErr || !created?.user?.id) {
    return new Response(JSON.stringify({ error: createErr?.message || "Failed to create user" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } })
  }

  const newUserId = created.user.id

  // Update the inserted profile row with the chosen role (trigger inserts profile)
  await supabaseAdmin
    .from("profiles")
    .update({ role: newRole, updated_at: new Date().toISOString() })
    .eq("id", newUserId)

  return new Response(JSON.stringify({ id: newUserId }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } })
})