-- =============================================
-- Migration 003: Audit Log System
-- เก็บประวัติทุกการเปลี่ยนแปลงในระบบ
-- =============================================

-- สร้างตาราง audit_logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- ข้อมูลผู้ทำรายการ
    user_id UUID REFERENCES users(id),
    user_email TEXT,
    user_name TEXT,
    user_role TEXT,
    
    -- ข้อมูลการกระทำ
    action TEXT NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT'
    table_name TEXT,
    record_id UUID,
    
    -- ข้อมูลก่อน/หลังเปลี่ยนแปลง
    old_data JSONB,
    new_data JSONB,
    changed_fields TEXT[], -- รายการ fields ที่เปลี่ยน
    
    -- ข้อมูลเพิ่มเติม
    description TEXT,
    ip_address TEXT,
    user_agent TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- สร้าง indexes สำหรับ performance
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_table_name ON audit_logs(table_name);
CREATE INDEX idx_audit_logs_record_id ON audit_logs(record_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- Function สำหรับบันทึก audit log
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
    -- ดึงข้อมูล user จาก auth.uid()
    v_user_id := auth.uid();
    
    IF v_user_id IS NOT NULL THEN
        SELECT email, full_name, role INTO v_user_email, v_user_name, v_user_role
        FROM users WHERE id = v_user_id;
    END IF;
    
    -- กำหนดข้อมูลตาม action
    IF TG_OP = 'INSERT' THEN
        v_new_data := to_jsonb(NEW);
        v_description := 'สร้างข้อมูลใหม่ใน ' || TG_TABLE_NAME;
        
        INSERT INTO audit_logs (
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
        
        -- หา fields ที่เปลี่ยนแปลง
        v_changed_fields := ARRAY[]::TEXT[];
        FOR v_key IN SELECT jsonb_object_keys(v_new_data)
        LOOP
            IF v_old_data->v_key IS DISTINCT FROM v_new_data->v_key THEN
                v_changed_fields := array_append(v_changed_fields, v_key);
            END IF;
        END LOOP;
        
        -- บันทึกเฉพาะเมื่อมีการเปลี่ยนแปลงจริง (ไม่รวม updated_at)
        IF array_length(v_changed_fields, 1) > 0 AND 
           NOT (array_length(v_changed_fields, 1) = 1 AND v_changed_fields[1] = 'updated_at') THEN
            v_description := 'แก้ไขข้อมูลใน ' || TG_TABLE_NAME || ': ' || array_to_string(v_changed_fields, ', ');
            
            INSERT INTO audit_logs (
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
        
        INSERT INTO audit_logs (
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

-- สร้าง triggers สำหรับทุกตารางหลัก
DROP TRIGGER IF EXISTS audit_users ON users;
CREATE TRIGGER audit_users
    AFTER INSERT OR UPDATE OR DELETE ON users
    FOR EACH ROW EXECUTE FUNCTION log_audit_event();

DROP TRIGGER IF EXISTS audit_patients ON patients;
CREATE TRIGGER audit_patients
    AFTER INSERT OR UPDATE OR DELETE ON patients
    FOR EACH ROW EXECUTE FUNCTION log_audit_event();

DROP TRIGGER IF EXISTS audit_products ON products;
CREATE TRIGGER audit_products
    AFTER INSERT OR UPDATE OR DELETE ON products
    FOR EACH ROW EXECUTE FUNCTION log_audit_event();

DROP TRIGGER IF EXISTS audit_inventory ON inventory;
CREATE TRIGGER audit_inventory
    AFTER INSERT OR UPDATE OR DELETE ON inventory
    FOR EACH ROW EXECUTE FUNCTION log_audit_event();

DROP TRIGGER IF EXISTS audit_cases ON cases;
CREATE TRIGGER audit_cases
    AFTER INSERT OR UPDATE OR DELETE ON cases
    FOR EACH ROW EXECUTE FUNCTION log_audit_event();

DROP TRIGGER IF EXISTS audit_case_reservations ON case_reservations;
CREATE TRIGGER audit_case_reservations
    AFTER INSERT OR UPDATE OR DELETE ON case_reservations
    FOR EACH ROW EXECUTE FUNCTION log_audit_event();

DROP TRIGGER IF EXISTS audit_purchase_orders ON purchase_orders;
CREATE TRIGGER audit_purchase_orders
    AFTER INSERT OR UPDATE OR DELETE ON purchase_orders
    FOR EACH ROW EXECUTE FUNCTION log_audit_event();

DROP TRIGGER IF EXISTS audit_inventory_transfers ON inventory_transfers;
CREATE TRIGGER audit_inventory_transfers
    AFTER INSERT OR UPDATE OR DELETE ON inventory_transfers
    FOR EACH ROW EXECUTE FUNCTION log_audit_event();

-- Function สำหรับบันทึก login/logout events
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
    -- ดึงข้อมูล user
    SELECT full_name, role INTO v_user_name, v_user_role
    FROM users WHERE id = p_user_id;
    
    INSERT INTO audit_logs (
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

-- RLS Policies สำหรับ audit_logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- เฉพาะ Admin เท่านั้นที่ดู audit logs ได้
CREATE POLICY "Admin can view all audit logs" ON audit_logs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

-- ไม่มีใครแก้ไข/ลบ audit logs ได้ (immutable)
-- INSERT จะทำผ่าน SECURITY DEFINER functions เท่านั้น

-- View สำหรับดู audit logs แบบสรุป
CREATE OR REPLACE VIEW audit_logs_summary AS
SELECT 
    DATE(created_at) as log_date,
    action,
    table_name,
    COUNT(*) as total_actions,
    COUNT(DISTINCT user_id) as unique_users
FROM audit_logs
GROUP BY DATE(created_at), action, table_name
ORDER BY log_date DESC, total_actions DESC;

-- View สำหรับดู user activity
CREATE OR REPLACE VIEW user_activity_logs AS
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
FROM audit_logs al
ORDER BY al.created_at DESC;

-- Grant permissions
GRANT SELECT ON audit_logs TO authenticated;
GRANT SELECT ON audit_logs_summary TO authenticated;
GRANT SELECT ON user_activity_logs TO authenticated;
