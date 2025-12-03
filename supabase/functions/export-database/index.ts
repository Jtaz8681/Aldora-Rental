import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, accept",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

const escapeSqlString = (str: string): string => str.replace(/'/g, "''")

type ColumnTypes = Record<string, string>
type TableSchema = Record<string, ColumnTypes>

// Define expected table columns and types (public schema)
const schema: TableSchema = {
  profiles: {
    id: "uuid",
    first_name: "text",
    last_name: "text",
    avatar_url: "text",
    updated_at: "timestamp with time zone",
    role: "text",
  },
  gear_categories: {
    id: "uuid",
    user_id: "uuid",
    name: "text",
    service_interval_months: "integer",
    usage_service_threshold: "integer",
    created_at: "timestamp with time zone",
    updated_at: "timestamp with time zone",
    checklist_template_pre: "jsonb",
    checklist_template_post: "jsonb",
  },
  gear_subcategories: {
    id: "uuid",
    user_id: "uuid",
    category_id: "uuid",
    name: "text",
    service_interval_months: "integer",
    usage_service_threshold: "integer",
    created_at: "timestamp with time zone",
    updated_at: "timestamp with time zone",
  },
  service_settings: {
    id: "uuid",
    user_id: "uuid",
    regulator_service_interval_months: "integer",
    bcd_service_interval_months: "integer",
    max_dives_before_service: "integer",
    late_fee_per_day: "numeric",
    updated_at: "timestamp with time zone",
    created_at: "timestamp with time zone",
  },
  company_settings: {
    id: "uuid",
    name: "text",
    logo_url: "text",
    updated_at: "timestamp with time zone",
  },
  customers: {
    id: "uuid",
    user_id: "uuid",
    name: "text",
    phone: "text",
    email: "text",
    certification_level: "text",
    certification_agency: "text",
    past_damage_notes: "text",
    balance_due: "numeric",
    created_at: "timestamp with time zone",
    updated_at: "timestamp with time zone",
  },
  gear_items: {
    id: "uuid",
    user_id: "uuid",
    internal_id: "text",
    friendly_name: "text",
    category: "text",
    sub_type: "text",
    brand: "text",
    model: "text",
    size: "text",
    purchase_date: "date",
    purchase_cost: "numeric",
    date_added: "date",
    initial_cost: "numeric",
    current_value: "numeric",
    photos: "text[]",
    serial_number: "text",
    status: "text",
    home_location: "text",
    rental_price: "numeric",
    manual_url: "text",
    notes: "text",
    created_at: "timestamp with time zone",
    updated_at: "timestamp with time zone",
    category_id: "uuid",
    subcategory_id: "uuid",
    service_interval_months: "integer",
    usage_service_threshold: "integer",
    checklist_template_pre: "jsonb",
    checklist_template_post: "jsonb",
  },
  category_pricing: {
    id: "uuid",
    user_id: "uuid",
    category: "text",
    price: "numeric",
    created_at: "timestamp with time zone",
    updated_at: "timestamp with time zone",
  },
  rentals: {
    id: "uuid",
    user_id: "uuid",
    customer_id: "uuid",
    start_at: "timestamp with time zone",
    expected_end_at: "timestamp with time zone",
    signed_at: "timestamp with time zone",
    signature_data_url: "text",
    total_cost: "numeric",
    status: "text",
    created_at: "timestamp with time zone",
    updated_at: "timestamp with time zone",
  },
  rental_items: {
    id: "uuid",
    user_id: "uuid",
    rental_id: "uuid",
    gear_id: "uuid",
    price: "numeric",
    pre_checklist: "jsonb",
    post_checklist: "jsonb",
    created_at: "timestamp with time zone",
    inspected_by: "text",
    inspected_at: "timestamp with time zone",
    package_share_total: "numeric",
  },
  damage_reports: {
    id: "uuid",
    user_id: "uuid",
    rental_id: "uuid",
    gear_id: "uuid",
    damage_type: "text",
    severity: "text",
    photos: "text[]",
    estimate_cost: "numeric",
    notes: "text",
    reported_at: "timestamp with time zone",
    rental_item_id: "uuid",
  },
  maintenance_tickets: {
    id: "uuid",
    user_id: "uuid",
    gear_id: "uuid",
    rental_id: "uuid",
    damage_report_id: "uuid",
    status: "text",
    date_received: "timestamp with time zone",
    problem_description: "text",
    assigned_technician: "text",
    estimated_completion_date: "timestamp with time zone",
    cost: "numeric",
    charge_customer: "boolean",
    created_at: "timestamp with time zone",
    updated_at: "timestamp with time zone",
  },
  maintenance_work_logs: {
    id: "uuid",
    user_id: "uuid",
    ticket_id: "uuid",
    description: "text",
    created_at: "timestamp with time zone",
  },
  maintenance_parts: {
    id: "uuid",
    user_id: "uuid",
    ticket_id: "uuid",
    part_name: "text",
    quantity: "integer",
    unit_cost: "numeric",
    created_at: "timestamp with time zone",
  },
  payments: {
    id: "uuid",
    user_id: "uuid",
    customer_id: "uuid",
    amount: "numeric",
    method: "text",
    note: "text",
    created_at: "timestamp with time zone",
  },
}

const generateEnsureTableSql = (tableName: string, columns: ColumnTypes): string => {
  let sql = `-- Ensure table and columns exist for: ${tableName}
DO $$
BEGIN
  IF to_regclass('public."${tableName}"') IS NULL THEN
    CREATE TABLE public."${tableName}" (id uuid PRIMARY KEY);
  END IF;
END$$;
`
  for (const [col, type] of Object.entries(columns)) {
    if (col === "id") continue
    sql += `ALTER TABLE public."${tableName}" ADD COLUMN IF NOT EXISTS "${col}" ${type};\n`
  }
  return sql + "\n"
}

const formatArrayLiteral = (arr: unknown[], baseType: string): string => {
  // Use ARRAY[...] form to avoid escaping issues
  const formatted = arr.map((v) => {
    if (v === null || v === undefined) return "NULL"
    if (typeof v === "number" || typeof v === "boolean") return String(v)
    return `'${escapeSqlString(String(v))}'`
  })
  return `ARRAY[${formatted.join(", ")}]::${baseType}[]`
}

const formatValue = (value: unknown, sqlType: string): string => {
  if (value === null || value === undefined) return "NULL"

  // Arrays
  if (sqlType.endsWith("[]")) {
    const baseType = sqlType.replace("[]", "")
    const arr = Array.isArray(value) ? value : []
    return formatArrayLiteral(arr, baseType)
  }

  switch (sqlType) {
    case "jsonb":
      // Cast to jsonb explicitly
      return `'${escapeSqlString(JSON.stringify(value))}'::jsonb`
    case "timestamp with time zone":
    case "date":
      // Dates represented as ISO strings
      if (value instanceof Date) return `'${(value as Date).toISOString()}'`
      return `'${escapeSqlString(String(value))}'`
    case "uuid":
      return `'${escapeSqlString(String(value))}'`
    case "text":
      return `'${escapeSqlString(String(value))}'`
    case "numeric":
    case "integer":
      // Numbers stored as numbers if possible
      if (typeof value === "number") return String(value)
      // fall back to cast
      return `'${escapeSqlString(String(value))}'::${sqlType}`
    case "boolean":
      return (value as boolean) ? "true" : "false"
    default:
      // Fallback: treat as text
      return `'${escapeSqlString(String(value))}'`
  }
}

const generateInsertSql = (tableName: string, rows: Record<string, unknown>[], colTypes: ColumnTypes): string => {
  if (!rows || rows.length === 0) {
    return `-- No data to insert for table: ${tableName}\n\n`
  }

  // Use keys from data rows to avoid inserting missing columns
  const columns = Object.keys(rows[0])
  const columnNames = columns.map((c) => `"${c}"`).join(", ")

  const valueStatements = rows.map((row) => {
    const values = columns.map((col) => {
      const type = colTypes[col] ?? "text"
      return formatValue(row[col], type)
    })
    return `(${values.join(", ")})`
  })

  return `-- Data for table: ${tableName}
INSERT INTO "${tableName}" (${columnNames}) VALUES
${valueStatements.join(",\n")};
\n`
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders })
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")
  const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({ error: "Missing server environment variables." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  const supabaseAnon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  // Auth
  const authHeader = req.headers.get("Authorization")
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
  const token = authHeader.replace("Bearer ", "")

  const { data: caller, error: callerErr } = await supabaseAnon.auth.getUser(token)
  if (callerErr || !caller?.user) {
    return new Response(JSON.stringify({ error: "Invalid token" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  const { data: profile, error: profileErr } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", caller.user.id)
    .maybeSingle()

  if (profileErr || !profile || (profile.role !== "owner" && profile.role !== "dev")) {
    return new Response(JSON.stringify({ error: "Forbidden: owners or devs only." }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  const tables = Object.keys(schema)

  try {
    const results = await Promise.all(tables.map((t) => supabaseAdmin.from(t).select("*")))

    let fullSqlDump = `-- Full Database Dump
-- Generated on: ${new Date().toISOString()}
-- Intended for development/migration purposes only.

SET session_replication_role = replica; -- Temporarily disables triggers/RLS for import

`

    // Ensure table and columns exist before inserts
    tables.forEach((t) => {
      fullSqlDump += generateEnsureTableSql(t, schema[t])
    })

    // Append data inserts
    results.forEach((result, index) => {
      const tableName = tables[index]
      if (result.error) {
        fullSqlDump += `-- ERROR fetching table ${tableName}: ${result.error.message}\n\n`
      } else {
        fullSqlDump += generateInsertSql(tableName, (result.data ?? []) as Record<string, unknown>[], schema[tableName])
      }
    })

    fullSqlDump += `SET session_replication_role = DEFAULT; -- Re-enable triggers/RLS
`

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
    return new Response(JSON.stringify({ error: "An unexpected error occurred." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})