# Reference Survey — jup.ag/gacha (Jupiter Gacha)

> **Purpose:** Reverse-engineered design system of the EMULATED WEBSITE. Only
> observed/measured findings are recorded; estimates are labeled.
> **Surveyed:** 2026-08-11 via Playwright MCP + headless Chromium 146
> (measured computed styles at 1440×900, 1024×768, 768×1024, 390×844, 375×812).
> **Screenshots:** `.style-morph/screenshots/reference/{packs,collection,marketplace}.png`

---

## 1. Global visual language

- **Aesthetic:** Dark, high-density web3/fintech dashboard. Flat surfaces, minimal
  elevation, crisp 1px borders, neon-lime accent on near-black. Gamified gacha
  energy (pack tiers, graded-card pulls, leaderboard, battlepass rewards).
- **Density:** Medium-high; compact rows and controls; generous section gaps.
- **Whitespace:** 20px page gutters (mobile) to ~80px (desktop); gap-4 (16px)
  card grids, gap-6 (24px) section stacks.
- **Hierarchy:** Single primary lime accent; near-white foreground; muted
  blue-grey secondary text; dark elevated panels for cards/surfaces.
- **Grid:** App shell = left sidebar + top bar + max-width content; content
  grids 2/3/4-col responsive; pack detail = 1fr + 340px stats rail at ≥lg.
- **Section rhythm:** stacked `flex flex-col gap-6` sections with clear
  separation by surface/panel rather than heavy shadows.

## 2. Typography (measured)

| Element | Font | Size | Weight | Line-height |
|---|---|---|---|---|
| Base body | Inter | 16px | 400 | 24px |
| h1 (product title) | Inter | 18px | 600 | 28px |
| Nav links | Inter | 14px | 500 | — |
| Tabs | Inter | 14px | 500 | — |
| Badges ("New"/"Beta") | Inter | 10px | 500 | — |
| Primary button | Inter | 12px | 600 | — |
| Select | Inter | 14px | 400 | — |

- Letter-spacing: normal (no wide tracking on UI text). Labels/eyebrows uppercase
  tracked-widest in a few spots (inferred from pokemon-vault parity).
- Font family: Inter (body class `font-inter`, body `text-white`).

## 3. Color system (measured oklch/oklab → approx)

| Role | Value (measured) | Approx hex |
|---|---|---|
| Page/body bg | rgb(9,13,16) | #090d10 |
| Surface/panel | oklch(0.192 0.022 251.886) | ~#1d232b |
| Border | oklch(25.5% .025 246.371) | ~#262e36 |
| Foreground (primary text) | oklch(0.929 0.013 255.508) | ~#eceef2 |
| Muted/secondary text | oklch(0.704 0.04 256.993) | ~#8b93a5 |
| **Primary (lime)** | oklch(90.7% .145 126.628) | ~#c6f24c |
| Primary @ 10% | oklch(90.7% .145 126.628 / .1) | lime wash |
| Primary @ 5% (hover) | oklab(0.907 -.0865 .1163 / .05) | hover wash |
| Active tab bg | oklab(0.907 -.0865 .1163 / .05) | lime 5% |
| Dark control bg | oklch(0.255 0.025 246.371) | ~#262e36 |
| Backdrop overlay | black/20 | rgba(0,0,0,.2) |

- **IMPORTANT:** the reference primary is LIME GREEN, not gold. pokemon-vault's
  current primary is gold `#f5c542`. A fidelity transformation should introduce
  the lime accent (at least for interactions/CTAs/active states) while preserving
  pokemon-vault's gold identity where deliberate.

## 4. Shape language (measured)

- **Pills:** buttons (radius 3.35e7px → fully rounded), tabs (40px), badges
  (32px), select (pill), search pill, hamburger (28px pill).
- **Cards/panels:** radius **16px**, 1px border, flat (no box-shadow), pad 16–20px.
- **Nav buttons:** radius 8px, h=32.
- **Borders:** 1px solid border color (dark slate); `border-b-2` on tier rows.
- **Divider/separator:** subtle border-color lines; no heavy elevation.

## 5. Spacing system (inferred)

- Base unit ~4px; recurring: 8 (gap/pad), 12 (button pad), 16 (card pad/grid
  gap), 20 (page gutter/card pad), 24 (section gap), 36–42 (row heights).
- Header 56px (desktop) / 50px (tablet+mobile).
- Controls: buttons h=32–36; select h=40; tabs h=36; nav links h=36; tier rows 42px.

## 6. Layout

- App shell: fixed left sidebar + top header + content (max-width ~6xl-7xl).
- Sidebar states: expanded (~230px) → icon rail (56px) → hidden (mobile).
- Header offset follows sidebar; content gutters 20px mobile → ~76px tablet →
  ~80px+ desktop.
- Pack detail: 2-col `lg:grid-cols-[minmax(0,1fr)_340px]` (content + stats rail);
  stacks below lg.
- Card grids: `grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4`.

## 7. Components (measured)

### Header
h=56/50, bg rgb(9,13,16), Jupiter wordmark, nav links 14px/500, search pill
(12px/500, h=36), Connect button (lime pill, 12px/600, h=36), settings, hamburger
(mobile 28px pill).

### Navigation
Desktop: expanded sidebar w/ groups + "Pin to top nav". Tablet: 56px icon rail.
Mobile: hidden + full-screen drawer (backdrop black/20, opacity 0.3s
cubic-bezier(0.32,0.72,0,1) — Observed). Gacha sub-nav on mobile = horizontal
scroll strip of pill links (36px).

### Buttons
Pill radius; primary lime (dark text); icon 36px; nav 32px r8; base 14px gap-8.

### Tabs
Pill (40px), h=36, 14px/500; active bg lime@5% + lime text; inactive transparent
+ muted; instant swap (Observed), click flips aria-selected.

### Select
Pill, h=40, 14px, dark elevated bg, menu opens on click (options list).

### Badges
10px/500, radius 32px, pad 0 6px; "New" lime on lime@10%; "Beta" muted on dark.

### Cards
radius 16px, 1px border, flat, elevated panel bg; pack card 340×380 pad 16;
rewards card pad 20.

### Marketplace/listing rows
Div-based compact rows: title + Price + Grade (PSA/CGC/BECKETT badge). No
semantic table.

### Leaderboard rows
Ranked list: rank / wallet (truncated) / volume; top-3 podium cards.

### Footer
No `<footer>` element observed (minimal; Back-to-top sticky). pokemon-vault
keeps a footer — restyle to dark panel, minimal.

## 8. Interactions (observed)

- **Tabs:** click → aria-selected flips → active bg lime@5% → content swaps (instant).
- **Nav hover:** `hover:bg-primary/5` wash on pills; transition all (base 0s;
  hover duration Estimated ~150ms).
- **Mobile drawer:** hamburger tap → backdrop `fixed inset-0 z-50 bg-black/20`
  fades in (opacity 0.3s cubic-bezier(0.32,0.72,0,1) — Observed) → panel opens.
- **Pack carousel:** Previous/Spin/Next (32px) + Gift (32px) + Fewer/More (28px);
  drag-to-spin + tap-to-open (motion Estimated springy; exact Unknown).
- **Select:** click → menu → choose → label updates.
- **Back-to-top:** sticky bottom, appears on scroll, smooth scroll (Inferred).
- **Wallet-gated:** Connect wallet to open packs; Turbo toggle; Instant buyback
  — BLOCKED (needs wallet) — mark Unknown until transformation decides parity.

## 9. Motion (observed/estimated)

- Drawer/backdrop: opacity 0.3s cubic-bezier(0.32, 0.72, 0, 1) — **Observed**.
- Tab active: instant bg swap — **Observed**.
- Hover washes: primary/5, ~150ms — **Estimated**.
- Pack spin/open: springy rotate/scale — **Inferred**.
- Back-to-top scroll: smooth — **Inferred**.

## 10. Responsive matrix

| Component | Desktop 1440 | Tablet 768–1024 | Mobile <640 |
|---|---|---|---|
| Sidebar | Expanded (~230px) | 56px icon rail | Hidden |
| Header | h=56, offset by sidebar | h=50, offset by 56px rail | h=50, full-width, hamburger |
| Main nav | Top links | Condensed | Drawer (full-screen) |
| Gacha sub-nav | Sidebar groups | Icon rail | Horizontal scroll pill strip |
| Hero (pack) | 2-col (content + 340px rail) | 2-col ≥lg / stacks | Single column |
| Card grids | 4-col | 3-col | 2-col |
| Rows | Card rows | Condensed | Single column |
| Footer | Minimal / Back-to-top | Same | Same |
| Overflow | 0 | 0 | 0 |

Breakpoints (inferred from Tailwind classes observed): `sm` ≥640 (3-col),
`lg` ≥1024 (4-col + hero 2-col), sidebar expanded requires xl/2xl (Inferred);
header 56→50 below some width.

## 11. Key implications for pokemon-vault

1. **Accent:** introduce lime (primary interaction/CTA/active) alongside gold.
2. **Shape:** pills for buttons/tabs/select/badges; 16px card radius; 1px borders; flat cards.
3. **Colors:** bg #090d10 family, panels ~#1d232b, border ~#262e36, muted #8b93a5, near-white text.
4. **Header:** h=56 desktop / 50 mobile; offset by sidebar/rail.
5. **Mobile sub-nav:** horizontal scroll pill strips (packs/collection/marketplace).
6. **Drawer motion:** opacity 0.3s cubic-bezier(0.32,0.72,0,1).
7. **Grids:** 2/3/4-col already matches; keep 20px gutters.
8. **Zero horizontal overflow** at all widths.
