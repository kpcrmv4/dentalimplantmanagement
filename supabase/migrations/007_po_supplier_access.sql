-- Migration: Add supplier access code to purchase orders
-- This allows suppliers to view PO details via a public link with a 5-character secret code

-- Add supplier access code column (generated on approval)
ALTER TABLE purchase_orders
  ADD COLUMN IF NOT EXISTS supplier_access_code VARCHAR(5);

-- Add index for faster lookup when verifying access code
CREATE INDEX IF NOT EXISTS idx_po_access_code
  ON purchase_orders(id, supplier_access_code)
  WHERE supplier_access_code IS NOT NULL;
