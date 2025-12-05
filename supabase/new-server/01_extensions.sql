-- 01_extensions.sql
-- Run this first in the new Supabase project's SQL editor.

-- Enable pgcrypto (required for gen_random_uuid)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Optional: Some setups use uuid-ossp, include it if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";