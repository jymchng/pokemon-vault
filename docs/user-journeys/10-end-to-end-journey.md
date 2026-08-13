# 10 — End-to-End Journey

Putting it all together: one continuous story from guest to collector, using
the test user `test@vault.io` / `Str0ng!Passw0rd`.

## 1. Browse

Start as a guest on the **home** page, explore the **store**, **packs** and
**sets** — everything loads from the backend.

![Home](images/01-home.png) · ![Store](images/02-store.png)

## 2. Create an account & sign in

Open the sign-in modal and **Create Account** (or sign in as the test user).
The live password checklist guides you; personal areas unlock.

![Sign-in modal](images/13-sign-in-modal.png) → ![Signed in](images/14-signed-in.png)

## 3. Shop & checkout

Add a product to the cart, review it in the drawer, fill checkout, and place
the order.

![Cart drawer](images/15-cart-drawer.png) → ![Checkout](images/16-checkout.png) → ![Order placed](images/18-order-placed.png)

## 4. Track the order

See the new order in **Orders** and open its detail with the status timeline.

![Orders list](images/19-orders-list.png) → ![Order detail](images/20-order-detail.png)

## 5. Grow your collection

Open booster packs (server-side pulls) and watch the cards land in your
**collection** and **activity** feed.

![Pack open result](images/28-pack-open-result.png) → ![Collection](images/21-collection.png)

## 6. Wishlist & rewards

Save products to your **wishlist**, and check your **Collector Level** and
**Reward Ladder**.

![Wishlist](images/24-wishlist.png) → ![Rewards](images/25-rewards.png)

## 7. Manage your account & sign out

Review your profile and addresses in **Account**, then **Sign Out** to return
to the guest experience.

![Account](images/26-account.png) → ![Signed out](images/29-signed-out.png)

---

That's the complete journey. Re-run any step any time — all state lives in
the dev database, so you can reset with a fresh `./scripts/dev-env.sh down
--drop-db && ./scripts/dev-env.sh up`.
