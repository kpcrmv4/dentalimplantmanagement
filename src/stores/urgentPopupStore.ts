'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UrgentCaseForPopup } from '@/types/database';

interface UrgentPopupState {
  dismissedAt: string | null;
  dismissedCaseIds: string[];
  isDismissed: boolean;
  setDismissed: (caseIds: string[]) => void;
  resetDismissed: () => void;
  shouldShowPopup: (cases: UrgentCaseForPopup[]) => boolean;
}

const REAPPEAR_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

export const useUrgentPopupStore = create<UrgentPopupState>()(
  persist(
    (set, get) => ({
      dismissedAt: null,
      dismissedCaseIds: [],
      isDismissed: false,

      setDismissed: (caseIds: string[]) => {
        set({
          dismissedAt: new Date().toISOString(),
          dismissedCaseIds: caseIds,
          isDismissed: true,
        });
      },

      resetDismissed: () => {
        set({
          dismissedAt: null,
          dismissedCaseIds: [],
          isDismissed: false,
        });
      },

      shouldShowPopup: (cases: UrgentCaseForPopup[]) => {
        const state = get();

        // If not dismissed, show popup
        if (!state.isDismissed || !state.dismissedAt) {
          return cases.length > 0;
        }

        // Check if timeout has passed (30 minutes)
        const dismissedTime = new Date(state.dismissedAt).getTime();
        const now = Date.now();
        if (now - dismissedTime > REAPPEAR_TIMEOUT_MS) {
          // Reset and show
          set({
            dismissedAt: null,
            dismissedCaseIds: [],
            isDismissed: false,
          });
          return cases.length > 0;
        }

        // Check if there are new urgent cases not in dismissed list
        const newCases = cases.filter(
          (c) => !state.dismissedCaseIds.includes(c.id)
        );
        if (newCases.length > 0) {
          // New urgent cases appeared
          set({
            dismissedAt: null,
            dismissedCaseIds: [],
            isDismissed: false,
          });
          return true;
        }

        // Check if any case became more urgent (critical level)
        const criticalCases = cases.filter((c) => c.urgency_level === 'critical');
        const previouslyCritical = state.dismissedCaseIds.filter((id) => {
          const c = cases.find((case_) => case_.id === id);
          return c && c.urgency_level === 'critical';
        });

        // If more cases are now critical, show popup
        if (criticalCases.length > previouslyCritical.length) {
          set({
            dismissedAt: null,
            dismissedCaseIds: [],
            isDismissed: false,
          });
          return true;
        }

        return false;
      },
    }),
    {
      name: 'urgent-popup-storage',
      partialize: (state) => ({
        dismissedAt: state.dismissedAt,
        dismissedCaseIds: state.dismissedCaseIds,
        isDismissed: state.isDismissed,
      }),
    }
  )
);
