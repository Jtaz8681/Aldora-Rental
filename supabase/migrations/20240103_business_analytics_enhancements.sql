-- =============================================
-- BUSINESS ANALYTICS ENHANCEMENTS MIGRATION
-- =============================================

-- =============================================
-- 1. NEW COLUMNS FOR EXISTING TABLES
-- =============================================

-- Add purchase and cost tracking to gear_items
ALTER TABLE public.gear_items 
ADD COLUMN purchase_date timestamp with time zone NULL,
ADD COLUMN purchase_cost numeric NULL,
ADD COLUMN current_value numeric NULL,
ADD COLUMN depreciation_rate numeric NULL DEFAULT 0.1,
ADD COLUMN supplier text NULL,
ADD COLUMN warranty_expiry timestamp with time zone NULL;

-- Add financial tracking to rentals
ALTER TABLE public.rentals 
ADD COLUMN actual_return_date timestamp with time zone NULL,
ADD COLUMN late_fee_amount numeric NULL DEFAULT 0,
ADD COLUMN late_fee_collected numeric NULL DEFAULT 0,
ADD COLUMN discount_amount numeric NULL DEFAULT 0,
ADD COLUMN payment_method text NULL,
ADD COLUMN staff_assigned_id uuid NULL,
ADD COLUMN created_by_staff_id uuid NULL;

-- Add customer acquisition and segmentation data
ALTER TABLE public.customers 
ADD COLUMN acquisition_source text NULL,
ADD COLUMN first_rental_date timestamp with time zone NULL,
ADD COLUMN last_rental_date timestamp with time zone NULL,
ADD COLUMN total_rentals_count integer NULL DEFAULT 0,
ADD COLUMN total_revenue_generated numeric NULL DEFAULT 0,
ADD COLUMN customer_segment text NULL DEFAULT 'occasional',
ADD COLUMN customer_since timestamp with time zone NULL,
ADD COLUMN address text NULL,
ADD COLUMN city text NULL,
ADD COLUMN state text NULL,
ADD COLUMN zip_code text NULL,
ADD COLUMN country text NULL DEFAULT 'USA';

-- Add operational tracking to maintenance tickets
ALTER TABLE public.maintenance_tickets 
ADD COLUMN staff_assigned_id uuid NULL,
ADD COLUMN priority_level text NULL DEFAULT 'normal',
ADD COLUMN estimated_completion_date timestamp with time zone NULL,
ADD COLUMN parts_used text[] NULL,
ADD COLUMN labor_hours numeric NULL,
ADD COLUMN resolution_notes text NULL;

-- Add cost tracking to damage_reports
ALTER TABLE public.damage_reports 
ADD COLUMN actual_cost numeric NULL,
ADD COLUMN insurance_claim_id text NULL,
ADD COLUMN resolved_at timestamp with time zone NULL,
ADD COLUMN prevention_measures text NULL;

-- =============================================
-- 2. NEW ANALYTICS TABLES
-- =============================================

-- Revenue analytics table for time-series data
CREATE TABLE public.revenue_analytics (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL,
    created_at timestamp with time zone NULL DEFAULT now(),
    date date NOT NULL,
    rental_revenue numeric NULL DEFAULT 0,
    late_fee_revenue numeric NULL DEFAULT 0,
    maintenance_costs numeric NULL DEFAULT 0,
    damage_costs numeric NULL DEFAULT 0,
    total_revenue numeric NULL DEFAULT 0,
    net_profit numeric NULL DEFAULT 0,
    active_rentals_count integer NULL DEFAULT 0,
    new_customers_count integer NULL DEFAULT 0,
    total_customers_count integer NULL DEFAULT 0,
    CONSTRAINT revenue_analytics_pkey PRIMARY KEY (id),
    CONSTRAINT revenue_analytics_date_user UNIQUE (date, user_id),
    CONSTRAINT revenue_analytics_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Customer behavior analytics
CREATE TABLE public.customer_analytics (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL,
    customer_id uuid NOT NULL,
    created_at timestamp with time zone NULL DEFAULT now(),
    updated_at timestamp with time zone NULL,
    rental_frequency numeric NULL DEFAULT 0, -- rentals per month
    average_rental_duration numeric NULL DEFAULT 0, -- days
    average_rental_value numeric NULL DEFAULT 0,
    total_rental_days numeric NULL DEFAULT 0,
    total_revenue numeric NULL DEFAULT 0,
    last_activity_date timestamp with time zone NULL,
    churn_risk_score numeric NULL DEFAULT 0,
    loyalty_score numeric NULL DEFAULT 0,
    preferred_categories text[] NULL,
    seasonal_pattern text NULL,
    CONSTRAINT customer_analytics_pkey PRIMARY KEY (id),
    CONSTRAINT customer_analytics_customer_user UNIQUE (customer_id, user_id),
    CONSTRAINT customer_analytics_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
    CONSTRAINT customer_analytics_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE CASCADE
);

-- Gear performance analytics
CREATE TABLE public.gear_performance (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL,
    gear_id uuid NOT NULL,
    created_at timestamp with time zone NULL DEFAULT now(),
    updated_at timestamp with time zone NULL,
    total_rental_days numeric NULL DEFAULT 0,
    total_revenue numeric NULL DEFAULT 0,
    total_maintenance_cost numeric NULL DEFAULT 0,
    total_damage_cost numeric NULL DEFAULT 0,
    utilization_rate numeric NULL DEFAULT 0, -- percentage
    roi numeric NULL DEFAULT 0, -- return on investment
    days_since_last_rental integer NULL DEFAULT 0,
    average_rental_duration numeric NULL DEFAULT 0,
    break_even_date timestamp with time zone NULL,
    performance_score numeric NULL DEFAULT 0,
    demand_forecast numeric NULL DEFAULT 0,
    CONSTRAINT gear_performance_pkey PRIMARY KEY (id),
    CONSTRAINT gear_performance_gear_user UNIQUE (gear_id, user_id),
    CONSTRAINT gear_performance_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
    CONSTRAINT gear_performance_gear_id_fkey FOREIGN KEY (gear_id) REFERENCES public.gear_items(id) ON DELETE CASCADE
);

-- Staff performance analytics
CREATE TABLE public.staff_performance (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL,
    staff_id uuid NOT NULL,
    date date NOT NULL,
    created_at timestamp with time zone NULL DEFAULT now(),
    rentals_processed integer NULL DEFAULT 0,
    revenue_generated numeric NULL DEFAULT 0,
    maintenance_tickets_completed integer NULL DEFAULT 0,
    customer_interactions integer NULL DEFAULT 0,
    average_processing_time numeric NULL DEFAULT 0, -- minutes
    customer_satisfaction_score numeric NULL DEFAULT 0,
    upsells_completed integer NULL DEFAULT 0,
    CONSTRAINT staff_performance_pkey PRIMARY KEY (id),
    CONSTRAINT staff_performance_staff_date_user UNIQUE (staff_id, date, user_id),
    CONSTRAINT staff_performance_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
    CONSTRAINT staff_performance_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- Business metrics snapshots
CREATE TABLE public.business_metrics (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL,
    date date NOT NULL,
    created_at timestamp with time zone NULL DEFAULT now(),
    total_gear_value numeric NULL DEFAULT 0,
    total_gear_depreciation numeric NULL DEFAULT 0,
    customer_retention_rate numeric NULL DEFAULT 0,
    customer_acquisition_cost numeric NULL DEFAULT 0,
    average_order_value numeric NULL DEFAULT 0,
    inventory_turnover_rate numeric NULL DEFAULT 0,
    gross_profit_margin numeric NULL DEFAULT 0,
    net_profit_margin numeric NULL DEFAULT 0,
    cash_flow numeric NULL DEFAULT 0,
    working_capital numeric NULL DEFAULT 0,
    CONSTRAINT business_metrics_pkey PRIMARY KEY (id),
    CONSTRAINT business_metrics_date_user UNIQUE (date, user_id),
    CONSTRAINT business_metrics_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- =============================================
-- 3. INDEXES FOR PERFORMANCE
-- =============================================

-- Revenue analytics indexes
CREATE INDEX idx_revenue_analytics_user_date ON public.revenue_analytics USING btree (user_id, date);
CREATE INDEX idx_revenue_analytics_date ON public.revenue_analytics USING btree (date);

-- Customer analytics indexes
CREATE INDEX idx_customer_analytics_user_customer ON public.customer_analytics USING btree (user_id, customer_id);
CREATE INDEX idx_customer_analytics_churn_risk ON public.customer_analytics USING btree (churn_risk_score);
CREATE INDEX idx_customer_analytics_loyalty ON public.customer_analytics USING btree (loyalty_score);

-- Gear performance indexes
CREATE INDEX idx_gear_performance_user_gear ON public.gear_performance USING btree (user_id, gear_id);
CREATE INDEX idx_gear_performance_utilization ON public.gear_performance USING btree (utilization_rate);
CREATE INDEX idx_gear_performance_roi ON public.gear_performance USING btree (roi);

-- Staff performance indexes
CREATE INDEX idx_staff_performance_user_staff_date ON public.staff_performance USING btree (user_id, staff_id, date);
CREATE INDEX idx_staff_performance_date ON public.staff_performance USING btree (date);

-- Business metrics indexes
CREATE INDEX idx_business_metrics_user_date ON public.business_metrics USING btree (user_id, date);

-- Enhanced indexes for existing tables
CREATE INDEX idx_rentals_actual_return_date ON public.rentals USING btree (actual_return_date);
CREATE INDEX idx_rentals_staff_assigned ON public.rentals USING btree (staff_assigned_id);
CREATE INDEX idx_customers_acquisition_source ON public.customers USING btree (acquisition_source);
CREATE INDEX idx_customers_segment ON public.customers USING btree (customer_segment);
CREATE INDEX idx_gear_items_purchase_date ON public.gear_items USING btree (purchase_date);
CREATE INDEX idx_gear_items_purchase_cost ON public.gear_items USING btree (purchase_cost);
CREATE INDEX idx_maintenance_tickets_staff_assigned ON public.maintenance_tickets USING btree (staff_assigned_id);
CREATE INDEX idx_maintenance_tickets_priority ON public.maintenance_tickets USING btree (priority_level);

-- =============================================
-- 4. ROW LEVEL SECURITY (RLS)
-- =============================================

-- Enable RLS on new tables
ALTER TABLE public.revenue_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gear_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for new tables
CREATE POLICY "Users can view their own revenue analytics." ON public.revenue_analytics FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own revenue analytics." ON public.revenue_analytics FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own revenue analytics." ON public.revenue_analytics FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own revenue analytics." ON public.revenue_analytics FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own customer analytics." ON public.customer_analytics FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own customer analytics." ON public.customer_analytics FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own customer analytics." ON public.customer_analytics FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own customer analytics." ON public.customer_analytics FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own gear performance." ON public.gear_performance FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own gear performance." ON public.gear_performance FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own gear performance." ON public.gear_performance FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own gear performance." ON public.gear_performance FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own staff performance." ON public.staff_performance FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own staff performance." ON public.staff_performance FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own staff performance." ON public.staff_performance FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own staff performance." ON public.staff_performance FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own business metrics." ON public.business_metrics FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own business metrics." ON public.business_metrics FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own business metrics." ON public.business_metrics FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own business metrics." ON public.business_metrics FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- 5. FUNCTIONS AND TRIGGERS FOR AUTOMATION
-- =============================================

-- Function to update customer analytics
CREATE OR REPLACE FUNCTION public.update_customer_analytics()
RETURNS TRIGGER AS $$
BEGIN
    -- Update customer rental metrics when rental is created/updated
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        INSERT INTO public.customer_analytics (
            user_id, customer_id, total_rentals_count, total_revenue_generated, 
            last_activity_date, updated_at
        )
        VALUES (
            NEW.user_id, NEW.customer_id, 1, COALESCE(NEW.total_cost, 0), NEW.created_at, NOW()
        )
        ON CONFLICT (customer_id, user_id) 
        DO UPDATE SET 
            total_rentals_count = customer_analytics.total_rentals_count + 1,
            total_revenue_generated = customer_analytics.total_revenue_generated + COALESCE(NEW.total_cost, 0),
            last_activity_date = NEW.created_at,
            updated_at = NOW();
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update gear performance
CREATE OR REPLACE FUNCTION public.update_gear_performance()
RETURNS TRIGGER AS $$
BEGIN
    -- Update gear performance when rental item is created
    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.gear_performance (
            user_id, gear_id, total_revenue, updated_at
        )
        VALUES (
            NEW.user_id, NEW.gear_id, COALESCE(NEW.price, 0), NOW()
        )
        ON CONFLICT (gear_id, user_id) 
        DO UPDATE SET 
            total_revenue = gear_performance.total_revenue + COALESCE(NEW.price, 0),
            updated_at = NOW();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate daily revenue analytics
CREATE OR REPLACE FUNCTION public.calculate_daily_revenue_analytics(target_date date DEFAULT CURRENT_DATE)
RETURNS void AS $$
DECLARE
    user_record RECORD;
    daily_revenue numeric;
    daily_late_fees numeric;
    daily_maintenance_costs numeric;
    daily_damage_costs numeric;
    active_rentals_count integer;
    new_customers_count integer;
    total_customers_count integer;
BEGIN
    FOR user_record IN SELECT DISTINCT user_id FROM public.rentals LOOP
        -- Calculate daily metrics for each user
        SELECT 
            COALESCE(SUM(total_cost), 0) as revenue,
            COALESCE(SUM(late_fee_collected), 0) as late_fees,
            0 as maintenance_costs, -- Will be calculated separately
            0 as damage_costs, -- Will be calculated separately
            COUNT(*) FILTER (WHERE status IN ('active', 'checked-out')) as active_rentals
        INTO daily_revenue, daily_late_fees, daily_maintenance_costs, daily_damage_costs, active_rentals_count
        FROM public.rentals 
        WHERE user_id = user_record.user_id 
        AND DATE(created_at) = target_date;
        
        -- Get customer counts
        SELECT 
            COUNT(*) FILTER (WHERE DATE(created_at) = target_date) as new_customers,
            COUNT(*) as total_customers
        INTO new_customers_count, total_customers_count
        FROM public.customers 
        WHERE user_id = user_record.user_id;
        
        -- Calculate maintenance costs for the day
        SELECT COALESCE(SUM(cost), 0)
        INTO daily_maintenance_costs
        FROM public.maintenance_tickets 
        WHERE user_id = user_record.user_id 
        AND DATE(date_received) = target_date;
        
        -- Calculate damage costs for the day
        SELECT COALESCE(SUM(actual_cost), 0)
        INTO daily_damage_costs
        FROM public.damage_reports 
        WHERE user_id = user_record.user_id 
        AND DATE(created_at) = target_date;
        
        -- Insert or update revenue analytics
        INSERT INTO public.revenue_analytics (
            user_id, date, rental_revenue, late_fee_revenue, maintenance_costs,
            damage_costs, total_revenue, net_profit, active_rentals_count,
            new_customers_count, total_customers_count
        )
        VALUES (
            user_record.user_id, target_date, daily_revenue, daily_late_fees,
            daily_maintenance_costs, daily_damage_costs, 
            daily_revenue + daily_late_fees, 
            (daily_revenue + daily_late_fees) - daily_maintenance_costs - daily_damage_costs,
            active_rentals_count, new_customers_count, total_customers_count
        )
        ON CONFLICT (date, user_id) 
        DO UPDATE SET
            rental_revenue = EXCLUDED.rental_revenue,
            late_fee_revenue = EXCLUDED.late_fee_revenue,
            maintenance_costs = EXCLUDED.maintenance_costs,
            damage_costs = EXCLUDED.damage_costs,
            total_revenue = EXCLUDED.total_revenue,
            net_profit = EXCLUDED.net_profit,
            active_rentals_count = EXCLUDED.active_rentals_count,
            new_customers_count = EXCLUDED.new_customers_count,
            total_customers_count = EXCLUDED.total_customers_count;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers
CREATE TRIGGER update_customer_analytics_trigger
    AFTER INSERT OR UPDATE ON public.rentals
    FOR EACH ROW EXECUTE FUNCTION public.update_customer_analytics();

CREATE TRIGGER update_gear_performance_trigger
    AFTER INSERT ON public.rental_items
    FOR EACH ROW EXECUTE FUNCTION public.update_gear_performance();

-- =============================================
-- 6. VIEWS FOR COMMON ANALYTICS QUERIES
-- =============================================

-- Customer lifetime value view
CREATE OR REPLACE VIEW public.customer_lifetime_value AS
SELECT 
    c.user_id,
    c.id as customer_id,
    c.name,
    c.created_at as customer_since,
    COALESCE(ca.total_revenue, 0) as total_revenue,
    COALESCE(ca.total_rentals_count, 0) as total_rentals,
    COALESCE(ca.average_rental_value, 0) as average_rental_value,
    COALESCE(ca.rental_frequency, 0) as rental_frequency,
    COALESCE(c.balance_due, 0) as current_balance,
    c.customer_segment,
    ca.churn_risk_score,
    ca.loyalty_score
FROM public.customers c
LEFT JOIN public.customer_analytics ca ON c.id = ca.customer_id AND c.user_id = ca.user_id;

-- Gear ROI view
CREATE OR REPLACE VIEW public.gear_roi_analysis AS
SELECT 
    g.user_id,
    g.id as gear_id,
    g.internal_id,
    g.category,
    g.brand,
    g.model,
    g.purchase_cost,
    g.current_value,
    COALESCE(gp.total_revenue, 0) as total_revenue,
    COALESCE(gp.total_maintenance_cost, 0) as total_maintenance_cost,
    COALESCE(gp.total_damage_cost, 0) as total_damage_cost,
    COALESCE(gp.utilization_rate, 0) as utilization_rate,
    CASE 
        WHEN g.purchase_cost > 0 THEN 
            ROUND(((COALESCE(gp.total_revenue, 0) - COALESCE(gp.total_maintenance_cost, 0) - COALESCE(gp.total_damage_cost, 0)) / g.purchase_cost) * 100, 2)
        ELSE 0 
    END as roi_percentage,
    gp.break_even_date,
    g.purchase_date
FROM public.gear_items g
LEFT JOIN public.gear_performance gp ON g.id = gp.gear_id AND g.user_id = gp.user_id;

-- Monthly revenue trends view
CREATE OR REPLACE VIEW public.monthly_revenue_trends AS
SELECT 
    user_id,
    DATE_TRUNC('month', date) as month,
    SUM(rental_revenue) as monthly_rental_revenue,
    SUM(late_fee_revenue) as monthly_late_fee_revenue,
    SUM(maintenance_costs) as monthly_maintenance_costs,
    SUM(damage_costs) as monthly_damage_costs,
    SUM(total_revenue) as monthly_total_revenue,
    SUM(net_profit) as monthly_net_profit,
    AVG(active_rentals_count) as avg_active_rentals
FROM public.revenue_analytics
GROUP BY user_id, DATE_TRUNC('month', date)
ORDER BY month DESC;

-- Staff performance summary view
CREATE OR REPLACE VIEW public.staff_performance_summary AS
SELECT 
    sp.user_id,
    sp.staff_id,
    p.first_name,
    p.last_name,
    p.role,
    SUM(sp.rentals_processed) as total_rentals_processed,
    SUM(sp.revenue_generated) as total_revenue_generated,
    SUM(sp.maintenance_tickets_completed) as total_maintenance_completed,
    AVG(sp.average_processing_time) as avg_processing_time,
    AVG(sp.customer_satisfaction_score) as avg_customer_satisfaction,
    MAX(sp.date) as last_active_date
FROM public.staff_performance sp
JOIN public.profiles p ON sp.staff_id = p.id
GROUP BY sp.user_id, sp.staff_id, p.first_name, p.last_name, p.role;

-- =============================================
-- 7. SAMPLE DATA AND INITIALIZATION
-- =============================================

-- Function to initialize analytics for existing data
CREATE OR REPLACE FUNCTION public.initialize_analytics()
RETURNS void AS $$
BEGIN
    -- Backfill customer analytics
    INSERT INTO public.customer_analytics (user_id, customer_id, total_rentals_count, total_revenue_generated, last_activity_date)
    SELECT 
        r.user_id,
        r.customer_id,
        COUNT(*) as rental_count,
        COALESCE(SUM(r.total_cost), 0) as total_revenue,
        MAX(r.created_at) as last_activity
    FROM public.rentals r
    GROUP BY r.user_id, r.customer_id
    ON CONFLICT (customer_id, user_id) DO NOTHING;
    
    -- Backfill gear performance
    INSERT INTO public.gear_performance (user_id, gear_id, total_revenue)
    SELECT 
        ri.user_id,
        ri.gear_id,
        COALESCE(SUM(ri.price), 0) as total_revenue
    FROM public.rental_items ri
    GROUP BY ri.user_id, ri.gear_id
    ON CONFLICT (gear_id, user_id) DO NOTHING;
    
    -- Calculate revenue analytics for the last 30 days
    FOR i IN 0..29 LOOP
        PERFORM public.calculate_daily_revenue_analytics(CURRENT_DATE - i);
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
