"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

type ModalId = "search" | "cart" | "signin" | null;

type UiState = {
  sidebarCollapsed: boolean;
  mobileNavOpen: boolean;
  activeModal: ModalId;
  searchOpen: boolean;
  cartOpen: boolean;
  signInOpen: boolean;
  toggleSidebar: () => void;
  setMobileNavOpen: (open: boolean) => void;
  openModal: (modal: Exclude<ModalId, null>) => void;
  closeModal: () => void;
  setSearchOpen: (open: boolean) => void;
  setCartOpen: (open: boolean) => void;
  setSignInOpen: (open: boolean) => void;
};

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      mobileNavOpen: false,
      activeModal: null,
      searchOpen: false,
      cartOpen: false,
      signInOpen: false,
      toggleSidebar: () =>
        set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setMobileNavOpen: (open) => set({ mobileNavOpen: open }),
      openModal: (modal) => set({ activeModal: modal }),
      closeModal: () => set({ activeModal: null }),
      setSearchOpen: (open) => set({ searchOpen: open }),
      setCartOpen: (open) => set({ cartOpen: open }),
      setSignInOpen: (open) => set({ signInOpen: open }),
    }),
    {
      name: "pokemon-vault-ui",
      partialize: (s) => ({ sidebarCollapsed: s.sidebarCollapsed }),
    },
  ),
);
