-- =============================================
-- POPULATE ANALYTICS DEMO DATA (90 DAYS)
-- =============================================
-- This file generates realistic dummy data to showcase all analytics features
-- Created: 2025-01-04
-- Purpose: Demonstrate analytics capabilities with meaningful test data

-- =============================================
-- 1. SETUP USERS FOR DEMO
-- =============================================

-- Insert demo users (if not exists)
INSERT INTO public.profiles (id, email, first_name, last_name, role, created_at, updated_at) VALUES
('00000000-0000-0000-0000-000000000001', 'owner@rentaldemo.com', 'John', 'Owner', 'owner', NOW() - INTERVAL '365 days', NOW()),
('00000000-0000-0000-0000-000000000002', 'staff@rentaldemo.com', 'Sarah', 'Staff', 'staff', NOW() - INTERVAL '180 days', NOW()),
('00000000-0000-0000-0000-000000000003', 'manager@rentaldemo.com', 'Mike', 'Manager', 'admin', NOW() - INTERVAL '270 days', NOW())
ON CONFLICT (id) DO NOTHING;

-- =============================================
-- 2. POPULATE GEAR_ITEMS WITH PURCHASE DATA
-- =============================================

-- Insert demo gear items with realistic purchase and depreciation data
INSERT INTO public.gear_items (
    id, user_id, internal_id, category, brand, model, status, 
    purchase_cost, current_value, purchase_date, depreciation_rate,
    supplier, warranty_expiry, date_added
) VALUES
-- High-value construction equipment
('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'EXC-001', 'Excavator', 'Caterpillar', '320D', 'Available', 85000.00, 76500.00, NOW() - INTERVAL '365 days', 0.10, 'Heavy Equipment Co', NOW() + INTERVAL '365 days', NOW() - INTERVAL '365 days'),
('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'EXC-002', 'Excavator', 'Komatsu', 'PC200-8', 'Available', 78000.00, 70200.00, NOW() - INTERVAL '300 days', 0.10, 'Heavy Equipment Co', NOW() + INTERVAL '365 days', NOW() - INTERVAL '300 days'),

-- Medium-value tools
('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'GEN-001', 'Generator', 'Honda', 'EU7000IS', 'Available', 3500.00, 3150.00, NOW() - INTERVAL '180 days', 0.15, 'Power Tools Inc', NOW() + INTERVAL '180 days', NOW() - INTERVAL '180 days'),
('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'GEN-002', 'Generator', 'Generac', 'GP7500E', 'Available', 4200.00, 3780.00, NOW() - INTERVAL '150 days', 0.15, 'Power Tools Inc', NOW() + INTERVAL '180 days', NOW() - INTERVAL '150 days'),

-- Low-value hand tools
('10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'DRILL-001', 'Drill', 'DeWalt', 'DCD991', 'Available', 250.00, 225.00, NOW() - INTERVAL '90 days', 0.20, 'Tool Depot', NOW() + INTERVAL '90 days', NOW() - INTERVAL '90 days'),
('10000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001', 'SAW-001', 'Circular Saw', 'Makita', '5007M', 'Available', 180.00, 162.00, NOW() - INTERVAL '60 days', 0.20, 'Tool Depot', NOW() + INTERVAL '90 days', NOW() - INTERVAL '60 days'),

-- Specialty equipment
('10000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000001', 'LIFT-001', 'Scissor Lift', 'Genie', 'GS-1932', 'Available', 12000.00, 10800.00, NOW() - INTERVAL '240 days', 0.12, 'Aerial Equipment', NOW() + INTERVAL '365 days', NOW() - INTERVAL '240 days'),
('10000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000001', 'COMP-001', 'Air Compressor', 'Ingersoll Rand', '2475F13G', 'Available', 2800.00, 2520.00, NOW() - INTERVAL '120 days', 0.15, 'Industrial Supply', NOW() + INTERVAL '180 days', NOW() - INTERVAL '120 days'),

-- Rental vehicles
('10000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000001', 'VAN-001', 'Cargo Van', 'Ford', 'Transit', 'Available', 35000.00, 31500.00, NOW() - INTERVAL '400 days', 0.15, 'Ford Dealer', NOW() + INTERVAL '365 days', NOW() - INTERVAL '400 days'),
('10000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', 'TRUCK-001', 'Pickup Truck', 'Chevrolet', 'Silverado', 'Available', 42000.00, 37800.00, NOW() - INTERVAL '350 days', 0.12, 'Chevy Dealer', NOW() + INTERVAL '365 days', NOW() - INTERVAL '350 days')
ON CONFLICT (id) DO NOTHING;

-- =============================================
-- 3. POPULATE CUSTOMERS WITH ACQUISITION DATA
-- =============================================

INSERT INTO public.customers (
    id, user_id, name, email, phone, address, city, state, zip_code, country,
    acquisition_source, customer_segment, customer_since, balance_due
) VALUES
-- VIP Customers (high value, frequent renters)
('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Construction Pro Inc', 'contact@constructionpro.com', '555-0101', '123 Main St', 'Chicago', 'IL', '60601', 'USA', 'Referral', 'vip', NOW() - INTERVAL '365 days', 0.00),
('20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Mega Builders LLC', 'rentals@megabuilders.com', '555-0102', '456 Oak Ave', 'Chicago', 'IL', '60602', 'USA', 'Website', 'vip', NOW() - INTERVAL '300 days', 250.00),

-- Regular Customers (consistent business)
('20000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'Home Repair Services', 'tools@homerepair.com', '555-0103', '789 Elm St', 'Chicago', 'IL', '60603', 'USA', 'Online Ad', 'regular', NOW() - INTERVAL '180 days', 0.00),
('20000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'DIY Dave', 'dave@diydave.com', '555-0104', '321 Pine St', 'Chicago', 'IL', '60604', 'USA', 'Google', 'regular', NOW() - INTERVAL '150 days', 75.00),

-- Occasional Customers (infrequent renters)
('20000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'Weekend Warrior', 'weekend@email.com', '555-0105', '654 Maple Dr', 'Chicago', 'IL', '60605', 'USA', 'Social Media', 'occasional', NOW() - INTERVAL '90 days', 0.00),
('20000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001', 'One-Time Project', 'project@email.com', '555-0106', '987 Cedar Ln', 'Chicago', 'IL', '60606', 'USA', 'Walk-in', 'occasional', NOW() - INTERVAL '30 days', 150.00)
ON CONFLICT (id) DO NOTHING;

-- =============================================
-- 4. GENERATE 90 DAYS OF RENTAL DATA
-- =============================================

-- Create a function to generate rentals over 90 days
DO $$
DECLARE
    rental_date DATE;
    i INTEGER;
    customer_id UUID;
    gear_id UUID;
    rental_status TEXT;
    duration_days INTEGER;
    base_price NUMERIC;
    late_fee NUMERIC;
    staff_id UUID;
BEGIN
    -- Generate 150 rental records over 90 days
    FOR i IN 1..150 LOOP
    LOOP
        -- Random date within last 90 days
        rental_date := NOW() - (FLOOR(RANDOM() * 90) || ' days')::INTERVAL;
        
        -- Random customer (weight towards VIPs)
        customer_id := CASE 
            WHEN RANDOM() < 0.3 THEN '20000000-0000-0000-0000-000000000001'  -- VIP Customer 1
            WHEN RANDOM() < 0.5 THEN '20000000-0000-0000-0000-000000000002'  -- VIP Customer 2
            WHEN RANDOM() < 0.7 THEN '20000000-0000-0000-0000-000000000003'  -- Regular Customer 1
            WHEN RANDOM() < 0.85 THEN '20000000-0000-0000-0000-000000000004'  -- Regular Customer 2
            ELSE '20000000-0000-0000-0000-000000000005'  -- Occasional
        END;
        
        -- Random gear (excavators and generators are most popular)
        gear_id := CASE
            WHEN RANDOM() < 0.15 THEN '10000000-0000-0000-0000-000000000001'  -- Excavator 1
            WHEN RANDOM() < 0.25 THEN '10000000-0000-0000-0000-000000000002'  -- Excavator 2
            WHEN RANDOM() < 0.40 THEN '10000000-0000-0000-0000-000000000003'  -- Generator 1
            WHEN RANDOM() < 0.55 THEN '10000000-0000-0000-0000-000000000004'  -- Generator 2
            WHEN RANDOM() < 0.70 THEN '10000000-0000-0000-0000-000000000007'  -- Scissor Lift
            WHEN RANDOM() < 0.80 THEN '10000000-0000-0000-0000-000000000008'  -- Air Compressor
            WHEN RANDOM() < 0.90 THEN '10000000-0000-0000-0000-000000000005'  -- Drill
            ELSE '10000000-0000-0000-0000-000000000006'  -- Saw
        END;
        
        -- Random rental duration (1-14 days, with some longer rentals)
        duration_days := CASE
            WHEN RANDOM() < 0.6 THEN FLOOR(RANDOM() * 3) + 1        -- 1-3 days
            WHEN RANDOM() < 0.8 THEN FLOOR(RANDOM() * 4) + 4        -- 4-7 days
            WHEN RANDOM() < 0.95 THEN FLOOR(RANDOM() * 7) + 8       -- 8-14 days
            ELSE FLOOR(RANDOM() * 16) + 15                                -- 15-30 days
        END;
        
        -- Base price depends on gear category
        base_price := CASE
            WHEN gear_id LIKE '10000000-0000-0000-0000-000000000001%' THEN 850.00 + (RANDOM() * 150)  -- Excavators: $850-1000/day
            WHEN gear_id LIKE '10000000-0000-0000-0000-000000000007%' THEN 350.00 + (RANDOM() * 100)  -- Scissor Lift: $350-450/day
            WHEN gear_id LIKE '10000000-0000-0000-0000-000000000003%' THEN 175.00 + (RANDOM() * 75)   -- Generators: $175-250/day
            WHEN gear_id LIKE '10000000-0000-0000-0000-000000000008%' THEN 140.00 + (RANDOM() * 60)   -- Air Compressor: $140-200/day
            WHEN gear_id LIKE '10000000-0000-0000-0000-000000000009%' THEN 500.00 + (RANDOM() * 100)  -- Van: $500-600/day
            ELSE 35.00 + (RANDOM() * 65                                     -- Tools: $35-100/day
        END;
        
        -- Calculate total cost
        base_price := base_price * duration_days;
        
        -- 20% chance of late fee for overdue rentals
        late_fee := CASE
            WHEN RANDOM() < 0.2 AND rental_date < NOW() - INTERVAL '30 days' 
            THEN (base_price * 0.1) * (FLOOR(RANDOM() * 5) + 1)
            ELSE 0
        END;
        
        -- Random status (most are completed)
        rental_status := CASE
            WHEN rental_date > NOW() - INTERVAL '7 days' THEN 'active'
            WHEN rental_date > NOW() - INTERVAL '14 days' THEN 'checked-out'
            ELSE 'completed'
        END;
        
        -- Random staff assignment
        staff_id := CASE
            WHEN RANDOM() < 0.6 THEN '00000000-0000-0000-0000-000000000002'  -- Sarah
            WHEN RANDOM() < 0.9 THEN '00000000-0000-0000-0000-000000000003'  -- Mike
            ELSE '00000000-0000-0000-0000-000000000001'  -- John
        END;
        
        -- Insert rental
        INSERT INTO public.rentals (
            id, user_id, customer_id, status, start_at, expected_end_at, actual_return_date,
            total_cost, late_fee_amount, late_fee_collected, discount_amount,
            payment_method, staff_assigned_id, created_by_staff_id, created_at, updated_at
        ) VALUES (
            gen_random_uuid(), '00000000-0000-0000-0000-000000000001', customer_id, rental_status,
            rental_date, rental_date + (duration_days || ' days')::INTERVAL,
            CASE WHEN rental_status = 'completed' THEN rental_date + (duration_days + FLOOR(RANDOM() * 3))::INTERVAL ELSE NULL END,
            base_price + late_fee, late_fee, late_fee, 
            CASE WHEN RANDOM() < 0.15 THEN base_price * 0.05 ELSE 0 END,  -- 15% discount chance
            CASE WHEN RANDOM() < 0.4 THEN 'Credit Card' WHEN RANDOM() < 0.7 THEN 'Cash' ELSE 'Check' END,
            staff_id, staff_id, rental_date, NOW()
        ) ON CONFLICT DO NOTHING;
        
        -- Insert rental item
        INSERT INTO public.rental_items (
            id, user_id, rental_id, gear_id, price, quantity, created_at, updated_at
        ) VALUES (
            gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 
            (SELECT id FROM public.rentals WHERE customer_id = customer_id AND start_at = rental_date ORDER BY created_at DESC LIMIT 1),
            gear_id, base_price, 1, rental_date, NOW()
        ) ON CONFLICT DO NOTHING;
    END LOOP;
END $$;

-- =============================================
-- 5. POPULATE MAINTENANCE TICKETS
-- =============================================

-- Generate maintenance tickets for equipment
DO $$
DECLARE
    i INTEGER;
    gear_id UUID;
    ticket_date DATE;
    cost NUMERIC;
    priority TEXT;
    status TEXT;
BEGIN
    FOR i IN 1..80 LOOP
    LOOP
        -- Random gear item
        gear_id := (SELECT id FROM public.gear_items ORDER BY RANDOM() LIMIT 1);
        
        -- Random date within last 90 days
        ticket_date := NOW() - (FLOOR(RANDOM() * 90) || ' days')::INTERVAL;
        
        -- Random maintenance cost
        cost := CASE
            WHEN gear_id LIKE '10000000-0000-0000-0000-000000000001%' THEN 500 + (RANDOM() * 2000)  -- Heavy equipment: $500-2500
            WHEN gear_id LIKE '10000000-0000-0000-0000-000000000007%' THEN 200 + (RANDOM() * 800)   -- Lifts: $200-1000
            WHEN gear_id LIKE '10000000-0000-0000-0000-000000000009%' THEN 300 + (RANDOM() * 700)   -- Vehicles: $300-1000
            ELSE 50 + (RANDOM() * 300                                           -- Tools: $50-350
        END;
        
        -- Random priority
        priority := CASE
            WHEN RANDOM() < 0.2 THEN 'urgent'
            WHEN RANDOM() < 0.5 THEN 'high'
            WHEN RANDOM() < 0.8 THEN 'normal'
            ELSE 'low'
        END;
        
        -- Random status
        status := CASE
            WHEN ticket_date > NOW() - INTERVAL '7 days' THEN 'pending'
            WHEN ticket_date > NOW() - INTERVAL '14 days' THEN 'in-progress'
            ELSE 'completed'
        END;
        
        -- Insert maintenance ticket
        INSERT INTO public.maintenance_tickets (
            id, user_id, gear_id, status, priority_level, cost, date_received,
            estimated_completion_date, staff_assigned_id, labor_hours, resolution_notes,
            created_at, updated_at
        ) VALUES (
            gen_random_uuid(), '00000000-0000-0000-0000-000000000001', gear_id, status, priority, cost,
            ticket_date, ticket_date + INTERVAL '7 days',
            CASE WHEN RANDOM() < 0.8 THEN '00000000-0000-0000-0000-000000000002' ELSE NULL END,  -- Sarah assigned 80% of time
            FLOOR(RANDOM() * 20) + 1,  -- 1-20 labor hours
            CASE 
                WHEN RANDOM() < 0.3 THEN 'Replaced worn hydraulic seals'
                WHEN RANDOM() < 0.6 THEN 'Engine oil change and filter replacement'
                WHEN RANDOM() < 0.8 THEN 'Electrical system diagnostic and repair'
                ELSE 'General inspection and calibration'
            END,
            ticket_date, NOW()
        ) ON CONFLICT DO NOTHING;
    END LOOP;
END $$;

-- =============================================
-- 6. POPULATE DAMAGE REPORTS
-- =============================================

-- Generate damage reports for some rentals
DO $$
DECLARE
    i INTEGER;
    rental_id UUID;
    damage_cost NUMERIC;
BEGIN
    FOR i IN 1..25 LOOP
    LOOP
        -- Get a random completed rental
        SELECT id INTO rental_id 
        FROM public.rentals 
        WHERE status = 'completed' AND actual_return_date IS NOT NULL
        ORDER BY RANDOM() LIMIT 1;
        
        IF rental_id IS NOT NULL THEN
            -- Random damage cost (0-1500)
            damage_cost := RANDOM() * 1500;
            
            INSERT INTO public.damage_reports (
                id, user_id, rental_id, description, damage_type, severity, status,
                actual_cost, insurance_claim_id, resolved_at, prevention_measures,
                created_at, updated_at
            ) VALUES (
                gen_random_uuid(), '00000000-0000-0000-0000-000000000001', rental_id,
                CASE 
                    WHEN RANDOM() < 0.3 THEN 'Scratches and dents on equipment body'
                    WHEN RANDOM() < 0.6 THEN 'Broken hydraulic line'
                    WHEN RANDOM() < 0.8 THEN 'Electrical system damage'
                    ELSE 'Wear and tear on moving parts'
                END,
                CASE 
                    WHEN RANDOM() < 0.5 THEN 'accidental'
                    ELSE 'wear_and_tear'
                END,
                CASE 
                    WHEN damage_cost > 1000 THEN 'severe'
                    WHEN damage_cost > 500 THEN 'moderate'
                    ELSE 'minor'
                END,
                'resolved',
                damage_cost, 
                CASE WHEN damage_cost > 800 THEN 'CLAIM-' || gen_random_uuid()::text ELSE NULL END,
                NOW() - INTERVAL '5 days',
                'Improved operator training and daily inspection checklist',
                NOW() - INTERVAL '90 days', NOW()
            ) ON CONFLICT DO NOTHING;
        END IF;
    END LOOP;
END $$;

-- =============================================
-- 7. CALCULATE ANALYTICS DATA
-- =============================================

-- Calculate customer analytics
INSERT INTO public.customer_analytics (
    id, user_id, customer_id, rental_frequency, average_rental_duration,
    average_rental_value, total_rental_days, total_revenue, last_activity_date,
    churn_risk_score, loyalty_score, preferred_categories, seasonal_pattern
)
SELECT 
    gen_random_uuid(), '00000000-0000-0000-0000-000000000001', c.id,
    -- Rental frequency (rentals per month)
    (COUNT(r.id)::NUMERIC / GREATEST(EXTRACT(EPOCH FROM (NOW() - c.created_at))/2592000, 1)),
    -- Average rental duration
    AVG(EXTRACT(DAY FROM (r.actual_return_date - r.start_at))),
    -- Average rental value
    AVG(r.total_cost),
    -- Total rental days
    SUM(EXTRACT(DAY FROM (COALESCE(r.actual_return_date, NOW()) - r.start_at))),
    -- Total revenue
    COALESCE(SUM(r.total_cost), 0),
    -- Last activity
    COALESCE(MAX(r.created_at), c.created_at),
    -- Churn risk score (based on recency and frequency)
    CASE 
        WHEN MAX(r.created_at) < NOW() - INTERVAL '60 days' THEN 0.8
        WHEN MAX(r.created_at) < NOW() - INTERVAL '30 days' THEN 0.6
        WHEN COUNT(r.id) < 3 THEN 0.4
        ELSE 0.1
    END,
    -- Loyalty score (based on revenue and frequency)
    LEAST((COUNT(r.id) * 0.3 + COALESCE(SUM(r.total_cost), 0) / 1000 * 0.7), 1.0),
    -- Preferred categories (most rented gear category)
    ARRAY_AGG(DISTINCT gi.category ORDER BY COUNT(DISTINCT gi.category) DESC LIMIT 2),
    -- Seasonal pattern
    CASE 
        WHEN EXTRACT(MONTH FROM MAX(r.created_at)) IN (6,7,8) THEN 'summer'
        WHEN EXTRACT(MONTH FROM MAX(r.created_at)) IN (12,1,2) THEN 'winter'
        WHEN EXTRACT(MONTH FROM MAX(r.created_at)) IN (3,4,5) THEN 'spring'
        ELSE 'fall'
    END
FROM public.customers c
LEFT JOIN public.rentals r ON c.id = r.customer_id
LEFT JOIN public.rental_items ri ON r.id = ri.rental_id
LEFT JOIN public.gear_items gi ON ri.gear_id = gi.id
WHERE c.user_id = '00000000-0000-0000-0000-000000000001'
GROUP BY c.id
ON CONFLICT (customer_id, user_id) DO UPDATE SET
    rental_frequency = EXCLUDED.rental_frequency,
    average_rental_duration = EXCLUDED.average_rental_duration,
    average_rental_value = EXCLUDED.average_rental_value,
    total_rental_days = EXCLUDED.total_rental_days,
    total_revenue = EXCLUDED.total_revenue,
    last_activity_date = EXCLUDED.last_activity_date,
    updated_at = NOW();

-- Calculate gear performance
INSERT INTO public.gear_performance (
    id, user_id, gear_id, total_rental_days, total_revenue,
    total_maintenance_cost, utilization_rate, roi, performance_score,
    days_since_last_rental, average_rental_duration
)
SELECT 
    gen_random_uuid(), '00000000-0000-0000-0000-000000000001', gi.id,
    -- Total rental days
    COALESCE(SUM(EXTRACT(DAY FROM (COALESCE(r.actual_return_date, NOW()) - r.start_at))), 0),
    -- Total revenue
    COALESCE(SUM(ri.price), 0),
    -- Total maintenance cost
    COALESCE((SELECT SUM(cost) FROM public.maintenance_tickets WHERE gear_id = gi.id), 0),
    -- Utilization rate (rental days / days since purchase)
    CASE 
        WHEN gi.purchase_date IS NOT NULL THEN
            COALESCE(SUM(EXTRACT(DAY FROM (COALESCE(r.actual_return_date, NOW()) - r.start_at))), 0) / 
            GREATEST(EXTRACT(DAY FROM (NOW() - gi.purchase_date)), 1)
        ELSE 0
    END,
    -- ROI calculation
    CASE 
        WHEN gi.purchase_cost > 0 AND COALESCE(SUM(ri.price), 0) > 0 THEN
            ((COALESCE(SUM(ri.price), 0) - COALESCE((SELECT SUM(cost) FROM public.maintenance_tickets WHERE gear_id = gi.id), 0)) / gi.purchase_cost) * 100
        ELSE 0
    END,
    -- Performance score (0-1 based on revenue and utilization)
    LEAST(
        (COALESCE(SUM(ri.price), 0) / 10000 * 0.6 + 
         CASE 
            WHEN gi.purchase_date IS NOT NULL THEN
                COALESCE(SUM(EXTRACT(DAY FROM (COALESCE(r.actual_return_date, NOW()) - r.start_at)), 0) / 
                GREATEST(EXTRACT(DAY FROM (NOW() - gi.purchase_date)), 1) * 0.4
            ELSE 0
        END), 1.0
    ),
    -- Days since last rental
    EXTRACT(DAY FROM (NOW() - COALESCE(MAX(r.start_at), NOW()))),
    -- Average rental duration
    AVG(EXTRACT(DAY FROM (COALESCE(r.actual_return_date, NOW()) - r.start_at)))
FROM public.gear_items gi
LEFT JOIN public.rental_items ri ON gi.id = ri.gear_id
LEFT JOIN public.rentals r ON ri.rental_id = r.id
WHERE gi.user_id = '00000000-0000-0000-0000-000000000001'
GROUP BY gi.id
ON CONFLICT (gear_id, user_id) DO UPDATE SET
    total_rental_days = EXCLUDED.total_rental_days,
    total_revenue = EXCLUDED.total_revenue,
    total_maintenance_cost = EXCLUDED.total_maintenance_cost,
    utilization_rate = EXCLUDED.utilization_rate,
    roi = EXCLUDED.roi,
    updated_at = NOW();

-- Generate 90 days of revenue analytics
DO $$
DECLARE
    current_date DATE;
    i INTEGER;
BEGIN
    -- Generate daily analytics for the last 90 days
    FOR i IN 0..89 LOOP
    LOOP
        current_date := NOW() - (i || ' days')::INTERVAL;
        
        INSERT INTO public.revenue_analytics (
            id, user_id, date, rental_revenue, late_fee_revenue, 
            maintenance_costs, damage_costs, total_revenue, net_profit,
            active_rentals_count, new_customers_count, total_customers_count
        ) VALUES (
            gen_random_uuid(), '00000000-0000-0000-0000-000000000001', current_date,
            -- Daily rental revenue (varies by day of week)
            ROUND((
                SELECT COALESCE(SUM(r.total_cost), 0) * 
                CASE EXTRACT(DOW FROM current_date)
                    WHEN 0 THEN 0.7  -- Sunday: 70% of average
                    WHEN 1 THEN 0.9  -- Monday: 90% of average  
                    WHEN 2 THEN 1.0  -- Tuesday: 100% of average
                    WHEN 3 THEN 1.1  -- Wednesday: 110% of average
                    WHEN 4 THEN 1.2  -- Thursday: 120% of average
                    WHEN 5 THEN 1.3  -- Friday: 130% of average
                    ELSE 0.8       -- Saturday: 80% of average
                END
            FROM public.rentals r 
            WHERE DATE(r.created_at) = current_date AND r.user_id = '00000000-0000-0000-0000-000000000001'
            ), 2),
            
            -- Daily late fee revenue
            COALESCE((
                SELECT SUM(late_fee_collected) 
                FROM public.rentals 
                WHERE DATE(created_at) = current_date AND user_id = '00000000-0000-0000-0000-000000000001'
            ), 0),
            
            -- Daily maintenance costs
            COALESCE((
                SELECT SUM(cost) 
                FROM public.maintenance_tickets 
                WHERE DATE(date_received) = current_date AND user_id = '00000000-0000-0000-0000-000000000001'
            ), 0),
            
            -- Daily damage costs
            COALESCE((
                SELECT SUM(actual_cost) 
                FROM public.damage_reports 
                WHERE DATE(created_at) = current_date AND user_id = '00000000-0000-0000-0000-000000000001'
            ), 0),
            
            0, 0,  -- Will be calculated below
            0,       -- Will be calculated below
            0,       -- Will be calculated below
            0,       -- Will be calculated below
            0        -- Will be calculated below
        ) ON CONFLICT (date, user_id) DO UPDATE SET
            rental_revenue = EXCLUDED.rental_revenue,
            late_fee_revenue = EXCLUDED.late_fee_revenue,
            maintenance_costs = EXCLUDED.maintenance_costs,
            damage_costs = EXCLUDED.damage_costs;
    END LOOP;
    
    -- Update calculated fields
    UPDATE public.revenue_analytics SET
        total_revenue = rental_revenue + late_fee_revenue,
        net_profit = total_revenue - maintenance_costs - damage_costs,
        active_rentals_count = (
            SELECT COUNT(*) 
            FROM public.rentals 
            WHERE status IN ('active', 'checked-out') AND 
                  DATE <= date AND user_id = '00000000-0000-0000-0000-000000000001'
        ),
        new_customers_count = (
            SELECT COUNT(*) 
            FROM public.customers 
            WHERE DATE(created_at) = date AND user_id = '00000000-0000-0000-0000-000000000001'
        ),
        total_customers_count = (
            SELECT COUNT(*) 
            FROM public.customers 
            WHERE user_id = '00000000-0000-0000-0000-000000000001'
        );
END $$;

-- =============================================
-- 8. GENERATE STAFF PERFORMANCE DATA
-- =============================================

DO $$
DECLARE
    current_date DATE;
    i INTEGER;
    rentals_processed INTEGER;
    revenue_generated NUMERIC;
BEGIN
    -- Generate daily staff performance for last 30 days
    FOR i IN 0..29 LOOP
    LOOP
        current_date := NOW() - (i || ' days')::INTERVAL;
        
        -- Sarah's performance (better performer)
        SELECT 
            COUNT(*) INTO rentals_processed,
            COALESCE(SUM(total_cost), 0) INTO revenue_generated
        FROM public.rentals 
        WHERE DATE(created_at) = current_date AND created_by_staff_id = '00000000-0000-0000-0000-000000000002' AND user_id = '00000000-0000-0000-0000-000000000001';
        
        INSERT INTO public.staff_performance (
            id, user_id, staff_id, date, rentals_processed, revenue_generated,
            maintenance_tickets_completed, customer_interactions, average_processing_time,
            customer_satisfaction_score, upsells_completed
        ) VALUES (
            gen_random_uuid(), '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', current_date,
            rentals_processed, revenue_generated,
            FLOOR(RANDOM() * 3) + 1,  -- 1-3 maintenance tickets
            FLOOR(RANDOM() * 10) + 5,  -- 5-14 customer interactions
            15 + (RANDOM() * 10),       -- 15-25 minutes avg processing time
            0.85 + (RANDOM() * 0.1), -- 85-95% satisfaction
            FLOOR(RANDOM() * 2)         -- 0-2 upsells
        ) ON CONFLICT (staff_id, date, user_id) DO NOTHING;
        
        -- Mike's performance (average performer)
        SELECT 
            COUNT(*) INTO rentals_processed,
            COALESCE(SUM(total_cost), 0) INTO revenue_generated
        FROM public.rentals 
        WHERE DATE(created_at) = current_date AND created_by_staff_id = '00000000-0000-0000-0000-000000000003' AND user_id = '00000000-0000-0000-0000-000000000001';
        
        INSERT INTO public.staff_performance (
            id, user_id, staff_id, date, rentals_processed, revenue_generated,
            maintenance_tickets_completed, customer_interactions, average_processing_time,
            customer_satisfaction_score, upsells_completed
        ) VALUES (
            gen_random_uuid(), '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', current_date,
            rentals_processed, revenue_generated,
            FLOOR(RANDOM() * 2) + 1,  -- 1-2 maintenance tickets
            FLOOR(RANDOM() * 8) + 3,   -- 3-10 customer interactions
            20 + (RANDOM() * 15),       -- 20-35 minutes avg processing time
            0.75 + (RANDOM() * 0.15), -- 75-90% satisfaction
            FLOOR(RANDOM() * 1)         -- 0-1 upsells
        ) ON CONFLICT (staff_id, date, user_id) DO NOTHING;
    END LOOP;
END $$;

-- =============================================
-- 9. UPDATE BUSINESS METRICS
-- =============================================

-- Calculate and insert business metrics snapshots
INSERT INTO public.business_metrics (
    id, user_id, date, total_gear_value, total_gear_depreciation,
    customer_retention_rate, customer_acquisition_cost, average_order_value,
    inventory_turnover_rate, gross_profit_margin, net_profit_margin,
    cash_flow, working_capital
)
SELECT 
    gen_random_uuid(), '00000000-0000-0000-0000-000000000001', NOW()::DATE,
    -- Total gear value (purchase cost - accumulated depreciation)
    COALESCE(SUM(gi.purchase_cost), 0) - 
    COALESCE(SUM(gi.purchase_cost * (1 - POWER(1 - gi.depreciation_rate, 
        EXTRACT(DAY FROM (NOW() - gi.purchase_date))/30)), 0),
    
    -- Total gear depreciation
    COALESCE(SUM(gi.purchase_cost * (1 - POWER(1 - gi.depreciation_rate, 
        EXTRACT(DAY FROM (NOW() - gi.purchase_date))/30))), 0),
    
    -- Customer retention rate (customers with rentals in last 90 days / total customers)
    CASE 
        WHEN (SELECT COUNT(*) FROM public.customers) > 0 THEN
            ((SELECT COUNT(DISTINCT customer_id) FROM public.rentals 
              WHERE created_at > NOW() - INTERVAL '90 days')::NUMERIC / 
             (SELECT COUNT(*) FROM public.customers)) * 100
        ELSE 0
    END,
    
    -- Customer acquisition cost (marketing spend / new customers)
    150.00,  -- Assumed average marketing cost per customer
    
    -- Average order value (total revenue / total rentals)
    CASE 
        WHEN (SELECT COUNT(*) FROM public.rentals) > 0 THEN
            (SELECT COALESCE(SUM(total_cost), 0) FROM public.rentals) / 
            (SELECT COUNT(*) FROM public.rentals)
        ELSE 0
    END,
    
    -- Inventory turnover rate (total rental revenue / average inventory value)
    CASE 
        WHEN COALESCE(SUM(gi.purchase_cost), 0) > 0 THEN
            ((SELECT COALESCE(SUM(total_cost), 0) FROM public.rentals WHERE created_at > NOW() - INTERVAL '90 days')::NUMERIC / 
             COALESCE(SUM(gi.purchase_cost), 0)) * 4  -- Annualized
        ELSE 0
    END,
    
    -- Gross profit margin (revenue - direct costs / revenue)
    CASE 
        WHEN (SELECT COALESCE(SUM(total_cost), 0) FROM public.rentals) > 0 THEN
            (((SELECT COALESCE(SUM(total_cost), 0) FROM public.rentals) - 
              (SELECT COALESCE(SUM(cost), 0) FROM public.maintenance_tickets WHERE date_received > NOW() - INTERVAL '90 days')) /
             (SELECT COALESCE(SUM(total_cost), 0) FROM public.rentals)) * 100
        ELSE 0
    END,
    
    -- Net profit margin (after all costs)
    CASE 
        WHEN (SELECT COALESCE(SUM(total_cost), 0) FROM public.rentals) > 0 THEN
            (((SELECT COALESCE(SUM(total_cost), 0) FROM public.rentals) - 
              (SELECT COALESCE(SUM(cost), 0) FROM public.maintenance_tickets WHERE date_received > NOW() - INTERVAL '90 days') -
              (SELECT COALESCE(SUM(actual_cost), 0) FROM public.damage_reports WHERE created_at > NOW() - INTERVAL '90 days')) /
             (SELECT COALESCE(SUM(total_cost), 0) FROM public.rentals)) * 100
        ELSE 0
    END,
    
    -- Cash flow (revenue - expenses)
    (SELECT COALESCE(SUM(total_cost), 0) FROM public.rentals WHERE created_at > NOW() - INTERVAL '30 days') -
    ((SELECT COALESCE(SUM(cost), 0) FROM public.maintenance_tickets WHERE date_received > NOW() - INTERVAL '30 days') +
     (SELECT COALESCE(SUM(actual_cost), 0) FROM public.damage_reports WHERE created_at > NOW() - INTERVAL '30 days')),
    
    -- Working capital (current assets - current liabilities)
    COALESCE(SUM(gi.current_value), 0) - 
    (SELECT COALESCE(SUM(balance_due), 0) FROM public.customers)
FROM public.gear_items gi
WHERE gi.user_id = '00000000-0000-0000-0000-000000000001'
ON CONFLICT (date, user_id) DO NOTHING;

-- =============================================
-- 10. VERIFICATION QUERIES
-- =============================================

-- Display summary of generated data
SELECT 'Demo Data Population Complete' AS status;
SELECT 
    (SELECT COUNT(*) FROM public.customers WHERE user_id = '00000000-0000-0000-0000-000000000001') AS customers_created,
    (SELECT COUNT(*) FROM public.gear_items WHERE user_id = '00000000-0000-0000-0000-000000000001') AS gear_items_created,
    (SELECT COUNT(*) FROM public.rentals WHERE user_id = '00000000-0000-0000-0000-000000000001') AS rentals_created,
    (SELECT COUNT(*) FROM public.maintenance_tickets WHERE user_id = '00000000-0000-0000-0000-000000000001') AS maintenance_tickets_created,
    (SELECT COUNT(*) FROM public.damage_reports WHERE user_id = '00000000-0000-0000-0000-000000000001') AS damage_reports_created,
    (SELECT COUNT(*) FROM public.revenue_analytics WHERE user_id = '00000000-0000-0000-0000-000000000001') AS analytics_days_created,
    (SELECT COUNT(*) FROM public.customer_analytics WHERE user_id = '00000000-0000-0000-0000-000000000001') AS customer_analytics_created,
    (SELECT COUNT(*) FROM public.gear_performance WHERE user_id = '00000000-0000-0000-0000-000000000001') AS gear_performance_created,
    (SELECT COUNT(*) FROM public.staff_performance WHERE user_id = '00000000-0000-0000-0000-000000000001') AS staff_performance_created;

-- Display revenue summary for verification
SELECT 
    'Revenue Summary' AS metric,
    SUM(CASE WHEN DATE(created_at) >= NOW() - INTERVAL '7 days' THEN total_cost ELSE 0 END) AS last_7_days,
    SUM(CASE WHEN DATE(created_at) >= NOW() - INTERVAL '30 days' THEN total_cost ELSE 0 END) AS last_30_days,
    SUM(CASE WHEN DATE(created_at) >= NOW() - INTERVAL '90 days' THEN total_cost ELSE 0 END) AS last_90_days
FROM public.rentals 
WHERE user_id = '00000000-0000-0000-0000-000000000001';

-- Display top performing gear
SELECT 
    'Top Performing Gear' AS category,
    gi.internal_id,
    gi.category,
    gp.total_revenue,
    gp.utilization_rate,
    gp.roi
FROM public.gear_performance gp
JOIN public.gear_items gi ON gp.gear_id = gi.id
WHERE gp.user_id = '00000000-0000-0000-0000-000000000001'
ORDER BY gp.total_revenue DESC
LIMIT 5;
