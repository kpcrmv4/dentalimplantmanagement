-- =====================================================
-- DentalStock Management System - Fix RLS Policies
-- Version: 1.0.0
-- Description: แก้ไข RLS policies ให้ทำงานได้ถูกต้อง
-- =====================================================

-- ตัวเลือกที่ 1: ปิด RLS ชั่วคราวเพื่อทดสอบ (ไม่แนะนำสำหรับ production)
-- หากต้องการปิด RLS ให้ uncomment บรรทัดด้านล่าง

-- ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.patients DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.product_categories DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.products DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.suppliers DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.inventory DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.cases DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.case_reservations DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.stock_movements DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.purchase_orders DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.purchase_order_items DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.transfers DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.transfer_items DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.notifications DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.settings DISABLE ROW LEVEL SECURITY;

-- =====================================================
-- ตัวเลือกที่ 2: สร้าง helper function และแก้ไข policies
-- =====================================================

-- สร้าง function สำหรับเช็ค user role
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS user_role AS $$
DECLARE
    user_role_val user_role;
BEGIN
    SELECT role INTO user_role_val
    FROM public.users
    WHERE id = auth.uid();
    
    RETURN COALESCE(user_role_val, 'assistant'::user_role);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- สร้าง function สำหรับเช็คว่า user เป็น admin หรือไม่
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- สร้าง function สำหรับเช็คว่า user เป็น dentist หรือไม่
CREATE OR REPLACE FUNCTION public.is_dentist()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() AND role = 'dentist'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- สร้าง function สำหรับเช็คว่า user เป็น stock_staff หรือไม่
CREATE OR REPLACE FUNCTION public.is_stock_staff()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() AND role IN ('admin', 'stock_staff')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- สร้าง function สำหรับเช็คว่า user มีอยู่ในระบบหรือไม่
CREATE OR REPLACE FUNCTION public.is_authenticated_user()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() AND is_active = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- =====================================================
-- ลบ policies เก่าและสร้างใหม่
-- =====================================================

-- Users table policies
DROP POLICY IF EXISTS "Users are viewable by authenticated users" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Admin can manage users" ON public.users;

CREATE POLICY "Users can view all users" ON public.users
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE TO authenticated
    USING (auth.uid() = id);

CREATE POLICY "Admin can insert users" ON public.users
    FOR INSERT TO authenticated
    WITH CHECK (public.is_admin() OR auth.uid() = id);

CREATE POLICY "Admin can delete users" ON public.users
    FOR DELETE TO authenticated
    USING (public.is_admin());

-- Patients table policies
DROP POLICY IF EXISTS "Patients are viewable by authenticated users" ON public.patients;
DROP POLICY IF EXISTS "Patients can be managed by authorized roles" ON public.patients;

CREATE POLICY "Patients viewable by authenticated" ON public.patients
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "Patients can be managed" ON public.patients
    FOR ALL TO authenticated
    USING (public.is_authenticated_user());

-- Products table policies
DROP POLICY IF EXISTS "Products are viewable by authenticated users" ON public.products;
DROP POLICY IF EXISTS "Products can be managed by stock staff" ON public.products;

CREATE POLICY "Products viewable by authenticated" ON public.products
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "Products can be managed" ON public.products
    FOR ALL TO authenticated
    USING (public.is_authenticated_user());

-- Product Categories table policies
DROP POLICY IF EXISTS "Categories are viewable by authenticated users" ON public.product_categories;
DROP POLICY IF EXISTS "Categories can be managed by stock staff" ON public.product_categories;

CREATE POLICY "Categories viewable by authenticated" ON public.product_categories
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "Categories can be managed" ON public.product_categories
    FOR ALL TO authenticated
    USING (public.is_authenticated_user());

-- Inventory table policies
DROP POLICY IF EXISTS "Inventory is viewable by authenticated users" ON public.inventory;
DROP POLICY IF EXISTS "Inventory can be managed by stock staff" ON public.inventory;

CREATE POLICY "Inventory viewable by authenticated" ON public.inventory
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "Inventory can be managed" ON public.inventory
    FOR ALL TO authenticated
    USING (public.is_authenticated_user());

-- Cases table policies
DROP POLICY IF EXISTS "Cases are viewable by authenticated users" ON public.cases;
DROP POLICY IF EXISTS "Dentists can manage their cases" ON public.cases;
DROP POLICY IF EXISTS "Admin and CS can manage all cases" ON public.cases;

CREATE POLICY "Cases viewable by authenticated" ON public.cases
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "Cases can be managed" ON public.cases
    FOR ALL TO authenticated
    USING (public.is_authenticated_user());

-- Case Reservations table policies
DROP POLICY IF EXISTS "Reservations are viewable by authenticated users" ON public.case_reservations;
DROP POLICY IF EXISTS "Dentists can create reservations" ON public.case_reservations;
DROP POLICY IF EXISTS "Stock staff can update reservations" ON public.case_reservations;
DROP POLICY IF EXISTS "Dentists can update own reservations" ON public.case_reservations;
DROP POLICY IF EXISTS "Admin can delete reservations" ON public.case_reservations;

CREATE POLICY "Reservations viewable by authenticated" ON public.case_reservations
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "Dentists can create reservations" ON public.case_reservations
    FOR INSERT TO authenticated
    WITH CHECK (public.is_dentist() OR public.is_admin());

CREATE POLICY "Reservations can be updated" ON public.case_reservations
    FOR UPDATE TO authenticated
    USING (public.is_authenticated_user());

CREATE POLICY "Reservations can be deleted" ON public.case_reservations
    FOR DELETE TO authenticated
    USING (public.is_admin());

-- Stock Movements table policies
DROP POLICY IF EXISTS "Stock movements are viewable by authenticated users" ON public.stock_movements;
DROP POLICY IF EXISTS "Stock movements can be created by stock staff" ON public.stock_movements;

CREATE POLICY "Stock movements viewable by authenticated" ON public.stock_movements
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "Stock movements can be managed" ON public.stock_movements
    FOR ALL TO authenticated
    USING (public.is_authenticated_user());

-- Purchase Orders table policies
DROP POLICY IF EXISTS "Orders are viewable by authenticated users" ON public.purchase_orders;
DROP POLICY IF EXISTS "Orders can be managed by stock staff" ON public.purchase_orders;

CREATE POLICY "Orders viewable by authenticated" ON public.purchase_orders
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "Orders can be managed" ON public.purchase_orders
    FOR ALL TO authenticated
    USING (public.is_authenticated_user());

-- Purchase Order Items table policies
DROP POLICY IF EXISTS "Order items are viewable by authenticated users" ON public.purchase_order_items;
DROP POLICY IF EXISTS "Order items can be managed by stock staff" ON public.purchase_order_items;

CREATE POLICY "Order items viewable by authenticated" ON public.purchase_order_items
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "Order items can be managed" ON public.purchase_order_items
    FOR ALL TO authenticated
    USING (public.is_authenticated_user());

-- Transfers table policies
DROP POLICY IF EXISTS "Transfers are viewable by authenticated users" ON public.transfers;
DROP POLICY IF EXISTS "Transfers can be managed by stock staff" ON public.transfers;

CREATE POLICY "Transfers viewable by authenticated" ON public.transfers
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "Transfers can be managed" ON public.transfers
    FOR ALL TO authenticated
    USING (public.is_authenticated_user());

-- Transfer Items table policies
DROP POLICY IF EXISTS "Transfer items are viewable by authenticated users" ON public.transfer_items;
DROP POLICY IF EXISTS "Transfer items can be managed by stock staff" ON public.transfer_items;

CREATE POLICY "Transfer items viewable by authenticated" ON public.transfer_items
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "Transfer items can be managed" ON public.transfer_items
    FOR ALL TO authenticated
    USING (public.is_authenticated_user());

-- Suppliers table policies
DROP POLICY IF EXISTS "Suppliers are viewable by authenticated users" ON public.suppliers;
DROP POLICY IF EXISTS "Suppliers can be managed by stock staff" ON public.suppliers;

CREATE POLICY "Suppliers viewable by authenticated" ON public.suppliers
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "Suppliers can be managed" ON public.suppliers
    FOR ALL TO authenticated
    USING (public.is_authenticated_user());

-- Product Suppliers table policies (if exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'product_suppliers') THEN
        DROP POLICY IF EXISTS "Product suppliers viewable" ON public.product_suppliers;
        DROP POLICY IF EXISTS "Product suppliers manageable" ON public.product_suppliers;
        
        EXECUTE 'CREATE POLICY "Product suppliers viewable" ON public.product_suppliers FOR SELECT TO authenticated USING (true)';
        EXECUTE 'CREATE POLICY "Product suppliers manageable" ON public.product_suppliers FOR ALL TO authenticated USING (public.is_authenticated_user())';
    END IF;
END $$;

-- Notifications table policies (if exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications') THEN
        DROP POLICY IF EXISTS "Notifications viewable" ON public.notifications;
        DROP POLICY IF EXISTS "Notifications manageable" ON public.notifications;
        
        EXECUTE 'CREATE POLICY "Notifications viewable" ON public.notifications FOR SELECT TO authenticated USING (true)';
        EXECUTE 'CREATE POLICY "Notifications manageable" ON public.notifications FOR ALL TO authenticated USING (public.is_authenticated_user())';
    END IF;
END $$;

-- Settings table policies (if exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'settings') THEN
        DROP POLICY IF EXISTS "Settings viewable" ON public.settings;
        DROP POLICY IF EXISTS "Settings manageable" ON public.settings;
        
        EXECUTE 'CREATE POLICY "Settings viewable" ON public.settings FOR SELECT TO authenticated USING (true)';
        EXECUTE 'CREATE POLICY "Settings manageable" ON public.settings FOR ALL TO authenticated USING (public.is_admin())';
    END IF;
END $$;

-- Urgent Case Alerts table policies (if exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'urgent_case_alerts') THEN
        DROP POLICY IF EXISTS "Alerts viewable" ON public.urgent_case_alerts;
        DROP POLICY IF EXISTS "Alerts manageable" ON public.urgent_case_alerts;
        
        EXECUTE 'CREATE POLICY "Alerts viewable" ON public.urgent_case_alerts FOR SELECT TO authenticated USING (true)';
        EXECUTE 'CREATE POLICY "Alerts manageable" ON public.urgent_case_alerts FOR ALL TO authenticated USING (public.is_authenticated_user())';
    END IF;
END $$;

-- Audit Logs table policies (if exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_logs') THEN
        DROP POLICY IF EXISTS "Audit logs viewable by admin" ON public.audit_logs;
        
        EXECUTE 'CREATE POLICY "Audit logs viewable by admin" ON public.audit_logs FOR SELECT TO authenticated USING (public.is_admin())';
    END IF;
END $$;

-- =====================================================
-- Grant permissions
-- =====================================================
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- =====================================================
-- สรุป: หลังจากรัน SQL นี้แล้ว
-- 1. RLS policies จะถูกแก้ไขให้ง่ายขึ้น
-- 2. User ที่มีอยู่ในตาราง public.users จะสามารถเข้าถึงข้อมูลได้
-- 3. เฉพาะ dentist และ admin เท่านั้นที่สร้าง reservations ได้
-- =====================================================
