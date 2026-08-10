/**
 * Seed the SQLite database (fake DB) with the Pokémon Vault mock data.
 * Run with: npx tsx prisma/seed.ts
 */
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import path from "path";
import { cards } from "../src/lib/data/cards";
import { products } from "../src/lib/data/products";
import { packs, latestPulls } from "../src/lib/data/packs";
import { sets } from "../src/lib/data/sets";
import { orders } from "../src/lib/data/orders";
import { activityEvents } from "../src/lib/data/activity";
import { rewardTiers, leaderboardEntries, waysToWin } from "../src/lib/data/rewards";
import { addresses, shipments } from "../src/lib/data/shipping";

const dbPath = process.env.DATABASE_URL?.replace("file:", "") ?? "dev.db";
const adapter = new PrismaBetterSqlite3({
  url: path.isAbsolute(dbPath) ? dbPath : path.join(process.cwd(), dbPath),
});
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding Pokémon Vault SQLite database...");

  // Cards
  await prisma.card.deleteMany();
  await prisma.card.createMany({
    data: cards.map((c) => ({
      id: c.id,
      name: c.name,
      set: c.set,
      cardNumber: c.cardNumber,
      rarity: c.rarity,
      type: c.type,
      grade: c.grade,
      condition: c.condition,
      image: c.image,
      owned: c.owned,
      quantity: c.quantity,
      acquiredAt: c.acquiredAt,
      marketPrice: c.marketPrice,
      population: c.population ?? null,
      description: c.description ?? null,
    })),
  });

  // Products
  await prisma.product.deleteMany();
  await prisma.product.createMany({
    data: products.map((p) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      set: p.set,
      price: p.price,
      image: p.image,
      stock: p.stock,
      rating: p.rating,
      availability: p.availability,
      description: p.description ?? null,
      featured: p.featured ?? false,
      trending: p.trending ?? false,
    })),
  });

  // Packs
  await prisma.pack.deleteMany();
  await prisma.pack.createMany({
    data: packs.map((p) => ({
      slug: p.slug,
      name: p.name,
      tagline: p.tagline,
      price: p.price,
      cardsPerPack: p.cardsPerPack,
      image: p.image,
      availability: p.availability,
      oddsCommon: p.odds.common,
      oddsUncommon: p.odds.uncommon,
      oddsRare: p.odds.rare,
      oddsUltra: p.odds.ultraRare,
      oddsSecret: p.odds.secretRare,
      contents: JSON.stringify(p.contents),
      featured: p.featured ?? false,
    })),
  });

  // Sets
  await prisma.set.deleteMany();
  await prisma.set.createMany({
    data: sets.map((s) => ({
      id: s.id,
      name: s.name,
      symbol: s.symbol,
      releaseYear: s.releaseYear,
      totalCards: s.totalCards,
      collected: s.collected,
      image: s.image,
    })),
  });

  // Orders
  await prisma.order.deleteMany();
  await prisma.order.createMany({
    data: orders.map((o) => ({
      id: o.id,
      number: o.number,
      date: o.date,
      total: o.total,
      status: o.status,
      trackingNumber: o.trackingNumber ?? null,
      estimatedDelivery: o.estimatedDelivery ?? null,
      deliveredDate: o.deliveredDate ?? null,
      address: o.address,
      items: JSON.stringify(o.items),
    })),
  });

  // Activity
  await prisma.activityEvent.deleteMany();
  await prisma.activityEvent.createMany({
    data: activityEvents.map((e) => ({
      id: e.id,
      type: e.type,
      title: e.title,
      subtitle: e.subtitle,
      image: e.image ?? null,
      date: e.date,
      xp: e.xp ?? null,
    })),
  });

  // Rewards
  await prisma.rewardTier.deleteMany();
  await prisma.rewardTier.createMany({
    data: rewardTiers.map((t) => ({
      id: t.id,
      xp: t.xp,
      label: t.label,
      icon: t.icon,
    })),
  });

  await prisma.leaderboardEntry.deleteMany();
  await prisma.leaderboardEntry.createMany({
    data: leaderboardEntries.map((e) => ({
      id: `lb-${e.rank}`,
      rank: e.rank,
      name: e.name,
      handle: e.handle,
      xp: e.xp,
      packs: e.packs,
      avatarColor: e.avatarColor,
    })),
  });

  await prisma.wayToWin.deleteMany();
  await prisma.wayToWin.createMany({
    data: waysToWin.map((w, i) => ({
      id: `way-${i}`,
      title: w.title,
      description: w.description,
      icon: w.icon,
    })),
  });

  // Shipping
  await prisma.address.deleteMany();
  await prisma.address.createMany({
    data: addresses.map((a) => ({
      id: a.id,
      label: a.label,
      name: a.name,
      line1: a.line1,
      line2: a.line2 ?? null,
      city: a.city,
      state: a.state,
      postal: a.postal,
      country: a.country,
      current: a.current ?? false,
    })),
  });

  await prisma.shipment.deleteMany();
  await prisma.shipment.createMany({
    data: shipments.map((s) => ({
      id: s.id,
      orderNumber: s.orderNumber,
      status: s.status,
      carrier: s.carrier,
      trackingNumber: s.trackingNumber,
      estimatedDelivery: s.estimatedDelivery,
      deliveredDate: s.deliveredDate ?? null,
      progress: s.progress,
      items: JSON.stringify(s.items),
    })),
  });

  // Latest pulls
  await prisma.latestPull.deleteMany();
  await prisma.latestPull.createMany({
    data: latestPulls.map((p) => ({
      id: p.id,
      title: p.title,
      value: p.value,
      delta: p.delta,
      grader: p.grader,
    })),
  });

  console.log("✅ Seed complete:");
  console.log(`   Cards: ${await prisma.card.count()}`);
  console.log(`   Products: ${await prisma.product.count()}`);
  console.log(`   Packs: ${await prisma.pack.count()}`);
  console.log(`   Sets: ${await prisma.set.count()}`);
  console.log(`   Orders: ${await prisma.order.count()}`);
  console.log(`   Activity: ${await prisma.activityEvent.count()}`);
  console.log(`   Leaderboard: ${await prisma.leaderboardEntry.count()}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
