"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface User {
  name: string;
  email: string;
  level: number;
  xp: number;
}

type AuthState = {
  user: User | null;
  signedIn: boolean;
  signInOpen: boolean;
  signIn: (user: User) => void;
  signOut: () => void;
  setSignInOpen: (open: boolean) => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      signedIn: false,
      signInOpen: false,
      signIn: (user) => set({ user, signedIn: true, signInOpen: false }),
      signOut: () => set({ user: null, signedIn: false }),
      setSignInOpen: (open) => set({ signInOpen: open }),
    }),
    { name: "pokemon-vault-auth" },
  ),
);
