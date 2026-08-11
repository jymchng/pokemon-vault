# Pokémon Vault — Baseline (before transformation)

> **Purpose:** Document the CURRENT WEBSITE's state *before* any transformation, so
> verification can later distinguish **pre-existing problems** from **problems
> introduced by the transformation**.
> **Current website:** `~/typescript_projects/pokemon-vault/`
> **Emulated website (reference):** `https://jup.ag/gacha`
> **Baseline captured:** 2026-08-11 (repo survey + 12 screenshots)
> **Git HEAD:** `fcd1328` — feat(packs): owned pack-opening flow — buy, store, and open with animation

---

## 1. Framework & stack

| Aspect | Value |
|---|---|
| Framework | Next.js **16.3.0** (App Router), React **19.2.8**, TypeScript 5 (strict) |
| Source layout | `src/` (`@/*` → `./src/*`), route group `(shop)` |
| Package manager | npm (`package-lock.json`) |
| Data | Prisma **7.9.1** + better-sqlite3 13 + `@prisma/adapter-better-sqlite3`; SQLite at `dev.db`; generated client in `src/generated/prisma`; `prisma/seed.ts` via tsx |
| State/UI libs | @tanstack/react-query (+devtools), zustand 5, framer-motion 13, sonner, next-themes, lucide-react, @base-ui/react, shadcn, cva, clsx, tailwind-merge, tw-animate-css |
| Build/deploy | `next build && node scripts/copy-assets.mjs`; `images.unoptimized: true` (Netlify static, no `/_next/image`); `netlify.toml` pins `NODE_VERSION = 22`, esbuild bundler, `external_node_modules` for better-sqlite3/@prisma/* |

## 2. Scripts / entry points

`dev` (next dev) · `build` (next build + build:assets) · `start` · `lint` (eslint) ·
`format`/`format:check` (prettier) · `db:generate|migrate|migrate:deploy|seed|reset|studio`
(Prisma) · `prebuild` = `db:generate` · `build:assets` = `scripts/copy-assets.mjs`.
Root `src/app/layout.tsx`: imports Inter 400–700 (`@fontsource/inter`), `globals.css`,
`Providers`; `themeColor #08090B`; metadata/OG for "Pokémon Vault — Premium Pokémon
Trading Card Store".

## 3. Routes (17 `page.tsx`, most in the `(shop)` group wrapped by `AppShell`)

- `/` — home: hero (blur orbs, Sparkles badge, h1, CTAs) + product grid + graded grid + sets grid (completion %) + rewards + more
- `/store` (+ `?filter=new`), `/packs` + `/packs/[slug]` (owned pack-open flow), `/sets` + `/sets/[id]`
- `/collection` + `/[id]` (card detail) + `/activity` + `/shipping` (+ `/collection/recent` in nav)
- `/account`, `/checkout`, `/orders` + `/orders/[id]`, `/rewards` (+ `?tab=level`), `/wishlist`
- `/dev/components` (showcase), `/api/data` (Prisma-backed JSON), `error.tsx`, `loading.tsx`, `not-found.tsx`

## 4. Components

**Global layout (`AppShell`, wraps every `(shop)` page):**
- `Sidebar` — fixed left, collapsible (`ui-store.sidebarCollapsed`), nav groups Shop/Collect/Orders/Rewards from `src/lib/navigation.ts` (lucide icons, "New" badge on Booster Packs)
- `TopBar` — fixed top `h-14`, `backdrop-blur-md`, search pill (⌘K), cart button w/ count badge, account menu
- `Footer` (desktop-only) · `MobileNav` (bottom, 5 items) + `MobileNavDrawer` (slide-in, Esc dismiss)
- `CartDrawer`, `SearchOverlay`, `SignInModal`, `Toaster` (sonner)

**Global UI primitives (`src/components/ui/`):** button, card, dialog, dropdown-menu, input,
label, badge, alert, avatar, breadcrumb, checkbox, pagination, progress, empty-state,
filter-pills, page-header, price-tag, sonner

**Feature components:** pokemon-card, card-art, product-card, pack-open-stage
(framer-motion pack reveal), cart-drawer, sign-in-modal, search-overlay,
unopened-packs-section, activity-item, reward-progress

**State/data:** zustand stores (`activity`, `auth`, `cart`, `collection`,
`pack-inventory`, `rewards`, `ui`, `wishlist`) in `src/lib/store/`; TanStack Query hooks
in `src/lib/hooks/queries.ts`; mock data in `src/lib/data/*.ts`; Prisma client in
`src/lib/db.ts`.

## 5. Styling architecture & design tokens

- Tailwind CSS **4** (`@tailwindcss/postcss`), single stylesheet `src/app/globals.css`
  (`@theme inline`, `@custom-variant dark`, base + components layers).
- **Dark-only system** (`color-scheme: dark`), shadcn-compatible semantic tokens.
- Tokens (measured from source):
  - background `#08090b` · surface `#101216` · elevated `#16191f` · foreground `#f5f6f8` · muted-foreground `#969ba6`
  - primary `#f5c542` (gold) · primary-foreground `#1a1503` · secondary `rgba(245,197,66,0.12)`
  - accents: yellow `#f5c542` · blue `#4c9aff` · red `#e94545` · success `#42c978` · purple `#a78bfa`
  - border `#252932` · input `#2e343f` · ring `#f5c542` · radius `0.625rem`
  - shadows: elevated/modal/popover/hover-lift/glow-accent · rarity tokens (common→secret) · grade tokens (PSA/CGC/BGS)
  - fonts: Inter (sans), Geist Mono (mono); animations fade-in/fade-up/scale-in/shimmer/spin-slow/card-glow
- Signature effect: `.card-border-ring` conic-gradient animated border.
- **Notable:** globals.css comment states the token system is "Reference: jup.ag/gacha
  dark dashboard language, recolored to the Pokémon collector palette" — i.e. the current
  site is *already* jup.ag/gacha-inspired; the transformation is a **fidelity pass**.

## 6. Responsive behavior (observed from screenshots)

| Component | Desktop 1440 | Tablet 768 | Mobile 390 |
|---|---|---|---|
| Sidebar | Fixed left, expanded (collapsible) | Fixed left (narrower) | Hidden |
| Top bar | Fixed, full width offset by sidebar | Same | Hamburger + search pill |
| Bottom nav | Hidden | Hidden | 5-item bottom bar + drawer |
| Grids | 4-col (cards) / 2-4 col sections | 2-3 col | 1-2 col, stacks |
| Hero | Centered, rounded-3xl, orbs | Centered | Stacks, smaller type |
| Footer | Visible | Visible | Hidden (bottom nav) |

## 7. Tests

**No automated test suite** (no `tests/`, no `*.test.*` / `*.spec.*` files). Status: NOT AVAILABLE.

## 8. Build / lint / typecheck status

| Check | Result |
|---|---|
| `npx tsc --noEmit` | **PASS** (exit 0) |
| `npm run lint` | **PASS** (exit 0) |
| `npm run build` | **PRE-EXISTING FAILURE (env)** — `prisma generate` (prebuild) crashes `ERR_REQUIRE_ESM` in `@prisma/dev` under local Node v21.7.3; works under Node 22 (verified: `npx node@22 prisma generate` exit 0). netlify.toml pins NODE_VERSION=22, so the deploy environment builds. |

## 9. Pre-existing console / network / rendering failures

1. **`ERR_DLOPEN_FAILED`** (`PrismaClientKnownRequestError`) on DB-backed `/api/data`
   routes (`resource=sets|cards|…`) → **GET 500** under the `node@22` dev runtime used
   locally. Root cause: better-sqlite3 native ABI mismatch in this environment. Pages
   still render (fallback/mock data), but DB API endpoints fail. **PRE-EXISTING ENVIRONMENT.**
2. **Local Node v21.7.3** cannot run `prisma generate` / `npm run build`
   (`ERR_REQUIRE_ESM` in `@prisma/dev`). Must use Node 22+. **PRE-EXISTING ENVIRONMENT.**
3. **No automated tests.** **NOT AVAILABLE.**

## 10. Git state

- Clean working tree at baseline (HEAD `fcd1328`).
- Recent history: pack-opening flow, mobile nav drawer, sign-in modal, Netlify deploy,
  collection/rewards — the project is actively developed.

## 11. Screenshots (baseline)

Directory: `.style-morph/screenshots/baseline/` — 12 PNGs, captured via headless
Chromium 146 at ~08:45 UTC, virtual-time-budget 8000 ms:

| File | URL | Viewport | Purpose |
|---|---|---|---|
| home-desktop.png | `/` | 1440×900 | Home hero + grids, desktop |
| home-tablet.png | `/` | 768×1024 | Home, tablet |
| home-mobile.png | `/` | 390×844 | Home, mobile |
| packs-desktop.png | `/packs` | 1440×900 | Pack grid, desktop |
| packs-tablet.png | `/packs` | 768×1024 | Pack grid, tablet |
| packs-mobile.png | `/packs` | 390×844 | Pack grid, mobile |
| collection-desktop.png | `/collection` | 1440×900 | Collection grid, desktop |
| collection-tablet.png | `/collection` | 768×1024 | Collection grid, tablet |
| collection-mobile.png | `/collection` | 390×844 | Collection grid, mobile |
| store-desktop.png | `/store` | 1440×900 | Store grid, desktop |
| store-tablet.png | `/store` | 768×1024 | Store grid, tablet |
| store-mobile.png | `/store` | 390×844 | Store grid, mobile |

---

*Baseline complete. The reference survey (jup.ag/gacha) is the next stage.*
