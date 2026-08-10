import type { RewardTier } from "@/lib/types";

export const rewardTiers: RewardTier[] = [
  { id: "tier-100", xp: 100, label: "5% off coupon", icon: "🎟️" },
  { id: "tier-500", xp: 500, label: "Free card sleeves", icon: "🛡️" },
  { id: "tier-1000", xp: 1000, label: "Free Booster Pack", icon: "🎁" },
  { id: "tier-2500", xp: 2500, label: "Exclusive promo card", icon: "✨" },
  { id: "tier-5000", xp: 5000, label: "Limited collector reward", icon: "🏆" },
];

export interface LeaderboardEntry {
  rank: number;
  name: string;
  handle: string;
  xp: number;
  packs: number;
  avatarColor: string;
}

export const leaderboardEntries: LeaderboardEntry[] = [
  {
    rank: 1,
    name: "Ash Ketchum",
    handle: "@ash",
    xp: 12480,
    packs: 42,
    avatarColor: "#F5C542",
  },
  {
    rank: 2,
    name: "Misty",
    handle: "@misty",
    xp: 10920,
    packs: 36,
    avatarColor: "#4C9AFF",
  },
  {
    rank: 3,
    name: "Brock",
    handle: "@brock",
    xp: 9860,
    packs: 31,
    avatarColor: "#A78BFA",
  },
  {
    rank: 4,
    name: "Lance",
    handle: "@lance",
    xp: 8740,
    packs: 28,
    avatarColor: "#42C978",
  },
  {
    rank: 5,
    name: "Cynthia",
    handle: "@cynthia",
    xp: 8120,
    packs: 25,
    avatarColor: "#E94545",
  },
  {
    rank: 6,
    name: "Red",
    handle: "@red",
    xp: 7540,
    packs: 22,
    avatarColor: "#F5C542",
  },
  {
    rank: 7,
    name: "Blue",
    handle: "@blue",
    xp: 6980,
    packs: 20,
    avatarColor: "#4C9AFF",
  },
  {
    rank: 8,
    name: "Steven",
    handle: "@steven",
    xp: 6410,
    packs: 18,
    avatarColor: "#A78BFA",
  },
  {
    rank: 9,
    name: "Wallace",
    handle: "@wallace",
    xp: 5870,
    packs: 16,
    avatarColor: "#42C978",
  },
  {
    rank: 10,
    name: "N",
    handle: "@n",
    xp: 5230,
    packs: 14,
    avatarColor: "#E94545",
  },
];

export const waysToWin = [
  {
    title: "Open packs",
    description:
      "Rip booster packs for real, graded, vaulted cards, and score random free bonus packs as you open.",
    icon: "🎁",
  },
  {
    title: "Earn free packs",
    description:
      "Your pack spend builds collector progress. Reach a tier to claim a free pack.",
    icon: "📈",
  },
  {
    title: "Climb the leaderboard",
    description:
      "Ranked by collector XP. The season's top collectors claim a share of the prize pool.",
    icon: "🏆",
  },
];
