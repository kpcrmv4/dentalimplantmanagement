-- =====================================================
-- DentalStock Management System - Demo Seed Data
-- Version: 1.0.0
-- Description: Complete demo data including users and cases
-- Run this file in Supabase SQL Editor AFTER schema.sql
-- NOTE: This creates demo users - for production use Supabase Auth
-- =====================================================

-- =====================================================
-- STEP 1: Create demo users in auth.users first
-- (This simulates what Supabase Auth would do)
-- =====================================================

-- Insert demo users into auth.users (required for foreign key)
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role)
VALUES 
    ('11111111-1111-1111-1111-111111111111', 'admin@dentalclinic.com', '$2a$10$PznXR4plgZxE0nqTfXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX', NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{}', 'authenticated', 'authenticated'),
    ('22222222-2222-2222-2222-222222222222', 'dr.somchai@dentalclinic.com', '$2a$10$PznXR4plgZxE0nqTfXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX', NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{}', 'authenticated', 'authenticated'),
    ('33333333-3333-3333-3333-333333333333', 'dr.wipa@dentalclinic.com', '$2a$10$PznXR4plgZxE0nqTfXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX', NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{}', 'authenticated', 'authenticated'),
    ('44444444-4444-4444-4444-444444444444', 'stock@dentalclinic.com', '$2a$10$PznXR4plgZxE0nqTfXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX', NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{}', 'authenticated', 'authenticated'),
    ('55555555-5555-5555-5555-555555555555', 'assistant@dentalclinic.com', '$2a$10$PznXR4plgZxE0nqTfXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX', NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{}', 'authenticated', 'authenticated'),
    ('66666666-6666-6666-6666-666666666666', 'cs@dentalclinic.com', '$2a$10$PznXR4plgZxE0nqTfXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX', NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{}', 'authenticated', 'authenticated')
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- STEP 2: Create user profiles in public.users
-- =====================================================

INSERT INTO public.users (id, email, full_name, role, phone, license_number) VALUES
('11111111-1111-1111-1111-111111111111', 'admin@dentalclinic.com', 'ผู้ดูแลระบบ', 'admin', '02-000-0001', NULL),
('22222222-2222-2222-2222-222222222222', 'dr.somchai@dentalclinic.com', 'ทพ.สมชาย รักษาดี', 'dentist', '02-000-0002', 'ท.12345'),
('33333333-3333-3333-3333-333333333333', 'dr.wipa@dentalclinic.com', 'ทพญ.วิภา ใจเย็น', 'dentist', '02-000-0003', 'ท.23456'),
('44444444-4444-4444-4444-444444444444', 'stock@dentalclinic.com', 'คุณนิดา จัดการดี', 'stock_staff', '02-000-0004', NULL),
('55555555-5555-5555-5555-555555555555', 'assistant@dentalclinic.com', 'คุณมานี ช่วยเหลือ', 'assistant', '02-000-0005', NULL),
('66666666-6666-6666-6666-666666666666', 'cs@dentalclinic.com', 'คุณสมใจ บริการดี', 'cs', '02-000-0006', NULL)
ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    phone = EXCLUDED.phone;

-- =====================================================
-- STEP 3: Create sample patients
-- =====================================================

INSERT INTO public.patients (id, hn_number, first_name, last_name, date_of_birth, gender, phone, email, address, medical_history, allergies, created_by) VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'HN-2568-0001', 'สมชาย', 'ใจดี', '1985-03-15', 'male', '081-234-5678', 'somchai@email.com', '123 ถนนสุขุมวิท กรุงเทพฯ', 'ความดันโลหิตสูง, เบาหวาน Type 2', 'ไม่มี', '11111111-1111-1111-1111-111111111111'),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'HN-2568-0002', 'สมหญิง', 'รักสวย', '1990-07-22', 'female', '082-345-6789', 'somying@email.com', '456 ถนนพหลโยธิน กรุงเทพฯ', 'ไม่มีโรคประจำตัว', 'Penicillin', '11111111-1111-1111-1111-111111111111'),
('cccccccc-cccc-cccc-cccc-cccccccccccc', 'HN-2568-0003', 'วิชัย', 'มั่นคง', '1978-11-08', 'male', '083-456-7890', 'wichai@email.com', '789 ถนนรัชดาภิเษก กรุงเทพฯ', 'โรคหัวใจ, รับประทานยาละลายลิ่มเลือด', 'Aspirin', '11111111-1111-1111-1111-111111111111'),
('dddddddd-dddd-dddd-dddd-dddddddddddd', 'HN-2568-0004', 'นภา', 'สดใส', '1995-01-30', 'female', '084-567-8901', 'napa@email.com', '321 ถนนลาดพร้าว กรุงเทพฯ', 'ไม่มีโรคประจำตัว', 'ไม่มี', '11111111-1111-1111-1111-111111111111'),
('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'HN-2568-0005', 'ประเสริฐ', 'ยิ่งใหญ่', '1970-05-18', 'male', '085-678-9012', 'prasert@email.com', '654 ถนนรามคำแหง กรุงเทพฯ', 'เบาหวาน Type 2, ไขมันในเลือดสูง', 'Sulfa drugs', '11111111-1111-1111-1111-111111111111'),
('ffffffff-ffff-ffff-ffff-ffffffffffff', 'HN-2568-0006', 'มาลี', 'งามตา', '1988-09-12', 'female', '086-789-0123', 'malee@email.com', '987 ถนนบางนา กรุงเทพฯ', 'ไม่มีโรคประจำตัว', 'ไม่มี', '11111111-1111-1111-1111-111111111111'),
('gggggggg-gggg-gggg-gggg-gggggggggggg', 'HN-2568-0007', 'สุรชัย', 'เก่งกล้า', '1982-12-25', 'male', '087-890-1234', 'surachai@email.com', '147 ถนนพระราม 9 กรุงเทพฯ', 'ความดันโลหิตสูง', 'Iodine', '11111111-1111-1111-1111-111111111111'),
('hhhhhhhh-hhhh-hhhh-hhhh-hhhhhhhhhhhh', 'HN-2568-0008', 'พิมพ์ใจ', 'สุขสันต์', '1992-04-05', 'female', '088-901-2345', 'pimjai@email.com', '258 ถนนสีลม กรุงเทพฯ', 'ไม่มีโรคประจำตัว', 'ไม่มี', '11111111-1111-1111-1111-111111111111')
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- STEP 4: Create sample cases with different statuses
-- สถานะ 4 สีตามบรีฟ:
-- green = พร้อมผ่าตัด (วัสดุครบและเตรียมเรียบร้อย)
-- yellow = รอวัสดุ (สั่งซื้อแล้วแต่ยังมาไม่ถึง)
-- red = วัสดุไม่พอ (ต้องดำเนินการเร่งด่วน)
-- gray = ยังไม่จองวัสดุ (เคสสร้างแล้วแต่ยังไม่จอง)
-- =====================================================

INSERT INTO public.cases (id, case_number, patient_id, dentist_id, assistant_id, surgery_date, surgery_time, estimated_duration, tooth_positions, procedure_type, status, notes, pre_op_notes, created_by) VALUES
-- เคสพร้อมผ่าตัด (สีเขียว)
('c1111111-1111-1111-1111-111111111111', 'CASE-2568-0001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', '55555555-5555-5555-5555-555555555555', CURRENT_DATE + INTERVAL '3 days', '09:00', 90, ARRAY['36'], 'single_implant', 'green', 'เคสปกติ วัสดุพร้อมแล้ว', 'ตรวจ CT Scan แล้ว กระดูกเพียงพอ', '11111111-1111-1111-1111-111111111111'),
('c2222222-2222-2222-2222-222222222222', 'CASE-2568-0002', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '33333333-3333-3333-3333-333333333333', '55555555-5555-5555-5555-555555555555', CURRENT_DATE + INTERVAL '4 days', '14:00', 60, ARRAY['46'], 'single_implant', 'green', 'วัสดุเตรียมพร้อมแล้ว', 'ผู้ป่วยแพ้ Penicillin ใช้ยาทดแทน', '11111111-1111-1111-1111-111111111111'),

-- เคสรอวัสดุ (สีเหลือง)
('c3333333-3333-3333-3333-333333333333', 'CASE-2568-0003', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '22222222-2222-2222-2222-222222222222', '55555555-5555-5555-5555-555555555555', CURRENT_DATE + INTERVAL '5 days', '10:30', 120, ARRAY['14', '15'], 'multiple_implants', 'yellow', 'รอวัสดุจาก Straumann คาดว่าจะถึงใน 2 วัน', 'ต้องใช้ Implant 2 ตัว', '11111111-1111-1111-1111-111111111111'),
('c4444444-4444-4444-4444-444444444444', 'CASE-2568-0004', 'dddddddd-dddd-dddd-dddd-dddddddddddd', '33333333-3333-3333-3333-333333333333', NULL, CURRENT_DATE + INTERVAL '6 days', '11:00', 90, ARRAY['26'], 'single_implant', 'yellow', 'สั่ง Osstem Implant แล้ว รอของมาถึง', NULL, '11111111-1111-1111-1111-111111111111'),

-- เคสวัสดุไม่พอ (สีแดง)
('c5555555-5555-5555-5555-555555555555', 'CASE-2568-0005', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '22222222-2222-2222-2222-222222222222', '55555555-5555-5555-5555-555555555555', CURRENT_DATE + INTERVAL '7 days', '14:00', 180, ARRAY['11', '21'], 'implant_with_bone_graft', 'red', 'วัสดุ Bone Graft ไม่พอ ต้องสั่งเพิ่มด่วน!', 'ต้องใช้ Bio-Oss 2 กล่อง และ Membrane 1 แผ่น', '11111111-1111-1111-1111-111111111111'),
('c6666666-6666-6666-6666-666666666666', 'CASE-2568-0006', 'ffffffff-ffff-ffff-ffff-ffffffffffff', '33333333-3333-3333-3333-333333333333', '55555555-5555-5555-5555-555555555555', CURRENT_DATE + INTERVAL '8 days', '09:30', 150, ARRAY['16', '17'], 'multiple_implants', 'red', 'Implant Straumann หมดสต็อก ต้องสั่งด่วน', 'ผู้ป่วยต้องการแบรนด์ Straumann เท่านั้น', '11111111-1111-1111-1111-111111111111'),

-- เคสยังไม่จองวัสดุ (สีเทา)
('c7777777-7777-7777-7777-777777777777', 'CASE-2568-0007', 'gggggggg-gggg-gggg-gggg-gggggggggggg', '22222222-2222-2222-2222-222222222222', NULL, CURRENT_DATE + INTERVAL '10 days', '09:30', 60, ARRAY['46'], 'single_implant', 'gray', 'ยังไม่ได้จองวัสดุ รอทันตแพทย์ยืนยัน', NULL, '11111111-1111-1111-1111-111111111111'),
('c8888888-8888-8888-8888-888888888888', 'CASE-2568-0008', 'hhhhhhhh-hhhh-hhhh-hhhh-hhhhhhhhhhhh', '33333333-3333-3333-3333-333333333333', NULL, CURRENT_DATE + INTERVAL '12 days', '10:00', 90, ARRAY['36', '37'], 'multiple_implants', 'gray', 'เคสใหม่ รอจองวัสดุ', 'ต้องตรวจ CT Scan เพิ่มเติม', '11111111-1111-1111-1111-111111111111'),

-- เคสเสร็จสิ้น
('c9999999-9999-9999-9999-999999999999', 'CASE-2568-0009', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', '55555555-5555-5555-5555-555555555555', CURRENT_DATE - INTERVAL '5 days', '11:00', 90, ARRAY['26'], 'single_implant', 'completed', 'ผ่าตัดเสร็จเรียบร้อย', 'ผ่าตัดราบรื่น ไม่มีภาวะแทรกซ้อน', '11111111-1111-1111-1111-111111111111'),
('caaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'CASE-2568-0010', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '33333333-3333-3333-3333-333333333333', '55555555-5555-5555-5555-555555555555', CURRENT_DATE - INTERVAL '10 days', '14:00', 120, ARRAY['14', '15'], 'multiple_implants', 'completed', 'ผ่าตัดเสร็จสิ้น นัดติดตามผล 1 สัปดาห์', NULL, '11111111-1111-1111-1111-111111111111')
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- STEP 5: Create sample reservations for cases
-- =====================================================

-- Get product IDs for reservations
DO $$
DECLARE
    prod_imp001 UUID;
    prod_imp002 UUID;
    prod_imp005 UUID;
    prod_bio001 UUID;
    prod_bio003 UUID;
    prod_abt001 UUID;
    inv_id UUID;
BEGIN
    SELECT id INTO prod_imp001 FROM public.products WHERE sku = 'IMP-001';
    SELECT id INTO prod_imp002 FROM public.products WHERE sku = 'IMP-002';
    SELECT id INTO prod_imp005 FROM public.products WHERE sku = 'IMP-005';
    SELECT id INTO prod_bio001 FROM public.products WHERE sku = 'BIO-001';
    SELECT id INTO prod_bio003 FROM public.products WHERE sku = 'BIO-003';
    SELECT id INTO prod_abt001 FROM public.products WHERE sku = 'ABT-001';

    -- Reservations for green cases (confirmed/prepared)
    SELECT id INTO inv_id FROM public.inventory WHERE product_id = prod_imp005 LIMIT 1;
    IF inv_id IS NOT NULL THEN
        INSERT INTO public.case_reservations (case_id, inventory_id, product_id, quantity, status, reserved_by, prepared_by, prepared_at)
        VALUES ('c1111111-1111-1111-1111-111111111111', inv_id, prod_imp005, 1, 'prepared', '44444444-4444-4444-4444-444444444444', '44444444-4444-4444-4444-444444444444', NOW() - INTERVAL '1 day');
    END IF;

    SELECT id INTO inv_id FROM public.inventory WHERE product_id = prod_abt001 LIMIT 1;
    IF inv_id IS NOT NULL THEN
        INSERT INTO public.case_reservations (case_id, inventory_id, product_id, quantity, status, reserved_by, prepared_by, prepared_at)
        VALUES ('c1111111-1111-1111-1111-111111111111', inv_id, prod_abt001, 1, 'prepared', '44444444-4444-4444-4444-444444444444', '44444444-4444-4444-4444-444444444444', NOW() - INTERVAL '1 day');
    END IF;

    -- Reservations for yellow cases (confirmed but waiting)
    SELECT id INTO inv_id FROM public.inventory WHERE product_id = prod_imp001 LIMIT 1;
    IF inv_id IS NOT NULL THEN
        INSERT INTO public.case_reservations (case_id, inventory_id, product_id, quantity, status, reserved_by, notes)
        VALUES ('c3333333-3333-3333-3333-333333333333', inv_id, prod_imp001, 2, 'confirmed', '44444444-4444-4444-4444-444444444444', 'รอของจาก Straumann');
    END IF;

    -- Reservations for red cases (pending - not enough stock)
    SELECT id INTO inv_id FROM public.inventory WHERE product_id = prod_bio001 LIMIT 1;
    IF inv_id IS NOT NULL THEN
        INSERT INTO public.case_reservations (case_id, inventory_id, product_id, quantity, status, reserved_by, notes)
        VALUES ('c5555555-5555-5555-5555-555555555555', inv_id, prod_bio001, 2, 'pending', '44444444-4444-4444-4444-444444444444', 'สต็อกไม่พอ ต้องสั่งเพิ่ม');
    END IF;

    SELECT id INTO inv_id FROM public.inventory WHERE product_id = prod_bio003 LIMIT 1;
    IF inv_id IS NOT NULL THEN
        INSERT INTO public.case_reservations (case_id, inventory_id, product_id, quantity, status, reserved_by, notes)
        VALUES ('c5555555-5555-5555-5555-555555555555', inv_id, prod_bio003, 1, 'pending', '44444444-4444-4444-4444-444444444444', 'รอของเข้า');
    END IF;

END $$;

-- =====================================================
-- STEP 6: Create sample purchase orders
-- =====================================================

INSERT INTO public.purchase_orders (id, po_number, supplier_id, status, order_date, expected_delivery_date, subtotal, tax_amount, total_amount, notes, created_by)
SELECT 
    'po111111-1111-1111-1111-111111111111',
    'PO-2568-0001',
    s.id,
    'ordered',
    CURRENT_DATE - INTERVAL '3 days',
    CURRENT_DATE + INTERVAL '2 days',
    30000.00,
    2100.00,
    32100.00,
    'สั่งซื้อ Implant Straumann เพิ่มเติม',
    '44444444-4444-4444-4444-444444444444'
FROM public.suppliers s WHERE s.code = 'SUP-001'
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.purchase_orders (id, po_number, supplier_id, status, order_date, expected_delivery_date, subtotal, tax_amount, total_amount, notes, created_by)
SELECT 
    'po222222-2222-2222-2222-222222222222',
    'PO-2568-0002',
    s.id,
    'pending',
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '10 days',
    15000.00,
    1050.00,
    16050.00,
    'สั่งซื้อ Bone Graft ด่วน',
    '44444444-4444-4444-4444-444444444444'
FROM public.suppliers s WHERE s.code = 'SUP-004'
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- STEP 7: Create sample transfers (borrow/exchange)
-- =====================================================

INSERT INTO public.transfers (id, transfer_number, transfer_type, supplier_id, status, transfer_date, return_due_date, notes, created_by)
SELECT 
    'tr111111-1111-1111-1111-111111111111',
    'TR-2568-0001',
    'borrow',
    s.id,
    'approved',
    CURRENT_DATE - INTERVAL '5 days',
    CURRENT_DATE + INTERVAL '25 days',
    'ยืม Implant Straumann 5 ตัว สำหรับเคสด่วน',
    '44444444-4444-4444-4444-444444444444'
FROM public.suppliers s WHERE s.code = 'SUP-001'
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- Summary of demo data created:
-- - 6 Users (1 admin, 2 dentists, 1 stock_staff, 1 assistant, 1 cs)
-- - 8 Patients
-- - 10 Cases (2 green, 2 yellow, 2 red, 2 gray, 2 completed)
-- - Multiple reservations linked to cases
-- - 2 Purchase orders
-- - 1 Transfer (borrow)
-- =====================================================

SELECT 'Demo data created successfully!' as message;
