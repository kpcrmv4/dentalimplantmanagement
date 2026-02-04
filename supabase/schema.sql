-- =====================================================
-- DentalStock Management System - Supabase Database Schema
-- Version: 1.0.0
-- Description: Complete database schema for dental implant management
-- Run this file in Supabase SQL Editor
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- ENUM TYPES
-- =====================================================

-- User roles enum
CREATE TYPE user_role AS ENUM ('admin', 'dentist', 'stock_staff', 'assistant', 'cs');

-- Case status enum (Traffic Light System)
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
CREATE TABLE public.products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sku TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    category_id UUID REFERENCES public.product_categories(id),
    brand TEXT,
    unit TEXT NOT NULL DEFAULT 'piece', -- piece, box, pack, etc.
    unit_price DECIMAL(12, 2) NOT NULL DEFAULT 0,
    min_stock_level INTEGER NOT NULL DEFAULT 5,
    is_implant BOOLEAN NOT NULL DEFAULT false,
    specifications JSONB, -- For implant specs: diameter, length, platform, etc.
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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
    lot_number TEXT NOT NULL,
    serial_number TEXT, -- For implants
    expiry_date DATE,
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
CREATE TABLE public.case_reservations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
    inventory_id UUID NOT NULL REFERENCES public.inventory(id),
    product_id UUID NOT NULL REFERENCES public.products(id),
    quantity INTEGER NOT NULL DEFAULT 1,
    status reservation_status NOT NULL DEFAULT 'pending',
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
    inventory_id UUID REFERENCES public.inventory(id),
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

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX idx_patients_hn_number ON public.patients(hn_number);
CREATE INDEX idx_patients_name ON public.patients(first_name, last_name);
CREATE INDEX idx_products_sku ON public.products(sku);
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
    v_confirmed_items INTEGER;
    v_has_insufficient BOOLEAN;
    v_surgery_date DATE;
BEGIN
    -- Get case_id from the affected row
    v_case_id := COALESCE(NEW.case_id, OLD.case_id);
    
    -- Get case surgery date
    SELECT surgery_date INTO v_surgery_date FROM public.cases WHERE id = v_case_id;
    
    -- Count total and confirmed reservations
    SELECT 
        COUNT(*),
        COUNT(*) FILTER (WHERE status IN ('confirmed', 'prepared', 'used'))
    INTO v_total_items, v_confirmed_items
    FROM public.case_reservations
    WHERE case_id = v_case_id AND status != 'cancelled';
    
    -- Check if any reservation has insufficient stock
    SELECT EXISTS(
        SELECT 1 FROM public.case_reservations cr
        JOIN public.inventory i ON cr.inventory_id = i.id
        WHERE cr.case_id = v_case_id 
        AND cr.status NOT IN ('cancelled', 'used')
        AND i.available_quantity < cr.quantity
    ) INTO v_has_insufficient;
    
    -- Update case status
    UPDATE public.cases SET status = 
        CASE
            WHEN v_total_items = 0 THEN 'gray'::case_status
            WHEN v_has_insufficient THEN 'red'::case_status
            WHEN v_confirmed_items < v_total_items THEN 'yellow'::case_status
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
    IF TG_OP = 'INSERT' THEN
        UPDATE public.inventory 
        SET reserved_quantity = reserved_quantity + NEW.quantity
        WHERE id = NEW.inventory_id;
    ELSIF TG_OP = 'UPDATE' THEN
        UPDATE public.inventory 
        SET reserved_quantity = reserved_quantity - OLD.quantity + NEW.quantity
        WHERE id = NEW.inventory_id;
    ELSIF TG_OP = 'DELETE' THEN
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

-- RLS Policies

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

-- Case Reservations
CREATE POLICY "Reservations are viewable by authenticated users" ON public.case_reservations
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Reservations can be managed by authorized roles" ON public.case_reservations
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'dentist', 'stock_staff', 'assistant')
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
    (SELECT COUNT(*) FROM public.inventory WHERE expiry_date IS NOT NULL AND expiry_date <= CURRENT_DATE + INTERVAL '30 days') as expiring_soon_items;

-- Low stock items view
CREATE OR REPLACE VIEW public.low_stock_items AS
SELECT 
    p.id as product_id,
    p.sku,
    p.name as product_name,
    p.min_stock_level,
    COALESCE(SUM(i.available_quantity), 0) as current_stock,
    p.min_stock_level - COALESCE(SUM(i.available_quantity), 0) as shortage
FROM public.products p
LEFT JOIN public.inventory i ON p.id = i.product_id
WHERE p.is_active = true
GROUP BY p.id, p.sku, p.name, p.min_stock_level
HAVING COALESCE(SUM(i.available_quantity), 0) <= p.min_stock_level
ORDER BY shortage DESC;

-- Expiring items view
CREATE OR REPLACE VIEW public.expiring_items AS
SELECT 
    i.id as inventory_id,
    p.sku,
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

-- =====================================================
-- SEED DATA (Optional - Remove in production)
-- =====================================================

-- Insert default product categories
INSERT INTO public.product_categories (name, description) VALUES
    ('Implants', 'Dental implants of various brands and sizes'),
    ('Abutments', 'Implant abutments and connectors'),
    ('Bone Grafts', 'Bone graft materials and membranes'),
    ('Surgical Instruments', 'Surgical tools and instruments'),
    ('Consumables', 'Disposable items and consumables'),
    ('Prosthetics', 'Prosthetic components and materials');

-- Insert default settings
INSERT INTO public.settings (key, value, description) VALUES
    ('clinic_name', '"DentalStock Clinic"', 'Name of the clinic'),
    ('emergency_alert_hours', '48', 'Hours before surgery to trigger emergency alerts'),
    ('low_stock_threshold_multiplier', '1.5', 'Multiplier for low stock warnings'),
    ('expiry_warning_days', '90', 'Days before expiry to show warnings');
