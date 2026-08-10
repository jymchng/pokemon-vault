"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ActivityEvent } from "@/lib/types";

type ActivityState = {
  events: ActivityEvent[];
  addEvent: (event: ActivityEvent) => void;
};

export const useActivityStore = create<ActivityState>()(
  persist(
    (set) => ({
      events: [],
      addEvent: (event) =>
        set((s) => ({ events: [event, ...s.events].slice(0, 50) })),
    }),
    { name: "pokemon-vault-activity" },
  ),
);
