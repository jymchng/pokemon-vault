/**
 * Pokémon Vault — API seed (PostgreSQL).
 * Deterministic, safe to rerun: deletes then recreates seed data within one
 * transaction. Run: pnpm --filter @pokemon-vault/api db:seed
 */
import { PrismaClient } from "../src/generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import * as argon2 from "argon2";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const SETS = [
  { slug: "sv151", name: "Pokémon 151", series: "Scarlet & Violet", releaseYear: 2023, totalCards: 207 },
  { slug: "obf", name: "Obsidian Flames", series: "Scarlet & Violet", releaseYear: 2023, totalCards: 230 },
  { slug: "sv1", name: "Scarlet & Violet", series: "Scarlet & Violet", releaseYear: 2023, totalCards: 258 },
  { slug: "paf", name: "Paldean Fates", series: "Scarlet & Violet", releaseYear: 2024, totalCards: 245 },
  { slug: "twm", name: "Temporal Forces", series: "Scarlet & Violet", releaseYear: 2024, totalCards: 218 },
];

const PACKS = [
  { slug: "sv151", name: "Pokémon 151", price: 5.99, cardsPerPack: 10 },
  { slug: "obsidian-flames", name: "Obsidian Flames", price: 4.99, cardsPerPack: 10 },
  { slug: "scarlet-violet", name: "Scarlet & Violet", price: 4.49, cardsPerPack: 10 },
  { slug: "paldean-fates", name: "Paldean Fates", price: 5.49, cardsPerPack: 10 },
  { slug: "temporal-forces", name: "Temporal Forces", price: 4.99, cardsPerPack: 10 },
  { slug: "twilight-masquerade", name: "Twilight Masquerade", price: 5.29, cardsPerPack: 10 },
  { slug: "surging-sparks", name: "Surging Sparks", price: 5.49, cardsPerPack: 10 },
  { slug: "premium-vault", name: "Premium Vault Pack", price: 24.99, cardsPerPack: 12 },
];

const PRODUCTS = [
  { name: "Charizard ex — PSA 10", sku: "CARD-CHZ-PSA10", slug: "charizard-ex-psa-10", category: "Graded Cards", productType: "GRADED_CARD", price: 489.99, stock: 3, setName: "Pokémon 151" },
  { name: "Pikachu Illustration Rare — PSA 10", sku: "CARD-PIK-ILLU-PSA10", slug: "pikachu-illustration-rare-psa-10", category: "Graded Cards", productType: "GRADED_CARD", price: 299.99, stock: 5, setName: "Pokémon 151" },
  { name: "Umbreon VMAX — PSA 10", sku: "CARD-UMB-VMAX-PSA10", slug: "umbreon-vmax-psa-10", category: "Graded Cards", productType: "GRADED_CARD", price: 749.99, stock: 2, setName: "Evolving Skies" },
  { name: "Mew ex — PSA 10", sku: "CARD-MEW-EX-PSA10", slug: "mew-ex-psa-10", category: "Graded Cards", productType: "GRADED_CARD", price: 189.99, stock: 6, setName: "Pokémon 151" },
  { name: "Pokémon 151 Booster Pack", sku: "PKG-SV151", slug: "pokemon-151-booster-pack", category: "Booster Packs", productType: "BOOSTER_PACK", price: 5.99, stock: 120, setName: "Pokémon 151" },
  { name: "Obsidian Flames Booster Pack", sku: "PKG-OBF", slug: "obsidian-flames-booster-pack", category: "Booster Packs", productType: "BOOSTER_PACK", price: 4.99, stock: 100, setName: "Obsidian Flames" },
  { name: "Elite Trainer Box — Pokémon 151", sku: "ETB-SV151", slug: "elite-trainer-box-pokemon-151", category: "Elite Trainer Boxes", productType: "ELITE_TRAINER_BOX", price: 59.99, stock: 15, setName: "Pokémon 151" },
  { name: "Pokémon Vault Sleeves — Gold", sku: "ACC-SLV-GLD", slug: "pokemon-vault-sleeves-gold", category: "Accessories", productType: "ACCESSORY", price: 9.99, stock: 200, setName: null },
];

const CARDS = [
  { name: "Charizard ex", setName: "Pokémon 151", cardNumber: "223/197", rarity: "Special Illustration Rare", type: "Fire", grade: "PSA_10", marketPrice: 489.99, owned: true, quantity: 1 },
  { name: "Pikachu Illustration Rare", setName: "Pokémon 151", cardNumber: "173/197", rarity: "Illustration Rare", type: "Electric", grade: "PSA_10", marketPrice: 299.99, owned: true, quantity: 1 },
  { name: "Umbreon VMAX", setName: "Evolving Skies", cardNumber: "215/203", rarity: "Special Illustration Rare", type: "Darkness", grade: "PSA_10", marketPrice: 749.99, owned: true, quantity: 2 },
  { name: "Mew ex", setName: "Pokémon 151", cardNumber: "151/197", rarity: "Double Rare", type: "Psychic", grade: "PSA_10", marketPrice: 189.99, owned: true, quantity: 3 },
  { name: "Snorlax", setName: "Obsidian Flames", cardNumber: "139/197", rarity: "Illustration Rare", type: "Colorless", grade: "UNGRADED", marketPrice: 24.99, owned: false, quantity: 0 },
];

const LATEST_PULLS = [
  { title: "Charizard-Holo 1st Edition", grader: "CGC", delta: 4662, value: 20000 },
  { title: "Charizard-Holo PSA 1", grader: "PSA", delta: 3948, value: 17000 },
  { title: "Arcanine-Holo PSA 10 Aquapolis", grader: "PSA", delta: 3471, value: 15000 },
];

const REWARD_TIERS = [
  { name: "Level 1 — Collector", level: 1, xpRequired: 0 },
  { name: "Level 2 — Enthusiast", level: 2, xpRequired: 250 },
  { name: "Level 3 — Trainer", level: 3, xpRequired: 500 },
  { name: "Level 4 — Master", level: 4, xpRequired: 1000 },
  { name: "Level 5 — Legend", level: 5, xpRequired: 2000 },
];

async function main() {
  console.log("Seeding Pokémon Vault (PostgreSQL)...");

  await prisma.$transaction(async (tx) => {
    // Wipe seed data (deterministic rerun)
    await tx.platformPull.deleteMany();
    await tx.latestPull.deleteMany();
    await tx.shipment.deleteMany();
    await tx.address.deleteMany();
    await tx.wayToWin.deleteMany();
    await tx.leaderboardEntry.deleteMany();
    await tx.rewardTier.deleteMany();
    await tx.activityEvent.deleteMany();
    await tx.order.deleteMany();
    await tx.pack.deleteMany();
    await tx.product.deleteMany();
    await tx.card.deleteMany();
    await tx.set.deleteMany();
    await tx.user.deleteMany();

    // Users (admin + test customer) — Argon2id hashed
    const adminHash = await argon2.hash("Admin123!");
    const customerHash = await argon2.hash("Customer123!");
    await tx.user.createMany({
      data: [
        { email: "admin@pokemon-vault.dev", passwordHash: adminHash, role: "ADMIN", displayName: "Vault Admin", status: "ACTIVE" },
        { email: "customer@pokemon-vault.dev", passwordHash: customerHash, role: "CUSTOMER", displayName: "Ash Ketchum", status: "ACTIVE" },
      ],
    });

    // Sets
    await tx.set.createMany({
      data: SETS.map((s) => {
        const { releaseYear, ...rest } = s;
        return { ...rest, releaseDate: new Date(`${releaseYear}-01-01`), logoUrl: "/images/placeholder-card.png", symbolUrl: "/images/placeholder-card.png" };
      }),
    });
    const setMap = new Map(SETS.map((s) => [s.slug, s.name]));

    // Cards
    await tx.card.createMany({
      data: CARDS.map((c) => ({ ...c, language: "EN", imageUrl: "/images/placeholder-card.png", acquiredAt: c.owned ? new Date("2026-01-15") : null })),
    });

    // Products (inventory via stock)
    await tx.product.createMany({
      data: PRODUCTS.map((p) => ({ ...p, currency: "USD", status: "ACTIVE", availability: p.stock > 0 ? "In Stock" : "Out of Stock", image: "/images/placeholder-card.png", rating: 4.9 })),
    });

    // Packs
    await tx.pack.createMany({
      data: PACKS.map((p) => ({ ...p, tagline: `${p.name} — open a pack, discover your next favorite card.`, availability: "In Stock", image: "/images/placeholder-card.png" })),
    });

    // Rewards
    await tx.rewardTier.createMany({ data: REWARD_TIERS });
    await tx.wayToWin.createMany({
      data: [
        { title: "Open packs", body: "Rip digital packs for real, graded, vaulted cards." },
        { title: "Earn free packs", body: "Your pack spend builds battlepass progress." },
        { title: "Climb the leaderboard", body: "The season's top collectors claim a share of the prize pool." },
      ],
    });
    await tx.leaderboardEntry.createMany({
      data: [
        { wallet: "FjNc…dudR", volume: 426150, rank: 1 },
        { wallet: "H6Ev…RnkW", volume: 233680, rank: 2 },
        { wallet: "JXrS…G2qw", volume: 165510, rank: 3 },
      ],
    });

    // Latest pulls + platform pulls
    await tx.latestPull.createMany({ data: LATEST_PULLS });
    await tx.platformPull.createMany({
      data: [
        { title: "Charizard ex", price: 489.99, timeAgo: "2m", grader: "PSA" },
        { title: "Umbreon VMAX", price: 749.99, timeAgo: "8m", grader: "CGC" },
        { title: "Mew ex", price: 189.99, timeAgo: "14m", grader: "PSA" },
      ],
    });

    // Order + address + shipment (PV-10001)
    const order = await tx.order.create({
      data: {
        orderNumber: "PV-10001",
        email: "customer@pokemon-vault.dev",
        status: "DELIVERED",
        subtotal: 65.98, discount: 0, shipping: 4.99, tax: 4.62, total: 75.59,
      },
    });
    await tx.address.create({
      data: { userId: null, label: "Home", line1: "1 Pallet Town", city: "Kanto", country: "US", isDefault: true },
    });
    await tx.shipment.create({
      data: { orderId: order.id, carrier: "FedEx", trackingNumber: "794657849201", status: "DELIVERED", shippedAt: new Date("2026-07-01"), deliveredAt: new Date("2026-07-04") },
    });

    // Activity (collection milestone + order completed)
    await tx.activityEvent.createMany({
      data: [
        { userId: null, eventType: "ORDER_COMPLETED", entityType: "Order", entityId: order.id, metadata: { orderNumber: "PV-10001" } },
        { userId: null, eventType: "CARD_ADDED", entityType: "Card", metadata: { name: "Charizard ex" } },
      ],
    });

    console.log("Seed complete: 2 users, %d sets, %d cards, %d products, %d packs, %d reward tiers, 1 order, activity.", SETS.length, CARDS.length, PRODUCTS.length, PACKS.length, REWARD_TIERS.length);
  });
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
