-- =====================================================
-- Migration: Dentist-Only Reservation System
-- Version: 1.1.0
-- Description: Update RLS to allow only dentists to create reservations
--              Add support for out-of-stock reservations and urgent case alerts
-- =====================================================

-- Drop existing reservation policies
DROP POLICY IF EXISTS "Reservations can be managed by authorized roles" ON public.case_reservations;

-- Create new policy: Only dentists can CREATE reservations
CREATE POLICY "Dentists can create reservations" ON public.case_reservations
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND role = 'dentist'
        )
    );

-- Stock staff can UPDATE reservations (for preparing, confirming)
CREATE POLICY "Stock staff can update reservations" ON public.case_reservations
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'stock_staff', 'assistant')
        )
    );

-- Dentists can update their own reservations
CREATE POLICY "Dentists can update own reservations" ON public.case_reservations
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.cases c
            JOIN public.users u ON u.id = auth.uid()
            WHERE c.id = case_reservations.case_id
            AND c.dentist_id = auth.uid()
            AND u.role = 'dentist'
        )
    );

-- Admin can delete reservations
CREATE POLICY "Admin can delete reservations" ON public.case_reservations
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

-- =====================================================
-- Add REF number to products (reference number from manufacturer)
-- =====================================================
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS ref_number TEXT;

-- Create index for searching by REF
CREATE INDEX IF NOT EXISTS idx_products_ref ON public.products(ref_number);

-- =====================================================
-- Add out-of-stock reservation support
-- =====================================================

-- Allow inventory_id to be NULL for out-of-stock reservations
ALTER TABLE public.case_reservations ALTER COLUMN inventory_id DROP NOT NULL;

-- Add flag for out-of-stock reservations
ALTER TABLE public.case_reservations ADD COLUMN IF NOT EXISTS is_out_of_stock BOOLEAN DEFAULT false;

-- Add requested product details for out-of-stock items
ALTER TABLE public.case_reservations ADD COLUMN IF NOT EXISTS requested_ref TEXT;
ALTER TABLE public.case_reservations ADD COLUMN IF NOT EXISTS requested_lot TEXT;
ALTER TABLE public.case_reservations ADD COLUMN IF NOT EXISTS requested_specs JSONB;

-- =====================================================
-- Urgent case alerts table
-- =====================================================
CREATE TABLE IF NOT EXISTS public.urgent_case_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
    reservation_id UUID REFERENCES public.case_reservations(id) ON DELETE CASCADE,
    alert_type TEXT NOT NULL CHECK (alert_type IN ('out_of_stock', 'urgent_48h', 'material_shortage')),
    message TEXT NOT NULL,
    is_resolved BOOLEAN DEFAULT false,
    resolved_by UUID REFERENCES public.users(id),
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on urgent_case_alerts
ALTER TABLE public.urgent_case_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Alerts are viewable by authenticated users" ON public.urgent_case_alerts
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Stock staff can manage alerts" ON public.urgent_case_alerts
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'stock_staff')
        )
    );

-- =====================================================
-- View for out-of-stock reservations needing attention
-- =====================================================
CREATE OR REPLACE VIEW public.pending_stock_requests AS
SELECT 
    cr.id as reservation_id,
    cr.case_id,
    c.case_number,
    c.surgery_date,
    c.dentist_id,
    u.full_name as dentist_name,
    p.id as product_id,
    p.sku,
    p.name as product_name,
    p.ref_number,
    cr.requested_ref,
    cr.requested_lot,
    cr.requested_specs,
    cr.quantity,
    cr.is_out_of_stock,
    cr.created_at as requested_at,
    CASE 
        WHEN c.surgery_date <= CURRENT_DATE + INTERVAL '2 days' THEN 'urgent'
        WHEN c.surgery_date <= CURRENT_DATE + INTERVAL '7 days' THEN 'soon'
        ELSE 'normal'
    END as urgency,
    (c.surgery_date - CURRENT_DATE) as days_until_surgery
FROM public.case_reservations cr
JOIN public.cases c ON c.id = cr.case_id
JOIN public.users u ON u.id = c.dentist_id
JOIN public.products p ON p.id = cr.product_id
WHERE cr.is_out_of_stock = true
AND cr.status = 'pending'
ORDER BY c.surgery_date ASC;

-- =====================================================
-- View for urgent cases within 48 hours
-- =====================================================
CREATE OR REPLACE VIEW public.urgent_cases_48h AS
SELECT 
    c.id,
    c.case_number,
    c.surgery_date,
    c.surgery_time,
    c.status,
    c.dentist_id,
    u.full_name as dentist_name,
    pt.first_name || ' ' || pt.last_name as patient_name,
    pt.hn_number,
    (c.surgery_date - CURRENT_DATE) as days_until_surgery,
    (
        SELECT COUNT(*) 
        FROM public.case_reservations cr 
        WHERE cr.case_id = c.id 
        AND cr.status NOT IN ('prepared', 'used')
    ) as unprepared_items,
    (
        SELECT COUNT(*) 
        FROM public.case_reservations cr 
        WHERE cr.case_id = c.id 
        AND cr.is_out_of_stock = true
    ) as out_of_stock_items
FROM public.cases c
JOIN public.users u ON u.id = c.dentist_id
JOIN public.patients pt ON pt.id = c.patient_id
WHERE c.surgery_date <= CURRENT_DATE + INTERVAL '2 days'
AND c.surgery_date >= CURRENT_DATE
AND c.status NOT IN ('completed', 'cancelled')
ORDER BY c.surgery_date ASC, c.surgery_time ASC;

-- =====================================================
-- Function to create alert when out-of-stock reservation is made
-- =====================================================
CREATE OR REPLACE FUNCTION create_out_of_stock_alert()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_out_of_stock = true THEN
        INSERT INTO public.urgent_case_alerts (case_id, reservation_id, alert_type, message)
        SELECT 
            NEW.case_id,
            NEW.id,
            CASE 
                WHEN c.surgery_date <= CURRENT_DATE + INTERVAL '2 days' THEN 'urgent_48h'
                ELSE 'out_of_stock'
            END,
            'วัสดุ ' || p.name || ' (REF: ' || COALESCE(NEW.requested_ref, p.ref_number, p.sku) || ') ไม่มีในสต็อก สำหรับเคส ' || c.case_number
        FROM public.cases c
        JOIN public.products p ON p.id = NEW.product_id
        WHERE c.id = NEW.case_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_out_of_stock_alert ON public.case_reservations;
CREATE TRIGGER trigger_out_of_stock_alert
    AFTER INSERT ON public.case_reservations
    FOR EACH ROW
    EXECUTE FUNCTION create_out_of_stock_alert();

-- =====================================================
-- Function to check and create urgent case alerts
-- =====================================================
CREATE OR REPLACE FUNCTION check_urgent_cases()
RETURNS void AS $$
BEGIN
    -- Create alerts for cases within 48h that have unprepared materials
    INSERT INTO public.urgent_case_alerts (case_id, alert_type, message)
    SELECT 
        c.id,
        'urgent_48h',
        'เคส ' || c.case_number || ' มีกำหนดผ่าตัดภายใน 48 ชั่วโมง แต่ยังมีวัสดุที่ยังไม่เตรียม'
    FROM public.cases c
    WHERE c.surgery_date <= CURRENT_DATE + INTERVAL '2 days'
    AND c.surgery_date >= CURRENT_DATE
    AND c.status NOT IN ('completed', 'cancelled', 'green')
    AND NOT EXISTS (
        SELECT 1 FROM public.urgent_case_alerts ua 
        WHERE ua.case_id = c.id 
        AND ua.alert_type = 'urgent_48h'
        AND ua.is_resolved = false
    );
END;
$$ LANGUAGE plpgsql;
