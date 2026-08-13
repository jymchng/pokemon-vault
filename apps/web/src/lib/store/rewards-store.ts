"use client";

import { create } from "zustand";
import { fetchRewardAccount } from "@/lib/api";

/**
 * Rewards XP/level — backed by the real backend (/rewards/me, requires
 * sign-in). XP accrues server-side (purchases, pack openings, milestones);
 * this store mirrors the account for the UI.
 */
type RewardsState = {
  xp: number;
  level: number;
  loading: boolean;
  error: string | null;
  sync: () => Promise<void>;
};

export const useRewardsStore = create<RewardsState>()((set) => ({
  xp: 0,
  level: 1,
  loading: false,
  error: null,

  sync: async () => {
    set({ loading: true, error: null });
    try {
      const account = await fetchRewardAccount();
      set({
        xp: account.xp ?? 0,
        level: account.level ?? 1,
        loading: false,
      });
    } catch (err) {
      set({
        loading: false,
        error: err instanceof Error ? err.message : "Failed to load rewards",
      });
    }
  },
}));
