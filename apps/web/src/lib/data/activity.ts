import type { ActivityEvent } from "@/lib/types";

function daysAgo(days: number, hour = 12): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

export const activityEvents: ActivityEvent[] = [
  {
    id: "act-001",
    type: "added",
    title: "Added Charizard ex",
    subtitle: "Obsidian Flames · Special Illustration Rare · PSA 10",
    image: "/images/placeholder-card.png",
    date: daysAgo(0, 9),
    xp: 25,
  },
  {
    id: "act-002",
    type: "opened_pack",
    title: "Opened Obsidian Flames Booster Pack",
    subtitle: "Pulled Charizard ex — Special Illustration Rare",
    image: "/images/placeholder-card.png",
    date: daysAgo(0, 8),
    xp: 10,
  },
  {
    id: "act-003",
    type: "added",
    title: "Added Umbreon ex",
    subtitle: "Twilight Masquerade · Special Illustration Rare · CGC 10",
    image: "/images/placeholder-card.png",
    date: daysAgo(1, 18),
    xp: 25,
  },
  {
    id: "act-004",
    type: "purchased",
    title: "Purchased Pokémon 151 Booster Bundle",
    subtitle: "6 packs · $39.99",
    image: "/images/placeholder-card.png",
    date: daysAgo(1, 15),
    xp: 40,
  },
  {
    id: "act-005",
    type: "added",
    title: "Added Pikachu Illustration Rare",
    subtitle: "Paldean Fates · Illustration Rare · PSA 10",
    image: "/images/placeholder-card.png",
    date: daysAgo(2, 20),
    xp: 25,
  },
  {
    id: "act-006",
    type: "opened_pack",
    title: "Opened Scarlet & Violet Booster Pack",
    subtitle: "Pulled Pikachu — Paldean Fates",
    image: "/images/placeholder-card.png",
    date: daysAgo(2, 17),
    xp: 10,
  },
  {
    id: "act-007",
    type: "sold",
    title: "Sold Gengar ex",
    subtitle: "Temporal Forces · PSA 9 · $67.00",
    image: "/images/placeholder-card.png",
    date: daysAgo(3, 12),
    xp: 30,
  },
  {
    id: "act-008",
    type: "shipped",
    title: "Shipped — Pokémon 151 Booster Bundle",
    subtitle: "Order #PV-10478 · Delivered",
    image: "/images/placeholder-card.png",
    date: daysAgo(4, 9),
  },
  {
    id: "act-009",
    type: "added",
    title: "Added Mew ex",
    subtitle: "151 · Special Illustration Rare · PSA 10",
    image: "/images/placeholder-card.png",
    date: daysAgo(5, 14),
    xp: 25,
  },
  {
    id: "act-010",
    type: "opened_pack",
    title: "Opened Pokémon 151 Booster Pack",
    subtitle: "Pulled Mew ex — Special Illustration Rare",
    image: "/images/placeholder-card.png",
    date: daysAgo(6, 11),
    xp: 10,
  },
  {
    id: "act-011",
    type: "purchased",
    title: "Purchased Charizard ex PSA 10",
    subtitle: "Obsidian Flames · Graded Card · $189.99",
    image: "/images/placeholder-card.png",
    date: daysAgo(7, 16),
    xp: 80,
  },
  {
    id: "act-012",
    type: "added",
    title: "Added Rayquaza VMAX",
    subtitle: "Evolving Skies · Secret Rare · Ungraded",
    image: "/images/placeholder-card.png",
    date: daysAgo(8, 10),
    xp: 25,
  },
];

/** Platform-wide live pulls (mock — like the reference's Platform tab) */
export interface PlatformPull {
  id: string;
  title: string;
  condition: string;
  packPrice: string;
  value: number;
  time: string;
  image: string;
}

export const platformPulls: PlatformPull[] = [
  {
    id: "pull-001",
    title: "2025 #176 Umbreon EX PSA 10",
    condition: "GEM MINT 10",
    packPrice: "$50 pack",
    value: 2500,
    time: "2m ago",
    image: "/images/placeholder-card.png",
  },
  {
    id: "pull-002",
    title: "2015 #98 Full Art/M Rayquaza EX",
    condition: "EX-MT 6",
    packPrice: "$1,000 pack",
    value: 750,
    time: "3m ago",
    image: "/images/placeholder-card.png",
  },
  {
    id: "pull-003",
    title: "2026 #30 Mega Charizard Y EX CGC",
    condition: "PRISTINE 10",
    packPrice: "$75 pack",
    value: 57,
    time: "3m ago",
    image: "/images/placeholder-card.png",
  },
  {
    id: "pull-004",
    title: "2013 Bowman Chrome Gold Refracto",
    condition: "GEM MINT 9.5",
    packPrice: "$100 pack",
    value: 54,
    time: "4m ago",
    image: "/images/placeholder-card.png",
  },
  {
    id: "pull-005",
    title: "2026 Pokemon Japanese Mega Evolu",
    condition: "GEM-MT 10",
    packPrice: "$25 pack",
    value: 51,
    time: "4m ago",
    image: "/images/placeholder-card.png",
  },
  {
    id: "pull-006",
    title: "2025 #014 Monkey D. Luffy PSA 10",
    condition: "GEM-MT 10",
    packPrice: "$50 pack",
    value: 4000,
    time: "5m ago",
    image: "/images/placeholder-card.png",
  },
  {
    id: "pull-007",
    title: "2024 #170 Terapagos EX PSA 10",
    condition: "GEM-MT 10",
    packPrice: "$1,000 pack",
    value: 610,
    time: "6m ago",
    image: "/images/placeholder-card.png",
  },
  {
    id: "pull-008",
    title: "2026 #51 Pikachu CGC 10 Pokemon",
    condition: "GEM MINT 10",
    packPrice: "$25 pack",
    value: 35,
    time: "7m ago",
    image: "/images/placeholder-card.png",
  },
  {
    id: "pull-009",
    title: "2021 #238 Single Strike Urshifu",
    condition: "GEM MINT 9.5",
    packPrice: "$25 pack",
    value: 13,
    time: "8m ago",
    image: "/images/placeholder-card.png",
  },
  {
    id: "pull-010",
    title: "2024 #146 Turtonator CGC 10 Stel",
    condition: "GEM MINT 10",
    packPrice: "$25 pack",
    value: 30,
    time: "9m ago",
    image: "/images/placeholder-card.png",
  },
  {
    id: "pull-011",
    title: "2022 #190 Galarian Moltres CGC 9",
    condition: "MINT 9",
    packPrice: "$25 pack",
    value: 14,
    time: "10m ago",
    image: "/images/placeholder-card.png",
  },
  {
    id: "pull-012",
    title: "2025 #103 Sacred Charm PSA 10 Ja",
    condition: "GEM-MT 10",
    packPrice: "$50 pack",
    value: 31,
    time: "11m ago",
    image: "/images/placeholder-card.png",
  },
];

export function getActivityEvents(): ActivityEvent[] {
  return [...activityEvents].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
}
