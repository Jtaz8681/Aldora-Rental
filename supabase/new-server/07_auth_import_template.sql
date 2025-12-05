-- 07_auth_import_template.sql
-- WARNING: Direct writes to auth.* tables are sensitive and may require elevated privileges.
-- Supabase recommends using the Admin API to create users. To import hashed passwords and provider identities,
-- you may insert into auth.users and auth.identities directly via SQL if permitted.

-- 1) Insert users (replace values with your exported data).
-- Columns vary by Supabase version; adjust as needed to match your project.
-- Common fields: id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_user_meta_data
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_user_meta_data)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'owner@example.com', '$2a$10$replace_with_bcrypt_hash', NOW(), NOW(), NOW(), '{"first_name":"Owner","last_name":"User","role":"owner"}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- 2) Insert provider identities (OAuth) if you used them.
-- Adjust columns to your version: id, user_id, provider, identity_data, created_at, updated_at
INSERT INTO auth.identities (id, user_id, provider, identity_data, created_at, updated_at)
VALUES
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000001', 'github', '{"sub":"github_123","email":"owner@example.com"}'::jsonb, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- 3) Sessions are not migrated; users must sign in again post-migration.
-- 4) After inserting, verify with a simple check:
-- SELECT id, email FROM auth.users ORDER BY email;