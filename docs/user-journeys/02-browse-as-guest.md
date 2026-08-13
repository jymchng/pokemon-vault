# 02 — Browse as a Guest

Anyone can browse the catalog without an account. This journey covers what a
**guest** sees: the home page, the store, booster packs, and sets.

## Home

`/` is the landing page — hero, trending products, featured graded cards,
latest sets, collector-rewards teaser, and a pack CTA. All of it comes from the
backend catalog.

![Home](images/01-home.png)

## Store

The store (`/store`) lists every product with filters (category), search, and
sorting. Each card shows price, category and an **Add to Cart** button.

![Store](images/02-store.png)

> Guests who click **Add to Cart** are prompted to sign in — the cart is tied
> to an account (see [04 — Shop & checkout](04-shop-and-checkout.md)).

## Booster Packs

The packs page (`/packs`) is a carousel of booster packs. Use the arrows or
the pack pills to switch packs, and **Open Pack** / **Buy Pack** are available
(open requires sign-in).

![Booster packs](images/03-packs.png)

### Pack detail

Clicking through to a single pack (`/packs/<slug>`) shows the pack art,
price, contents and other packs in the catalog.

![Pack detail](images/04-pack-detail.png)

## Sets

`/sets` shows every Pokémon set with collection progress. Guests see the full
catalog and set completion percentages.

![Sets](images/05-sets.png)

![Set detail](images/06-set-detail.png)

## Guest sign-in prompts

Account-based areas ask guests to sign in instead of showing blank pages:

| Page | Guest sees |
|---|---|
| Collection | ![guest-collection](images/07-guest-collection.png) |
| Orders | ![guest-orders](images/08-guest-orders.png) |
| Wishlist | ![guest-wishlist](images/09-guest-wishlist.png) |
| Rewards | ![guest-rewards](images/10-guest-rewards.png) |
| Account | ![guest-account](images/11-guest-account.png) |
| Checkout | ![guest-checkout](images/12-guest-checkout.png) |

## Next

→ [03 — Create an account & sign in](03-create-account-and-sign-in.md)
