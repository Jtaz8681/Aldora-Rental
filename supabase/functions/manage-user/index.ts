import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, accept",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

type ManagePayload = {
  action: "delete"
  user_id?: string
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders })
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")
  const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(
      JSON.stringify({ error: "Missing Supabase environment variables in Edge Function secrets. Check SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }

  const supabaseAnon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  const authHeader = req.headers.get("Authorization")
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } })
  }
  const token = authHeader.replace("Bearer ", "")

  const { data: caller, error: callerErr } = await supabaseAnon.auth.getUser(token)
  if (callerErr || !caller?.user) {
    return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } })
  }

  const { data: profile, error: profileErr } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", caller.user.id)
    .maybeSingle()

  if (profileErr) {
    return new Response(JSON.stringify({ error: "Failed to verify role" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } })
  }

  const callerRole = (profile?.role || "").toLowerCase()
  if (!["owner", "manager", "dev"].includes(callerRole)) {
    return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } })
  }

  let payload: ManagePayload = { action: "delete" }
  try {
    payload = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } })
  }

  const { action, user_id } = payload
  if (!user_id) {
    return new Response(JSON.stringify({ error: "Missing required field: user_id" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } })
  }

  if (action !== "delete") {
    return new Response(JSON.stringify({ error: "Unsupported action" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } })
  }

  if (user_id === caller.user.id) {
    return new Response(JSON.stringify({ error: "You cannot delete your own account." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } })
  }

  const { error: delErr } = await supabaseAdmin.auth.admin.deleteUser(user_id)
  if (delErr) {
    return new Response(JSON.stringify({ error: delErr.message || "Failed to delete user" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } })
  }

  // Remove profile row for cleanliness (safe after delete)
  await supabaseAdmin.from("profiles").delete().eq("id", user_id)

  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } })
})