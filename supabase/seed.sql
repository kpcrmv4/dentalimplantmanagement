-- =====================================================
-- DentalStock Management System - Seed Data
-- Version: 1.0.0
-- Description: Sample data for testing and development
-- Run this file in Supabase SQL Editor AFTER schema.sql
-- =====================================================

-- =====================================================
-- SAMPLE PRODUCTS
-- =====================================================

-- Get category IDs
DO $$
DECLARE
    cat_implants UUID;
    cat_abutments UUID;
    cat_bone_grafts UUID;
    cat_surgical UUID;
    cat_consumables UUID;
BEGIN
    SELECT id INTO cat_implants FROM public.product_categories WHERE name = 'Implants';
    SELECT id INTO cat_abutments FROM public.product_categories WHERE name = 'Abutments';
    SELECT id INTO cat_bone_grafts FROM public.product_categories WHERE name = 'Bone Grafts';
    SELECT id INTO cat_surgical FROM public.product_categories WHERE name = 'Surgical Instruments';
    SELECT id INTO cat_consumables FROM public.product_categories WHERE name = 'Consumables';

    -- Insert Implants
    INSERT INTO public.products (sku, name, description, category_id, brand, unit, unit_price, min_stock_level, is_implant, specifications) VALUES
    ('IMP-001', 'Straumann BLX Implant 4.0x10mm', 'Straumann BLX implant, diameter 4.0mm, length 10mm', cat_implants, 'Straumann', 'piece', 15000.00, 10, true, '{"diameter": "4.0mm", "length": "10mm", "platform": "BLX", "surface": "SLActive"}'),
    ('IMP-002', 'Straumann BLX Implant 4.0x12mm', 'Straumann BLX implant, diameter 4.0mm, length 12mm', cat_implants, 'Straumann', 'piece', 15000.00, 10, true, '{"diameter": "4.0mm", "length": "12mm", "platform": "BLX", "surface": "SLActive"}'),
    ('IMP-003', 'Straumann BLT Implant 4.1x10mm', 'Straumann BLT implant, diameter 4.1mm, length 10mm', cat_implants, 'Straumann', 'piece', 14500.00, 8, true, '{"diameter": "4.1mm", "length": "10mm", "platform": "BLT", "surface": "SLActive"}'),
    ('IMP-004', 'Nobel Biocare Active 4.3x10mm', 'Nobel Biocare NobelActive implant', cat_implants, 'Nobel Biocare', 'piece', 16000.00, 8, true, '{"diameter": "4.3mm", "length": "10mm", "platform": "NobelActive"}'),
    ('IMP-005', 'Osstem TS III 4.0x10mm', 'Osstem TS III implant system', cat_implants, 'Osstem', 'piece', 8000.00, 15, true, '{"diameter": "4.0mm", "length": "10mm", "platform": "TS III"}'),
    ('IMP-006', 'Osstem TS III 4.0x11.5mm', 'Osstem TS III implant system', cat_implants, 'Osstem', 'piece', 8000.00, 15, true, '{"diameter": "4.0mm", "length": "11.5mm", "platform": "TS III"}'),
    ('IMP-007', 'Dentium SuperLine 4.0x10mm', 'Dentium SuperLine implant', cat_implants, 'Dentium', 'piece', 7500.00, 12, true, '{"diameter": "4.0mm", "length": "10mm", "platform": "SuperLine"}'),
    ('IMP-008', 'Neodent Grand Morse 4.0x11mm', 'Neodent Grand Morse implant', cat_implants, 'Neodent', 'piece', 9500.00, 10, true, '{"diameter": "4.0mm", "length": "11mm", "platform": "Grand Morse"}');

    -- Insert Abutments
    INSERT INTO public.products (sku, name, description, category_id, brand, unit, unit_price, min_stock_level, is_implant) VALUES
    ('ABT-001', 'Straumann RC Healing Cap', 'Straumann RC healing abutment', cat_abutments, 'Straumann', 'piece', 2500.00, 20, false),
    ('ABT-002', 'Straumann Variobase Abutment', 'Straumann Variobase for custom abutment', cat_abutments, 'Straumann', 'piece', 4500.00, 15, false),
    ('ABT-003', 'Nobel Biocare Snappy Abutment', 'Nobel Biocare Snappy healing abutment', cat_abutments, 'Nobel Biocare', 'piece', 3000.00, 15, false),
    ('ABT-004', 'Osstem Transfer Abutment', 'Osstem transfer/impression abutment', cat_abutments, 'Osstem', 'piece', 1500.00, 25, false);

    -- Insert Bone Grafts
    INSERT INTO public.products (sku, name, description, category_id, brand, unit, unit_price, min_stock_level, is_implant) VALUES
    ('BIO-001', 'Bio-Oss Granules 0.5g', 'Geistlich Bio-Oss bone substitute 0.5g', cat_bone_grafts, 'Geistlich', 'piece', 4500.00, 5, false),
    ('BIO-002', 'Bio-Oss Granules 1.0g', 'Geistlich Bio-Oss bone substitute 1.0g', cat_bone_grafts, 'Geistlich', 'piece', 7500.00, 5, false),
    ('BIO-003', 'Bio-Gide Membrane 25x25mm', 'Geistlich Bio-Gide collagen membrane', cat_bone_grafts, 'Geistlich', 'piece', 6000.00, 5, false),
    ('BIO-004', 'Cerabone 0.5-1.0mm 0.5ml', 'Botiss Cerabone xenograft', cat_bone_grafts, 'Botiss', 'piece', 3500.00, 8, false),
    ('BIO-005', 'Jason Membrane 20x30mm', 'Botiss Jason pericardium membrane', cat_bone_grafts, 'Botiss', 'piece', 5500.00, 5, false);

    -- Insert Surgical Instruments
    INSERT INTO public.products (sku, name, description, category_id, brand, unit, unit_price, min_stock_level, is_implant) VALUES
    ('SUR-001', 'Surgical Drill Kit - Straumann', 'Complete surgical drill kit for Straumann system', cat_surgical, 'Straumann', 'set', 45000.00, 2, false),
    ('SUR-002', 'Torque Wrench 35Ncm', 'Calibrated torque wrench', cat_surgical, 'Generic', 'piece', 8500.00, 3, false),
    ('SUR-003', 'Implant Driver Set', 'Universal implant driver set', cat_surgical, 'Generic', 'set', 12000.00, 2, false);

    -- Insert Consumables
    INSERT INTO public.products (sku, name, description, category_id, brand, unit, unit_price, min_stock_level, is_implant) VALUES
    ('CON-001', 'Surgical Suture 4-0', 'Absorbable surgical suture 4-0', cat_consumables, 'Ethicon', 'piece', 350.00, 50, false),
    ('CON-002', 'Surgical Suture 5-0', 'Absorbable surgical suture 5-0', cat_consumables, 'Ethicon', 'piece', 350.00, 50, false),
    ('CON-003', 'Sterile Gauze Pack', 'Sterile gauze 4x4 inch', cat_consumables, 'Generic', 'pack', 150.00, 100, false),
    ('CON-004', 'Surgical Gloves Size M', 'Sterile surgical gloves medium', cat_consumables, 'Generic', 'pair', 45.00, 200, false),
    ('CON-005', 'Chlorhexidine Solution 0.12%', 'Antiseptic mouthwash 300ml', cat_consumables, 'Generic', 'bottle', 180.00, 30, false);
END $$;

-- =====================================================
-- SAMPLE SUPPLIERS
-- =====================================================

INSERT INTO public.suppliers (code, name, contact_person, phone, email, address, lead_time_days, on_time_delivery_score, quality_score, reliability_score) VALUES
('SUP-001', 'Straumann Thailand', 'คุณสมชาย ใจดี', '02-123-4567', 'contact@straumann.co.th', '123 ถนนสุขุมวิท กรุงเทพฯ 10110', 5, 95.00, 98.00, 97.00),
('SUP-002', 'Nobel Biocare Thailand', 'คุณวิภา สุขใจ', '02-234-5678', 'info@nobelbiocare.co.th', '456 ถนนพระราม 4 กรุงเทพฯ 10120', 7, 92.00, 96.00, 94.00),
('SUP-003', 'Osstem Thailand', 'คุณธนา รุ่งเรือง', '02-345-6789', 'sales@osstem.co.th', '789 ถนนรัชดาภิเษก กรุงเทพฯ 10400', 3, 88.00, 90.00, 85.00),
('SUP-004', 'Geistlich Thailand', 'คุณปรีชา มั่นคง', '02-456-7890', 'order@geistlich.co.th', '321 ถนนสาทร กรุงเทพฯ 10500', 10, 90.00, 99.00, 92.00),
('SUP-005', 'Dental Supply Co.', 'คุณนภา สดใส', '02-567-8901', 'info@dentalsupply.co.th', '654 ถนนเพชรบุรี กรุงเทพฯ 10400', 2, 85.00, 88.00, 82.00);

-- =====================================================
-- SAMPLE INVENTORY (Stock)
-- =====================================================

-- Link products to suppliers first
INSERT INTO public.product_suppliers (product_id, supplier_id, supplier_sku, unit_cost, is_preferred)
SELECT p.id, s.id, 'STR-' || p.sku, p.unit_price * 0.7, true
FROM public.products p, public.suppliers s
WHERE p.brand = 'Straumann' AND s.code = 'SUP-001';

INSERT INTO public.product_suppliers (product_id, supplier_id, supplier_sku, unit_cost, is_preferred)
SELECT p.id, s.id, 'NB-' || p.sku, p.unit_price * 0.7, true
FROM public.products p, public.suppliers s
WHERE p.brand = 'Nobel Biocare' AND s.code = 'SUP-002';

INSERT INTO public.product_suppliers (product_id, supplier_id, supplier_sku, unit_cost, is_preferred)
SELECT p.id, s.id, 'OSS-' || p.sku, p.unit_price * 0.65, true
FROM public.products p, public.suppliers s
WHERE p.brand = 'Osstem' AND s.code = 'SUP-003';

INSERT INTO public.product_suppliers (product_id, supplier_id, supplier_sku, unit_cost, is_preferred)
SELECT p.id, s.id, 'GEI-' || p.sku, p.unit_price * 0.7, true
FROM public.products p, public.suppliers s
WHERE p.brand = 'Geistlich' AND s.code = 'SUP-004';

-- Add inventory items
INSERT INTO public.inventory (product_id, lot_number, expiry_date, quantity, location, received_date, unit_cost, supplier_id)
SELECT 
    p.id,
    'LOT' || TO_CHAR(NOW(), 'YYMM') || '-' || LPAD(ROW_NUMBER() OVER()::TEXT, 4, '0'),
    CURRENT_DATE + INTERVAL '2 years',
    CASE 
        WHEN p.is_implant THEN FLOOR(RANDOM() * 15 + 5)::INTEGER
        ELSE FLOOR(RANDOM() * 50 + 10)::INTEGER
    END,
    CASE FLOOR(RANDOM() * 3)::INTEGER
        WHEN 0 THEN 'Cabinet A'
        WHEN 1 THEN 'Cabinet B'
        ELSE 'Cabinet C'
    END,
    CURRENT_DATE - INTERVAL '30 days',
    p.unit_price * 0.7,
    (SELECT id FROM public.suppliers ORDER BY RANDOM() LIMIT 1)
FROM public.products p
WHERE p.is_active = true;

-- Add some items with low stock for testing alerts
UPDATE public.inventory 
SET quantity = 3, available_quantity = 3
WHERE product_id IN (
    SELECT id FROM public.products WHERE sku IN ('IMP-001', 'BIO-001')
);

-- Add some items expiring soon for testing alerts
UPDATE public.inventory 
SET expiry_date = CURRENT_DATE + INTERVAL '20 days'
WHERE product_id IN (
    SELECT id FROM public.products WHERE sku IN ('BIO-002', 'CON-001')
);

-- =====================================================
-- SAMPLE PATIENTS
-- =====================================================

INSERT INTO public.patients (hn_number, first_name, last_name, date_of_birth, gender, phone, email, address, medical_history, allergies) VALUES
('HN-2568-0001', 'สมชาย', 'ใจดี', '1985-03-15', 'male', '081-234-5678', 'somchai@email.com', '123 ถนนสุขุมวิท กรุงเทพฯ', 'ความดันโลหิตสูง, เบาหวาน Type 2', 'ไม่มี'),
('HN-2568-0002', 'สมหญิง', 'รักสวย', '1990-07-22', 'female', '082-345-6789', 'somying@email.com', '456 ถนนพหลโยธิน กรุงเทพฯ', 'ไม่มีโรคประจำตัว', 'Penicillin'),
('HN-2568-0003', 'วิชัย', 'มั่นคง', '1978-11-08', 'male', '083-456-7890', 'wichai@email.com', '789 ถนนรัชดาภิเษก กรุงเทพฯ', 'โรคหัวใจ, รับประทานยาละลายลิ่มเลือด', 'Aspirin'),
('HN-2568-0004', 'นภา', 'สดใส', '1995-01-30', 'female', '084-567-8901', 'napa@email.com', '321 ถนนลาดพร้าว กรุงเทพฯ', 'ไม่มีโรคประจำตัว', 'ไม่มี'),
('HN-2568-0005', 'ประเสริฐ', 'ยิ่งใหญ่', '1970-05-18', 'male', '085-678-9012', 'prasert@email.com', '654 ถนนรามคำแหง กรุงเทพฯ', 'เบาหวาน Type 2, ไขมันในเลือดสูง', 'Sulfa drugs'),
('HN-2568-0006', 'มาลี', 'งามตา', '1988-09-12', 'female', '086-789-0123', 'malee@email.com', '987 ถนนบางนา กรุงเทพฯ', 'ไม่มีโรคประจำตัว', 'ไม่มี'),
('HN-2568-0007', 'สุรชัย', 'เก่งกล้า', '1982-12-25', 'male', '087-890-1234', 'surachai@email.com', '147 ถนนพระราม 9 กรุงเทพฯ', 'ความดันโลหิตสูง', 'Iodine'),
('HN-2568-0008', 'พิมพ์ใจ', 'สุขสันต์', '1992-04-05', 'female', '088-901-2345', 'pimjai@email.com', '258 ถนนสีลม กรุงเทพฯ', 'ไม่มีโรคประจำตัว', 'ไม่มี');

-- =====================================================
-- NOTE: Users need to be created through Supabase Auth first
-- Then run this to add user profiles:
-- =====================================================

-- Example: After creating auth users, run these inserts with actual UUIDs
-- INSERT INTO public.users (id, email, full_name, role, phone) VALUES
-- ('uuid-from-auth-admin', 'admin@dentalclinic.com', 'ผู้ดูแลระบบ', 'admin', '02-000-0001'),
-- ('uuid-from-auth-dentist1', 'dr.somchai@dentalclinic.com', 'ทพ.สมชาย รักษาดี', 'dentist', '02-000-0002'),
-- ('uuid-from-auth-dentist2', 'dr.wipa@dentalclinic.com', 'ทพญ.วิภา ใจเย็น', 'dentist', '02-000-0003'),
-- ('uuid-from-auth-stock', 'stock@dentalclinic.com', 'คุณนิดา จัดการดี', 'stock_staff', '02-000-0004'),
-- ('uuid-from-auth-assistant', 'assistant@dentalclinic.com', 'คุณมานี ช่วยเหลือ', 'assistant', '02-000-0005'),
-- ('uuid-from-auth-cs', 'cs@dentalclinic.com', 'คุณสมใจ บริการดี', 'cs', '02-000-0006');

-- =====================================================
-- SAMPLE CASES (Run after creating users)
-- =====================================================

-- Example: After creating users, run these inserts with actual patient and user UUIDs
-- INSERT INTO public.cases (case_number, patient_id, dentist_id, assistant_id, surgery_date, surgery_time, estimated_duration, tooth_positions, procedure_type, status, notes) VALUES
-- ('CASE-2568-0001', 'patient-uuid-1', 'dentist-uuid-1', 'assistant-uuid-1', CURRENT_DATE + INTERVAL '3 days', '09:00', 90, ARRAY['36'], 'single_implant', 'green', 'เคสปกติ วัสดุพร้อมแล้ว'),
-- ('CASE-2568-0002', 'patient-uuid-2', 'dentist-uuid-1', 'assistant-uuid-1', CURRENT_DATE + INTERVAL '5 days', '10:30', 120, ARRAY['14', '15'], 'multiple_implants', 'yellow', 'รอวัสดุจาก Straumann'),
-- ('CASE-2568-0003', 'patient-uuid-3', 'dentist-uuid-2', 'assistant-uuid-1', CURRENT_DATE + INTERVAL '7 days', '14:00', 180, ARRAY['11', '21'], 'implant_with_bone_graft', 'red', 'วัสดุ Bone Graft ไม่พอ'),
-- ('CASE-2568-0004', 'patient-uuid-4', 'dentist-uuid-2', NULL, CURRENT_DATE + INTERVAL '10 days', '09:30', 60, ARRAY['46'], 'single_implant', 'gray', 'ยังไม่ได้จองวัสดุ'),
-- ('CASE-2568-0005', 'patient-uuid-5', 'dentist-uuid-1', 'assistant-uuid-1', CURRENT_DATE - INTERVAL '2 days', '11:00', 90, ARRAY['26'], 'single_implant', 'completed', 'ผ่าตัดเสร็จเรียบร้อย');

-- =====================================================
-- ALTERNATIVE: Create test data without auth dependency
-- Use this for development/demo purposes only
-- =====================================================

-- Create temporary users table entries (for demo only - normally use Supabase Auth)
-- This requires disabling the foreign key constraint temporarily or using a different approach

-- For production: Always create users through Supabase Auth and then add to public.users table
