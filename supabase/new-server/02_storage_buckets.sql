-- 02_storage_buckets.sql
-- Creates storage buckets and dev-friendly policies.
-- Note: This sets both buckets to public and allows broad access (development mode).

-- Ensure storage schema exists (Supabase includes it by default)
-- Create buckets (public=true because app uses getPublicUrl)
INSERT INTO storage.buckets (id, name, public)
VALUES ('gear-photos', 'gear-photos', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('manuals', 'manuals', true)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on objects (typically enabled by default, but ensure here)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Dev policies for gear-photos
CREATE POLICY "gear_photos_public_read" ON storage.objects
FOR SELECT USING (bucket_id = 'gear-photos');

CREATE POLICY "gear_photos_insert_dev" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'gear-photos');

CREATE POLICY "gear_photos_update_dev" ON storage.objects
FOR UPDATE USING (bucket_id = 'gear-photos');

CREATE POLICY "gear_photos_delete_dev" ON storage.objects
FOR DELETE USING (bucket_id = 'gear-photos');

-- Dev policies for manuals
CREATE POLICY "manuals_public_read" ON storage.objects
FOR SELECT USING (bucket_id = 'manuals');

CREATE POLICY "manuals_insert_dev" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'manuals');

CREATE POLICY "manuals_update_dev" ON storage.objects
FOR UPDATE USING (bucket_id = 'manuals');

CREATE POLICY "manuals_delete_dev" ON storage.objects
FOR DELETE USING (bucket_id = 'manuals');