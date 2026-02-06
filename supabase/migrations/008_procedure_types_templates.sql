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

-- Triggers for updated_at
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
