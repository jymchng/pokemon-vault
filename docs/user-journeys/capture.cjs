/**
 * Pokémon Vault — user-journey screenshot capture (dev environment).
 *
 * Drives the live storefront (http://localhost:3000) with headless Chromium,
 * walks every user journey (guest + signed-in as the test user), and writes
 * PNG screenshots into docs/user-journeys/images/.
 *
 * Run: node docs/user-journeys/capture.cjs
 * Requires: scripts/dev-env.sh up (api :3001, web :3000).
 */
const path = require("node:path");
const fs = require("node:fs");
const { chromium } = require("/root/typescript_projects/pokemon-vault/node_modules/.pnpm/playwright@1.62.1/node_modules/playwright");

const WEB = "http://localhost:3000";
const OUT = path.join(__dirname, "images");
fs.mkdirSync(OUT, { recursive: true });

const EMAIL = "test@vault.io";
const PASSWORD = "Str0ng!Passw0rd";
const T = 20_000; // default wait timeout

async function shot(page, name) {
  await page.waitForTimeout(500); // let animations/loading settle
  await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: false });
  console.log(`  📸 ${name}.png`);
}

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1360, height: 900 } });
  const page = await context.newPage();
  page.setDefaultTimeout(T);

  // =====================================================================
  // GUEST JOURNEYS
  // =====================================================================
  console.log("— Guest journeys —");

  await page.goto(`${WEB}/`, { waitUntil: "networkidle" });
  await shot(page, "01-home");

  await page.goto(`${WEB}/store`, { waitUntil: "networkidle" });
  await page.waitForSelector('button[aria-label*="Add Mew ex"]', { timeout: T });
  await shot(page, "02-store");

  await page.goto(`${WEB}/packs`, { waitUntil: "networkidle" });
  await page.waitForSelector('text=Booster Packs', { timeout: T });
  await shot(page, "03-packs");

  await page.goto(`${WEB}/packs/obsidian-flames`, { waitUntil: "networkidle" });
  await page.waitForSelector('text=Obsidian Flames', { timeout: T });
  await shot(page, "04-pack-detail");

  await page.goto(`${WEB}/sets`, { waitUntil: "networkidle" });
  await shot(page, "05-sets");

  await page.goto(`${WEB}/sets/obf`, { waitUntil: "networkidle" });
  await shot(page, "06-set-detail");

  // Guest sign-in prompts
  for (const [route, name] of [
    ["/collection", "07-guest-collection"],
    ["/orders", "08-guest-orders"],
    ["/wishlist", "09-guest-wishlist"],
    ["/rewards", "10-guest-rewards"],
    ["/account", "11-guest-account"],
    ["/checkout", "12-guest-checkout"],
  ]) {
    await page.goto(`${WEB}${route}`, { waitUntil: "networkidle" });
    await shot(page, name);
  }

  // =====================================================================
  // AUTH — sign in modal
  // =====================================================================
  console.log("— Sign in —");
  await page.goto(`${WEB}/store`, { waitUntil: "networkidle" });
  await page.click('button[aria-label="Sign in"]');
  await page.waitForSelector('[role="dialog"]', { timeout: T });
  await shot(page, "13-sign-in-modal");
  await page.fill("#auth-email", EMAIL);
  await page.fill("#auth-password", PASSWORD);
  await page.click('button[type="submit"]:has-text("Sign In")');
  await page.waitForSelector('button[aria-label="Account menu"]', { timeout: T });
  await shot(page, "14-signed-in");

  // =====================================================================
  // SHOPPING — add to cart, cart drawer
  // =====================================================================
  console.log("— Cart —");
  await page.click('button[aria-label*="Add Mew ex"]');
  await page.waitForSelector('button[aria-label^="Open cart,"]', { timeout: T });
  await page.click('button[aria-label^="Open cart,"]');
  await page.waitForSelector('text=Your Cart', { timeout: T });
  await shot(page, "15-cart-drawer");

  // =====================================================================
  // CHECKOUT — real order (test payment)
  // =====================================================================
  console.log("— Checkout —");
  await page.goto(`${WEB}/checkout`, { waitUntil: "networkidle" });
  await page.waitForSelector('text=Checkout', { timeout: T });
  await shot(page, "16-checkout");
  await page.fill("#contact", EMAIL);
  await page.fill("#address", "12 Pallet Lane");
  await page.fill("#city", "Celadon City");
  await page.fill("#zip", "10001");
  await page.check('input[name="delivery"][value="standard"]');
  await page.fill("#card", "4242 4242 4242 4242");
  await page.fill("#expiry", "12/30");
  await page.fill("#cvc", "123");
  await shot(page, "17-checkout-filled");
  await page.click('button:has-text("Place Order")');
  await page.waitForSelector('text=Order Placed!', { timeout: T });
  await shot(page, "18-order-placed");

  // =====================================================================
  // ORDERS — list + detail
  // =====================================================================
  console.log("— Orders —");
  await page.goto(`${WEB}/orders`, { waitUntil: "networkidle" });
  await page.waitForSelector('text=Your order history', { timeout: T });
  await shot(page, "19-orders-list");
  const firstOrder = await page.locator('a[href^="/orders/"]').first().getAttribute("href");
  await page.goto(`${WEB}${firstOrder}`, { waitUntil: "networkidle" });
  await page.waitForSelector('text=Order #', { timeout: T });
  await shot(page, "20-order-detail");

  // =====================================================================
  // COLLECTION — cards, activity, shipping
  // =====================================================================
  console.log("— Collection —");
  await page.goto(`${WEB}/collection`, { waitUntil: "networkidle" });
  await page.waitForSelector('text=Collection', { timeout: T });
  await shot(page, "21-collection");
  await page.goto(`${WEB}/collection/activity`, { waitUntil: "networkidle" });
  await shot(page, "22-collection-activity");
  await page.goto(`${WEB}/collection/shipping`, { waitUntil: "networkidle" });
  await shot(page, "23-collection-shipping");

  // =====================================================================
  // WISHLIST — add from store, view
  // =====================================================================
  console.log("— Wishlist —");
  await page.goto(`${WEB}/store`, { waitUntil: "networkidle" });
  await page.click('button[aria-label*="Add Charizard ex"]');
  await page.click('button[aria-label*="Add Umbreon VMAX"]');
  await page.goto(`${WEB}/wishlist`, { waitUntil: "networkidle" });
  await page.waitForSelector('text=Wishlist', { timeout: T });
  await shot(page, "24-wishlist");

  // =====================================================================
  // REWARDS
  // =====================================================================
  console.log("— Rewards —");
  await page.goto(`${WEB}/rewards`, { waitUntil: "networkidle" }).catch(() => {});
  await page.waitForTimeout(1200);
  await shot(page, "25-rewards").catch(() => console.log("  (rewards shot skipped)"));

  // =====================================================================
  // ACCOUNT
  // =====================================================================
  console.log("— Account —");
  await page.goto(`${WEB}/account`, { waitUntil: "networkidle" }).catch(() => {});
  await page.waitForTimeout(1200);
  await shot(page, "26-account").catch(() => console.log("  (account shot skipped)"));

  // =====================================================================
  // PACK OPENING
  // =====================================================================
  console.log("— Pack opening —");
  await page.goto(`${WEB}/packs`, { waitUntil: "networkidle" }).catch(() => {});
  await page.waitForTimeout(800);
  const openBtn = page.locator('button:has-text("Open Pack")').first();
  await openBtn.click().catch(() => {});
  await page.waitForSelector('text=cards per pack', { timeout: 8000 }).catch(() => {});
  await shot(page, "27-pack-open-dialog").catch(() => console.log("  (dialog shot skipped)"));
  // Reveal pulls until done
  try {
    for (let i = 0; i < 12; i++) {
      const btn = page.locator('button:has-text("Reveal Next"), button:has-text("Done")').first();
      await btn.waitFor({ state: "visible", timeout: 6000 }).catch(() => null);
      if (await btn.isVisible().catch(() => false)) {
        await btn.click();
        await page.waitForTimeout(700);
      } else break;
    }
    await shot(page, "28-pack-open-result").catch(() => {});
  } catch (e) {
    console.log("  (pack reveal skipped)", e.message);
  }

  // =====================================================================
  // SIGN OUT
  // =====================================================================
  console.log("— Sign out —");
  await page.goto(`${WEB}/account`, { waitUntil: "networkidle" }).catch(() => {});
  await page.waitForTimeout(1000);
  await page.click('button:has-text("Sign Out")').catch(() => {});
  await page.waitForTimeout(1500);
  await shot(page, "29-signed-out").catch(() => console.log("  (sign-out shot skipped)"));

  await browser.close();
  console.log("\nDone — screenshots written to docs/user-journeys/images/");
})().catch((err) => {
  console.error("Capture failed:", err);
  process.exit(1);
});
