# Component Mapping — pokemon-vault → jup.ag/gacha

> Maps each CURRENT component to its reference pattern with an action and
> priority. Priorities: **Critical** (global/high-impact), **High** (common),
> **Medium** (feature), **Low** (minor).

## Global layout & shell

| Current Component | Reference Pattern | Action | Priority |
|---|---|---|---|
| globals.css tokens (gold #f5c542, radius 10px) | Lime primary + pill radii + 16px cards | **Restyle** (introduce lime accent, pill radius tokens, flat surfaces) | Critical |
| Sidebar (expanded / icon rail / hidden) | Sidebar (expanded / 56px rail / hidden) | **Keep** (already matches) + tighten rail to 56px | High |
| TopBar (h-14 fixed, blur) | Header (h=56 desktop / 50 mobile+tablet, blur) | **Restyle** (height 50 on <lg; align paddings) | Critical |
| Footer (desktop-only) | Minimal/no footer + Back-to-top | **Restyle** (dark panel, minimal, add Back-to-top) | Medium |
| MobileNav (bottom 5 items) | Full-screen drawer + scroll sub-nav | **Keep** (functional divergence, pokemon-vault's bottom nav is fine) + align drawer motion | Medium |
| MobileNavDrawer | Full-screen drawer (opacity 0.3s cubic-bezier(0.32,0.72,0,1)) | **Restyle** (adopt reference drawer motion + backdrop) | High |
| CartDrawer / SearchOverlay / SignInModal | Wallet-connect/drawer patterns | **Keep** + align motion | Medium |
| Toaster | — | Keep | Low |

## UI primitives

| Current Component | Reference Pattern | Action | Priority |
|---|---|---|---|
| Button | Pill buttons (fully rounded, h 32–36, lime primary) | **Restyle** (pill radius; lime primary variant; dark ghost) | Critical |
| Card | Cards radius 16px, 1px border, flat (no shadow) | **Restyle** (radius 16, flat, elevated panel bg) | Critical |
| Badge | Pill badges 10px/500, radius 32px | **Restyle** (pill) | High |
| Tabs (packs/collection) | Pill tabs h=36, active lime@5% + lime text | **Restyle** (pill tabs + lime active state) | High |
| Input | Dark elevated inputs, 1px border | **Restyle** (match border/bg) | High |
| Select/dropdown (filter-pills, sort) | Pill select h=40 | **Restyle** (pill) | Medium |
| Checkbox/Switch | — | Keep + minor | Medium |
| Pagination | (not in reference; infinite/load-more) | **Keep** | Low |
| Progress | Reward progress bars | Keep (already close) | Low |
| EmptyState | Reference empty state + CTA | **Keep** (already matches pattern) | Low |
| PageHeader | Section header pattern | Restyle (typography scale) | Medium |
| PriceTag | Price + grade rows | Restyle (compact rows) | Medium |
| SkeletonCard | — | Keep | Low |

## Feature components

| Current Component | Reference Pattern | Action | Priority |
|---|---|---|---|
| PokemonCard / CardArt | Graded-card display w/ rarity border | **Restyle** (radius 16, 1px border, lime rarity accents; keep card-border-ring) | Critical |
| ProductCard | Marketplace/card listing rows (price + grade) | **Restyle** (compact rows, price+grade badges) | High |
| PackOpenStage (framer-motion) | Pack-open/gacha reveal (spin + flip) | **Keep + refine** (already flagship gacha; align motion/easing) | High |
| UnopenedPacksSection | Pack inventory strip | Keep + restyle | Medium |
| ActivityItem | Activity rows | Restyle (compact) | Medium |
| RewardProgress | Rewards/battlepass block | Restyle (match reference rewards card) | Medium |
| SignInModal | Connect wallet modal | Keep + align | Medium |

## Pages / sections

| Current | Reference | Action | Priority |
|---|---|---|---|
| Home hero (orbs, rounded-3xl card) | Pack hero (2-col + 340px rail ≥lg; single col mobile) | **Restyle** (radius 16; keep orbs/gold identity) | High |
| Home grids | Card grids 2/3/4-col gap-4 | **Keep** (matches) | Low |
| Store / Marketplace rows | Marketplace listing rows | **Restyle** (compact price+grade rows) | High |
| Packs page + detail | Pack detail (carousel, tabs, stats rail, rewards) | **Restyle** (align hero layout, stats panel, pill tabs) | High |
| Collection (cards/activity/shipping) | Collection (Cards/Activity/Shipping tabs) | **Restyle** (pill tabs, compact rows, filters) | High |
| Rewards / leaderboard | Leaderboard + battlepass | **Restyle** (podium, ranked list, prizes) | Medium |
| Checkout / Orders | — | Keep (functionality) | Low |
| dev/components | — | Keep | Low |

## Notes

- **Primary accent decision:** introduce **lime** as the primary interaction/CTA/
  active accent (buttons, tabs active, hover washes, focus rings) while keeping
  **gold #f5c542** as the brand accent (logo, rarity-secret, premium badges) —
  mirrors how the reference uses one strong accent; keeps Pokémon identity.
- **Radius:** global card radius → 16px; buttons/tabs/select/badges → pill.
- **Flat surfaces:** reduce reliance on elevation shadows; use 1px borders +
  elevated panels (reference is flat).
- **Header:** h-14 (56) desktop, **h-12 (50)** below lg.
- **Drawer motion:** backdrop opacity 0.3s cubic-bezier(0.32, 0.72, 0, 1).
- **Mobile sub-nav:** add horizontal scroll pill strips for packs/collection/
  store/rewards where the reference uses them.
- **Preserve:** all routes/data/functionality, dark identity, gold brand accent,
  card-border-ring, pack-open-stage, sidebar shell, bottom nav, a11y.
