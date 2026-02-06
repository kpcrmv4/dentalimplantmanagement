-- =====================================================
-- Migration: LINE Integration
-- Version: 004
-- Description: Add LINE user ID fields to users and suppliers
-- =====================================================

-- Add line_user_id to users table
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS line_user_id TEXT;

-- Add line_user_id to suppliers table
ALTER TABLE public.suppliers
ADD COLUMN IF NOT EXISTS line_user_id TEXT;

-- Create indexes for quick lookup
CREATE INDEX IF NOT EXISTS idx_users_line_user_id ON public.users(line_user_id) WHERE line_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_suppliers_line_user_id ON public.suppliers(line_user_id) WHERE line_user_id IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.users.line_user_id IS 'LINE User ID for receiving LINE notifications';
COMMENT ON COLUMN public.suppliers.line_user_id IS 'LINE User ID for receiving purchase order notifications';
