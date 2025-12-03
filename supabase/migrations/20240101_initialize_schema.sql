-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. TABLES
-- ============================================

-- Profiles (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID NOT NULL PRIMARY KEY,
  first_name TEXT,
  last_name TEXT,
  avatar_url TEXT,
  updated_at TIMESTAMP WITH TIME ZONE,
  role TEXT
);

-- Gear Categories
CREATE TABLE IF NOT EXISTS public.gear_categories (
  id UUID NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  service_interval_months INTEGER,
  usage_service_threshold INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE,
  checklist_template_pre JSONB,
  checklist_template_post JSONB
);

-- Gear Subcategories
CREATE TABLE IF NOT EXISTS public.gear_subcategories (
  id UUID NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL,
  category_id UUID NOT NULL,
  name TEXT NOT NULL,
  service_interval_months INTEGER,
  usage_service_threshold INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE
);

-- Service Settings
CREATE TABLE IF NOT EXISTS public.service_settings (
  id UUID NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL,
  regulator_service_interval_months INTEGER,
  bcd_service_interval_months INTEGER,
  max_dives_before_service INTEGER,
  late_fee_per_day NUMERIC,
  updated_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Company Settings
CREATE TABLE IF NOT EXISTS public.company_settings (
  id UUID NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT,
  logo_url TEXT,
  updated_at TIMESTAMP WITH TIME ZONE
);

-- Customers
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  certification_level TEXT,
  certification_agency TEXT,
  past_damage_notes TEXT,
  balance_due NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE
);

-- Gear Items
CREATE TABLE IF NOT EXISTS public.gear_items (
  id UUID NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL,
  internal_id TEXT NOT NULL,
  friendly_name TEXT,
  category TEXT NOT NULL,
  sub_type TEXT,
  brand TEXT,
  model TEXT,
  size TEXT,
  purchase_date DATE,
  purchase_cost NUMERIC,
  date_added DATE,
  initial_cost NUMERIC,
  current_value NUMERIC,
  photos TEXT[],
  serial_number TEXT,
  status TEXT NOT NULL,
  home_location TEXT,
  rental_price NUMERIC,
  manual_url TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE,
  category_id UUID,
  subcategory_id UUID,
  service_interval_months INTEGER,
  usage_service_threshold INTEGER,
  checklist_template_pre JSONB,
  checklist_template_post JSONB
);

-- Category Pricing
CREATE TABLE IF NOT EXISTS public.category_pricing (
  id UUID NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL,
  category TEXT NOT NULL,
  price NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE
);

-- Rentals
CREATE TABLE IF NOT EXISTS public.rentals (
  id UUID NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL,
  customer_id UUID NOT NULL,
  start_at TIMESTAMP WITH TIME ZONE NOT NULL,
  expected_end_at TIMESTAMP WITH TIME ZONE NOT NULL,
  signed_at TIMESTAMP WITH TIME ZONE,
  signature_data_url TEXT,
  total_cost NUMERIC,
  status TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE
);

-- Rental Items
CREATE TABLE IF NOT EXISTS public.rental_items (
  id UUID NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL,
  rental_id UUID NOT NULL,
  gear_id UUID NOT NULL,
  price NUMERIC,
  pre_checklist JSONB,
  post_checklist JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  inspected_by TEXT,
  inspected_at TIMESTAMP WITH TIME ZONE,
  package_share_total NUMERIC
);

-- Damage Reports
CREATE TABLE IF NOT EXISTS public.damage_reports (
  id UUID NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL,
  rental_id UUID,
  gear_id UUID NOT NULL,
  damage_type TEXT,
  severity TEXT,
  photos TEXT[],
  estimate_cost NUMERIC,
  notes TEXT,
  reported_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  rental_item_id UUID
);

-- Maintenance Tickets
CREATE TABLE IF NOT EXISTS public.maintenance_tickets (
  id UUID NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL,
  gear_id UUID,
  rental_id UUID,
  damage_report_id UUID,
  status TEXT NOT NULL,
  date_received TIMESTAMP WITH TIME ZONE DEFAULT now(),
  problem_description TEXT,
  assigned_technician TEXT,
  estimated_completion_date TIMESTAMP WITH TIME ZONE,
  cost NUMERIC,
  charge_customer BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE
);

-- Maintenance Work Logs
CREATE TABLE IF NOT EXISTS public.maintenance_work_logs (
  id UUID NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL,
  ticket_id UUID NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Maintenance Parts
CREATE TABLE IF NOT EXISTS public.maintenance_parts (
  id UUID NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL,
  ticket_id UUID NOT NULL,
  part_name TEXT NOT NULL,
  quantity INTEGER,
  unit_cost NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Payments
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL,
  customer_id UUID NOT NULL,
  amount NUMERIC,
  method TEXT,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ============================================
-- 2. INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_gear_categories_user_id ON public.gear_categories(user_id);
CREATE INDEX IF NOT EXISTS idx_gear_subcategories_user_id ON public.gear_subcategories(user_id);
CREATE INDEX IF NOT EXISTS idx_service_settings_user_id ON public.service_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_customers_user_id ON public.customers(user_id);
CREATE INDEX IF NOT EXISTS idx_gear_items_user_id ON public.gear_items(user_id);
CREATE INDEX IF NOT EXISTS idx_gear_items_internal_id ON public.gear_items(internal_id);
CREATE INDEX IF NOT EXISTS idx_category_pricing_user_id ON public.category_pricing(user_id);
CREATE INDEX IF NOT EXISTS idx_rentals_user_id ON public.rentals(user_id);
CREATE INDEX IF NOT EXISTS idx_rental_items_user_id ON public.rental_items(user_id);
CREATE INDEX IF NOT EXISTS idx_rental_items_rental_id ON public.rental_items(rental_id);
CREATE INDEX IF NOT EXISTS idx_rental_items_gear_id ON public.rental_items(gear_id);
CREATE INDEX IF NOT EXISTS idx_damage_reports_user_id ON public.damage_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_damage_reports_gear_id ON public.damage_reports(gear_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_tickets_user_id ON public.maintenance_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_tickets_gear_id ON public.maintenance_tickets(gear_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_work_logs_user_id ON public.maintenance_work_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_work_logs_ticket_id ON public.maintenance_work_logs(ticket_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_parts_user_id ON public.maintenance_parts(user_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_parts_ticket_id ON public.maintenance_parts(ticket_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_customer_id ON public.payments(customer_id);

-- ============================================
-- 3. RLS (Row Level Security)
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
-- 4. RLS POLICIES
-- ============================================

-- Profiles
CREATE POLICY "Users can view own profile." ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile." ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Gear Categories
CREATE POLICY "Users can view own gear categories." ON public.gear_categories FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own gear categories." ON public.gear_categories FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own gear categories." ON public.gear_categories FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own gear categories." ON public.gear_categories FOR DELETE USING (auth.uid() = user_id);

-- Gear Subcategories
CREATE POLICY "Users can view own gear subcategories." ON public.gear_subcategories FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own gear subcategories." ON public.gear_subcategories FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own gear subcategories." ON public.gear_subcategories FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own gear subcategories." ON public.gear_subcategories FOR DELETE USING (auth.uid() = user_id);

-- Service Settings
CREATE POLICY "Users can view own service settings." ON public.service_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own service settings." ON public.service_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own service settings." ON public.service_settings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own service settings." ON public.service_settings FOR DELETE USING (auth.uid() = user_id);

-- Company Settings
CREATE POLICY "All authenticated users can view company settings." ON public.company_settings FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Owners can update company settings." ON public.company_settings FOR UPDATE USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'owner'));

-- Customers
CREATE POLICY "Users can view own customers." ON public.customers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own customers." ON public.customers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own customers." ON public.customers FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own customers." ON public.customers FOR DELETE USING (auth.uid() = user_id);

-- Gear Items
CREATE POLICY "Users can view own gear items." ON public.gear_items FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own gear items." ON public.gear_items FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own gear items." ON public.gear_items FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own gear items." ON public.gear_items FOR DELETE USING (auth.uid() = user_id);

-- Category Pricing
CREATE POLICY "Users can view own category pricing." ON public.category_pricing FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own category pricing." ON public.category_pricing FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own category pricing." ON public.category_pricing FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own category pricing." ON public.category_pricing FOR DELETE USING (auth.uid() = user_id);

-- Rentals
CREATE POLICY "Users can view own rentals." ON public.rentals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own rentals." ON public.rentals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own rentals." ON public.rentals FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own rentals." ON public.rentals FOR DELETE USING (auth.uid() = user_id);

-- Rental Items
CREATE POLICY "Users can view own rental items." ON public.rental_items FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own rental items." ON public.rental_items FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own rental items." ON public.rental_items FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own rental items." ON public.rental_items FOR DELETE USING (auth.uid() = user_id);

-- Damage Reports
CREATE POLICY "Users can view own damage reports." ON public.damage_reports FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own damage reports." ON public.damage_reports FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own damage reports." ON public.damage_reports FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own damage reports." ON public.damage_reports FOR DELETE USING (auth.uid() = user_id);

-- Maintenance Tickets
CREATE POLICY "Users can view own maintenance tickets." ON public.maintenance_tickets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own maintenance tickets." ON public.maintenance_tickets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own maintenance tickets." ON public.maintenance_tickets FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own maintenance tickets." ON public.maintenance_tickets FOR DELETE USING (auth.uid() = user_id);

-- Maintenance Work Logs
CREATE POLICY "Users can view own maintenance work logs." ON public.maintenance_work_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own maintenance work logs." ON public.maintenance_work_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own maintenance work logs." ON public.maintenance_work_logs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own maintenance work logs." ON public.maintenance_work_logs FOR DELETE USING (auth.uid() = user_id);

-- Maintenance Parts
CREATE POLICY "Users can view own maintenance parts." ON public.maintenance_parts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own maintenance parts." ON public.maintenance_parts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own maintenance parts." ON public.maintenance_parts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own maintenance parts." ON public.maintenance_parts FOR DELETE USING (auth.uid() = user_id);

-- Payments
CREATE POLICY "Users can view own payments." ON public.payments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own payments." ON public.payments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own payments." ON public.payments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own payments." ON public.payments FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- 5. FUNCTIONS AND TRIGGERS
-- ============================================

-- Function to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name, role)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    COALESCE(NEW.raw_user_meta_data->>'role', 'staff')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on signup
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to increment customer balance
CREATE OR REPLACE FUNCTION public.increment_customer_balance(p_user_id UUID, p_customer_id UUID, p_amount NUMERIC)
RETURNS VOID AS $$
BEGIN
  UPDATE public.customers
  SET balance_due = balance_due + p_amount,
      updated_at = now()
  WHERE user_id = p_user_id AND id = p_customer_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get current user's role
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT AS $$
BEGIN
  RETURN (SELECT role FROM public.profiles WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to list profiles with emails (for admin)
CREATE OR REPLACE FUNCTION public.list_profiles_with_email()
RETURNS TABLE (
  id UUID,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  role TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.first_name,
    p.last_name,
    u.email,
    p.role
  FROM public.profiles p
  JOIN auth.users u ON p.id = u.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 6. STORAGE BUCKET
-- ============================================

-- Create storage bucket (if not exists)
INSERT INTO storage.buckets (id, name, public)
VALUES ('gear-photos', 'gear-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Policies for storage bucket
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
-- 7. FINAL NOTES
-- ============================================

-- Ensure migration version tracking (optional)
-- You can add a schema_migrations table if you use a migration tool.