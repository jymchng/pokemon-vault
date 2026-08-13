import { test, expect } from "@playwright/test";

/**
 * Storefront E2E journey (G53) — browse → cart → checkout → orders →
 * collection/packs through the Next.js storefront against the LIVE dev
 * environment (scripts/dev-env.sh up). The web server proxies /api/v1 to the
 * API, so these assertions prove the real backend data flows through the UI.
 *
 * Live-data proof: the seeded backend prices differ from the static mock
 * (e.g. "Mew ex — PSA 10" is $189.99 in the DB vs $122.00 in the mock), so
 * asserting the backend price on the rendered page fails if the mock fallback
 * ever served the data.
 */

const WEB = process.env.E2E_WEB_URL || "http://localhost:3000";

async function addMewToCart(page: import("@playwright/test").Page) {
  await page.goto(`${WEB}/store`);
  await page
    .getByRole("button", { name: /Add Mew ex — PSA 10 to cart/ })
    .click();
  // Cart badge (zustand persist, per-test isolated storage).
  await expect(
    page.getByRole("button", { name: "Open cart, 1 items" }),
  ).toBeVisible();
}

/** Navigate to checkout; the cart is persisted in localStorage by zustand. */
async function gotoCheckout(page: import("@playwright/test").Page) {
  await page.goto(`${WEB}/checkout`);
  await expect(
    page.getByRole("heading", { name: "Checkout", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Mew ex — PSA 10").first()).toBeVisible();
}

test.describe("storefront journey (G53)", () => {
  test("browse store renders real backend products", async ({ page }) => {
    await page.goto(`${WEB}/store`);
    // Wait for the product grid populated by /api/v1/products (via proxy).
    const product = page.getByRole("button", {
      name: /Add Mew ex — PSA 10 to cart/,
    });
    await expect(product).toBeVisible({ timeout: 20_000 });
    // Backend seed price — the static mock uses $122.00.
    await expect(
      page.getByText("$189.99", { exact: true }).first(),
    ).toBeVisible();
  });

  test("add to cart → cart drawer → checkout", async ({ page }) => {
    await addMewToCart(page);
    await page.getByRole("button", { name: "Open cart, 1 items" }).click();
    await expect(page.getByText("Your Cart")).toBeVisible();
    await expect(page.getByText("Mew ex — PSA 10").first()).toBeVisible();
    await expect(
      page.getByText("$189.99", { exact: true }).first(),
    ).toBeVisible();
    // Close the drawer, then reach checkout via the persisted cart.
    await page.getByText("Continue Shopping", { exact: true }).click();
    await gotoCheckout(page);
  });

  test("checkout places an order (client journey, mock payment)", async ({
    page,
  }) => {
    await addMewToCart(page);
    await gotoCheckout(page);

    await page.fill("#contact", "trainer@vault.io");
    await page.fill("#address", "12 Pallet Lane");
    await page.fill("#city", "Celadon City");
    await page.fill("#zip", "10001");
    await page.check('input[name="delivery"][value="standard"]');
    await page.fill("#card", "4242 4242 4242 4242");
    await page.fill("#expiry", "12/30");
    await page.fill("#cvc", "123");

    await page.getByRole("button", { name: /Place Order/ }).click();
    await expect(
      page.getByRole("heading", { name: "Order Placed!", exact: true }),
    ).toBeVisible({ timeout: 15_000 });
  });

  test("orders page renders after checkout", async ({ page }) => {
    await addMewToCart(page);
    await gotoCheckout(page);
    await page.fill("#contact", "trainer@vault.io");
    await page.fill("#address", "12 Pallet Lane");
    await page.fill("#city", "Celadon City");
    await page.fill("#zip", "10001");
    await page.fill("#card", "4242 4242 4242 4242");
    await page.fill("#expiry", "12/30");
    await page.fill("#cvc", "123");
    await page.getByRole("button", { name: /Place Order/ }).click();
    await expect(
      page.getByRole("heading", { name: "Order Placed!", exact: true }),
    ).toBeVisible({ timeout: 15_000 });

    await page.goto(`${WEB}/orders`);
    await expect(
      page.getByRole("heading", { name: "Orders", exact: true }),
    ).toBeVisible();
    await expect(page.getByText(/Your order history/)).toBeVisible();
  });

  test("collection page renders (backend cards)", async ({ page }) => {
    await page.goto(`${WEB}/collection`);
    await expect(
      page.getByRole("heading", { name: "Collection", exact: true }),
    ).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/View and manage the Pok/)).toBeVisible();
  });

  test("packs page renders seeded packs", async ({ page }) => {
    await page.goto(`${WEB}/packs`);
    await expect(
      page.getByRole("heading", { name: "Booster Packs", exact: true }),
    ).toBeVisible({ timeout: 20_000 });
    await expect(
      page.getByRole("heading", { name: "Obsidian Flames", exact: true }),
    ).toBeVisible();
    await expect(page.getByText("$4.99", { exact: true }).first()).toBeVisible();
  });
});
