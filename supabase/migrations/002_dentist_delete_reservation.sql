-- =====================================================
-- Migration: Allow dentists to delete their own case reservations
-- Description: Dentists should be able to delete reservations from their own cases
--              Previously only admin could delete reservations
-- =====================================================

-- Drop existing delete policies (handle both possible names)
DROP POLICY IF EXISTS "Admin can delete reservations" ON public.case_reservations;
DROP POLICY IF EXISTS "Reservations can be deleted" ON public.case_reservations;

-- Create new delete policy: Admin can delete any reservation
CREATE POLICY "Admin can delete reservations" ON public.case_reservations
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid()
            AND role = 'admin'
        )
    );

-- Create new delete policy: Dentists can delete reservations from their own cases
CREATE POLICY "Dentists can delete own case reservations" ON public.case_reservations
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.cases c
            JOIN public.users u ON u.id = auth.uid()
            WHERE c.id = case_reservations.case_id
            AND c.dentist_id = auth.uid()
            AND u.role = 'dentist'
            AND c.status NOT IN ('completed', 'cancelled')
        )
    );
