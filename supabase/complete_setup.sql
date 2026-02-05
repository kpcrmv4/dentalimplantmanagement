-- =====================================================
-- DentalStock Management System - Complete Database Setup
-- Version: 1.2.0
-- Last Updated: 2026-02-05
-- Description: Complete database schema with all migrations included
-- 
-- รันไฟล์นี้ไฟล์เดียวใน Supabase SQL Editor
-- ไม่ต้องรันไฟล์อื่นเพิ่มเติม
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- ENUM TYPES
-- =====================================================

-- User roles enum
CREATE TYPE user_role AS ENUM ('admin', 'dentist', 'stock_staff', 'assistant', 'cs');

-- Case status enum (Traffic Light System - 4 สี)
-- gray = ยังไม่จองวัสดุ
-- green = พร้อมผ่าตัด (วัสดุครบและเตรียมเรียบร้อย)
-- yellow = รอวัสดุ (สั่งซื้อแล้วแต่ยังมาไม่ถึง)
-- red = วัสดุไม่พอ (ต้องดำเนินการเร่งด่วน)
CREATE TYPE case_status AS ENUM ('gray', 'green', 'yellow', 'red', 'completed', 'cancelled');

-- Reservation status enum
CREATE TYPE reservation_status AS ENUM ('pending', 'confirmed', 'prepared', 'used', 'cancelled');

-- Order status enum
CREATE TYPE order_status AS ENUM ('draft', 'pending', 'approved', 'ordered', 'shipped', 'received', 'cancelled');

-- Transfer type enum
CREATE TYPE transfer_type AS ENUM ('borrow', 'return', 'exchange');

-- Transfer status enum
CREATE TYPE transfer_status AS ENUM ('pending', 'approved', 'completed', 'rejected');

-- Stock movement type enum
CREATE TYPE movement_type AS ENUM ('receive', 'use', 'adjust', 'transfer_out', 'transfer_in', 'expired', 'damaged');

-- =====================================================
-- TABLES
-- =====================================================

-- Users table (extends Supabase auth.users)
CREATE TABLE public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'assistant',
    phone TEXT,
    avatar_url TEXT,
    license_number TEXT, -- เลขใบอนุญาตประกอบวิชาชีพ (สำหรับทันตแพทย์)
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Patients table
CREATE TABLE public.patients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hn_number TEXT NOT NULL UNIQUE, -- Hospital Number
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    date_of_birth DATE,
    gender TEXT CHECK (gender IN ('male', 'female', 'other')),
    phone TEXT,
    email TEXT,
    address TEXT,
    medical_history TEXT,
    allergies TEXT,
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Product categories table
CREATE TABLE public.product_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Products table (Master data)
-- SKU เป็น optional, REF number เป็น primary identifier
CREATE TABLE public.products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sku TEXT, -- Optional: รหัสภายในคลินิก
    ref_number TEXT, -- REF number จากผู้ผลิต (เช่น 021.5308)
    name TEXT NOT NULL,
    description TEXT,
    category_id UUID REFERENCES public.product_categories(id),
    brand TEXT,
    unit TEXT NOT NULL DEFAULT 'piece', -- piece, box, pack, etc.
    unit_price DECIMAL(12, 2) NOT NULL DEFAULT 0,
    min_stock_level INTEGER NOT NULL DEFAULT 5,
    is_implant BOOLEAN NOT NULL DEFAULT false,
    specifications JSONB, -- For implant specs: diameter, length, platform, surface, material
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add comments for SKU and REF
COMMENT ON COLUMN public.products.sku IS 'Optional internal SKU code. Can be null if REF number is used as primary identifier.';
COMMENT ON COLUMN public.products.ref_number IS 'Reference number from manufacturer (e.g., 021.5308 for Straumann). Primary identifier for products.';

-- Suppliers table
CREATE TABLE public.suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    contact_person TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    tax_id TEXT,
    payment_terms TEXT,
    lead_time_days INTEGER DEFAULT 7,
    -- Supplier scoring
    on_time_delivery_score DECIMAL(5, 2) DEFAULT 100, -- 60% weight
    quality_score DECIMAL(5, 2) DEFAULT 100, -- 30% weight
    reliability_score DECIMAL(5, 2) DEFAULT 100, -- 10% weight
    overall_score DECIMAL(5, 2) GENERATED ALWAYS AS (
        (on_time_delivery_score * 0.6) + (quality_score * 0.3) + (reliability_score * 0.1)
    ) STORED,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Product suppliers (many-to-many)
CREATE TABLE public.product_suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
    supplier_sku TEXT,
    unit_cost DECIMAL(12, 2),
    is_preferred BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(product_id, supplier_id)
);

-- Inventory (Stock) table
CREATE TABLE public.inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    lot_number TEXT NOT NULL, -- LOT number (บังคับ)
    serial_number TEXT, -- For implants
    expiry_date DATE, -- Optional: วันหมดอายุ
    quantity INTEGER NOT NULL DEFAULT 0,
    reserved_quantity INTEGER NOT NULL DEFAULT 0, -- Quantity reserved for cases
    available_quantity INTEGER GENERATED ALWAYS AS (quantity - reserved_quantity) STORED,
    location TEXT, -- Storage location
    received_date DATE NOT NULL DEFAULT CURRENT_DATE,
    unit_cost DECIMAL(12, 2),
    supplier_id UUID REFERENCES public.suppliers(id),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(product_id, lot_number)
);

-- Surgery cases table
CREATE TABLE public.cases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_number TEXT NOT NULL UNIQUE,
    patient_id UUID NOT NULL REFERENCES public.patients(id),
    dentist_id UUID NOT NULL REFERENCES public.users(id),
    assistant_id UUID REFERENCES public.users(id),
    surgery_date DATE NOT NULL,
    surgery_time TIME,
    estimated_duration INTEGER DEFAULT 60, -- in minutes
    tooth_positions TEXT[], -- Array of tooth positions
    procedure_type TEXT,
    status case_status NOT NULL DEFAULT 'gray',
    notes TEXT,
    pre_op_notes TEXT,
    post_op_notes TEXT,
    is_emergency BOOLEAN DEFAULT false,
    completed_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    cancelled_reason TEXT,
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Case reservations (materials reserved for a case)
-- เฉพาะทันตแพทย์เท่านั้นที่สามารถสร้างการจองได้
CREATE TABLE public.case_reservations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
    inventory_id UUID REFERENCES public.inventory(id), -- NULL สำหรับ out-of-stock reservations
    product_id UUID NOT NULL REFERENCES public.products(id),
    quantity INTEGER NOT NULL DEFAULT 1,
    status reservation_status NOT NULL DEFAULT 'pending',
    -- Out-of-stock reservation fields
    is_out_of_stock BOOLEAN DEFAULT false,
    requested_ref TEXT, -- REF ที่ต้องการ
    requested_lot TEXT, -- LOT ที่ต้องการ (ถ้ามี)
    requested_specs JSONB, -- Specifications ที่ต้องการ
    -- Tracking fields
    reserved_by UUID REFERENCES public.users(id),
    reserved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    prepared_by UUID REFERENCES public.users(id),
    prepared_at TIMESTAMPTZ,
    used_quantity INTEGER DEFAULT 0,
    used_at TIMESTAMPTZ,
    used_by UUID REFERENCES public.users(id),
    photo_evidence TEXT[], -- URLs to photos
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Stock movements (audit trail)
CREATE TABLE public.stock_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    inventory_id UUID NOT NULL REFERENCES public.inventory(id),
    product_id UUID NOT NULL REFERENCES public.products(id),
    movement_type movement_type NOT NULL,
    quantity INTEGER NOT NULL, -- Positive for in, negative for out
    reference_type TEXT, -- 'case', 'order', 'transfer', 'adjustment'
    reference_id UUID,
    lot_number TEXT,
    notes TEXT,
    performed_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Purchase orders table
CREATE TABLE public.purchase_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    po_number TEXT NOT NULL UNIQUE,
    supplier_id UUID NOT NULL REFERENCES public.suppliers(id),
    status order_status NOT NULL DEFAULT 'draft',
    order_date DATE,
    expected_delivery_date DATE,
    actual_delivery_date DATE,
    subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0,
    tax_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
    total_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
    notes TEXT,
    created_by UUID REFERENCES public.users(id),
    approved_by UUID REFERENCES public.users(id),
    approved_at TIMESTAMPTZ,
    received_by UUID REFERENCES public.users(id),
    received_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Purchase order items
CREATE TABLE public.purchase_order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id),
    quantity INTEGER NOT NULL,
    unit_cost DECIMAL(12, 2) NOT NULL,
    total_cost DECIMAL(12, 2) GENERATED ALWAYS AS (quantity * unit_cost) STORED,
    received_quantity INTEGER DEFAULT 0,
    lot_number TEXT,
    expiry_date DATE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Transfers (borrow/return/exchange with suppliers)
CREATE TABLE public.transfers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transfer_number TEXT NOT NULL UNIQUE,
    transfer_type transfer_type NOT NULL,
    supplier_id UUID REFERENCES public.suppliers(id),
    status transfer_status NOT NULL DEFAULT 'pending',
    transfer_date DATE NOT NULL DEFAULT CURRENT_DATE,
    return_due_date DATE,
    actual_return_date DATE,
    notes TEXT,
    created_by UUID REFERENCES public.users(id),
    approved_by UUID REFERENCES public.users(id),
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Transfer items
CREATE TABLE public.transfer_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transfer_id UUID NOT NULL REFERENCES public.transfers(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id),
    quantity INTEGER NOT NULL,
    lot_number TEXT,
    serial_number TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Notifications table
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'info', -- info, warning, error, success
    reference_type TEXT, -- 'case', 'order', 'inventory', etc.
    reference_id UUID,
    is_read BOOLEAN NOT NULL DEFAULT false,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- System settings table
CREATE TABLE public.settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key TEXT NOT NULL UNIQUE,
    value JSONB NOT NULL,
    description TEXT,
    updated_by UUID REFERENCES public.users(id),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Urgent case alerts table (สำหรับแจ้งเตือนเคสด่วน 48 ชม. และสินค้าไม่มีในสต็อก)
CREATE TABLE public.urgent_case_alerts (
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

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX idx_patients_hn_number ON public.patients(hn_number);
CREATE INDEX idx_patients_name ON public.patients(first_name, last_name);
CREATE INDEX idx_products_sku ON public.products(sku);
CREATE INDEX idx_products_ref ON public.products(ref_number);
CREATE INDEX idx_products_category ON public.products(category_id);
CREATE INDEX idx_inventory_product ON public.inventory(product_id);
CREATE INDEX idx_inventory_lot ON public.inventory(lot_number);
CREATE INDEX idx_inventory_expiry ON public.inventory(expiry_date);
CREATE INDEX idx_cases_date ON public.cases(surgery_date);
CREATE INDEX idx_cases_status ON public.cases(status);
CREATE INDEX idx_cases_dentist ON public.cases(dentist_id);
CREATE INDEX idx_cases_patient ON public.cases(patient_id);
CREATE INDEX idx_case_reservations_case ON public.case_reservations(case_id);
CREATE INDEX idx_stock_movements_inventory ON public.stock_movements(inventory_id);
CREATE INDEX idx_stock_movements_date ON public.stock_movements(created_at);
CREATE INDEX idx_purchase_orders_supplier ON public.purchase_orders(supplier_id);
CREATE INDEX idx_purchase_orders_status ON public.purchase_orders(status);
CREATE INDEX idx_notifications_user ON public.notifications(user_id);
CREATE INDEX idx_notifications_unread ON public.notifications(user_id, is_read) WHERE is_read = false;

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to generate case number
CREATE OR REPLACE FUNCTION generate_case_number()
RETURNS TRIGGER AS $$
DECLARE
    year_prefix TEXT;
    next_number INTEGER;
BEGIN
    year_prefix := TO_CHAR(NEW.surgery_date, 'YYYY');
    SELECT COALESCE(MAX(CAST(SUBSTRING(case_number FROM 6) AS INTEGER)), 0) + 1
    INTO next_number
    FROM public.cases
    WHERE case_number LIKE year_prefix || '-%';
    
    NEW.case_number := year_prefix || '-' || LPAD(next_number::TEXT, 5, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to generate PO number
CREATE OR REPLACE FUNCTION generate_po_number()
RETURNS TRIGGER AS $$
DECLARE
    year_month_prefix TEXT;
    next_number INTEGER;
BEGIN
    year_month_prefix := 'PO' || TO_CHAR(NOW(), 'YYMM');
    SELECT COALESCE(MAX(CAST(SUBSTRING(po_number FROM 7) AS INTEGER)), 0) + 1
    INTO next_number
    FROM public.purchase_orders
    WHERE po_number LIKE year_month_prefix || '%';
    
    NEW.po_number := year_month_prefix || LPAD(next_number::TEXT, 4, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to generate transfer number
CREATE OR REPLACE FUNCTION generate_transfer_number()
RETURNS TRIGGER AS $$
DECLARE
    prefix TEXT;
    year_month TEXT;
    next_number INTEGER;
BEGIN
    prefix := CASE NEW.transfer_type
        WHEN 'borrow' THEN 'BR'
        WHEN 'return' THEN 'RT'
        WHEN 'exchange' THEN 'EX'
    END;
    year_month := TO_CHAR(NOW(), 'YYMM');
    
    SELECT COALESCE(MAX(CAST(SUBSTRING(transfer_number FROM 7) AS INTEGER)), 0) + 1
    INTO next_number
    FROM public.transfers
    WHERE transfer_number LIKE prefix || year_month || '%';
    
    NEW.transfer_number := prefix || year_month || LPAD(next_number::TEXT, 4, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update case status based on reservations
CREATE OR REPLACE FUNCTION update_case_status()
RETURNS TRIGGER AS $$
DECLARE
    v_case_id UUID;
    v_total_items INTEGER;
    v_prepared_items INTEGER;
    v_has_out_of_stock BOOLEAN;
    v_has_insufficient BOOLEAN;
BEGIN
    -- Get case_id from the affected row
    v_case_id := COALESCE(NEW.case_id, OLD.case_id);
    
    -- Count total and prepared reservations
    SELECT 
        COUNT(*),
        COUNT(*) FILTER (WHERE status IN ('prepared', 'used'))
    INTO v_total_items, v_prepared_items
    FROM public.case_reservations
    WHERE case_id = v_case_id AND status != 'cancelled';
    
    -- Check if any reservation is out of stock
    SELECT EXISTS(
        SELECT 1 FROM public.case_reservations
        WHERE case_id = v_case_id 
        AND is_out_of_stock = true
        AND status NOT IN ('cancelled', 'used')
    ) INTO v_has_out_of_stock;
    
    -- Check if any reservation has insufficient stock
    SELECT EXISTS(
        SELECT 1 FROM public.case_reservations cr
        JOIN public.inventory i ON cr.inventory_id = i.id
        WHERE cr.case_id = v_case_id 
        AND cr.status NOT IN ('cancelled', 'used')
        AND cr.is_out_of_stock = false
        AND i.available_quantity < cr.quantity
    ) INTO v_has_insufficient;
    
    -- Update case status based on conditions
    UPDATE public.cases SET status = 
        CASE
            WHEN v_total_items = 0 THEN 'gray'::case_status
            WHEN v_has_out_of_stock OR v_has_insufficient THEN 'red'::case_status
            WHEN v_prepared_items < v_total_items THEN 'yellow'::case_status
            ELSE 'green'::case_status
        END
    WHERE id = v_case_id AND status NOT IN ('completed', 'cancelled');
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Function to update inventory reserved quantity
CREATE OR REPLACE FUNCTION update_inventory_reserved()
RETURNS TRIGGER AS $$
BEGIN
    -- Skip if out of stock reservation (no inventory_id)
    IF TG_OP = 'INSERT' AND NEW.inventory_id IS NOT NULL THEN
        UPDATE public.inventory 
        SET reserved_quantity = reserved_quantity + NEW.quantity
        WHERE id = NEW.inventory_id;
    ELSIF TG_OP = 'UPDATE' AND OLD.inventory_id IS NOT NULL AND NEW.inventory_id IS NOT NULL THEN
        UPDATE public.inventory 
        SET reserved_quantity = reserved_quantity - OLD.quantity + NEW.quantity
        WHERE id = NEW.inventory_id;
    ELSIF TG_OP = 'DELETE' AND OLD.inventory_id IS NOT NULL THEN
        UPDATE public.inventory 
        SET reserved_quantity = reserved_quantity - OLD.quantity
        WHERE id = OLD.inventory_id;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Function to get FEFO inventory (First Expiry First Out)
CREATE OR REPLACE FUNCTION get_fefo_inventory(p_product_id UUID, p_quantity INTEGER)
RETURNS TABLE (
    inventory_id UUID,
    lot_number TEXT,
    expiry_date DATE,
    available INTEGER,
    to_use INTEGER
) AS $$
DECLARE
    remaining INTEGER := p_quantity;
    rec RECORD;
BEGIN
    FOR rec IN 
        SELECT i.id, i.lot_number, i.expiry_date, i.available_quantity
        FROM public.inventory i
        WHERE i.product_id = p_product_id 
        AND i.available_quantity > 0
        AND (i.expiry_date IS NULL OR i.expiry_date > CURRENT_DATE)
        ORDER BY i.expiry_date NULLS LAST, i.received_date
    LOOP
        IF remaining <= 0 THEN
            EXIT;
        END IF;
        
        inventory_id := rec.id;
        lot_number := rec.lot_number;
        expiry_date := rec.expiry_date;
        available := rec.available_quantity;
        to_use := LEAST(rec.available_quantity, remaining);
        remaining := remaining - to_use;
        
        RETURN NEXT;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to create alert when out-of-stock reservation is made
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
            'วัสดุ ' || p.name || ' (REF: ' || COALESCE(NEW.requested_ref, p.ref_number, p.sku, 'N/A') || ') ไม่มีในสต็อก สำหรับเคส ' || c.case_number
        FROM public.cases c
        JOIN public.products p ON p.id = NEW.product_id
        WHERE c.id = NEW.case_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to check and create urgent case alerts
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

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Updated_at triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_patients_updated_at BEFORE UPDATE ON public.patients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON public.suppliers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_inventory_updated_at BEFORE UPDATE ON public.inventory
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cases_updated_at BEFORE UPDATE ON public.cases
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_case_reservations_updated_at BEFORE UPDATE ON public.case_reservations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_purchase_orders_updated_at BEFORE UPDATE ON public.purchase_orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transfers_updated_at BEFORE UPDATE ON public.transfers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-generate numbers
CREATE TRIGGER generate_case_number_trigger BEFORE INSERT ON public.cases
    FOR EACH ROW WHEN (NEW.case_number IS NULL)
    EXECUTE FUNCTION generate_case_number();

CREATE TRIGGER generate_po_number_trigger BEFORE INSERT ON public.purchase_orders
    FOR EACH ROW WHEN (NEW.po_number IS NULL)
    EXECUTE FUNCTION generate_po_number();

CREATE TRIGGER generate_transfer_number_trigger BEFORE INSERT ON public.transfers
    FOR EACH ROW WHEN (NEW.transfer_number IS NULL)
    EXECUTE FUNCTION generate_transfer_number();

-- Case status update triggers
CREATE TRIGGER update_case_status_on_reservation_change
    AFTER INSERT OR UPDATE OR DELETE ON public.case_reservations
    FOR EACH ROW EXECUTE FUNCTION update_case_status();

-- Inventory reserved quantity triggers
CREATE TRIGGER update_inventory_reserved_on_reservation
    AFTER INSERT OR UPDATE OR DELETE ON public.case_reservations
    FOR EACH ROW EXECUTE FUNCTION update_inventory_reserved();

-- Out-of-stock alert trigger
CREATE TRIGGER trigger_out_of_stock_alert
    AFTER INSERT ON public.case_reservations
    FOR EACH ROW
    EXECUTE FUNCTION create_out_of_stock_alert();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transfer_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.urgent_case_alerts ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Users: Everyone can read, only admin can modify
CREATE POLICY "Users are viewable by authenticated users" ON public.users
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admin can manage users" ON public.users
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
    );

-- Patients: All authenticated users can read, specific roles can modify
CREATE POLICY "Patients are viewable by authenticated users" ON public.patients
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Patients can be managed by authorized roles" ON public.patients
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'dentist', 'cs')
        )
    );

-- Products & Categories: All can read, stock_staff and admin can modify
CREATE POLICY "Products are viewable by authenticated users" ON public.products
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Products can be managed by stock staff" ON public.products
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'stock_staff')
        )
    );

CREATE POLICY "Categories are viewable by authenticated users" ON public.product_categories
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Categories can be managed by stock staff" ON public.product_categories
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'stock_staff')
        )
    );

-- Inventory: All can read, stock_staff can modify
CREATE POLICY "Inventory is viewable by authenticated users" ON public.inventory
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Inventory can be managed by stock staff" ON public.inventory
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'stock_staff')
        )
    );

-- Cases: All can read, dentists can create/modify their own
CREATE POLICY "Cases are viewable by authenticated users" ON public.cases
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Dentists can manage their cases" ON public.cases
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND (role = 'admin' OR (role = 'dentist' AND auth.uid() = dentist_id))
        )
    );

CREATE POLICY "Admin and CS can manage all cases" ON public.cases
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'cs')
        )
    );

-- Case Reservations: เฉพาะทันตแพทย์เท่านั้นที่สร้างการจองได้
CREATE POLICY "Reservations are viewable by authenticated users" ON public.case_reservations
    FOR SELECT USING (auth.role() = 'authenticated');

-- Only dentists can CREATE reservations
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

-- Stock Movements: All can read, stock_staff can create
CREATE POLICY "Stock movements are viewable by authenticated users" ON public.stock_movements
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Stock movements can be created by stock staff" ON public.stock_movements
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'stock_staff', 'assistant')
        )
    );

-- Purchase Orders
CREATE POLICY "Orders are viewable by authenticated users" ON public.purchase_orders
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Orders can be managed by stock staff" ON public.purchase_orders
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'stock_staff')
        )
    );

CREATE POLICY "Order items are viewable by authenticated users" ON public.purchase_order_items
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Order items can be managed by stock staff" ON public.purchase_order_items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'stock_staff')
        )
    );

-- Transfers
CREATE POLICY "Transfers are viewable by authenticated users" ON public.transfers
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Transfers can be managed by stock staff" ON public.transfers
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'stock_staff')
        )
    );

CREATE POLICY "Transfer items are viewable by authenticated users" ON public.transfer_items
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Transfer items can be managed by stock staff" ON public.transfer_items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'stock_staff')
        )
    );

-- Suppliers
CREATE POLICY "Suppliers are viewable by authenticated users" ON public.suppliers
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Suppliers can be managed by stock staff" ON public.suppliers
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'stock_staff')
        )
    );

CREATE POLICY "Product suppliers are viewable by authenticated users" ON public.product_suppliers
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Product suppliers can be managed by stock staff" ON public.product_suppliers
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'stock_staff')
        )
    );

-- Notifications: Users can only see their own
CREATE POLICY "Users can view own notifications" ON public.notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications" ON public.notifications
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update own notifications" ON public.notifications
    FOR UPDATE USING (auth.uid() = user_id);

-- Settings: All can read, only admin can modify
CREATE POLICY "Settings are viewable by authenticated users" ON public.settings
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Settings can be managed by admin" ON public.settings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

-- Urgent Case Alerts
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
-- VIEWS
-- =====================================================

-- Dashboard summary view
CREATE OR REPLACE VIEW public.dashboard_summary AS
SELECT
    (SELECT COUNT(*) FROM public.cases WHERE DATE_TRUNC('month', surgery_date) = DATE_TRUNC('month', CURRENT_DATE)) as cases_this_month,
    (SELECT COUNT(*) FROM public.cases WHERE surgery_date >= CURRENT_DATE AND surgery_date <= CURRENT_DATE + INTERVAL '7 days' AND status NOT IN ('completed', 'cancelled')) as upcoming_cases,
    (SELECT COUNT(*) FROM public.cases WHERE status = 'red') as cases_not_ready,
    (SELECT COUNT(*) FROM public.cases WHERE status = 'gray') as cases_not_reserved,
    (SELECT COUNT(*) FROM public.inventory i JOIN public.products p ON i.product_id = p.id WHERE i.available_quantity <= p.min_stock_level) as low_stock_items,
    (SELECT COUNT(*) FROM public.inventory WHERE expiry_date IS NOT NULL AND expiry_date <= CURRENT_DATE + INTERVAL '30 days') as expiring_soon_items,
    (SELECT COUNT(*) FROM public.urgent_case_alerts WHERE is_resolved = false) as urgent_alerts;

-- Low stock items view
CREATE OR REPLACE VIEW public.low_stock_items AS
SELECT 
    p.id as product_id,
    p.sku,
    p.ref_number,
    p.name as product_name,
    p.min_stock_level,
    COALESCE(SUM(i.available_quantity), 0) as current_stock,
    p.min_stock_level - COALESCE(SUM(i.available_quantity), 0) as shortage
FROM public.products p
LEFT JOIN public.inventory i ON p.id = i.product_id
WHERE p.is_active = true
GROUP BY p.id, p.sku, p.ref_number, p.name, p.min_stock_level
HAVING COALESCE(SUM(i.available_quantity), 0) <= p.min_stock_level
ORDER BY shortage DESC;

-- Expiring items view
CREATE OR REPLACE VIEW public.expiring_items AS
SELECT 
    i.id as inventory_id,
    p.sku,
    p.ref_number,
    p.name as product_name,
    i.lot_number,
    i.expiry_date,
    i.available_quantity,
    i.expiry_date - CURRENT_DATE as days_until_expiry
FROM public.inventory i
JOIN public.products p ON i.product_id = p.id
WHERE i.expiry_date IS NOT NULL 
AND i.expiry_date <= CURRENT_DATE + INTERVAL '90 days'
AND i.available_quantity > 0
ORDER BY i.expiry_date;

-- View for out-of-stock reservations needing attention
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

-- View for urgent cases within 48 hours
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
-- DEFAULT DATA
-- =====================================================

-- Insert default product categories
INSERT INTO public.product_categories (name, description) VALUES
    ('Implants', 'Dental implants - รากเทียม'),
    ('Abutments', 'Implant abutments - หัวต่อรากเทียม'),
    ('Bone Grafts', 'Bone graft materials - วัสดุปลูกกระดูก'),
    ('Membranes', 'Barrier membranes - เมมเบรน'),
    ('Surgical Instruments', 'Surgical tools - เครื่องมือผ่าตัด'),
    ('Consumables', 'Disposable items - วัสดุสิ้นเปลือง'),
    ('Prosthetics', 'Prosthetic components - ชิ้นส่วนครอบฟัน')
ON CONFLICT (name) DO NOTHING;

-- Insert default settings
INSERT INTO public.settings (key, value, description) VALUES
    ('clinic_name', '"DentalStock Clinic"', 'ชื่อคลินิก'),
    ('emergency_alert_hours', '48', 'จำนวนชั่วโมงก่อนผ่าตัดที่จะแจ้งเตือนเคสด่วน'),
    ('low_stock_threshold_multiplier', '1.5', 'ตัวคูณสำหรับเตือนสต็อกต่ำ'),
    ('expiry_warning_days', '90', 'จำนวนวันก่อนหมดอายุที่จะแสดงคำเตือน')
ON CONFLICT (key) DO NOTHING;

-- =====================================================
-- SAMPLE SUPPLIERS
-- =====================================================

INSERT INTO public.suppliers (code, name, contact_person, phone, email, lead_time_days) VALUES
    ('SUP-001', 'Straumann Thailand', 'คุณสมชาย', '02-123-4567', 'contact@straumann.co.th', 7),
    ('SUP-002', 'Osstem Thailand', 'คุณวิภา', '02-234-5678', 'sales@osstem.co.th', 5),
    ('SUP-003', 'Geistlich Thailand', 'คุณมานะ', '02-345-6789', 'info@geistlich.co.th', 10),
    ('SUP-004', 'Nobel Biocare Thailand', 'คุณศิริ', '02-456-7890', 'order@nobelbiocare.co.th', 14),
    ('SUP-005', 'Dentium Thailand', 'คุณประเสริฐ', '02-567-8901', 'sales@dentium.co.th', 3)
ON CONFLICT (code) DO NOTHING;

-- =====================================================
-- SAMPLE PRODUCTS (ตัวอย่างสินค้าจริง)
-- =====================================================

-- Get category IDs
DO $$
DECLARE
    cat_implants UUID;
    cat_abutments UUID;
    cat_bone UUID;
    cat_membranes UUID;
    sup_straumann UUID;
    sup_osstem UUID;
    sup_geistlich UUID;
BEGIN
    SELECT id INTO cat_implants FROM public.product_categories WHERE name = 'Implants';
    SELECT id INTO cat_abutments FROM public.product_categories WHERE name = 'Abutments';
    SELECT id INTO cat_bone FROM public.product_categories WHERE name = 'Bone Grafts';
    SELECT id INTO cat_membranes FROM public.product_categories WHERE name = 'Membranes';
    SELECT id INTO sup_straumann FROM public.suppliers WHERE code = 'SUP-001';
    SELECT id INTO sup_osstem FROM public.suppliers WHERE code = 'SUP-002';
    SELECT id INTO sup_geistlich FROM public.suppliers WHERE code = 'SUP-003';

    -- Straumann Implants
    INSERT INTO public.products (sku, ref_number, name, brand, category_id, unit, unit_price, min_stock_level, is_implant, specifications) VALUES
    ('IMP-001', '021.5308', 'Bone Level Tapered Implant Ø4.1mm RC SLActive 8mm', 'Straumann', cat_implants, 'piece', 35000, 5, true, 
     '{"diameter": "4.1mm", "length": "8mm", "platform": "RC", "surface": "SLActive", "material": "Roxolid"}'),
    ('IMP-002', '021.5510', 'Bone Level Tapered Implant Ø4.1mm RC SLA 10mm', 'Straumann', cat_implants, 'piece', 32000, 5, true,
     '{"diameter": "4.1mm", "length": "10mm", "platform": "RC", "surface": "SLA", "material": "Roxolid"}'),
    ('IMP-003', '021.7308', 'Bone Level Tapered Implant Ø3.3mm NC SLActive 8mm', 'Straumann', cat_implants, 'piece', 35000, 3, true,
     '{"diameter": "3.3mm", "length": "8mm", "platform": "NC", "surface": "SLActive", "material": "Roxolid"}')
    ON CONFLICT DO NOTHING;

    -- Osstem Implants
    INSERT INTO public.products (sku, ref_number, name, brand, category_id, unit, unit_price, min_stock_level, is_implant, specifications) VALUES
    ('IMP-004', 'TSIII-4010', 'TS III SA Implant Ø4.0mm 10mm', 'Osstem', cat_implants, 'piece', 15000, 10, true,
     '{"diameter": "4.0mm", "length": "10mm", "platform": "Regular", "surface": "SA", "material": "Titanium Grade 4"}'),
    ('IMP-005', 'TSIII-4510', 'TS III SA Implant Ø4.5mm 10mm', 'Osstem', cat_implants, 'piece', 15000, 10, true,
     '{"diameter": "4.5mm", "length": "10mm", "platform": "Regular", "surface": "SA", "material": "Titanium Grade 4"}')
    ON CONFLICT DO NOTHING;

    -- Abutments
    INSERT INTO public.products (sku, ref_number, name, brand, category_id, unit, unit_price, min_stock_level, is_implant, specifications) VALUES
    ('ABT-001', '048.541', 'RC Healing Abutment Ø4.8mm H4mm', 'Straumann', cat_abutments, 'piece', 5000, 10, false,
     '{"diameter": "4.8mm", "height": "4mm", "platform": "RC"}'),
    ('ABT-002', '048.542', 'RC Healing Abutment Ø4.8mm H6mm', 'Straumann', cat_abutments, 'piece', 5000, 10, false,
     '{"diameter": "4.8mm", "height": "6mm", "platform": "RC"}')
    ON CONFLICT DO NOTHING;

    -- Bone Grafts
    INSERT INTO public.products (sku, ref_number, name, brand, category_id, unit, unit_price, min_stock_level, is_implant, specifications) VALUES
    ('BIO-001', 'S1-1020-050', 'Straumann XenoGraft L 0.5g', 'Straumann', cat_bone, 'box', 8500, 5, false,
     '{"size": "L", "weight": "0.5g", "particle_size": "1.0-2.0mm"}'),
    ('BIO-002', '30643', 'Bio-Oss Granules 0.5g (0.25-1mm)', 'Geistlich', cat_bone, 'box', 7500, 5, false,
     '{"weight": "0.5g", "particle_size": "0.25-1mm"}'),
    ('BIO-003', '30644', 'Bio-Oss Granules 1.0g (0.25-1mm)', 'Geistlich', cat_bone, 'box', 12000, 3, false,
     '{"weight": "1.0g", "particle_size": "0.25-1mm"}')
    ON CONFLICT DO NOTHING;

    -- Membranes
    INSERT INTO public.products (sku, ref_number, name, brand, category_id, unit, unit_price, min_stock_level, is_implant, specifications) VALUES
    ('MEM-001', 'OP2500685', 'OSSIX Plus 25x30mm', 'Datum Dental', cat_membranes, 'piece', 9500, 5, false,
     '{"size": "25x30mm", "type": "Resorbable Collagen"}'),
    ('MEM-002', '30921', 'Bio-Gide 25x25mm', 'Geistlich', cat_membranes, 'piece', 8500, 5, false,
     '{"size": "25x25mm", "type": "Resorbable Collagen"}')
    ON CONFLICT DO NOTHING;

END $$;

-- =====================================================
-- SAMPLE INVENTORY (สต็อกตัวอย่าง)
-- =====================================================

DO $$
DECLARE
    prod_id UUID;
    sup_id UUID;
BEGIN
    -- Get supplier IDs
    SELECT id INTO sup_id FROM public.suppliers WHERE code = 'SUP-001';

    -- Add inventory for Straumann Implants
    SELECT id INTO prod_id FROM public.products WHERE ref_number = '021.5308';
    IF prod_id IS NOT NULL THEN
        INSERT INTO public.inventory (product_id, lot_number, expiry_date, quantity, supplier_id) VALUES
        (prod_id, 'MWX80', '2027-09-18', 5, sup_id),
        (prod_id, 'MWX81', '2027-10-15', 3, sup_id)
        ON CONFLICT DO NOTHING;
    END IF;

    SELECT id INTO prod_id FROM public.products WHERE ref_number = '021.5510';
    IF prod_id IS NOT NULL THEN
        INSERT INTO public.inventory (product_id, lot_number, expiry_date, quantity, supplier_id) VALUES
        (prod_id, 'MWZ45', '2027-08-11', 4, sup_id)
        ON CONFLICT DO NOTHING;
    END IF;

    -- Get Osstem supplier
    SELECT id INTO sup_id FROM public.suppliers WHERE code = 'SUP-002';

    SELECT id INTO prod_id FROM public.products WHERE ref_number = 'TSIII-4010';
    IF prod_id IS NOT NULL THEN
        INSERT INTO public.inventory (product_id, lot_number, expiry_date, quantity, supplier_id) VALUES
        (prod_id, '2023112901', '2028-11-29', 15, sup_id)
        ON CONFLICT DO NOTHING;
    END IF;

    SELECT id INTO prod_id FROM public.products WHERE ref_number = 'TSIII-4510';
    IF prod_id IS NOT NULL THEN
        INSERT INTO public.inventory (product_id, lot_number, expiry_date, quantity, supplier_id) VALUES
        (prod_id, '2023112902', '2028-11-29', 12, sup_id)
        ON CONFLICT DO NOTHING;
    END IF;

    -- Abutments
    SELECT id INTO sup_id FROM public.suppliers WHERE code = 'SUP-001';
    SELECT id INTO prod_id FROM public.products WHERE ref_number = '048.541';
    IF prod_id IS NOT NULL THEN
        INSERT INTO public.inventory (product_id, lot_number, quantity, supplier_id) VALUES
        (prod_id, 'HA2024001', 20, sup_id)
        ON CONFLICT DO NOTHING;
    END IF;

    -- Bone Grafts
    SELECT id INTO sup_id FROM public.suppliers WHERE code = 'SUP-003';
    SELECT id INTO prod_id FROM public.products WHERE ref_number = 'S1-1020-050';
    IF prod_id IS NOT NULL THEN
        INSERT INTO public.inventory (product_id, lot_number, expiry_date, quantity, supplier_id) VALUES
        (prod_id, 'B241203B', '2027-05-29', 8, sup_id)
        ON CONFLICT DO NOTHING;
    END IF;

    SELECT id INTO prod_id FROM public.products WHERE ref_number = '30643';
    IF prod_id IS NOT NULL THEN
        INSERT INTO public.inventory (product_id, lot_number, expiry_date, quantity, supplier_id) VALUES
        (prod_id, 'BG2024001', '2027-06-30', 10, sup_id)
        ON CONFLICT DO NOTHING;
    END IF;

    -- Membranes
    SELECT id INTO prod_id FROM public.products WHERE ref_number = 'OP2500685';
    IF prod_id IS NOT NULL THEN
        INSERT INTO public.inventory (product_id, lot_number, expiry_date, quantity, supplier_id) VALUES
        (prod_id, 'OP2500685', '2026-02-20', 3, sup_id) -- ใกล้หมดอายุ
        ON CONFLICT DO NOTHING;
    END IF;

END $$;

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'DentalStock Management System - Setup Complete!';
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'Tables created: 16';
    RAISE NOTICE 'Views created: 5';
    RAISE NOTICE 'Functions created: 8';
    RAISE NOTICE 'Triggers created: 12';
    RAISE NOTICE 'RLS Policies created: 30+';
    RAISE NOTICE '';
    RAISE NOTICE 'Default data inserted:';
    RAISE NOTICE '- 7 Product Categories';
    RAISE NOTICE '- 5 Suppliers';
    RAISE NOTICE '- 10+ Sample Products';
    RAISE NOTICE '- Sample Inventory';
    RAISE NOTICE '- System Settings';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Create users via Supabase Auth';
    RAISE NOTICE '2. Add user profiles to public.users table';
    RAISE NOTICE '3. Start using the application!';
    RAISE NOTICE '=====================================================';
END $$;


-- =====================================================
-- AUDIT LOG SYSTEM
-- เก็บประวัติทุกการเปลี่ยนแปลงในระบบ
-- =====================================================

-- สร้างตาราง audit_logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- ข้อมูลผู้ทำรายการ
    user_id UUID REFERENCES public.users(id),
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
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name ON public.audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_record_id ON public.audit_logs(record_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

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
        SELECT email, full_name, role::TEXT INTO v_user_email, v_user_name, v_user_role
        FROM public.users WHERE id = v_user_id;
    END IF;
    
    -- กำหนดข้อมูลตาม action
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

-- สร้าง triggers สำหรับทุกตารางหลัก
DROP TRIGGER IF EXISTS audit_users ON public.users;
CREATE TRIGGER audit_users
    AFTER INSERT OR UPDATE OR DELETE ON public.users
    FOR EACH ROW EXECUTE FUNCTION log_audit_event();

DROP TRIGGER IF EXISTS audit_patients ON public.patients;
CREATE TRIGGER audit_patients
    AFTER INSERT OR UPDATE OR DELETE ON public.patients
    FOR EACH ROW EXECUTE FUNCTION log_audit_event();

DROP TRIGGER IF EXISTS audit_products ON public.products;
CREATE TRIGGER audit_products
    AFTER INSERT OR UPDATE OR DELETE ON public.products
    FOR EACH ROW EXECUTE FUNCTION log_audit_event();

DROP TRIGGER IF EXISTS audit_inventory ON public.inventory;
CREATE TRIGGER audit_inventory
    AFTER INSERT OR UPDATE OR DELETE ON public.inventory
    FOR EACH ROW EXECUTE FUNCTION log_audit_event();

DROP TRIGGER IF EXISTS audit_cases ON public.cases;
CREATE TRIGGER audit_cases
    AFTER INSERT OR UPDATE OR DELETE ON public.cases
    FOR EACH ROW EXECUTE FUNCTION log_audit_event();

DROP TRIGGER IF EXISTS audit_case_reservations ON public.case_reservations;
CREATE TRIGGER audit_case_reservations
    AFTER INSERT OR UPDATE OR DELETE ON public.case_reservations
    FOR EACH ROW EXECUTE FUNCTION log_audit_event();

DROP TRIGGER IF EXISTS audit_purchase_orders ON public.purchase_orders;
CREATE TRIGGER audit_purchase_orders
    AFTER INSERT OR UPDATE OR DELETE ON public.purchase_orders
    FOR EACH ROW EXECUTE FUNCTION log_audit_event();

DROP TRIGGER IF EXISTS audit_inventory_transfers ON public.inventory_transfers;
CREATE TRIGGER audit_inventory_transfers
    AFTER INSERT OR UPDATE OR DELETE ON public.inventory_transfers
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

-- RLS Policies สำหรับ audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- เฉพาะ Admin เท่านั้นที่ดู audit logs ได้
CREATE POLICY "Admin can view all audit logs" ON public.audit_logs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE public.users.id = auth.uid() 
            AND public.users.role = 'admin'
        )
    );

-- View สำหรับดู audit logs แบบสรุป
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

-- View สำหรับดู user activity
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

-- Grant permissions
GRANT SELECT ON public.audit_logs TO authenticated;
GRANT SELECT ON public.audit_logs_summary TO authenticated;
GRANT SELECT ON public.user_activity_logs TO authenticated;
