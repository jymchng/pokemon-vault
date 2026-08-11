# Current Site Survey — Pokémon Vault

> **Purpose:** Document the CURRENT WEBSITE (system under transformation) so the
> transformation plan and verification can preserve what matters and separate
> pre-existing from introduced issues.
> **Surveyed:** 2026-08-11 (source inspection + rendered-style measurement at
> 1440×900 via headless Chromium on the dev server).

---

## 1. Architecture

- **Next.js 16.3.0** App Router, React 19.2.8, TypeScript 5 strict, `src/` layout
  (`@/*` → `./src/*`), route group `(shop)` wrapped by a single `AppShell`.
- **Data flow:** UI → TanStack Query (`src/lib/hooks/queries.ts`, `queryKeys`
  single source) → `/api/data` (Prisma) → SQLite (`better-sqlite3` adapter,
  `DATABASE_URL=file:./dev.db`, generated client in `src/generated/prisma`,
  `server-only`). Static mock data in `src/lib/data/*.ts`.
- **Client state:** zustand persisted stores — auth, cart, wishlist, collection,
  activity, rewards, pack-inventory (quantity-aware `addPacks`/`consumePack`),
  ui (sidebarCollapsed).
- **Providers:** `QueryClientProvider` (staleTime 60s, refetchOnWindowFocus false,
  retry 1).

## 2. Pages / routes (17 page.tsx)

- `/` home (hero + product/graded/set/rewards grids)
- `/store` (+`?filter=new`) · `/packs` + `/packs/[slug]` (pack-open flow)
- `/sets` + `/sets/[id]`
- `/collection` + `/[id]` (card detail) + `/activity` + `/shipping`
- `/account` · `/checkout` · `/orders` + `/orders/[id]` · `/rewards`
  (+`?tab=level`) · `/wishlist`
- `/dev/components` · `/api/data` · `error.tsx` · `loading.tsx` · `not-found.tsx`

## 3. Components

**Global layout (AppShell):** sidebar (collapsible, nav groups Shop/Collect/
Orders/Rewards), top-bar (fixed h-14, backdrop-blur, search pill ⌘K, cart badge,
account menu), footer (desktop), mobile-nav (bottom 5 items) + mobile-nav-drawer,
cart-drawer, search-overlay, sign-in-modal, toaster.

**UI primitives (global, reusable):** button, card, dialog, dropdown-menu, input,
label, badge, alert, avatar, breadcrumb, checkbox, switch, pagination, progress,
empty-state, filter-pills, page-header, price-tag, skeleton-card, sonner.

**Feature components:** pokemon-card, card-art, product-card, pack-open-stage
(framer-motion flagship), cart-drawer, unopened-packs-section, activity-item,
reward-progress, sign-in-modal, search-overlay.

## 4. Styling / tokens

- Tailwind 4 (`@tailwindcss/postcss`), single `src/app/globals.css` with
  `@theme inline`, `@custom-variant dark`, base + components layers.
- **Tokens (measured):** background `#08090b` · foreground `#f5f6f8` · surface
  `#101216` · elevated `#16191f` · **primary `#f5c542` (GOLD)** · primary-foreground
  `#1a1503` · secondary `#f5c5421f` · muted `#16191f` · muted-foreground `#969ba6`
  · border `#252932` · input `#2e343f` · ring `#f5c542` · **radius `.625rem` (10px)**
  · accent `#16191f` · destructive `#e94545`.
- Extended: accent-blue `#4c9aff`, red `#e94545`, success `#42c978`, purple
  `#a78bfa`; rarity (common→secret), grade (PSA/CGC/BGS); shadows
  elevated/modal/popover/hover-lift/glow-accent; fonts Inter + Geist Mono;
  keyframes fade-in/fade-up/scale-in/shimmer/card-glow.
- Signature: `.card-border-ring` conic-gradient animated border; skeleton shimmer;
  custom scrollbar.

## 5. Responsive behavior (observed)

| Component | Desktop 1440 | Tablet 768–1024 | Mobile <640 |
|---|---|---|---|
| Sidebar | Expanded (md:pl-56, 224px) | Icon rail (md:pl-14, 56px) | Hidden |
| Top bar | h-14 (56), offset by sidebar | Same h-14 | Same h-14 (56), hamburger |
| Main | max-w-6xl centered, px-5 | Same | Same, pb-24 bottom-nav |
| Card grids | 4-col | 3-col | 2-col |
| Bottom nav | Hidden | Hidden | 5-item + drawer |
| Footer | Visible | Visible | Hidden |
| Gutters | 20px | 20px | 20px |

## 6. Interaction behavior (from source + baseline)

- framer-motion pack-open-stage (gacha reveal), cart/wishlist toasts (sonner),
  sign-in modal, search overlay, mobile drawer (Esc dismiss + focus trap),
  sidebar collapse toggle, hover washes (`hover:bg-*`), `transition-colors` on
  links, `.animate-border-angle` ring animation.
- Tabs exist on packs (What's Inside / Latest Pulls) and collection
  (Cards / Activity / Shipping) pages.

## 7. Technical constraints

- `images.unoptimized: true` (Netlify static; no `/_next/image`).
- `netlify.toml`: `NODE_VERSION=22`, esbuild bundler, external better-sqlite3/@prisma.
- Local env: **Node v21.7.3 cannot run `prisma generate`/`npm run build`**
  (`ERR_REQUIRE_ESM`); use `npx node@22`. Dev server runs under node@22.
- DB-backed `/api/data` routes 500 under the node@22 dev runtime
  (`ERR_DLOPEN_FAILED`, better-sqlite3 ABI) — pages fall back to mock data.
- No automated test suite.

## 8. What must be preserved

- **All routes, data, functionality** (store/packs/collection/checkout/orders/
  rewards/wishlist/auth), TanStack + zustand data flow, accessibility (aria,
  focus-visible, Esc, focus trap).
- **Dark-only identity** and **gold `#f5c542` brand accent** (Pokémon collector
  palette), conic-gradient card-border-ring, framer-motion pack-open-stage,
  sidebar+topbar shell, mobile bottom nav + drawer, 2/3/4-col grids, 20px gutters.

## 9. Gaps vs reference (feed the plan)

| Area | Current | Reference (jup.ag/gacha) |
|---|---|---|
| Primary accent | Gold #f5c542 | **Lime** oklch(90.7% .145 126.6) |
| Radius | 10px (0.625rem) | Cards 16px; buttons/tabs/select/badges **pill** |
| Header height | 56px all widths | 56 desktop / **50 mobile+tablet** |
| Shadows | elevated/modal/etc | **Flat cards** (1px border, no shadow) |
| Buttons | not fully pill | Pill |
| Mobile sub-nav | bottom nav + drawer | **Horizontal scroll pill strips** |
| Drawer motion | current | opacity 0.3s cubic-bezier(0.32,0.72,0,1) |
| Marketplace rows | product cards | Compact rows w/ price+grade |
| Mobile sidebar | hidden | hidden (matches) |
| Grids | 2/3/4-col | 2/3/4-col (matches) |
