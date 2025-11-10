import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-file-path",
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders })
  }

  // Require an auth header (manual check; verify as needed)
  const authHeader = req.headers.get("Authorization")
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  const path = req.headers.get("X-File-Path") || `uploads/${Date.now()}`
  const contentType = req.headers.get("Content-Type") || "application/octet-stream"

  const arrayBuffer = await req.arrayBuffer()
  const bytes = new Uint8Array(arrayBuffer)

  const { error } = await supabase.storage
    .from("gear-photos")
    .upload(path, bytes, { contentType, upsert: false })

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  const { data: pub } = supabase.storage.from("gear-photos").getPublicUrl(path)

  return new Response(JSON.stringify({ path, publicUrl: pub?.publicUrl || null }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
})