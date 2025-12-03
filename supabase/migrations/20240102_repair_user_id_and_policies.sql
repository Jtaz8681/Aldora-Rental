-- ============================================
-- 1. ENSURE user_id COLUMN EXISTS ON ALL TABLES
-- ============================================

DO $$
BEGIN
  -- profiles
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS user_id UUID;
  -- gear_categories
  ALTER TABLE public.gear_categories ADD COLUMN IF NOT EXISTS user_id UUID;
  -- gear_subcategories
  ALTER TABLE public.gear_subcategories ADD COLUMN IF NOT EXISTS user_id UUID;
  -- service_settings
  ALTER TABLE public.service_settings ADD COLUMN IF NOT EXISTS user_id UUID;
  -- customers
  ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS user_id UUID;
  -- gear_items
  ALTER TABLE public.gear_items ADD COLUMN IF NOT EXISTS user_id UUID;
  -- category_pricing
  ALTER TABLE public.category_pricing ADD COLUMN IF NOT EXISTS user_id UUID;
  -- rentals
  ALTER TABLE public.rentals ADD COLUMN IF NOT EXISTS user_id UUID;
  -- rental_items
  ALTER TABLE public.rental_items ADD COLUMN IF NOT EXISTS user_id UUID;
  -- damage_reports
  ALTER TABLE public.damage_reports ADD COLUMN IF NOT EXISTS user_id UUID;
  -- maintenance_tickets
  ALTER TABLE public.maintenance_tickets ADD COLUMN IF NOT EXISTS user_id UUID;
  -- maintenance_work_logs
  ALTER TABLE public.maintenance_work_logs ADD COLUMN IF NOT EXISTS user_id UUID;
  -- maintenance_parts
  ALTER TABLE public.maintenance_parts ADD COLUMN IF NOT EXISTS user_id UUID;
  -- payments
  ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS user_id UUID;
END$$;

-- ============================================
-- 2. ENSURE INDEXES (safe, ignore if exists)
-- ============================================

CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_gear_categories_user_id ON public.gear_categories(user_id);
CREATE INDEX IF NOT EXISTS idx_gear_subcategories_user_id ON public.gear_subcategories(user_id);
CREATE INDEX IF NOT EXISTS idx_service_settings_user_id ON public.service_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_customers_user_id ON public.customers(user_id);
CREATE INDEX IF NOT EXISTS idx_gear_items_user_id ON public.gear_items(user_id);
CREATE INDEX IF NOT EXISTS idx_category_pricing_user_id ON public.category_pricing(user_id);
CREATE INDEX IF NOT EXISTS idx_rentals_user_id ON public.rentals(user_id);
CREATE INDEX IF NOT EXISTS idx_rental_items_user_id ON public.rental_items(user_id);
CREATE INDEX IF NOT EXISTS idx_damage_reports_user_id ON public.damage_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_tickets_user_id ON public.maintenance_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_work_logs_user_id ON public.maintenance_work_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_parts_user_id ON public.maintenance_parts(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON public.payments(user_id);

-- ============================================
-- 3. ENSURE RLS IS ENABLED
-- ============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gear_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gear_subcategories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gear_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.category_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rentals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rental_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.damage_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_work_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 4. DROP AND RECREATE RLS POLICIES (to avoid conflicts)
-- ============================================

-- Profiles
DROP POLICY IF EXISTS "Users can view own profile." ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile." ON public.profiles;
CREATE POLICY "Users can view own profile." ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile." ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Gear Categories
DROP POLICY IF EXISTS "Users can view own gear categories." ON public.gear_categories;
DROP POLICY IF EXISTS "Users can insert own gear categories." ON public.gear_categories;
DROP POLICY IF EXISTS "Users can update own gear categories." ON public.gear_categories;
DROP POLICY IF EXISTS "Users can delete own gear categories." ON public.gear_categories;
CREATE POLICY "Users can view own gear categories." ON public.gear_categories FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own gear categories." ON public.gear_categories FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own gear categories." ON public.gear_categories FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own gear categories." ON public.gear_categories FOR DELETE USING (auth.uid() = user_id);

-- Gear Subcategories
DROP POLICY IF EXISTS "Users can view own gear subcategories." ON public.gear_subcategories;
DROP POLICY IF EXISTS "Users can insert own gear subcategories." ON public.gear_subcategories;
DROP POLICY IF EXISTS "Users can update own gear subcategories." ON public.gear_subcategories;
DROP POLICY IF EXISTS "Users can delete own gear subcategories." ON public.gear_subcategories;
CREATE POLICY "Users can view own gear subcategories." ON public.gear_subcategories FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own gear subcategories." ON public.gear_subcategories FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own gear subcategories." ON public.gear_subcategories FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own gear subcategories." ON public.gear_subcategories FOR DELETE USING (auth.uid() = user_id);

-- Service Settings
DROP POLICY IF EXISTS "Users can view own service settings." ON public.service_settings;
DROP POLICY IF EXISTS "Users can insert own service settings." ON public.service_settings;
DROP POLICY IF EXISTS "Users can update own service settings." ON public.service_settings;
DROP POLICY IF EXISTS "Users can delete own service settings." ON public.service_settings;
CREATE POLICY "Users can view own service settings." ON public.service_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own service settings." ON public.service_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own service settings." ON public.service_settings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own service settings." ON public.service_settings FOR DELETE USING (auth.uid() = user_id);

-- Company Settings
DROP POLICY IF EXISTS "All authenticated users can view company settings." ON public.company_settings;
DROP POLICY IF EXISTS "Owners can update company settings." ON public.company_settings;
CREATE POLICY "All authenticated users can view company settings." ON public.company_settings FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Owners can update company settings." ON public.company_settings FOR UPDATE USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'owner'));

-- Customers
DROP POLICY IF EXISTS "Users can view own customers." ON public.customers;
DROP POLICY IF EXISTS "Users can insert own customers." ON public.customers;
DROP POLICY IF EXISTS "Users can update own customers." ON public.customers;
DROP POLICY IF EXISTS "Users can delete own customers." ON public.customers;
CREATE POLICY "Users can view own customers." ON public.customers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own customers." ON public.customers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own customers." ON public.customers FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own customers." ON public.customers FOR DELETE USING (auth.uid() = user_id);

-- Gear Items
DROP POLICY IF EXISTS "Users can view own gear items." ON public.gear_items;
DROP POLICY IF EXISTS "Users can insert own gear items." ON public.gear_items;
DROP POLICY IF EXISTS "Users can update own gear items." ON public.gear_items;
DROP POLICY IF EXISTS "Users can delete own gear items." ON public.gear_items;
CREATE POLICY "Users can view own gear items." ON public.gear_items FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own gear items." ON public.gear_items FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own gear items." ON public.gear_items FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own gear items." ON public.gear_items FOR DELETE USING (auth.uid() = user_id);

-- Category Pricing
DROP POLICY IF EXISTS "Users can view own category pricing." ON public.category_pricing;
DROP POLICY IF EXISTS "Users can insert own category pricing." ON public.category_pricing;
DROP POLICY IF EXISTS "Users can update own category pricing." ON public.category_pricing;
DROP POLICY IF EXISTS "Users can delete own category pricing." ON public.category_pricing;
CREATE POLICY "Users can view own category pricing." ON public.category_pricing FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own category pricing." ON public.category_pricing FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own category pricing." ON public.category_pricing FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own category pricing." ON public.category_pricing FOR DELETE USING (auth.uid() = user_id);

-- Rentals
DROP POLICY IF EXISTS "Users can view own rentals." ON public.rentals;
DROP POLICY IF EXISTS "Users can insert own rentals." ON public.rentals;
DROP POLICY IF EXISTS "Users can update own rentals." ON public.rentals;
DROP POLICY IF EXISTS "Users can delete own rentals." ON public.rentals;
CREATE POLICY "Users can view own rentals." ON public.rentals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own rentals." ON public.rentals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own rentals." ON public.rentals FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own rentals." ON public.rentals FOR DELETE USING (auth.uid() = user_id);

-- Rental Items
DROP POLICY IF EXISTS "Users can view own rental items." ON public.rental_items;
DROP POLICY IF EXISTS "Users can insert own rental items." ON public.rental_items;
DROP POLICY IF EXISTS "Users can update own rental items." ON public.rental_items;
DROP POLICY IF EXISTS "Users can delete own rental items." ON public.rental_items;
CREATE POLICY "Users can view own rental items." ON public.rental_items FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own rental items." ON public.rental_items FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own rental items." ON public.rental_items FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own rental items." ON public.rental_items FOR DELETE USING (auth.uid() = user_id);

-- Damage Reports
DROP POLICY IF EXISTS "Users can view own damage reports." ON public.damage_reports;
DROP POLICY IF EXISTS "Users can insert own damage reports." ON public.damage_reports;
DROP POLICY IF EXISTS "Users can update own damage reports." ON public.damage_reports;
DROP POLICY IF EXISTS "Users can delete own damage reports." ON public.damage_reports;
CREATE POLICY "Users can view own damage reports." ON public.damage_reports FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own damage reports." ON public.damage_reports FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own damage reports." ON public.damage_reports FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own damage reports." ON public.damage_reports FOR DELETE USING (auth.uid() = user_id);

-- Maintenance Tickets
DROP POLICY IF EXISTS "Users can view own maintenance tickets." ON public.maintenance_tickets;
DROP POLICY IF EXISTS "Users can insert own maintenance tickets." ON public.maintenance_tickets;
DROP POLICY IF EXISTS "Users can update own maintenance tickets." ON public.maintenance_tickets;
DROP POLICY IF EXISTS "Users can delete own maintenance tickets." ON public.maintenance_tickets;
CREATE POLICY "Users can view own maintenance tickets." ON public.maintenance_tickets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own maintenance tickets." ON public.maintenance_tickets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own maintenance tickets." ON public.maintenance_tickets FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own maintenance tickets." ON public.maintenance_tickets FOR DELETE USING (auth.uid() = user_id);

-- Maintenance Work Logs
DROP POLICY IF EXISTS "Users can view own maintenance work logs." ON public.maintenance_work_logs;
DROP POLICY IF EXISTS "Users can insert own maintenance work logs." ON public.maintenance_work_logs;
DROP POLICY IF EXISTS "Users can update own maintenance work logs." ON public.maintenance_work_logs;
DROP POLICY IF EXISTS "Users can delete own maintenance work logs." ON public.maintenance_work_logs;
CREATE POLICY "Users can view own maintenance work logs." ON public.maintenance_work_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own maintenance work logs." ON public.maintenance_work_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own maintenance work logs." ON public.maintenance_work_logs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own maintenance work logs." ON public.maintenance_work_logs FOR DELETE USING (auth.uid() = user_id);

-- Maintenance Parts
DROP POLICY IF EXISTS "Users can view own maintenance parts." ON public.maintenance_parts;
DROP POLICY IF EXISTS "Users can insert own maintenance parts." ON public.maintenance_parts;
DROP POLICY IF EXISTS "Users can update own maintenance parts." ON public.maintenance_parts;
DROP POLICY IF EXISTS "Users can delete own maintenance parts." ON public.maintenance_parts;
CREATE POLICY "Users can view own maintenance parts." ON public.maintenance_parts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own maintenance parts." ON public.maintenance_parts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own maintenance parts." ON public.maintenance_parts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own maintenance parts." ON public.maintenance_parts FOR DELETE USING (auth.uid() = user_id);

-- Payments
DROP POLICY IF EXISTS "Users can view own payments." ON public.payments;
DROP POLICY IF EXISTS "Users can insert own payments." ON public.payments;
DROP POLICY IF EXISTS "Users can update own payments." ON public.payments;
DROP POLICY IF EXISTS "Users can delete own payments." ON public.payments;
CREATE POLICY "Users can view own payments." ON public.payments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own payments." ON public.payments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own payments." ON public.payments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own payments." ON public.payments FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- 5. ENSURE STORAGE BUCKET AND POLICIES
-- ============================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('gear-photos', 'gear-photos', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Anyone can view photos." ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload photos." ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update own photos." ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete own photos." ON storage.objects;

CREATE POLICY "Anyone can view photos." ON storage.objects FOR SELECT USING (bucket_id = 'gear-photos');
CREATE POLICY "Authenticated users can upload photos." ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'gear-photos' AND auth.role() = 'authenticated'
);
CREATE POLICY "Authenticated users can update own photos." ON storage.objects FOR UPDATE USING (
  bucket_id = 'gear-photos' AND auth.uid()::text = (storage.foldername(name))[1]
);
CREATE POLICY "Authenticated users can delete own photos." ON storage.objects FOR DELETE USING (
  bucket_id = 'gear-photos' AND auth.uid()::text = (storage.foldername(name))[1]
);

-- ============================================
-- 6. FINAL NOTES
-- ============================================

-- All user_id columns should now exist and be indexed.
-- RLS policies are reapplied cleanly.
-- Storage bucket and policies are ensured.