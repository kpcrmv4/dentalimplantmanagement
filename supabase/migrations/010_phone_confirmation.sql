-- Migration 010: Add phone confirmation tracking to cases
-- Tracks whether patient was called to confirm their appointment

ALTER TABLE public.cases
  ADD COLUMN IF NOT EXISTS confirmation_status TEXT DEFAULT 'pending'
    CHECK (confirmation_status IN ('pending', 'confirmed', 'postponed', 'cancelled')),
  ADD COLUMN IF NOT EXISTS confirmation_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS confirmation_note TEXT,
  ADD COLUMN IF NOT EXISTS confirmed_by UUID REFERENCES public.users(id);

-- Index for filtering by confirmation status
CREATE INDEX IF NOT EXISTS idx_cases_confirmation_status ON public.cases(confirmation_status);

-- Allow authenticated users to insert audit logs for phone confirmation
-- (The automatic trigger handles UPDATE auditing, but we also insert explicit PHONE_CONFIRMATION entries)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert audit logs' AND tablename = 'audit_logs'
  ) THEN
    CREATE POLICY "Users can insert audit logs" ON public.audit_logs
      FOR INSERT TO authenticated
      WITH CHECK (true);
  END IF;
END $$;
