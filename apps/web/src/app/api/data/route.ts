import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * Consolidated data API — serves the SQLite fake DB (Prisma) to the client.
 * UI → TanStack Query → /api/data → Prisma → SQLite
 */

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const resource = searchParams.get("resource") ?? "cards";
  const id = searchParams.get("id");
  const slug = searchParams.get("slug");

  try {
    switch (resource) {
      case "cards": {
        if (id) {
          const row = await prisma.card.findUnique({ where: { id } });
          return NextResponse.json({ data: row });
        }
        const rows = await prisma.card.findMany({
          orderBy: { acquiredAt: "desc" },
        });
        return NextResponse.json({ data: rows });
      }
      case "products": {
        if (id) {
          const row = await prisma.product.findUnique({ where: { id } });
          return NextResponse.json({ data: row });
        }
        const rows = await prisma.product.findMany();
        return NextResponse.json({ data: rows });
      }
      case "packs": {
        if (slug) {
          const row = await prisma.pack.findUnique({ where: { slug } });
          return NextResponse.json({ data: row });
        }
        const rows = await prisma.pack.findMany();
        return NextResponse.json({ data: rows });
      }
      case "latest-pulls": {
        const rows = await prisma.latestPull.findMany({
          orderBy: { value: "desc" },
        });
        return NextResponse.json({ data: rows });
      }
      case "sets": {
        const rows = await prisma.set.findMany();
        return NextResponse.json({ data: rows });
      }
      case "activity": {
        const rows = await prisma.activityEvent.findMany({
          orderBy: { date: "desc" },
        });
        return NextResponse.json({ data: rows });
      }
      case "platform-pulls": {
        const rows = await prisma.platformPull.findMany();
        return NextResponse.json({ data: rows });
      }
      case "reward-tiers": {
        const rows = await prisma.rewardTier.findMany({
          orderBy: { xp: "asc" },
        });
        return NextResponse.json({ data: rows });
      }
      case "leaderboard": {
        const rows = await prisma.leaderboardEntry.findMany({
          orderBy: { rank: "asc" },
        });
        return NextResponse.json({ data: rows });
      }
      case "ways-to-win": {
        const rows = await prisma.wayToWin.findMany();
        return NextResponse.json({ data: rows });
      }
      case "addresses": {
        const rows = await prisma.address.findMany();
        return NextResponse.json({ data: rows });
      }
      case "shipments": {
        const rows = await prisma.shipment.findMany();
        return NextResponse.json({ data: rows });
      }
      case "orders": {
        if (id) {
          const row = await prisma.order.findFirst({
            where: { OR: [{ id }, { number: id }] },
          });
          return NextResponse.json({ data: row });
        }
        const rows = await prisma.order.findMany({ orderBy: { date: "desc" } });
        return NextResponse.json({ data: rows });
      }
      default:
        return NextResponse.json({ data: null }, { status: 400 });
    }
  } catch (err) {
    console.error("API error:", err);
    return NextResponse.json(
      { error: "Database query failed" },
      { status: 500 },
    );
  }
}
