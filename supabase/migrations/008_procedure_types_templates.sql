-- Migration: Procedure Types & Material Templates
-- Creates tables for managing procedure types (replacing hardcoded values)
-- and material templates with recommended products per procedure type

-- 1. procedure_types table
CREATE TABLE IF NOT EXISTS procedure_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  value VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. material_templates table
CREATE TABLE IF NOT EXISTS material_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  procedure_type_id UUID NOT NULL REFERENCES procedure_types(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. material_template_items table
CREATE TABLE IF NOT EXISTS material_template_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES material_templates(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_material_templates_procedure ON material_templates(procedure_type_id);
CREATE INDEX IF NOT EXISTS idx_material_template_items_template ON material_template_items(template_id);
CREATE INDEX IF NOT EXISTS idx_material_template_items_product ON material_template_items(product_id);
CREATE INDEX IF NOT EXISTS idx_procedure_types_value ON procedure_types(value);
CREATE INDEX IF NOT EXISTS idx_procedure_types_active ON procedure_types(is_active, sort_order);

-- RLS
ALTER TABLE procedure_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_template_items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if re-running (idempotent)
DROP POLICY IF EXISTS "procedure_types_select" ON procedure_types;
DROP POLICY IF EXISTS "procedure_types_insert" ON procedure_types;
DROP POLICY IF EXISTS "procedure_types_update" ON procedure_types;
DROP POLICY IF EXISTS "procedure_types_delete" ON procedure_types;
DROP POLICY IF EXISTS "material_templates_select" ON material_templates;
DROP POLICY IF EXISTS "material_templates_insert" ON material_templates;
DROP POLICY IF EXISTS "material_templates_update" ON material_templates;
DROP POLICY IF EXISTS "material_templates_delete" ON material_templates;
DROP POLICY IF EXISTS "material_template_items_select" ON material_template_items;
DROP POLICY IF EXISTS "material_template_items_insert" ON material_template_items;
DROP POLICY IF EXISTS "material_template_items_update" ON material_template_items;
DROP POLICY IF EXISTS "material_template_items_delete" ON material_template_items;

-- Everyone authenticated can read
CREATE POLICY "procedure_types_select" ON procedure_types
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "material_templates_select" ON material_templates
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "material_template_items_select" ON material_template_items
  FOR SELECT TO authenticated USING (true);

-- Admin can insert/update/delete
CREATE POLICY "procedure_types_insert" ON procedure_types
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT role FROM users WHERE id = auth.uid()) = 'admin');
CREATE POLICY "procedure_types_update" ON procedure_types
  FOR UPDATE TO authenticated
  USING ((SELECT role FROM users WHERE id = auth.uid()) = 'admin');
CREATE POLICY "procedure_types_delete" ON procedure_types
  FOR DELETE TO authenticated
  USING ((SELECT role FROM users WHERE id = auth.uid()) = 'admin');

CREATE POLICY "material_templates_insert" ON material_templates
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT role FROM users WHERE id = auth.uid()) = 'admin');
CREATE POLICY "material_templates_update" ON material_templates
  FOR UPDATE TO authenticated
  USING ((SELECT role FROM users WHERE id = auth.uid()) = 'admin');
CREATE POLICY "material_templates_delete" ON material_templates
  FOR DELETE TO authenticated
  USING ((SELECT role FROM users WHERE id = auth.uid()) = 'admin');

CREATE POLICY "material_template_items_insert" ON material_template_items
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT role FROM users WHERE id = auth.uid()) = 'admin');
CREATE POLICY "material_template_items_update" ON material_template_items
  FOR UPDATE TO authenticated
  USING ((SELECT role FROM users WHERE id = auth.uid()) = 'admin');
CREATE POLICY "material_template_items_delete" ON material_template_items
  FOR DELETE TO authenticated
  USING ((SELECT role FROM users WHERE id = auth.uid()) = 'admin');

-- Triggers for updated_at (drop first to be idempotent)
DROP TRIGGER IF EXISTS set_procedure_types_updated_at ON procedure_types;
DROP TRIGGER IF EXISTS set_material_templates_updated_at ON material_templates;

CREATE TRIGGER set_procedure_types_updated_at
  BEFORE UPDATE ON procedure_types
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_material_templates_updated_at
  BEFORE UPDATE ON material_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Seed data: migrate hardcoded procedure types
INSERT INTO procedure_types (name, value, sort_order) VALUES
  ('Single Implant', 'single_implant', 1),
  ('Multiple Implants', 'multiple_implants', 2),
  ('Full Arch Implant', 'full_arch', 3),
  ('Bone Graft', 'bone_graft', 4),
  ('Sinus Lift', 'sinus_lift', 5),
  ('Implant with Bone Graft', 'implant_with_bone_graft', 6)
ON CONFLICT (value) DO NOTHING;

-- =====================================================
-- Seed data: Sample material templates
-- Maps procedure types → recommended material sets
-- References products from seed.sql by SKU
-- =====================================================
DO $$
DECLARE
  pt_single UUID;
  pt_multiple UUID;
  pt_full_arch UUID;
  pt_bone_graft UUID;
  pt_sinus_lift UUID;
  pt_implant_bone UUID;
  tpl_id UUID;
  p_imp001 UUID;
  p_imp002 UUID;
  p_imp004 UUID;
  p_imp005 UUID;
  p_imp006 UUID;
  p_abt001 UUID;
  p_abt002 UUID;
  p_abt003 UUID;
  p_abt004 UUID;
  p_bio001 UUID;
  p_bio002 UUID;
  p_bio003 UUID;
  p_bio004 UUID;
  p_bio005 UUID;
  p_con001 UUID;
  p_con002 UUID;
  p_con003 UUID;
BEGIN
  SELECT id INTO pt_single FROM procedure_types WHERE value = 'single_implant';
  SELECT id INTO pt_multiple FROM procedure_types WHERE value = 'multiple_implants';
  SELECT id INTO pt_full_arch FROM procedure_types WHERE value = 'full_arch';
  SELECT id INTO pt_bone_graft FROM procedure_types WHERE value = 'bone_graft';
  SELECT id INTO pt_sinus_lift FROM procedure_types WHERE value = 'sinus_lift';
  SELECT id INTO pt_implant_bone FROM procedure_types WHERE value = 'implant_with_bone_graft';

  SELECT id INTO p_imp001 FROM products WHERE sku = 'IMP-001';
  SELECT id INTO p_imp002 FROM products WHERE sku = 'IMP-002';
  SELECT id INTO p_imp004 FROM products WHERE sku = 'IMP-004';
  SELECT id INTO p_imp005 FROM products WHERE sku = 'IMP-005';
  SELECT id INTO p_imp006 FROM products WHERE sku = 'IMP-006';
  SELECT id INTO p_abt001 FROM products WHERE sku = 'ABT-001';
  SELECT id INTO p_abt002 FROM products WHERE sku = 'ABT-002';
  SELECT id INTO p_abt003 FROM products WHERE sku = 'ABT-003';
  SELECT id INTO p_abt004 FROM products WHERE sku = 'ABT-004';
  SELECT id INTO p_bio001 FROM products WHERE sku = 'BIO-001';
  SELECT id INTO p_bio002 FROM products WHERE sku = 'BIO-002';
  SELECT id INTO p_bio003 FROM products WHERE sku = 'BIO-003';
  SELECT id INTO p_bio004 FROM products WHERE sku = 'BIO-004';
  SELECT id INTO p_bio005 FROM products WHERE sku = 'BIO-005';
  SELECT id INTO p_con001 FROM products WHERE sku = 'CON-001';
  SELECT id INTO p_con002 FROM products WHERE sku = 'CON-002';
  SELECT id INTO p_con003 FROM products WHERE sku = 'CON-003';

  IF p_imp001 IS NULL AND p_imp005 IS NULL THEN
    RAISE NOTICE 'Products not found - skipping template seed.';
    RETURN;
  END IF;

  -- Template 1: Single Implant - Straumann Standard Set
  INSERT INTO material_templates (procedure_type_id, name, description, sort_order)
  VALUES (pt_single, 'Straumann Standard Set', 'ชุด Straumann สำหรับฝังรากเดี่ยว ครบทั้ง Implant, Healing Cap, Abutment และวัสดุสิ้นเปลือง', 1)
  RETURNING id INTO tpl_id;
  IF p_imp001 IS NOT NULL THEN INSERT INTO material_template_items (template_id, product_id, quantity, sort_order, notes) VALUES (tpl_id, p_imp001, 1, 1, 'Straumann BLX Implant 4.0x10mm'); END IF;
  IF p_abt001 IS NOT NULL THEN INSERT INTO material_template_items (template_id, product_id, quantity, sort_order, notes) VALUES (tpl_id, p_abt001, 1, 2, 'Healing Cap'); END IF;
  IF p_abt002 IS NOT NULL THEN INSERT INTO material_template_items (template_id, product_id, quantity, sort_order, notes) VALUES (tpl_id, p_abt002, 1, 3, 'Variobase สำหรับครอบฟัน'); END IF;
  IF p_con001 IS NOT NULL THEN INSERT INTO material_template_items (template_id, product_id, quantity, sort_order, notes) VALUES (tpl_id, p_con001, 2, 4, 'ไหมเย็บ 4-0'); END IF;
  IF p_con003 IS NOT NULL THEN INSERT INTO material_template_items (template_id, product_id, quantity, sort_order, notes) VALUES (tpl_id, p_con003, 2, 5, 'ผ้าก๊อซ'); END IF;

  -- Template 2: Single Implant - Osstem Economy Set
  INSERT INTO material_templates (procedure_type_id, name, description, sort_order)
  VALUES (pt_single, 'Osstem Economy Set', 'ชุด Osstem ราคาประหยัด สำหรับฝังรากเดี่ยว', 2)
  RETURNING id INTO tpl_id;
  IF p_imp005 IS NOT NULL THEN INSERT INTO material_template_items (template_id, product_id, quantity, sort_order, notes) VALUES (tpl_id, p_imp005, 1, 1, 'Osstem TS III Implant 4.0x10mm'); END IF;
  IF p_abt004 IS NOT NULL THEN INSERT INTO material_template_items (template_id, product_id, quantity, sort_order, notes) VALUES (tpl_id, p_abt004, 1, 2, 'Osstem Transfer Abutment'); END IF;
  IF p_con001 IS NOT NULL THEN INSERT INTO material_template_items (template_id, product_id, quantity, sort_order, notes) VALUES (tpl_id, p_con001, 2, 3, 'ไหมเย็บ 4-0'); END IF;
  IF p_con003 IS NOT NULL THEN INSERT INTO material_template_items (template_id, product_id, quantity, sort_order, notes) VALUES (tpl_id, p_con003, 2, 4, 'ผ้าก๊อซ'); END IF;

  -- Template 3: Single Implant - Nobel Biocare Premium Set
  INSERT INTO material_templates (procedure_type_id, name, description, sort_order)
  VALUES (pt_single, 'Nobel Biocare Premium Set', 'ชุด Nobel Biocare ระดับพรีเมียม สำหรับฝังรากเดี่ยว', 3)
  RETURNING id INTO tpl_id;
  IF p_imp004 IS NOT NULL THEN INSERT INTO material_template_items (template_id, product_id, quantity, sort_order, notes) VALUES (tpl_id, p_imp004, 1, 1, 'Nobel Biocare Active 4.3x10mm'); END IF;
  IF p_abt003 IS NOT NULL THEN INSERT INTO material_template_items (template_id, product_id, quantity, sort_order, notes) VALUES (tpl_id, p_abt003, 1, 2, 'Nobel Biocare Snappy Abutment'); END IF;
  IF p_con001 IS NOT NULL THEN INSERT INTO material_template_items (template_id, product_id, quantity, sort_order, notes) VALUES (tpl_id, p_con001, 2, 3, 'ไหมเย็บ 4-0'); END IF;
  IF p_con003 IS NOT NULL THEN INSERT INTO material_template_items (template_id, product_id, quantity, sort_order, notes) VALUES (tpl_id, p_con003, 2, 4, 'ผ้าก๊อซ'); END IF;

  -- Template 4: Multiple Implants - Straumann Dual Set
  INSERT INTO material_templates (procedure_type_id, name, description, sort_order)
  VALUES (pt_multiple, 'Straumann Dual Set', 'ชุด Straumann สำหรับฝังราก 2 ตำแหน่ง', 1)
  RETURNING id INTO tpl_id;
  IF p_imp001 IS NOT NULL THEN INSERT INTO material_template_items (template_id, product_id, quantity, sort_order, notes) VALUES (tpl_id, p_imp001, 1, 1, 'Implant ตำแหน่งที่ 1 (4.0x10mm)'); END IF;
  IF p_imp002 IS NOT NULL THEN INSERT INTO material_template_items (template_id, product_id, quantity, sort_order, notes) VALUES (tpl_id, p_imp002, 1, 2, 'Implant ตำแหน่งที่ 2 (4.0x12mm)'); END IF;
  IF p_abt001 IS NOT NULL THEN INSERT INTO material_template_items (template_id, product_id, quantity, sort_order, notes) VALUES (tpl_id, p_abt001, 2, 3, 'Healing Cap x2'); END IF;
  IF p_abt002 IS NOT NULL THEN INSERT INTO material_template_items (template_id, product_id, quantity, sort_order, notes) VALUES (tpl_id, p_abt002, 2, 4, 'Variobase x2'); END IF;
  IF p_con001 IS NOT NULL THEN INSERT INTO material_template_items (template_id, product_id, quantity, sort_order, notes) VALUES (tpl_id, p_con001, 3, 5, 'ไหมเย็บ 4-0'); END IF;
  IF p_con003 IS NOT NULL THEN INSERT INTO material_template_items (template_id, product_id, quantity, sort_order, notes) VALUES (tpl_id, p_con003, 3, 6, 'ผ้าก๊อซ'); END IF;

  -- Template 5: Multiple Implants - Osstem Dual Set
  INSERT INTO material_templates (procedure_type_id, name, description, sort_order)
  VALUES (pt_multiple, 'Osstem Dual Set', 'ชุด Osstem สำหรับฝังราก 2 ตำแหน่ง ราคาประหยัด', 2)
  RETURNING id INTO tpl_id;
  IF p_imp005 IS NOT NULL THEN INSERT INTO material_template_items (template_id, product_id, quantity, sort_order, notes) VALUES (tpl_id, p_imp005, 1, 1, 'Osstem TS III 4.0x10mm ตำแหน่งที่ 1'); END IF;
  IF p_imp006 IS NOT NULL THEN INSERT INTO material_template_items (template_id, product_id, quantity, sort_order, notes) VALUES (tpl_id, p_imp006, 1, 2, 'Osstem TS III 4.0x11.5mm ตำแหน่งที่ 2'); END IF;
  IF p_abt004 IS NOT NULL THEN INSERT INTO material_template_items (template_id, product_id, quantity, sort_order, notes) VALUES (tpl_id, p_abt004, 2, 3, 'Osstem Transfer Abutment x2'); END IF;
  IF p_con001 IS NOT NULL THEN INSERT INTO material_template_items (template_id, product_id, quantity, sort_order, notes) VALUES (tpl_id, p_con001, 3, 4, 'ไหมเย็บ 4-0'); END IF;
  IF p_con003 IS NOT NULL THEN INSERT INTO material_template_items (template_id, product_id, quantity, sort_order, notes) VALUES (tpl_id, p_con003, 3, 5, 'ผ้าก๊อซ'); END IF;

  -- Template 6: Full Arch - Straumann Full Arch Set
  INSERT INTO material_templates (procedure_type_id, name, description, sort_order)
  VALUES (pt_full_arch, 'Straumann Full Arch Set', 'ชุด Straumann สำหรับฝังราก Full Arch (4-6 ตัว) พร้อม Abutment ครบ', 1)
  RETURNING id INTO tpl_id;
  IF p_imp001 IS NOT NULL THEN INSERT INTO material_template_items (template_id, product_id, quantity, sort_order, notes) VALUES (tpl_id, p_imp001, 3, 1, 'Straumann BLX 4.0x10mm x3'); END IF;
  IF p_imp002 IS NOT NULL THEN INSERT INTO material_template_items (template_id, product_id, quantity, sort_order, notes) VALUES (tpl_id, p_imp002, 3, 2, 'Straumann BLX 4.0x12mm x3'); END IF;
  IF p_abt001 IS NOT NULL THEN INSERT INTO material_template_items (template_id, product_id, quantity, sort_order, notes) VALUES (tpl_id, p_abt001, 6, 3, 'Healing Cap x6'); END IF;
  IF p_abt002 IS NOT NULL THEN INSERT INTO material_template_items (template_id, product_id, quantity, sort_order, notes) VALUES (tpl_id, p_abt002, 6, 4, 'Variobase x6'); END IF;
  IF p_con001 IS NOT NULL THEN INSERT INTO material_template_items (template_id, product_id, quantity, sort_order, notes) VALUES (tpl_id, p_con001, 4, 5, 'ไหมเย็บ 4-0'); END IF;
  IF p_con002 IS NOT NULL THEN INSERT INTO material_template_items (template_id, product_id, quantity, sort_order, notes) VALUES (tpl_id, p_con002, 2, 6, 'ไหมเย็บ 5-0 สำหรับจุดละเอียด'); END IF;
  IF p_con003 IS NOT NULL THEN INSERT INTO material_template_items (template_id, product_id, quantity, sort_order, notes) VALUES (tpl_id, p_con003, 5, 7, 'ผ้าก๊อซ'); END IF;

  -- Template 7: Bone Graft - Geistlich GBR Standard Set
  INSERT INTO material_templates (procedure_type_id, name, description, sort_order)
  VALUES (pt_bone_graft, 'Geistlich GBR Standard Set', 'ชุดปลูกกระดูกมาตรฐาน Bio-Oss + Bio-Gide Membrane', 1)
  RETURNING id INTO tpl_id;
  IF p_bio001 IS NOT NULL THEN INSERT INTO material_template_items (template_id, product_id, quantity, sort_order, notes) VALUES (tpl_id, p_bio001, 1, 1, 'Bio-Oss 0.5g กระดูกเทียม'); END IF;
  IF p_bio003 IS NOT NULL THEN INSERT INTO material_template_items (template_id, product_id, quantity, sort_order, notes) VALUES (tpl_id, p_bio003, 1, 2, 'Bio-Gide Membrane 25x25mm'); END IF;
  IF p_con001 IS NOT NULL THEN INSERT INTO material_template_items (template_id, product_id, quantity, sort_order, notes) VALUES (tpl_id, p_con001, 2, 3, 'ไหมเย็บ 4-0'); END IF;
  IF p_con002 IS NOT NULL THEN INSERT INTO material_template_items (template_id, product_id, quantity, sort_order, notes) VALUES (tpl_id, p_con002, 2, 4, 'ไหมเย็บ 5-0'); END IF;
  IF p_con003 IS NOT NULL THEN INSERT INTO material_template_items (template_id, product_id, quantity, sort_order, notes) VALUES (tpl_id, p_con003, 3, 5, 'ผ้าก๊อซ'); END IF;

  -- Template 8: Bone Graft - Botiss Economy Set
  INSERT INTO material_templates (procedure_type_id, name, description, sort_order)
  VALUES (pt_bone_graft, 'Botiss Economy Set', 'ชุดปลูกกระดูก Cerabone + Jason Membrane ราคาประหยัด', 2)
  RETURNING id INTO tpl_id;
  IF p_bio004 IS NOT NULL THEN INSERT INTO material_template_items (template_id, product_id, quantity, sort_order, notes) VALUES (tpl_id, p_bio004, 1, 1, 'Cerabone 0.5ml กระดูกเทียม'); END IF;
  IF p_bio005 IS NOT NULL THEN INSERT INTO material_template_items (template_id, product_id, quantity, sort_order, notes) VALUES (tpl_id, p_bio005, 1, 2, 'Jason Membrane 20x30mm'); END IF;
  IF p_con001 IS NOT NULL THEN INSERT INTO material_template_items (template_id, product_id, quantity, sort_order, notes) VALUES (tpl_id, p_con001, 2, 3, 'ไหมเย็บ 4-0'); END IF;
  IF p_con003 IS NOT NULL THEN INSERT INTO material_template_items (template_id, product_id, quantity, sort_order, notes) VALUES (tpl_id, p_con003, 2, 4, 'ผ้าก๊อซ'); END IF;

  -- Template 9: Sinus Lift - Standard Sinus Lift Set
  INSERT INTO material_templates (procedure_type_id, name, description, sort_order)
  VALUES (pt_sinus_lift, 'Standard Sinus Lift Set', 'ชุด Sinus Lift มาตรฐาน ใช้ Bio-Oss ปริมาณมาก + Membrane', 1)
  RETURNING id INTO tpl_id;
  IF p_bio002 IS NOT NULL THEN INSERT INTO material_template_items (template_id, product_id, quantity, sort_order, notes) VALUES (tpl_id, p_bio002, 2, 1, 'Bio-Oss 1.0g x2 สำหรับเติมไซนัส'); END IF;
  IF p_bio003 IS NOT NULL THEN INSERT INTO material_template_items (template_id, product_id, quantity, sort_order, notes) VALUES (tpl_id, p_bio003, 1, 2, 'Bio-Gide Membrane ปิดหน้าต่าง'); END IF;
  IF p_con001 IS NOT NULL THEN INSERT INTO material_template_items (template_id, product_id, quantity, sort_order, notes) VALUES (tpl_id, p_con001, 3, 3, 'ไหมเย็บ 4-0'); END IF;
  IF p_con002 IS NOT NULL THEN INSERT INTO material_template_items (template_id, product_id, quantity, sort_order, notes) VALUES (tpl_id, p_con002, 2, 4, 'ไหมเย็บ 5-0'); END IF;
  IF p_con003 IS NOT NULL THEN INSERT INTO material_template_items (template_id, product_id, quantity, sort_order, notes) VALUES (tpl_id, p_con003, 4, 5, 'ผ้าก๊อซ'); END IF;

  -- Template 10: Implant + Bone Graft - Straumann + Geistlich Combined Set
  INSERT INTO material_templates (procedure_type_id, name, description, sort_order)
  VALUES (pt_implant_bone, 'Straumann + Geistlich Combined Set', 'ชุดฝังราก Straumann พร้อมปลูกกระดูก Geistlich ครบวงจร', 1)
  RETURNING id INTO tpl_id;
  IF p_imp001 IS NOT NULL THEN INSERT INTO material_template_items (template_id, product_id, quantity, sort_order, notes) VALUES (tpl_id, p_imp001, 1, 1, 'Straumann BLX Implant 4.0x10mm'); END IF;
  IF p_abt001 IS NOT NULL THEN INSERT INTO material_template_items (template_id, product_id, quantity, sort_order, notes) VALUES (tpl_id, p_abt001, 1, 2, 'Healing Cap'); END IF;
  IF p_abt002 IS NOT NULL THEN INSERT INTO material_template_items (template_id, product_id, quantity, sort_order, notes) VALUES (tpl_id, p_abt002, 1, 3, 'Variobase Abutment'); END IF;
  IF p_bio001 IS NOT NULL THEN INSERT INTO material_template_items (template_id, product_id, quantity, sort_order, notes) VALUES (tpl_id, p_bio001, 1, 4, 'Bio-Oss 0.5g กระดูกเทียม'); END IF;
  IF p_bio003 IS NOT NULL THEN INSERT INTO material_template_items (template_id, product_id, quantity, sort_order, notes) VALUES (tpl_id, p_bio003, 1, 5, 'Bio-Gide Membrane'); END IF;
  IF p_con001 IS NOT NULL THEN INSERT INTO material_template_items (template_id, product_id, quantity, sort_order, notes) VALUES (tpl_id, p_con001, 3, 6, 'ไหมเย็บ 4-0'); END IF;
  IF p_con002 IS NOT NULL THEN INSERT INTO material_template_items (template_id, product_id, quantity, sort_order, notes) VALUES (tpl_id, p_con002, 2, 7, 'ไหมเย็บ 5-0'); END IF;
  IF p_con003 IS NOT NULL THEN INSERT INTO material_template_items (template_id, product_id, quantity, sort_order, notes) VALUES (tpl_id, p_con003, 3, 8, 'ผ้าก๊อซ'); END IF;

  -- Template 11: Implant + Bone Graft - Osstem + Botiss Economy Set
  INSERT INTO material_templates (procedure_type_id, name, description, sort_order)
  VALUES (pt_implant_bone, 'Osstem + Botiss Economy Set', 'ชุดฝังราก Osstem + ปลูกกระดูก Botiss ราคาประหยัด', 2)
  RETURNING id INTO tpl_id;
  IF p_imp005 IS NOT NULL THEN INSERT INTO material_template_items (template_id, product_id, quantity, sort_order, notes) VALUES (tpl_id, p_imp005, 1, 1, 'Osstem TS III 4.0x10mm'); END IF;
  IF p_abt004 IS NOT NULL THEN INSERT INTO material_template_items (template_id, product_id, quantity, sort_order, notes) VALUES (tpl_id, p_abt004, 1, 2, 'Osstem Transfer Abutment'); END IF;
  IF p_bio004 IS NOT NULL THEN INSERT INTO material_template_items (template_id, product_id, quantity, sort_order, notes) VALUES (tpl_id, p_bio004, 1, 3, 'Cerabone กระดูกเทียม'); END IF;
  IF p_bio005 IS NOT NULL THEN INSERT INTO material_template_items (template_id, product_id, quantity, sort_order, notes) VALUES (tpl_id, p_bio005, 1, 4, 'Jason Membrane'); END IF;
  IF p_con001 IS NOT NULL THEN INSERT INTO material_template_items (template_id, product_id, quantity, sort_order, notes) VALUES (tpl_id, p_con001, 2, 5, 'ไหมเย็บ 4-0'); END IF;
  IF p_con003 IS NOT NULL THEN INSERT INTO material_template_items (template_id, product_id, quantity, sort_order, notes) VALUES (tpl_id, p_con003, 3, 6, 'ผ้าก๊อซ'); END IF;

  RAISE NOTICE 'Seed templates created: 11 templates across 6 procedure types';
END $$;
