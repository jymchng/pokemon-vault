"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  apiLogin,
  apiLogout,
  apiMe,
  apiRegister,
  setAccessToken,
  type AuthUser,
} from "@/lib/api";

/**
 * Real backend auth (no fake "Demo Trainer"). The access token is persisted
 * (localStorage) and pushed into the api client (setAccessToken) so every
 * /api/v1 call carries `Authorization: Bearer <token>`. `hydrate()` is called
 * once on app mount: if a token exists we validate it against /auth/me and
 * hydrate the user (or clear it when expired).
 */
type AuthState = {
  user: AuthUser | null;
  token: string | null;
  signedIn: boolean;
  signInOpen: boolean;
  loading: boolean;
  error: string | null;
  hydrate: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (input: {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
  }) => Promise<void>;
  signOut: () => Promise<void>;
  setSignInOpen: (open: boolean) => void;
  clearError: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      signedIn: false,
      signInOpen: false,
      loading: false,
      error: null,

      hydrate: async () => {
        const { token } = get();
        if (!token) {
          setAccessToken(null);
          set({ user: null, signedIn: false });
          return;
        }
        setAccessToken(token);
        try {
          const { user } = await apiMe();
          set({ user, signedIn: true });
        } catch {
          setAccessToken(null);
          set({ user: null, signedIn: false, token: null });
        }
      },

      signIn: async (email, password) => {
        set({ loading: true, error: null });
        try {
          const result = await apiLogin({ email, password });
          setAccessToken(result.accessToken);
          set({
            user: result.user,
            token: result.accessToken,
            signedIn: true,
            signInOpen: false,
            loading: false,
          });
        } catch (err) {
          set({
            loading: false,
            error: err instanceof Error ? err.message : "Sign in failed",
          });
          throw err;
        }
      },

      signUp: async (input) => {
        set({ loading: true, error: null });
        try {
          const result = await apiRegister(input);
          setAccessToken(result.accessToken);
          set({
            user: result.user,
            token: result.accessToken,
            signedIn: true,
            signInOpen: false,
            loading: false,
          });
        } catch (err) {
          set({
            loading: false,
            error: err instanceof Error ? err.message : "Sign up failed",
          });
          throw err;
        }
      },

      signOut: async () => {
        await apiLogout().catch(() => undefined);
        setAccessToken(null);
        set({ user: null, token: null, signedIn: false });
      },

      setSignInOpen: (open) => set({ signInOpen: open }),
      clearError: () => set({ error: null }),
    }),
    {
      name: "pokemon-vault-auth",
      // Persist only the token; user/session state is re-hydrated from /auth/me.
      partialize: (s) => ({ token: s.token }) as AuthState,
    },
  ),
);
