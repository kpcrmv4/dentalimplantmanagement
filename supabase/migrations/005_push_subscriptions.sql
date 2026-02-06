-- =====================================================
-- Migration: Push Subscriptions
-- Version: 005
-- Description: Create table for storing PWA push notification subscriptions
-- =====================================================

-- Create push_subscriptions table
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL,
    p256dh_key TEXT NOT NULL,
    auth_key TEXT NOT NULL,
    user_agent TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create unique constraint on endpoint (one subscription per browser)
CREATE UNIQUE INDEX IF NOT EXISTS idx_push_subscriptions_endpoint ON public.push_subscriptions(endpoint);

-- Create index for user lookups
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON public.push_subscriptions(user_id);

-- Create index for active subscriptions
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_active ON public.push_subscriptions(user_id, is_active) WHERE is_active = true;

-- Enable RLS
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own subscriptions" ON public.push_subscriptions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own subscriptions" ON public.push_subscriptions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subscriptions" ON public.push_subscriptions
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own subscriptions" ON public.push_subscriptions
    FOR DELETE USING (auth.uid() = user_id);

-- Admin can manage all subscriptions
CREATE POLICY "Admin can manage all subscriptions" ON public.push_subscriptions
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
    );

-- Trigger to update updated_at
CREATE TRIGGER update_push_subscriptions_updated_at
    BEFORE UPDATE ON public.push_subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comments
COMMENT ON TABLE public.push_subscriptions IS 'Stores PWA push notification subscriptions for each user';
COMMENT ON COLUMN public.push_subscriptions.endpoint IS 'Push subscription endpoint URL';
COMMENT ON COLUMN public.push_subscriptions.p256dh_key IS 'Public key for encryption (ECDH)';
COMMENT ON COLUMN public.push_subscriptions.auth_key IS 'Authentication secret';
