"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export const REWARD_TIERS = [
  { xp: 100, label: "5% off coupon" },
  { xp: 500, label: "Free card sleeves" },
  { xp: 1000, label: "Free Booster Pack" },
  { xp: 2500, label: "Exclusive promo card" },
  { xp: 5000, label: "Limited collector reward" },
];

type RewardsState = {
  xp: number;
  level: number;
  addXp: (amount: number) => void;
};

export const useRewardsStore = create<RewardsState>()(
  persist(
    (set) => ({
      xp: 1680,
      level: 7,
      addXp: (amount) =>
        set((s) => {
          const xp = s.xp + amount;
          const level = Math.floor(xp / 500) + 1;
          return { xp, level };
        }),
    }),
    { name: "pokemon-vault-rewards" },
  ),
);
