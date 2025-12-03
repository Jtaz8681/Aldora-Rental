import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, accept",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

// Escape single quotes in strings for SQL
const escapeSqlString = (str: string): string => {
  return str.replace(/'/g, "''")
}

// Generate INSERT statements for a table
const generateInsertSql = (tableName: string, rows: Record<string, unknown>[]): string => {
  if (!rows || rows.length === 0) {
    return `-- No data to insert for table: ${tableName}\n`
  }

  const columns = Object.keys(rows[0])
  const columnNames = columns.map((c) => `"${c}"`).join(", ")

  const valueStatements = rows.map((row) => {
    const values = columns.map((col) => {
      const value = row[col]
      if (value === null || value === undefined) return "NULL"
      if (typeof value === "boolean") return value ? "true" : "false"
      if (typeof value === "number") return String(value)
      if (value instanceof Date) return `'${(value as Date).toISOString()}'`
      if (typeof value === "object") {
        // JSONB or arrays
        return `'${escapeSqlString(JSON.stringify(value))}'`
      }
      // String
      return `'${escapeSqlString(String(value))}'`
    })
    return `(${values.join(", ")})`
  })

  return `-- Data for table: ${tableName}\nINSERT INTO "${tableName}" (${columnNames}) VALUES\n${valueStatements.join(",\n")};\n\n`
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
      JSON.stringify({ error: "Missing server environment variables." }),
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

  if (profileErr || !profile || (profile.role !== "owner" && profile.role !== "dev")) {
    return new Response(JSON.stringify({ error: "Forbidden: owners or devs only." }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } })
  }

  // Tables to export in a dependency-safe order
  const tables = [
    "profiles",
    "gear_categories",
    "gear_subcategories",
    "service_settings",
    "company_settings",
    "customers",
    "gear_items",
    "category_pricing",
    "rentals",
    "rental_items",
    "damage_reports",
    "maintenance_tickets",
    "maintenance_work_logs",
    "maintenance_parts",
    "payments",
  ]

  try {
    const results = await Promise.all(
      tables.map((table) => supabaseAdmin.from(table).select("*"))
    )

    let fullSqlDump = `-- Full Database Dump
-- Generated on: ${new Date().toISOString()}
-- Intended for development/migration purposes only.

SET session_replication_role = replica; -- Temporarily disables triggers/RLS for import

`

    results.forEach((result, index) => {
      const tableName = tables[index]
      if (result.error) {
        fullSqlDump += `-- ERROR fetching table ${tableName}: ${result.error.message}\n\n`
      } else {
        fullSqlDump += generateInsertSql(tableName, (result.data ?? []) as Record<string, unknown>[])
      }
    })

    fullSqlDump += `SET session_replication_role = DEFAULT; -- Re-enable triggers/RLS\n`

    return new Response(fullSqlDump, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/sql",
        "Content-Disposition": `attachment; filename="database_dump_${new Date().toISOString().slice(0, 10)}.sql"`,
      },
    })
  } catch (err) {
    console.error("Export error:", err)
    return new Response(JSON.stringify({ error: "An unexpected error occurred." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } })
  }
})