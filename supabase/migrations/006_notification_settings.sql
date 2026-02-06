-- =====================================================
-- Migration: Notification Settings & Logs
-- Version: 006
-- Description: Add notification settings and create notification logs table
-- =====================================================

-- =====================================================
-- Part 1: Add notification-related settings
-- =====================================================

INSERT INTO public.settings (key, value, description) VALUES
    -- Scheduled Notifications
    ('scheduled_notification_enabled', 'true', 'เปิด/ปิดการแจ้งเตือนตามเวลา'),
    ('morning_notification_time', '"08:00"', 'เวลาแจ้งเตือนตอนเช้า (งานประจำวัน)'),
    ('evening_notification_time', '"17:00"', 'เวลาแจ้งเตือนตอนเย็น (งานวันพรุ่งนี้)'),

    -- Role-based notification settings
    ('notify_stock_daily', 'true', 'แจ้งเตือนสต็อกประจำวัน'),
    ('notify_cs_daily', 'true', 'แจ้งเตือน CS ประจำวัน'),
    ('notify_dentist_daily', 'true', 'แจ้งเตือนทันตแพทย์ประจำวัน'),

    -- LINE Integration
    ('line_channel_access_token', '""', 'LINE Channel Access Token'),
    ('line_channel_secret', '""', 'LINE Channel Secret for webhook verification'),
    ('line_bot_basic_id', '""', 'LINE Bot Basic ID'),

    -- Push Notification
    ('push_notification_enabled', 'true', 'เปิด/ปิด Push Notification'),

    -- LINE Notification Triggers
    ('line_notify_case_assigned', 'true', 'แจ้งเตือน LINE เมื่อมอบหมายเคสใหม่'),
    ('line_notify_out_of_stock', 'true', 'แจ้งเตือน LINE เมื่อวัสดุไม่มี'),
    ('line_notify_po_created', 'true', 'แจ้งเตือน LINE เมื่อสร้างใบสั่งซื้อ')
ON CONFLICT (key) DO NOTHING;

-- =====================================================
-- Part 2: Create notification_logs table
-- =====================================================

CREATE TABLE IF NOT EXISTS public.notification_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    recipient_type TEXT NOT NULL CHECK (recipient_type IN ('user', 'supplier', 'system')),
    recipient_id UUID, -- Can be user_id or supplier_id
    channel TEXT NOT NULL CHECK (channel IN ('push', 'line', 'in_app', 'email')),
    notification_type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'sent', 'failed', 'delivered', 'read')),
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for notification_logs
CREATE INDEX IF NOT EXISTS idx_notification_logs_user ON public.notification_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_recipient ON public.notification_logs(recipient_type, recipient_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_channel ON public.notification_logs(channel);
CREATE INDEX IF NOT EXISTS idx_notification_logs_status ON public.notification_logs(status);
CREATE INDEX IF NOT EXISTS idx_notification_logs_type ON public.notification_logs(notification_type);
CREATE INDEX IF NOT EXISTS idx_notification_logs_created ON public.notification_logs(created_at DESC);

-- Partial index for pending notifications (for retry logic)
CREATE INDEX IF NOT EXISTS idx_notification_logs_pending ON public.notification_logs(status, created_at)
    WHERE status = 'pending';

-- Enable RLS
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notification_logs
CREATE POLICY "Users can view own notification logs" ON public.notification_logs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can create notification logs" ON public.notification_logs
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Admin can view all notification logs" ON public.notification_logs
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
    );

-- =====================================================
-- Part 3: Create scheduled_notification_queue table
-- =====================================================

CREATE TABLE IF NOT EXISTS public.scheduled_notification_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scheduled_for TIMESTAMPTZ NOT NULL,
    notification_type TEXT NOT NULL,
    recipient_user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    recipient_role TEXT,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    channels TEXT[] NOT NULL DEFAULT ARRAY['push', 'in_app'],
    metadata JSONB DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed', 'cancelled')),
    processed_at TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for processing scheduled notifications
CREATE INDEX IF NOT EXISTS idx_scheduled_queue_pending ON public.scheduled_notification_queue(scheduled_for, status)
    WHERE status = 'pending';

-- Enable RLS
ALTER TABLE public.scheduled_notification_queue ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admin can manage scheduled notifications" ON public.scheduled_notification_queue
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
    );

-- =====================================================
-- Part 4: Add comments for documentation
-- =====================================================

COMMENT ON TABLE public.notification_logs IS 'Logs all sent notifications across all channels (push, LINE, in-app)';
COMMENT ON COLUMN public.notification_logs.channel IS 'Notification channel: push, line, in_app, email';
COMMENT ON COLUMN public.notification_logs.notification_type IS 'Type of notification: urgent_case, low_stock, daily_summary, case_assigned, etc.';
COMMENT ON COLUMN public.notification_logs.metadata IS 'Additional data like case_id, product_id, etc.';

COMMENT ON TABLE public.scheduled_notification_queue IS 'Queue for scheduled notifications to be processed by cron jobs';
COMMENT ON COLUMN public.scheduled_notification_queue.channels IS 'Array of channels to send to: push, line, in_app';
