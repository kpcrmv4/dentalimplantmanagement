-- =====================================================
-- Migration: Make SKU Optional
-- Version: 1.1.0
-- Description: SKU is now optional, REF number is the primary identifier
-- =====================================================

-- Remove UNIQUE constraint and NOT NULL from SKU
ALTER TABLE public.products 
  ALTER COLUMN sku DROP NOT NULL;

-- Drop the unique constraint on SKU (if exists)
ALTER TABLE public.products 
  DROP CONSTRAINT IF EXISTS products_sku_key;

-- Add ref_number column if not exists (primary identifier from manufacturer)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'products' 
    AND column_name = 'ref_number'
  ) THEN
    ALTER TABLE public.products ADD COLUMN ref_number TEXT;
  END IF;
END $$;

-- Create index on ref_number for faster lookups
CREATE INDEX IF NOT EXISTS idx_products_ref_number ON public.products(ref_number);

-- Create index on SKU (non-unique) for faster lookups
CREATE INDEX IF NOT EXISTS idx_products_sku ON public.products(sku);

-- Update the search function to handle optional SKU
COMMENT ON COLUMN public.products.sku IS 'Optional internal SKU code. Can be null if REF number is used as primary identifier.';
COMMENT ON COLUMN public.products.ref_number IS 'Reference number from manufacturer (e.g., 021.5308 for Straumann). Primary identifier for products.';
