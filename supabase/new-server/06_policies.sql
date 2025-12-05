-- 06_policies.sql
-- RLS policies. This includes dev-all permissive policies and user-scoped ones.
-- NOTE: This is development-grade. Review before using in production.

-- Ensure RLS on all relevant tables (double-check even if already enabled)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gear_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gear_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gear_subcategories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.category_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rentals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rental_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.damage_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_work_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

-- User-scoped data access (authenticated users can only access their own rows)
CREATE POLICY "profiles_select_policy" ON public.profiles
FOR SELECT TO authenticated USING (auth.uid() = id);

CREATE POLICY "profiles_insert_policy" ON public.profiles
FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_policy" ON public.profiles
FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE POLICY "profiles_delete_policy" ON public.profiles
FOR DELETE TO authenticated USING (auth.uid() = id);

-- Manager/Owner elevated access for profiles
CREATE POLICY "profiles_select_manager_owner" ON public.profiles
FOR SELECT TO authenticated USING (
  (auth.uid() = id) OR EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('manager','owner')
  )
);

CREATE POLICY "profiles_update_manager_owner" ON public.profiles
FOR UPDATE TO authenticated USING (
  (auth.uid() = id) OR EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('manager','owner')
  )
)
WITH CHECK (
  (auth.uid() = id) OR EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('manager','owner')
  )
);

-- customers
CREATE POLICY "customers_select" ON public.customers
FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "customers_insert" ON public.customers
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "customers_update" ON public.customers
FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "customers_delete" ON public.customers
FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- gear_items
CREATE POLICY "gear_items_select" ON public.gear_items
FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "gear_items_insert" ON public.gear_items
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "gear_items_update" ON public.gear_items
FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "gear_items_delete" ON public.gear_items
FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- gear_categories
CREATE POLICY "gear_categories_select_own" ON public.gear_categories
FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "gear_categories_insert_own" ON public.gear_categories
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "gear_categories_update_own" ON public.gear_categories
FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "gear_categories_delete_own" ON public.gear_categories
FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- gear_subcategories
CREATE POLICY "gear_subcategories_select_own" ON public.gear_subcategories
FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "gear_subcategories_insert_own" ON public.gear_subcategories
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "gear_subcategories_update_own" ON public.gear_subcategories
FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "gear_subcategories_delete_own" ON public.gear_subcategories
FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- rentals
CREATE POLICY "rentals_select" ON public.rentals
FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "rentals_insert" ON public.rentals
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "rentals_update" ON public.rentals
FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "rentals_delete" ON public.rentals
FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- rental_items
CREATE POLICY "rental_items_select" ON public.rental_items
FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "rental_items_insert" ON public.rental_items
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "rental_items_update" ON public.rental_items
FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "rental_items_delete" ON public.rental_items
FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- payments
CREATE POLICY "payments_select" ON public.payments
FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "payments_insert" ON public.payments
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "payments_update" ON public.payments
FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "payments_delete" ON public.payments
FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- service_settings
CREATE POLICY "service_settings_select" ON public.service_settings
FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "service_settings_insert" ON public.service_settings
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "service_settings_update" ON public.service_settings
FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "service_settings_delete" ON public.service_settings
FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- category_pricing
CREATE POLICY "category_pricing_select" ON public.category_pricing
FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "category_pricing_insert" ON public.category_pricing
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "category_pricing_update" ON public.category_pricing
FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "category_pricing_delete" ON public.category_pricing
FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- company_settings (owner-only writes)
CREATE POLICY "company_settings_select" ON public.company_settings
FOR SELECT USING (true);

CREATE POLICY "company_settings_insert_owner" ON public.company_settings
FOR INSERT TO authenticated WITH CHECK (EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'owner'
));

CREATE POLICY "company_settings_update_owner" ON public.company_settings
FOR UPDATE TO authenticated USING (EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'owner'
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'owner'
));

CREATE POLICY "company_settings_delete_owner" ON public.company_settings
FOR DELETE TO authenticated USING (EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'owner'
));

-- damage_reports (user must own report and it must be tied to their rental_item)
CREATE POLICY "damage_reports_select" ON public.damage_reports
FOR SELECT TO authenticated USING (
  (auth.uid() = user_id) AND EXISTS (
    SELECT 1
    FROM public.rental_items
    WHERE rental_items.id = damage_reports.rental_item_id
      AND rental_items.user_id = auth.uid()
  )
);

CREATE POLICY "damage_reports_insert" ON public.damage_reports
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "damage_reports_update" ON public.damage_reports
FOR UPDATE TO authenticated USING (
  (auth.uid() = user_id) AND EXISTS (
    SELECT 1
    FROM public.rental_items
    WHERE rental_items.id = damage_reports.rental_item_id
      AND rental_items.user_id = auth.uid()
  )
);

CREATE POLICY "damage_reports_delete" ON public.damage_reports
FOR DELETE TO authenticated USING (
  (auth.uid() = user_id) AND EXISTS (
    SELECT 1
    FROM public.rental_items
    WHERE rental_items.id = damage_reports.rental_item_id
      AND rental_items.user_id = auth.uid()
  )
);

-- maintenance_tickets
CREATE POLICY "maintenance_tickets_select" ON public.maintenance_tickets
FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "maintenance_tickets_insert" ON public.maintenance_tickets
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "maintenance_tickets_update" ON public.maintenance_tickets
FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "maintenance_tickets_delete" ON public.maintenance_tickets
FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- maintenance_work_logs
CREATE POLICY "maintenance_work_logs_select" ON public.maintenance_work_logs
FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "maintenance_work_logs_insert" ON public.maintenance_work_logs
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "maintenance_work_logs_update" ON public.maintenance_work_logs
FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "maintenance_work_logs_delete" ON public.maintenance_work_logs
FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- maintenance_parts
CREATE POLICY "maintenance_parts_select" ON public.maintenance_parts
FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "maintenance_parts_insert" ON public.maintenance_parts
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "maintenance_parts_update" ON public.maintenance_parts
FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "maintenance_parts_delete" ON public.maintenance_parts
FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Dev-all permissive policies (broad allowances for development)
-- If you already have dev_all_* policies, these mirror that behavior.
CREATE POLICY "dev_all_select_profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "dev_all_insert_profiles" ON public.profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "dev_all_update_profiles" ON public.profiles FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "dev_all_delete_profiles" ON public.profiles FOR DELETE USING (true);

CREATE POLICY "dev_all_select_gear_items" ON public.gear_items FOR SELECT USING (true);
CREATE POLICY "dev_all_insert_gear_items" ON public.gear_items FOR INSERT WITH CHECK (true);
CREATE POLICY "dev_all_update_gear_items" ON public.gear_items FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "dev_all_delete_gear_items" ON public.gear_items FOR DELETE USING (true);

CREATE POLICY "dev_all_select_gear_categories" ON public.gear_categories FOR SELECT USING (true);
CREATE POLICY "dev_all_insert_gear_categories" ON public.gear_categories FOR INSERT WITH CHECK (true);
CREATE POLICY "dev_all_update_gear_categories" ON public.gear_categories FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "dev_all_delete_gear_categories" ON public.gear_categories FOR DELETE USING (true);

CREATE POLICY "dev_all_select_gear_subcategories" ON public.gear_subcategories FOR SELECT USING (true);
CREATE POLICY "dev_all_insert_gear_subcategories" ON public.gear_subcategories FOR INSERT WITH CHECK (true);
CREATE POLICY "dev_all_update_gear_subcategories" ON public.gear_subcategories FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "dev_all_delete_gear_subcategories" ON public.gear_subcategories FOR DELETE USING (true);

CREATE POLICY "dev_all_select_customers" ON public.customers FOR SELECT USING (true);
CREATE POLICY "dev_all_insert_customers" ON public.customers FOR INSERT WITH CHECK (true);
CREATE POLICY "dev_all_update_customers" ON public.customers FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "dev_all_delete_customers" ON public.customers FOR DELETE USING (true);

CREATE POLICY "dev_all_select_rentals" ON public.rentals FOR SELECT USING (true);
CREATE POLICY "dev_all_insert_rentals" ON public.rentals FOR INSERT WITH CHECK (true);
CREATE POLICY "dev_all_update_rentals" ON public.rentals FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "dev_all_delete_rentals" ON public.rentals FOR DELETE USING (true);

CREATE POLICY "dev_all_select_rental_items" ON public.rental_items FOR SELECT USING (true);
CREATE POLICY "dev_all_insert_rental_items" ON public.rental_items FOR INSERT WITH CHECK (true);
CREATE POLICY "dev_all_update_rental_items" ON public.rental_items FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "dev_all_delete_rental_items" ON public.rental_items FOR DELETE USING (true);

CREATE POLICY "dev_all_select_payments" ON public.payments FOR SELECT USING (true);
CREATE POLICY "dev_all_insert_payments" ON public.payments FOR INSERT WITH CHECK (true);
CREATE POLICY "dev_all_update_payments" ON public.payments FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "dev_all_delete_payments" ON public.payments FOR DELETE USING (true);

CREATE POLICY "dev_all_select_category_pricing" ON public.category_pricing FOR SELECT USING (true);
CREATE POLICY "dev_all_insert_category_pricing" ON public.category_pricing FOR INSERT WITH CHECK (true);
CREATE POLICY "dev_all_update_category_pricing" ON public.category_pricing FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "dev_all_delete_category_pricing" ON public.category_pricing FOR DELETE USING (true);

CREATE POLICY "dev_all_select_service_settings" ON public.service_settings FOR SELECT USING (true);
CREATE POLICY "dev_all_insert_service_settings" ON public.service_settings FOR INSERT WITH CHECK (true);
CREATE POLICY "dev_all_update_service_settings" ON public.service_settings FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "dev_all_delete_service_settings" ON public.service_settings FOR DELETE USING (true);

CREATE POLICY "dev_all_select_maintenance_tickets" ON public.maintenance_tickets FOR SELECT USING (true);
CREATE POLICY "dev_all_insert_maintenance_tickets" ON public.maintenance_tickets FOR INSERT WITH CHECK (true);
CREATE POLICY "dev_all_update_maintenance_tickets" ON public.maintenance_tickets FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "dev_all_delete_maintenance_tickets" ON public.maintenance_tickets FOR DELETE USING (true);

CREATE POLICY "dev_all_select_maintenance_work_logs" ON public.maintenance_work_logs FOR SELECT USING (true);
CREATE POLICY "dev_all_insert_maintenance_work_logs" ON public.maintenance_work_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "dev_all_update_maintenance_work_logs" ON public.maintenance_work_logs FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "dev_all_delete_maintenance_work_logs" ON public.maintenance_work_logs FOR DELETE USING (true);

CREATE POLICY "dev_all_select_maintenance_parts" ON public.maintenance_parts FOR SELECT USING (true);
CREATE POLICY "dev_all_insert_maintenance_parts" ON public.maintenance_parts FOR INSERT WITH CHECK (true);
CREATE POLICY "dev_all_update_maintenance_parts" ON public.maintenance_parts FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "dev_all_delete_maintenance_parts" ON public.maintenance_parts FOR DELETE USING (true);

-- Optional: Allow-all policies mirroring dev-all (keep in dev only)
CREATE POLICY "allow_all_profiles_select" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "allow_all_profiles_insert" ON public.profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "allow_all_profiles_update" ON public.profiles FOR UPDATE USING (true);
CREATE POLICY "allow_all_profiles_delete" ON public.profiles FOR DELETE USING (true);