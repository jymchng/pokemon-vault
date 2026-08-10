import type { Rarity } from "@/lib/types";

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
  }).format(value);
}

export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(date);
}

export function rarityVariant(rarity: Rarity) {
  switch (rarity) {
    case "Common":
      return "common" as const;
    case "Uncommon":
      return "uncommon" as const;
    case "Rare":
    case "Holo Rare":
      return "rare" as const;
    case "Ultra Rare":
    case "Illustration Rare":
      return "ultra" as const;
    case "Special Illustration Rare":
    case "Secret Rare":
      return "secret" as const;
    default:
      return "common" as const;
  }
}

export function gradeVariant(grade: string) {
  if (grade.startsWith("PSA")) return "psa" as const;
  if (grade.startsWith("CGC")) return "cgc" as const;
  if (grade.startsWith("BGS")) return "bgs" as const;
  return "outline" as const;
}

export function initials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
