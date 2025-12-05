-- 08_import_data.sql
-- Use this to import table data (public schema).
-- Paste the output from your export edge function (database_dump_YYYY-MM-DD.sql) between the markers below.
-- This file temporarily disables triggers/RLS during import.

SET session_replication_role = replica;

-- === PASTE GENERATED INSERTS BELOW ===
-- Example:
-- INSERT INTO "profiles" (id, first_name, last_name, role, updated_at) VALUES
-- ('...', 'John', 'Doe', 'owner', '2024-01-01T00:00:00Z');

-- (Paste from supabase/functions/export-database/index.ts response)
-- === END GENERATED INSERTS ===

SET session_replication_role = DEFAULT;

-- Optional: quick validation
-- SELECT COUNT(*) FROM public.customers;
-- SELECT COUNT(*) FROM public.gear_items;