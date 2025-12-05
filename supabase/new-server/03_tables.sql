-- 03_tables.sql
-- Creates tables in public schema and enables RLS on each.

-- profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT,
  last_name TEXT,
  avatar_url TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  role TEXT DEFAULT 'manager',
  PRIMARY KEY (id)
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- customers
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  certification_level TEXT,
  certification_agency TEXT,
  past_damage_notes TEXT,
  balance_due NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  acquisition_source TEXT,
  first_rental_date TIMESTAMP WITH TIME ZONE,
  last_rental_date TIMESTAMP WITH TIME ZONE,
  total_rentals_count INTEGER DEFAULT 0,
  total_revenue_generated NUMERIC DEFAULT 0,
  customer_segment TEXT DEFAULT 'occasional',
  customer_since TIMESTAMP WITH TIME ZONE,
  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  country TEXT DEFAULT 'USA'
);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- gear_categories
CREATE TABLE IF NOT EXISTS public.gear_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  service_interval_months INTEGER,
  usage_service_threshold INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  checklist_template_pre JSONB DEFAULT '{}'::jsonb,
  checklist_template_post JSONB DEFAULT '{}'::jsonb
);

ALTER TABLE public.gear_categories ENABLE ROW LEVEL SECURITY;

-- gear_subcategories
CREATE TABLE IF NOT EXISTS public.gear_subcategories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.gear_categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  service_interval_months INTEGER,
  usage_service_threshold INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.gear_subcategories ENABLE ROW LEVEL SECURITY;

-- service_settings
CREATE TABLE IF NOT EXISTS public.service_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  regulator_service_interval_months INTEGER DEFAULT 12,
  bcd_service_interval_months INTEGER DEFAULT 12,
  max_dives_before_service INTEGER DEFAULT 100,
  late_fee_per_day NUMERIC DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.service_settings ENABLE ROW LEVEL SECURITY;

-- company_settings
CREATE TABLE IF NOT EXISTS public.company_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT,
  logo_url TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

-- gear_items
CREATE TABLE IF NOT EXISTS public.gear_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  internal_id TEXT NOT NULL,
  friendly_name TEXT,
  category TEXT NOT NULL,
  sub_type TEXT,
  brand TEXT,
  model TEXT,
  size TEXT,
  purchase_date DATE,
  purchase_cost NUMERIC,
  date_added DATE DEFAULT CURRENT_DATE,
  initial_cost NUMERIC,
  current_value NUMERIC,
  photos TEXT[] DEFAULT ARRAY[]::text[],
  serial_number TEXT,
  status TEXT NOT NULL,
  home_location TEXT,
  rental_price NUMERIC DEFAULT 0,
  manual_url TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  category_id UUID REFERENCES public.gear_categories(id) ON DELETE SET NULL,
  subcategory_id UUID REFERENCES public.gear_subcategories(id) ON DELETE SET NULL,
  service_interval_months INTEGER,
  usage_service_threshold INTEGER,
  checklist_template_pre JSONB DEFAULT '{}'::jsonb,
  checklist_template_post JSONB DEFAULT '{}'::jsonb,
  depreciation_rate NUMERIC DEFAULT 0.1,
  supplier TEXT,
  warranty_expiry TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.gear_items ENABLE ROW LEVEL SECURITY;

-- category_pricing
CREATE TABLE IF NOT EXISTS public.category_pricing (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  price NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.category_pricing ENABLE ROW LEVEL SECURITY;

-- rentals
CREATE TABLE IF NOT EXISTS public.rentals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  start_at TIMESTAMP WITH TIME ZONE NOT NULL,
  expected_end_at TIMESTAMP WITH TIME ZONE NOT NULL,
  signed_at TIMESTAMP WITH TIME ZONE,
  signature_data_url TEXT,
  total_cost NUMERIC DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  actual_return_date TIMESTAMP WITH TIME ZONE,
  late_fee_amount NUMERIC DEFAULT 0,
  late_fee_collected NUMERIC DEFAULT 0,
  discount_amount NUMERIC DEFAULT 0,
  payment_method TEXT,
  staff_assigned_id UUID,
  created_by_staff_id UUID
);

ALTER TABLE public.rentals ENABLE ROW LEVEL SECURITY;

-- rental_items
CREATE TABLE IF NOT EXISTS public.rental_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rental_id UUID NOT NULL REFERENCES public.rentals(id) ON DELETE CASCADE,
  gear_id UUID NOT NULL REFERENCES public.gear_items(id) ON DELETE CASCADE,
  price NUMERIC DEFAULT 0,
  pre_checklist JSONB DEFAULT '{}'::jsonb,
  post_checklist JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  inspected_by TEXT,
  inspected_at TIMESTAMP WITH TIME ZONE,
  package_share_total NUMERIC
);

ALTER TABLE public.rental_items ENABLE ROW LEVEL SECURITY;

-- damage_reports
CREATE TABLE IF NOT EXISTS public.damage_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rental_id UUID REFERENCES public.rentals(id) ON DELETE SET NULL,
  gear_id UUID NOT NULL REFERENCES public.gear_items(id) ON DELETE CASCADE,
  damage_type TEXT,
  severity TEXT,
  photos TEXT[] DEFAULT ARRAY[]::text[],
  estimate_cost NUMERIC,
  notes TEXT,
  reported_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  rental_item_id UUID REFERENCES public.rental_items(id) ON DELETE SET NULL,
  actual_cost NUMERIC,
  insurance_claim_id TEXT,
  resolved_at TIMESTAMP WITH TIME ZONE,
  prevention_measures TEXT
);

ALTER TABLE public.damage_reports ENABLE ROW LEVEL SECURITY;

-- maintenance_tickets
CREATE TABLE IF NOT EXISTS public.maintenance_tickets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  gear_id UUID REFERENCES public.gear_items(id) ON DELETE SET NULL,
  rental_id UUID REFERENCES public.rentals(id) ON DELETE SET NULL,
  damage_report_id UUID REFERENCES public.damage_reports(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  date_received TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  problem_description TEXT,
  assigned_technician TEXT,
  estimated_completion_date TIMESTAMP WITH TIME ZONE,
  cost NUMERIC,
  charge_customer BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  staff_assigned_id UUID,
  priority_level TEXT DEFAULT 'normal',
  parts_used TEXT[],
  labor_hours NUMERIC,
  resolution_notes TEXT
);

ALTER TABLE public.maintenance_tickets ENABLE ROW LEVEL SECURITY;

-- maintenance_work_logs
CREATE TABLE IF NOT EXISTS public.maintenance_work_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ticket_id UUID NOT NULL REFERENCES public.maintenance_tickets(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.maintenance_work_logs ENABLE ROW LEVEL SECURITY;

-- maintenance_parts
CREATE TABLE IF NOT EXISTS public.maintenance_parts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ticket_id UUID NOT NULL REFERENCES public.maintenance_tickets(id) ON DELETE CASCADE,
  part_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_cost NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.maintenance_parts ENABLE ROW LEVEL SECURITY;

-- payments
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  method TEXT,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;