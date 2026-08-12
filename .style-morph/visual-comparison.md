# Visual Comparison — Pokémon Vault vs jup.ag/gacha

> Three-way: **Before** (baseline) → **Reference** (jup.ag/gacha) → **After** (implementation).
> Screenshots: `.style-morph/screenshots/comparison/{packs,collection}-{desktop,tablet,mobile}-{reference,baseline,implementation}.png`
> Verdicts: PASS / PARTIAL / FAIL (concrete observations only).

---

## 1. Global design language

### Before
- Dark bg `#08090b`, gold `#f5c542` primary everywhere (CTAs, tabs, focus, orbs),
  10px radius, elevated shadows on cards, header h-14 (56px) at all widths,
  underline tabs, non-lime hover washes.

### Reference
- bg rgb(9,13,16), **lime** `oklch(90.7% .145 126.6)` interaction accent, panels
  ~#1d232b, border ~#262e36, muted #8b93a5, pill controls, 16px cards, flat
  1px-border surfaces, header 56/50px, pill tabs with lime active, lime hover washes.

### After
- bg `rgb(9,13,16)` (computed match), **lime** `#c6f24c` added as interaction
  accent (CTAs, active tabs, focus rings, hover washes, pack-tier active), gold
  kept as brand/primary, panels `#1d232b`, border `#262e36`, muted `#8b93a5`,
  cards 16px flat, buttons/tabs/select/badges pill, header 56/48px, drawer
  backdrop 0.3s cubic-bezier(0.32,0.72,0,1), Back-to-top sticky.

### Remaining mismatch
- Header 48px (mobile) vs reference ~50px (2px — negligible).
- Sidebar at 768 stays expanded 224px (reference uses 56px icon rail) — **preserved
  divergence** (pokemon-vault's existing responsive behavior, lower risk to keep).

### Verdict
**PASS** — bg/panels/border/muted/lime/focus/pills/16px cards/header heights all
match or closely match the reference.

## 2. Packs page

### Before
- Hero tier strip: gold active (`bg-secondary text-primary`), `scrollbar-none` flex;
  pull rows `rounded-xl bg-surface` with gold icon circle; no lime anywhere.

### Reference
- Tier strip: pill buttons, **lime active** (border-accent-lime/50 bg lime/10);
  pull rows 16px elevated with lime icon; dark elevated panels.

### After
- Tier strip → `subnav-strip` (hidden scrollbar), pill h-8, **active lime**
  (border-accent-lime/50 bg-accent-lime/10 text-accent-lime); pull rows →
  `rounded-[1rem] bg-elevated` with **lime pill icon**; stats/price rows now
  elevated 16px.

### Remaining mismatch
- Reference packs hero is a 2-col carousel + 340px stats rail at ≥lg; pokemon-vault
  packs uses a 2-col card layout with an info panel (functionally similar, different
  arrangement). The tier strip + pull rows now match the reference styling closely.

### Verdict
**PARTIAL** — tier strip + pull rows match (lime active, 16px elevated); the hero
layout (carousel vs static card) differs but preserves pokemon-vault's own
pack-open-stage functionality.

## 3. Collection page

### Before
- Underline tabs (border-b-2, gold active), muted links; grid of pokemon cards.

### Reference
- Pill tablist (rounded-full bg-muted), active pill lime@10% + lime text;
  graded-card rows with grade badges.

### After
- **Pill tablist** (rounded-full bg-muted p-1), active "Cards" pill
  `bg-accent-lime/10 text-accent-lime`, Activity/Shipping muted pills with
  hover:text-foreground; cards retain rarity/graded styling.

### Remaining mismatch
- Reference collection cards are graded-card rows (name/price/grade badge);
  pokemon-vault uses pokemon-card tiles (rarity border + art) — intentionally kept
  (domain identity). Tabs + filters now match the reference pill language.

### Verdict
**PASS** — tabs are now the reference pill pattern with lime active; card grid is
domain-appropriate.

## 4. Store / marketplace

### Before
- Product cards grid (2/3/4-col) with price; gold accents.

### Reference
- Compact listing rows (name, price, grade badge) with sort/filter pills.

### After
- Product cards now use the shared 16px elevated Card (border, flat); price tags
  render in foreground; hover washes lime. (Row-listing restructure was deferred —
  pokemon-vault's grid is functional and matches reference grid behavior.)

### Remaining mismatch
- Store remains a card grid, not the reference's row list — **Low priority**
  (grid is the pokemon-vault identity; rows are a reference-specific layout).

### Verdict
**PARTIAL** — tokens/cards/pills match; row-listing layout differs (Low, preserved).

## 5. Header / shell

### Before
- h-14 all widths, gold focus, non-pill search h-9.

### After
- h-12 mobile / h-14 desktop (48/56), lime focus ring, search pill h-8, offset
  matches (pt-12 md:pt-14). Sidebar hover washes lime.

### Verdict
**PASS** — matches reference header heights and pill/search/focus.

## 6. Motion / interactions

### Before
- Drawer backdrop bg-black/60 blur, unspecified motion.

### After
- Drawer backdrop `bg-black/20` + `opacity 0.3s cubic-bezier(0.32,0.72,0,1)`
  (exact reference), panel fade-up 0.3s ease-jupiter; Esc closes; nav links
  navigate; lime hover washes; lime focus rings.

### Verdict
**PASS** — drawer motion and interaction states match the reference.

## 7. Responsive

### Before
- Header 56 all widths; sidebar 224/224/hidden; grids 2/3/4; 0 overflow.

### After
- Header 48/56/56; sidebar hidden/224/224; grids 2/3/4; **0 overflow** at 390/768/1440.

### Verdict
**PASS** — matches reference 0-overflow and grid behavior; header mobile 48 vs 50 (negligible).

---

## Summary of verdicts

| Area | Verdict |
|---|---|
| Global design language | PASS |
| Packs page | PARTIAL (hero layout — Low, preserved) |
| Collection page | PASS |
| Store/marketplace | PARTIAL (row layout — Low, preserved) |
| Header/shell | PASS |
| Motion/interactions | PASS |
| Responsive | PASS |

**PASS: 5 · PARTIAL: 2 (both Low/preserved) · FAIL: 0 · BLOCKED: 0**

## Final gate (2026-08-11)

Clean final pass re-verified: typecheck/lint/format PASS; browser smoke 1440/768/390
0 overflow, 0 console errors desktop/tablet, drawer interactions PASS. The 2 PARTIALs
are Low-severity preserved divergences (packs hero arrangement, store card-grid
identity) — no Critical/High remain. **Gate: CLEAN.**
