-- =====================================================
-- DentalStock Management System - Migration Update
-- Version: 1.3.0
-- Last Updated: 2026-02-05
-- 
-- ไฟล์นี้สำหรับอัพเดทจาก version เดิม
-- รันซ้ำได้ปลอดภัย (idempotent)
-- =====================================================

-- =====================================================
-- 1. เพิ่ม ref_number column ถ้ายังไม่มี
-- =====================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'products' 
        AND column_name = 'ref_number'
    ) THEN
        ALTER TABLE public.products ADD COLUMN ref_number TEXT;
        RAISE NOTICE 'Added ref_number column to products table';
    ELSE
        RAISE NOTICE 'ref_number column already exists';
    END IF;
END $$;

-- =====================================================
-- 2. ทำให้ SKU เป็น optional (ลบ NOT NULL constraint)
-- =====================================================
DO $$
BEGIN
    -- Check if sku column has NOT NULL constraint
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'products' 
        AND column_name = 'sku'
        AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE public.products ALTER COLUMN sku DROP NOT NULL;
        RAISE NOTICE 'Made sku column nullable';
    ELSE
        RAISE NOTICE 'sku column is already nullable or does not exist';
    END IF;
END $$;

-- =====================================================
-- 3. ลบ UNIQUE constraint จาก SKU (ถ้ามี)
-- =====================================================
DO $$
DECLARE
    constraint_name TEXT;
BEGIN
    SELECT conname INTO constraint_name
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_namespace n ON t.relnamespace = n.oid
    WHERE n.nspname = 'public'
    AND t.relname = 'products'
    AND c.contype = 'u'
    AND EXISTS (
        SELECT 1 FROM pg_attribute a
        WHERE a.attrelid = t.oid
        AND a.attnum = ANY(c.conkey)
        AND a.attname = 'sku'
    );
    
    IF constraint_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE public.products DROP CONSTRAINT ' || constraint_name;
        RAISE NOTICE 'Dropped unique constraint % from sku', constraint_name;
    ELSE
        RAISE NOTICE 'No unique constraint on sku column';
    END IF;
END $$;

-- =====================================================
-- 4. เพิ่ม is_out_of_stock column ใน case_reservations
-- =====================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'case_reservations' 
        AND column_name = 'is_out_of_stock'
    ) THEN
        ALTER TABLE public.case_reservations ADD COLUMN is_out_of_stock BOOLEAN DEFAULT false;
        RAISE NOTICE 'Added is_out_of_stock column to case_reservations table';
    ELSE
        RAISE NOTICE 'is_out_of_stock column already exists';
    END IF;
END $$;

-- =====================================================
-- 5. สร้างตาราง audit_logs (ถ้ายังไม่มี)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id),
    user_email TEXT,
    user_name TEXT,
    user_role TEXT,
    action TEXT NOT NULL,
    table_name TEXT,
    record_id UUID,
    old_data JSONB,
    new_data JSONB,
    changed_fields TEXT[],
    description TEXT,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- สร้าง indexes (IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name ON public.audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_record_id ON public.audit_logs(record_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- =====================================================
-- 6. สร้าง/อัพเดท Function สำหรับ Audit Log
-- =====================================================
CREATE OR REPLACE FUNCTION log_audit_event()
RETURNS TRIGGER AS $$
DECLARE
    v_old_data JSONB;
    v_new_data JSONB;
    v_changed_fields TEXT[];
    v_user_id UUID;
    v_user_email TEXT;
    v_user_name TEXT;
    v_user_role TEXT;
    v_description TEXT;
    v_key TEXT;
BEGIN
    v_user_id := auth.uid();
    
    IF v_user_id IS NOT NULL THEN
        SELECT email, full_name, role::TEXT INTO v_user_email, v_user_name, v_user_role
        FROM public.users WHERE id = v_user_id;
    END IF;
    
    IF TG_OP = 'INSERT' THEN
        v_new_data := to_jsonb(NEW);
        v_description := 'สร้างข้อมูลใหม่ใน ' || TG_TABLE_NAME;
        
        INSERT INTO public.audit_logs (
            user_id, user_email, user_name, user_role,
            action, table_name, record_id,
            new_data, description
        ) VALUES (
            v_user_id, v_user_email, v_user_name, v_user_role,
            'INSERT', TG_TABLE_NAME, NEW.id,
            v_new_data, v_description
        );
        RETURN NEW;
        
    ELSIF TG_OP = 'UPDATE' THEN
        v_old_data := to_jsonb(OLD);
        v_new_data := to_jsonb(NEW);
        
        v_changed_fields := ARRAY[]::TEXT[];
        FOR v_key IN SELECT jsonb_object_keys(v_new_data)
        LOOP
            IF v_old_data->v_key IS DISTINCT FROM v_new_data->v_key THEN
                v_changed_fields := array_append(v_changed_fields, v_key);
            END IF;
        END LOOP;
        
        IF array_length(v_changed_fields, 1) > 0 AND 
           NOT (array_length(v_changed_fields, 1) = 1 AND v_changed_fields[1] = 'updated_at') THEN
            v_description := 'แก้ไขข้อมูลใน ' || TG_TABLE_NAME || ': ' || array_to_string(v_changed_fields, ', ');
            
            INSERT INTO public.audit_logs (
                user_id, user_email, user_name, user_role,
                action, table_name, record_id,
                old_data, new_data, changed_fields, description
            ) VALUES (
                v_user_id, v_user_email, v_user_name, v_user_role,
                'UPDATE', TG_TABLE_NAME, NEW.id,
                v_old_data, v_new_data, v_changed_fields, v_description
            );
        END IF;
        RETURN NEW;
        
    ELSIF TG_OP = 'DELETE' THEN
        v_old_data := to_jsonb(OLD);
        v_description := 'ลบข้อมูลจาก ' || TG_TABLE_NAME;
        
        INSERT INTO public.audit_logs (
            user_id, user_email, user_name, user_role,
            action, table_name, record_id,
            old_data, description
        ) VALUES (
            v_user_id, v_user_email, v_user_name, v_user_role,
            'DELETE', TG_TABLE_NAME, OLD.id,
            v_old_data, v_description
        );
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 7. สร้าง/อัพเดท Function สำหรับ Auth Events
-- =====================================================
CREATE OR REPLACE FUNCTION log_auth_event(
    p_action TEXT,
    p_user_id UUID,
    p_email TEXT,
    p_ip_address TEXT DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_log_id UUID;
    v_user_name TEXT;
    v_user_role TEXT;
BEGIN
    SELECT full_name, role::TEXT INTO v_user_name, v_user_role
    FROM public.users WHERE id = p_user_id;
    
    INSERT INTO public.audit_logs (
        user_id, user_email, user_name, user_role,
        action, description, ip_address, user_agent
    ) VALUES (
        p_user_id, p_email, v_user_name, v_user_role,
        p_action,
        CASE p_action 
            WHEN 'LOGIN' THEN 'เข้าสู่ระบบ'
            WHEN 'LOGOUT' THEN 'ออกจากระบบ'
            WHEN 'LOGIN_FAILED' THEN 'เข้าสู่ระบบไม่สำเร็จ'
            ELSE p_action
        END,
        p_ip_address, p_user_agent
    )
    RETURNING id INTO v_log_id;
    
    RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 8. สร้าง Audit Triggers (ตรวจสอบว่าตารางมีอยู่ก่อนสร้าง)
-- =====================================================
DO $$
BEGIN
    -- Trigger for users table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
        DROP TRIGGER IF EXISTS audit_users ON public.users;
        CREATE TRIGGER audit_users AFTER INSERT OR UPDATE OR DELETE ON public.users
            FOR EACH ROW EXECUTE FUNCTION log_audit_event();
        RAISE NOTICE 'Created audit trigger for users';
    END IF;

    -- Trigger for patients table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'patients') THEN
        DROP TRIGGER IF EXISTS audit_patients ON public.patients;
        CREATE TRIGGER audit_patients AFTER INSERT OR UPDATE OR DELETE ON public.patients
            FOR EACH ROW EXECUTE FUNCTION log_audit_event();
        RAISE NOTICE 'Created audit trigger for patients';
    END IF;

    -- Trigger for products table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'products') THEN
        DROP TRIGGER IF EXISTS audit_products ON public.products;
        CREATE TRIGGER audit_products AFTER INSERT OR UPDATE OR DELETE ON public.products
            FOR EACH ROW EXECUTE FUNCTION log_audit_event();
        RAISE NOTICE 'Created audit trigger for products';
    END IF;

    -- Trigger for inventory table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'inventory') THEN
        DROP TRIGGER IF EXISTS audit_inventory ON public.inventory;
        CREATE TRIGGER audit_inventory AFTER INSERT OR UPDATE OR DELETE ON public.inventory
            FOR EACH ROW EXECUTE FUNCTION log_audit_event();
        RAISE NOTICE 'Created audit trigger for inventory';
    END IF;

    -- Trigger for cases table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'cases') THEN
        DROP TRIGGER IF EXISTS audit_cases ON public.cases;
        CREATE TRIGGER audit_cases AFTER INSERT OR UPDATE OR DELETE ON public.cases
            FOR EACH ROW EXECUTE FUNCTION log_audit_event();
        RAISE NOTICE 'Created audit trigger for cases';
    END IF;

    -- Trigger for case_reservations table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'case_reservations') THEN
        DROP TRIGGER IF EXISTS audit_case_reservations ON public.case_reservations;
        CREATE TRIGGER audit_case_reservations AFTER INSERT OR UPDATE OR DELETE ON public.case_reservations
            FOR EACH ROW EXECUTE FUNCTION log_audit_event();
        RAISE NOTICE 'Created audit trigger for case_reservations';
    END IF;

    -- Trigger for purchase_orders table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'purchase_orders') THEN
        DROP TRIGGER IF EXISTS audit_purchase_orders ON public.purchase_orders;
        CREATE TRIGGER audit_purchase_orders AFTER INSERT OR UPDATE OR DELETE ON public.purchase_orders
            FOR EACH ROW EXECUTE FUNCTION log_audit_event();
        RAISE NOTICE 'Created audit trigger for purchase_orders';
    END IF;

    -- Trigger for transfers table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'transfers') THEN
        DROP TRIGGER IF EXISTS audit_transfers ON public.transfers;
        CREATE TRIGGER audit_transfers AFTER INSERT OR UPDATE OR DELETE ON public.transfers
            FOR EACH ROW EXECUTE FUNCTION log_audit_event();
        RAISE NOTICE 'Created audit trigger for transfers';
    END IF;
END $$;

-- =====================================================
-- 9. RLS สำหรับ audit_logs
-- =====================================================
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if exists and recreate
DROP POLICY IF EXISTS "Admin can view all audit logs" ON public.audit_logs;
CREATE POLICY "Admin can view all audit logs" ON public.audit_logs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE public.users.id = auth.uid() 
            AND public.users.role = 'admin'
        )
    );

-- =====================================================
-- 10. อัพเดท RLS สำหรับ case_reservations (เฉพาะทันตแพทย์จองได้)
-- =====================================================
DROP POLICY IF EXISTS "Dentists can create reservations" ON public.case_reservations;
CREATE POLICY "Dentists can create reservations" ON public.case_reservations
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND role = 'dentist'
        )
    );

-- =====================================================
-- 11. สร้าง Views สำหรับ Audit Logs
-- =====================================================
CREATE OR REPLACE VIEW public.audit_logs_summary AS
SELECT 
    DATE(created_at) as log_date,
    action,
    table_name,
    COUNT(*) as total_actions,
    COUNT(DISTINCT user_id) as unique_users
FROM public.audit_logs
GROUP BY DATE(created_at), action, table_name
ORDER BY log_date DESC, total_actions DESC;

CREATE OR REPLACE VIEW public.user_activity_logs AS
SELECT 
    al.id,
    al.user_id,
    al.user_email,
    al.user_name,
    al.user_role,
    al.action,
    al.table_name,
    al.record_id,
    al.description,
    al.changed_fields,
    al.ip_address,
    al.created_at,
    CASE 
        WHEN al.action = 'LOGIN' THEN 'เข้าสู่ระบบ'
        WHEN al.action = 'LOGOUT' THEN 'ออกจากระบบ'
        WHEN al.action = 'INSERT' THEN 'สร้างข้อมูล'
        WHEN al.action = 'UPDATE' THEN 'แก้ไขข้อมูล'
        WHEN al.action = 'DELETE' THEN 'ลบข้อมูล'
        ELSE al.action
    END as action_thai
FROM public.audit_logs al
ORDER BY al.created_at DESC;

-- =====================================================
-- 12. สร้าง View สำหรับเคสด่วน 48 ชั่วโมง
-- =====================================================
CREATE OR REPLACE VIEW public.urgent_cases_48h AS
SELECT 
    c.id,
    c.case_number,
    c.surgery_date,
    c.status,
    c.tooth_number,
    p.hn_number,
    p.first_name || ' ' || p.last_name as patient_name,
    u.full_name as dentist_name,
    c.surgery_date - CURRENT_DATE as days_until_surgery,
    CASE 
        WHEN c.status = 'red' THEN 'วัสดุไม่พอ - ต้องดำเนินการด่วน'
        WHEN c.status = 'gray' THEN 'ยังไม่จองวัสดุ'
        WHEN c.status = 'yellow' THEN 'รอวัสดุจากการสั่งซื้อ'
        ELSE 'ปกติ'
    END as alert_message
FROM public.cases c
JOIN public.patients p ON c.patient_id = p.id
LEFT JOIN public.users u ON c.dentist_id = u.id
WHERE c.surgery_date <= CURRENT_DATE + INTERVAL '2 days'
AND c.surgery_date >= CURRENT_DATE
AND c.status NOT IN ('completed', 'cancelled', 'green')
ORDER BY c.surgery_date ASC, 
    CASE c.status 
        WHEN 'red' THEN 1 
        WHEN 'gray' THEN 2 
        WHEN 'yellow' THEN 3 
        ELSE 4 
    END;

-- =====================================================
-- 13. สร้าง View สำหรับ Out-of-Stock Requests
-- =====================================================
CREATE OR REPLACE VIEW public.pending_stock_requests AS
SELECT 
    cr.id as reservation_id,
    cr.case_id,
    c.case_number,
    c.surgery_date,
    p.name as product_name,
    p.ref_number,
    p.sku,
    cr.quantity as requested_quantity,
    COALESCE(SUM(i.available_quantity), 0) as available_in_stock,
    cr.quantity - COALESCE(SUM(i.available_quantity), 0) as shortage,
    u.full_name as requested_by,
    cr.created_at as requested_at
FROM public.case_reservations cr
JOIN public.cases c ON cr.case_id = c.id
JOIN public.products p ON cr.product_id = p.id
LEFT JOIN public.inventory i ON i.product_id = p.id AND i.available_quantity > 0
LEFT JOIN public.users u ON c.dentist_id = u.id
WHERE cr.is_out_of_stock = true
AND cr.status NOT IN ('cancelled', 'used')
GROUP BY cr.id, cr.case_id, c.case_number, c.surgery_date, 
         p.name, p.ref_number, p.sku, cr.quantity, u.full_name, cr.created_at
ORDER BY c.surgery_date ASC;

-- =====================================================
-- Grant permissions
-- =====================================================
GRANT SELECT ON public.audit_logs TO authenticated;
GRANT SELECT ON public.audit_logs_summary TO authenticated;
GRANT SELECT ON public.user_activity_logs TO authenticated;
GRANT SELECT ON public.urgent_cases_48h TO authenticated;
GRANT SELECT ON public.pending_stock_requests TO authenticated;

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'DentalStock Management System - Migration Complete!';
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'Updates applied:';
    RAISE NOTICE '- Added ref_number column to products';
    RAISE NOTICE '- Made SKU optional';
    RAISE NOTICE '- Added is_out_of_stock to case_reservations';
    RAISE NOTICE '- Created audit_logs table and triggers';
    RAISE NOTICE '- Updated RLS policies for dentist-only reservations';
    RAISE NOTICE '- Created urgent_cases_48h view';
    RAISE NOTICE '- Created pending_stock_requests view';
    RAISE NOTICE '=====================================================';
END $$;
