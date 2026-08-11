# Transformation Plan — Pokémon Vault → jup.ag/gacha design language

> Strategy: **fidelity pass** — pokemon-vault already mirrors the reference's
> structure (sidebar+topbar shell, packs/collection/store/rewards, graded cards,
> pack-open gacha). The transformation shifts tokens/shape/behavior toward the
> measured reference design system while preserving all content, routes, data,
> and functionality.

---

## 1. What changes globally

1. **Design tokens (`globals.css` `@theme`):** add the reference's measured values
   — body bg `rgb(9,13,16)`, panels `~#1d232b`, border `~#262e36`, muted
   `#8b93a5`; introduce **lime accent** (approx `#c6f24c`, oklch(90.7% .145 126.6))
   as the *interaction* primary (CTA/active/hover/focus); keep **gold #f5c542**
   as the *brand* accent (logo, rarity-secret, premium). Add pill radius tokens
   (`--radius-pill: 9999px`), card radius `16px`, flat-surface shadows.
2. **Header:** h-14 (56) desktop → **h-12 (50) below lg**; align padding/gaps with
   reference.
3. **Radius/shape:** buttons, tabs, select, badges → pill; cards → 16px.
4. **Flat surfaces:** prefer 1px borders + elevated panels over heavy box-shadows.
5. **Motion tokens:** drawer/backdrop `opacity 0.3s cubic-bezier(0.32,0.72,0,1)`;
   hover washes `primary/5`.
6. **Scrollbar + focus ring:** align to reference dark slate + lime ring.

## 2. What changes at the component level

- **Button** — pill radius, lime primary variant + dark ghost; h 32–36.
- **Card** — radius 16, 1px border, flat, elevated panel bg.
- **Badge** — pill (radius 32px), 10px/500; lime "New", muted "Beta".
- **Tabs** — pill h=36, active lime@5% bg + lime text, inactive muted.
- **Input / Select / FilterPills** — pill select h=40, dark elevated bg.
- **TopBar** — h-12 mobile/tablet; search pill; connect/account button pill.
- **MobileNavDrawer** — reference backdrop + motion (0.3s springy ease).
- **PokemonCard / CardArt** — radius 16, 1px border, lime rarity accents (keep
  conic card-border-ring on premium).
- **ProductCard / store rows** — compact price + grade rows (reference marketplace).
- **PageHeader / PriceTag / EmptyState** — typography + pill alignment.
- **PackOpenStage** — keep flagship animation; align easing to springy reference.
- **RewardProgress / activity / rewards** — reference rewards-card styling.

## 3. What changes structurally

- **Mobile sub-nav:** add horizontal scroll pill strips for
  packs/collection/store/rewards (reference pattern) on relevant pages.
- **Home hero:** keep centered hero but radius 16 + lime accent orbs.
- **Pack detail:** adopt the 2-col layout (`1fr` + ~340px stats rail) at ≥lg and
  single-column below, with a stats panel (expected value, packs owned, toggles).
- **Footer:** minimal dark panel + Back-to-top (reference has minimal footer).
- No route/data changes; AppShell structure unchanged.

## 4. What changes behaviorally

- Drawer opens with reference motion; Esc/backdrop dismiss preserved.
- Tabs switch with instant lime active state (reference behavior).
- Hover washes on pills/cards (primary/5).
- Back-to-top sticky appears on scroll.
- Wallet-connect (sign-in) gates pack-open like reference "Connect wallet to open".

## 5. What changes responsively

- Header h-12 below lg (reference 50px).
- Sidebar already collapses to icon rail → keep (56px rail).
- Mobile sub-nav horizontal scroll strips (new).
- Card grids 2/3/4-col keep (already matches).
- Ensure 0 horizontal overflow at all widths; 20px gutters.

## 6. What stays unchanged

- **All routes, data, functionality** (store/packs/collection/checkout/orders/
  rewards/wishlist/auth), TanStack + zustand flows, Prisma/SQLite.
- **Dark identity**, **gold brand accent**, conic card-border-ring, pack-open-stage
  gacha, sidebar+topbar shell, mobile bottom nav + drawer, 2/3/4-col grids,
  a11y (aria, focus-visible, Esc, focus trap), accessibility semantics.
- Domain language (packs, graded cards, PSA/CGC/BGS grades, rewards, leaderboard).

## 7. Biggest visual mismatches (current → fix)

1. Gold-only primary → add lime interaction accent (Critical).
2. 10px radius → 16px cards + pill controls (Critical).
3. Header h-14 all widths → 50px mobile/tablet (High).
4. Elevated shadows → flat 1px-border surfaces (High).
5. Non-pill buttons/tabs/select → pill (High).
6. No mobile scroll sub-nav strips → add (High).
7. Product rows ≠ marketplace rows → compact price+grade rows (High).

## 8. Biggest interaction mismatches

1. Drawer motion ≠ reference springy ease (High).
2. Tab active state ≠ lime pill (High).
3. Hover washes ≠ primary/5 (Medium).
4. Wallet gate ≠ "Connect wallet to open" parity (Medium).

## 9. Safest implementation strategy

1. **Tokens first** (globals.css): add lime accent + radius/shadow tokens —
   zero-risk, ripples everywhere.
2. **Global shell** (TopBar height, sidebar rail, footer, drawer motion).
3. **UI primitives** (button, card, badge, tabs, input, select) via shared
   components/styles — one change, many pages.
4. **Feature components** (cards, store rows, rewards, activity).
5. **Pages** (home hero, pack detail layout, collection tabs).
6. **Verify** in real browser at 1440/768/390, compare screenshots vs reference,
   fix mismatches, iterate (bounded loop).

**Preservation guardrails:** never touch routes/data/API logic; keep dark identity
+ gold brand; keep a11y; keep pack-open-stage; keep bottom nav. All changes go
through Tailwind tokens/shared components to avoid one-off hacks.

## Reference IDs used

REF-TYPE (Inter 14/16, 18px h1), REF-COLOR (lime, bg rgb(9,13,16), panel,
border, muted), REF-SHAPE (pill, 16px cards, 1px borders), REF-SPACING (gaps,
header heights), REF-LAYOUT (sidebar states, 340px rail), REF-MOTION (drawer
0.3s cubic-bezier(0.32,0.72,0,1), hover washes), REF-RESP (2/3/4 grids, scroll
strips), REF-COMP (tabs, buttons, badges, select, cards).
