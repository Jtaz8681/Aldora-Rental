-- =============================================
-- 1. EXTENSIONS
-- =============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- 2. ENUM TYPES
-- =============================================
CREATE TYPE public.user_role AS ENUM ('owner', 'manager', 'dev', 'technician', 'staff');
CREATE TYPE public.rental_status AS ENUM ('draft', 'active', 'checked-out', 'returned', 'overdue');
CREATE TYPE public.gear_status AS ENUM ('Available', 'Checked-Out', 'Overdue', 'In Maintenance', 'Quarantined', 'Retired');
CREATE TYPE public.ticket_status AS ENUM ('pending', 'in_progress', 'completed', 'on_hold', 'cancelled');
CREATE TYPE public.damage_severity AS ENUM ('Cosmetic', 'Functional', 'Critical');

-- =============================================
-- 3. TABLES
-- =============================================

-- profiles table (extends auth.users)
CREATE TABLE public.profiles (
    id uuid NOT NULL,
    updated_at timestamp with time zone NULL,
    first_name text NULL,
    last_name text NULL,
    role public.user_role NOT NULL DEFAULT 'staff'::public.user_role,
    CONSTRAINT profiles_pkey PRIMARY KEY (id),
    CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- gear_categories table
CREATE TABLE public.gear_categories (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL,
    created_at timestamp with time zone NULL DEFAULT now(),
    updated_at timestamp with time zone NULL,
    name text NOT NULL,
    service_interval_months integer NULL,
    usage_service_threshold integer NULL,
    checklist_template_pre jsonb NULL,
    checklist_template_post jsonb NULL,
    CONSTRAINT gear_categories_pkey PRIMARY KEY (id),
    CONSTRAINT gear_categories_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- gear_subcategories table
CREATE TABLE public.gear_subcategories (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL,
    created_at timestamp with time zone NULL DEFAULT now(),
    updated_at timestamp with time zone NULL,
    category_id uuid NOT NULL,
    name text NOT NULL,
    service_interval_months integer NULL,
    usage_service_threshold integer NULL,
    CONSTRAINT gear_subcategories_pkey PRIMARY KEY (id),
    CONSTRAINT gear_subcategories_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.gear_categories(id) ON DELETE CASCADE,
    CONSTRAINT gear_subcategories_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- gear_items table
CREATE TABLE public.gear_items (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL,
    created_at timestamp with time zone NULL DEFAULT now(),
    updated_at timestamp with time zone NULL,
    internal_id text NOT NULL,
    friendly_name text NULL,
    category text NOT NULL,
    sub_type text NULL,
    brand text NULL,
    model text NULL,
    size text NULL,
    serial_number text NULL,
    home_location text NULL,
    status public.gear_status NOT NULL DEFAULT 'Available'::public.gear_status,
    rental_price numeric NULL,
    manual_url text NULL,
    photos text[] NULL,
    category_id uuid NULL,
    subcategory_id uuid NULL,
    service_interval_months integer NULL,
    checklist_template_pre jsonb NULL,
    checklist_template_post jsonb NULL,
    CONSTRAINT gear_items_pkey PRIMARY KEY (id),
    CONSTRAINT gear_items_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
    CONSTRAINT gear_items_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.gear_categories(id) ON DELETE SET NULL,
    CONSTRAINT gear_items_subcategory_id_fkey FOREIGN KEY (subcategory_id) REFERENCES public.gear_subcategories(id) ON DELETE SET NULL
);

-- customers table
CREATE TABLE public.customers (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL,
    created_at timestamp with time zone NULL DEFAULT now(),
    updated_at timestamp with time zone NULL,
    name text NOT NULL,
    phone text NULL,
    email text NULL,
    balance_due numeric NULL DEFAULT 0,
    CONSTRAINT customers_pkey PRIMARY KEY (id),
    CONSTRAINT customers_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- rentals table
CREATE TABLE public.rentals (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL,
    created_at timestamp with time zone NULL DEFAULT now(),
    updated_at timestamp with time zone NULL,
    customer_id uuid NOT NULL,
    start_at timestamp with time zone NOT NULL,
    expected_end_at timestamp with time zone NOT NULL,
    signed_at timestamp with time zone NULL,
    signature_data_url text NULL,
    total_cost numeric NULL,
    status public.rental_status NOT NULL DEFAULT 'draft'::public.rental_status,
    CONSTRAINT rentals_pkey PRIMARY KEY (id),
    CONSTRAINT rentals_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE CASCADE,
    CONSTRAINT rentals_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- rental_items table (junction table)
CREATE TABLE public.rental_items (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL,
    created_at timestamp with time zone NULL DEFAULT now(),
    updated_at timestamp with time zone NULL,
    rental_id uuid NOT NULL,
    gear_id uuid NOT NULL,
    price numeric NOT NULL,
    pre_checklist jsonb NULL,
    post_checklist jsonb NULL,
    inspected_by text NULL,
    inspected_at timestamp with time zone NULL,
    package_share_total numeric NULL,
    CONSTRAINT rental_items_pkey PRIMARY KEY (id),
    CONSTRAINT rental_items_gear_id_fkey FOREIGN KEY (gear_id) REFERENCES public.gear_items(id) ON DELETE CASCADE,
    CONSTRAINT rental_items_rental_id_fkey FOREIGN KEY (rental_id) REFERENCES public.rentals(id) ON DELETE CASCADE,
    CONSTRAINT rental_items_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- damage_reports table
CREATE TABLE public.damage_reports (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL,
    created_at timestamp with time zone NULL DEFAULT now(),
    updated_at timestamp with time zone NULL,
    rental_id uuid NULL,
    gear_id uuid NOT NULL,
    rental_item_id uuid NULL,
    damage_type text NULL,
    severity public.damage_severity NOT NULL DEFAULT 'Functional'::public.damage_severity,
    photos text[] NULL,
    notes text NULL,
    estimate_cost numeric NULL,
    CONSTRAINT damage_reports_pkey PRIMARY KEY (id),
    CONSTRAINT damage_reports_gear_id_fkey FOREIGN KEY (gear_id) REFERENCES public.gear_items(id) ON DELETE CASCADE,
    CONSTRAINT damage_reports_rental_id_fkey FOREIGN KEY (rental_id) REFERENCES public.rentals(id) ON DELETE CASCADE,
    CONSTRAINT damage_reports_rental_item_id_fkey FOREIGN KEY (rental_item_id) REFERENCES public.rental_items(id) ON DELETE CASCADE,
    CONSTRAINT damage_reports_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- maintenance_tickets table
CREATE TABLE public.maintenance_tickets (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL,
    created_at timestamp with time zone NULL DEFAULT now(),
    updated_at timestamp with time zone NULL,
    gear_id uuid NULL,
    rental_id uuid NULL,
    damage_report_id uuid NULL,
    problem_description text NULL,
    status public.ticket_status NOT NULL DEFAULT 'pending'::public.ticket_status,
    cost numeric NULL,
    charge_customer boolean NOT NULL DEFAULT false,
    date_received timestamp with time zone NULL,
    date_completed timestamp with time zone NULL,
    CONSTRAINT maintenance_tickets_pkey PRIMARY KEY (id),
    CONSTRAINT maintenance_tickets_damage_report_id_fkey FOREIGN KEY (damage_report_id) REFERENCES public.damage_reports(id) ON DELETE CASCADE,
    CONSTRAINT maintenance_tickets_gear_id_fkey FOREIGN KEY (gear_id) REFERENCES public.gear_items(id) ON DELETE CASCADE,
    CONSTRAINT maintenance_tickets_rental_id_fkey FOREIGN KEY (rental_id) REFERENCES public.rentals(id) ON DELETE CASCADE,
    CONSTRAINT maintenance_tickets_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- service_settings table (singleton-like)
CREATE TABLE public.service_settings (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL,
    created_at timestamp with time zone NULL DEFAULT now(),
    updated_at timestamp with time zone NULL,
    late_fee_per_day numeric NULL,
    regulator_service_interval_months integer NULL,
    bcd_service_interval_months integer NULL,
    CONSTRAINT service_settings_pkey PRIMARY KEY (id),
    CONSTRAINT service_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- company_settings table (singleton-like)
CREATE TABLE public.company_settings (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    created_at timestamp with time zone NULL DEFAULT now(),
    updated_at timestamp with time zone NULL,
    name text NULL,
    logo_url text NULL,
    CONSTRAINT company_settings_pkey PRIMARY KEY (id)
);

-- category_pricing table
CREATE TABLE public.category_pricing (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL,
    created_at timestamp with time zone NULL DEFAULT now(),
    updated_at timestamp with time zone NULL,
    category text NOT NULL,
    price numeric NOT NULL,
    CONSTRAINT category_pricing_pkey PRIMARY KEY (id),
    CONSTRAINT category_pricing_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- =============================================
-- 4. INDEXES
-- =============================================
CREATE INDEX idx_profiles_user_id ON public.profiles USING btree (id);
CREATE INDEX idx_gear_categories_user_id ON public.gear_categories USING btree (user_id);
CREATE INDEX idx_gear_subcategories_user_id ON public.gear_subcategories USING btree (user_id);
CREATE INDEX idx_gear_items_user_id ON public.gear_items USING btree (user_id);
CREATE INDEX idx_gear_items_status ON public.gear_items USING btree (status);
CREATE INDEX idx_gear_items_internal_id ON public.gear_items USING btree (internal_id);
CREATE INDEX idx_customers_user_id ON public.customers USING btree (user_id);
CREATE INDEX idx_rentals_user_id ON public.rentals USING btree (user_id);
CREATE INDEX idx_rentals_customer_id ON public.rentals USING btree (customer_id);
CREATE INDEX idx_rentals_status ON public.rentals USING btree (status);
CREATE INDEX idx_rental_items_user_id ON public.rental_items USING btree (user_id);
CREATE INDEX idx_rental_items_rental_id ON public.rental_items USING btree (rental_id);
CREATE INDEX idx_rental_items_gear_id ON public.rental_items USING btree (gear_id);
CREATE INDEX idx_damage_reports_user_id ON public.damage_reports USING btree (user_id);
CREATE INDEX idx_damage_reports_gear_id ON public.damage_reports USING btree (gear_id);
CREATE INDEX idx_maintenance_tickets_user_id ON public.maintenance_tickets USING btree (user_id);
CREATE INDEX idx_maintenance_tickets_gear_id ON public.maintenance_tickets USING btree (gear_id);
CREATE INDEX idx_service_settings_user_id ON public.service_settings USING btree (user_id);
CREATE INDEX idx_category_pricing_user_id ON public.category_pricing USING btree (user_id);


-- =============================================
-- 5. ROW LEVEL SECURITY (RLS)
-- =============================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gear_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gear_subcategories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gear_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rentals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rental_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.damage_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.category_pricing ENABLE ROW LEVEL SECURITY;


-- =============================================
-- 6. RLS POLICIES
-- =============================================

-- Profiles Policies
CREATE POLICY "Users can view their own profile." ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile." ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert their own profile." ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Gear Categories Policies
CREATE POLICY "Users can view their own gear categories." ON public.gear_categories FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own gear categories." ON public.gear_categories FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own gear categories." ON public.gear_categories FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own gear categories." ON public.gear_categories FOR DELETE USING (auth.uid() = user_id);

-- Gear Subcategories Policies
CREATE POLICY "Users can view their own gear subcategories." ON public.gear_subcategories FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own gear subcategories." ON public.gear_subcategories FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own gear subcategories." ON public.gear_subcategories FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own gear subcategories." ON public.gear_subcategories FOR DELETE USING (auth.uid() = user_id);

-- Gear Items Policies
CREATE POLICY "Users can view their own gear items." ON public.gear_items FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own gear items." ON public.gear_items FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own gear items." ON public.gear_items FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own gear items." ON public.gear_items FOR DELETE USING (auth.uid() = user_id);

-- Customers Policies
CREATE POLICY "Users can view their own customers." ON public.customers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own customers." ON public.customers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own customers." ON public.customers FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own customers." ON public.customers FOR DELETE USING (auth.uid() = user_id);

-- Rentals Policies
CREATE POLICY "Users can view their own rentals." ON public.rentals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own rentals." ON public.rentals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own rentals." ON public.rentals FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own rentals." ON public.rentals FOR DELETE USING (auth.uid() = user_id);

-- Rental Items Policies
CREATE POLICY "Users can view their own rental items." ON public.rental_items FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own rental items." ON public.rental_items FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own rental items." ON public.rental_items FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own rental items." ON public.rental_items FOR DELETE USING (auth.uid() = user_id);

-- Damage Reports Policies
CREATE POLICY "Users can view their own damage reports." ON public.damage_reports FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own damage reports." ON public.damage_reports FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own damage reports." ON public.damage_reports FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own damage reports." ON public.damage_reports FOR DELETE USING (auth.uid() = user_id);

-- Maintenance Tickets Policies
CREATE POLICY "Users can view their own maintenance tickets." ON public.maintenance_tickets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own maintenance tickets." ON public.maintenance_tickets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own maintenance tickets." ON public.maintenance_tickets FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own maintenance tickets." ON public.maintenance_tickets FOR DELETE USING (auth.uid() = user_id);

-- Service Settings Policies
CREATE POLICY "Users can view their own service settings." ON public.service_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own service settings." ON public.service_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own service settings." ON public.service_settings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own service settings." ON public.service_settings FOR DELETE USING (auth.uid() = user_id);

-- Company Settings Policies (Owner only)
CREATE POLICY "Allow full access to owners." ON public.company_settings FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'owner'
    )
);

-- Category Pricing Policies
CREATE POLICY "Users can view their own category pricing." ON public.category_pricing FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own category pricing." ON public.category_pricing FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own category pricing." ON public.category_pricing FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own category pricing." ON public.category_pricing FOR DELETE USING (auth.uid() = user_id);


-- =============================================
-- 7. TRIGGERS and FUNCTIONS
-- =============================================

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, first_name, last_name, role)
    VALUES (
        NEW.id,
        NEW.raw_user_meta_data->>'first_name',
        NEW.raw_user_meta_data->>'last_name',
        COALESCE(NEW.raw_user_meta_data->>'role', 'staff')::public.user_role
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call handle_new_user function after a new user is created
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Function to increment customer balance
CREATE OR REPLACE FUNCTION public.increment_customer_balance(p_user_id uuid, p_customer_id uuid, p_amount numeric)
RETURNS void AS $$
BEGIN
    UPDATE public.customers
    SET balance_due = balance_due + p_amount
    WHERE id = p_customer_id AND user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get the current user's role
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS public.user_role AS $$
DECLARE
    user_role public.user_role;
BEGIN
    SELECT role INTO user_role FROM public.profiles WHERE id = auth.uid();
    RETURN user_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to list profiles with email (for admin users)
CREATE OR REPLACE FUNCTION public.list_profiles_with_email()
RETURNS TABLE (
    id uuid,
    first_name text,
    last_name text,
    role public.user_role,
    email text
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.id,
        p.first_name,
        p.last_name,
        p.role,
        u.email
    FROM
        public.profiles p
    JOIN
        auth.users u ON p.id = u.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;