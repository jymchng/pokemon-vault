import { test, expect } from "@playwright/test";

/**
 * Storefront E2E journey (G53) — browse → auth → cart → checkout → orders →
 * collection/packs through the Next.js storefront against the LIVE dev
 * environment (scripts/dev-env.sh up). The web server proxies /api/v1 to the
 * API, so these assertions prove the real backend data flows through the UI.
 *
 * Since the storefront now requires sign-in for cart/checkout/orders (all data
 * is backend-persisted), the journey registers a fresh user, signs in, adds to
 * cart, completes a REAL checkout (test payment provider), and verifies the
 * persisted order.
 */

const WEB = process.env.POKE_VAULT_E2E_WEB_URL || "http://localhost:3000";
const PASSWORD = "Str0ng!Passw0rd";
let signUpCounter = 0;

async function signUp(page: import("@playwright/test").Page): Promise<string> {
  const email = `web-e2e-${Date.now()}-${signUpCounter++}@example.com`;
  await page.goto(`${WEB}/store`);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.getByRole("tab", { name: "Create Account" }).click();
  await page.fill("#auth-name", "Web E2E");
  await page.fill("#auth-email", email);
  await page.fill("#auth-password", PASSWORD);
  await page.getByRole("button", { name: "Create Account" }).click();
  // After signup the modal closes; the account menu shows the user email.
  await expect(page.getByRole("button", { name: "Account menu" })).toBeVisible({
    timeout: 20_000,
  });
  return email;
}

async function addMewToCart(page: import("@playwright/test").Page) {
  await page.goto(`${WEB}/store`);
  await page
    .getByRole("button", { name: /Add Mew ex — PSA 10 to cart/ })
    .click();
  // Cart badge (backend-persisted, mirrored in the client store).
  await expect(
    page.getByRole("button", { name: "Open cart, 1 items" }),
  ).toBeVisible({ timeout: 20_000 });
}

test.describe("storefront journey (G53)", () => {
  test("browse store renders real backend products", async ({ page }) => {
    await page.goto(`${WEB}/store`);
    const product = page.getByRole("button", {
      name: /Add Mew ex — PSA 10 to cart/,
    });
    await expect(product).toBeVisible({ timeout: 20_000 });
    // Backend seed price — the static mock used $122.00.
    await expect(
      page.getByText("$189.99", { exact: true }).first(),
    ).toBeVisible();
  });

  test("sign up (real backend auth) then add to cart", async ({ page }) => {
    await signUp(page);
    await addMewToCart(page);
    await page.getByRole("button", { name: "Open cart, 1 items" }).click();
    await expect(page.getByText("Your Cart")).toBeVisible();
    await expect(page.getByText("Mew ex — PSA 10").first()).toBeVisible();
    await page.getByText("Continue Shopping", { exact: true }).click();
  });

  test("checkout places a REAL order (test payment)", async ({ page }) => {
    const email = await signUp(page);
    await addMewToCart(page);
    await page.goto(`${WEB}/checkout`);
    await expect(
      page.getByRole("heading", { name: "Checkout", exact: true }),
    ).toBeVisible();

    await page.fill("#contact", email);
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
    ).toBeVisible({ timeout: 20_000 });
  });

  test("orders page shows the persisted order", async ({ page }) => {
    const email = await signUp(page);
    await addMewToCart(page);
    await page.goto(`${WEB}/checkout`);
    await expect(
      page.getByRole("heading", { name: "Checkout", exact: true }),
    ).toBeVisible();
    await page.fill("#contact", email);
    await page.fill("#address", "12 Pallet Lane");
    await page.fill("#city", "Celadon City");
    await page.fill("#zip", "10001");
    await page.fill("#card", "4242 4242 4242 4242");
    await page.fill("#expiry", "12/30");
    await page.fill("#cvc", "123");
    await page.getByRole("button", { name: /Place Order/ }).click();
    await expect(
      page.getByRole("heading", { name: "Order Placed!", exact: true }),
    ).toBeVisible({ timeout: 20_000 });

    await page.goto(`${WEB}/orders`);
    await expect(
      page.getByRole("heading", { name: "Orders", exact: true }),
    ).toBeVisible();
    await expect(page.getByText(/Your order history/)).toBeVisible();
  });

  test("create-account password validation shows live checklist + specific errors", async ({
    page,
  }) => {
    await page.goto(`${WEB}/store`);
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.getByRole("tab", { name: "Create Account" }).click();

    // Live checklist is visible in Create Account mode.
    await expect(page.getByText("At least 8 characters")).toBeVisible();
    await expect(
      page.getByText("Uses 3 of: lowercase, uppercase, number, symbol"),
    ).toBeVisible();
    await expect(page.getByText("No sequences like abc, 123, or qwerty")).toBeVisible();

    // Submitting a weak password surfaces the SPECIFIC backend message
    // (not the generic "Validation failed").
    await page.fill("#auth-name", "Weak Pw");
    await page.fill("#auth-email", `weak-${Date.now()}@example.com`);
    await page.fill("#auth-password", "abc");
    await page.getByRole("button", { name: "Create Account" }).click();
    await expect(
      page.getByText("Password must be at least 8 characters"),
    ).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("Validation failed")).not.toBeVisible();

    // Common password → specific reason too.
    await page.fill("#auth-password", "password1");
    await page.getByRole("button", { name: "Create Account" }).click();
    await expect(
      page.getByText("This password is too common"),
    ).toBeVisible({ timeout: 15_000 });
  });

  test("collection page prompts sign-in for guests", async ({ page }) => {
    await page.goto(`${WEB}/collection`);
    await expect(
      page.getByRole("heading", { name: "Collection", exact: true }),
    ).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/Sign in to view your collection/)).toBeVisible();
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
