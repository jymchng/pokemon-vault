import type { SetInfo } from "@/lib/types";

export const sets: SetInfo[] = [
  {
    id: "sv151",
    name: "Pokémon 151",
    symbol: "151",
    releaseYear: 2023,
    totalCards: 207,
    collected: 64,
    image: "/images/placeholder-card.png",
  },
  {
    id: "obf",
    name: "Obsidian Flames",
    symbol: "OBF",
    releaseYear: 2023,
    totalCards: 230,
    collected: 42,
    image: "/images/placeholder-card.png",
  },
  {
    id: "sv1",
    name: "Scarlet & Violet",
    symbol: "SVI",
    releaseYear: 2023,
    totalCards: 258,
    collected: 31,
    image: "/images/placeholder-card.png",
  },
  {
    id: "paf",
    name: "Paldean Fates",
    symbol: "PAF",
    releaseYear: 2024,
    totalCards: 245,
    collected: 18,
    image: "/images/placeholder-card.png",
  },
  {
    id: "tef",
    name: "Temporal Forces",
    symbol: "TEF",
    releaseYear: 2024,
    totalCards: 218,
    collected: 12,
    image: "/images/placeholder-card.png",
  },
  {
    id: "twm",
    name: "Twilight Masquerade",
    symbol: "TWM",
    releaseYear: 2024,
    totalCards: 226,
    collected: 9,
    image: "/images/placeholder-card.png",
  },
  {
    id: "ssp",
    name: "Surging Sparks",
    symbol: "SSP",
    releaseYear: 2024,
    totalCards: 252,
    collected: 0,
    image: "/images/placeholder-card.png",
  },
  {
    id: "svp",
    name: "Scarlet & Violet Promos",
    symbol: "SVP",
    releaseYear: 2023,
    totalCards: 150,
    collected: 5,
    image: "/images/placeholder-card.png",
  },
];

export const setFilters = [
  "All Sets",
  "Scarlet & Violet",
  "Obsidian Flames",
  "151",
  "Temporal Forces",
  "Paldean Fates",
  "Twilight Masquerade",
];

export const rarityFilters = [
  "All Rarities",
  "Common",
  "Uncommon",
  "Rare",
  "Holo Rare",
  "Ultra Rare",
  "Illustration Rare",
  "Special Illustration Rare",
  "Secret Rare",
];

export const gradeFilters = [
  "Any Grade",
  "Ungraded",
  "PSA 10",
  "PSA 9",
  "CGC 10",
  "BGS 10",
];

export const typeFilters = [
  "All Types",
  "Fire",
  "Water",
  "Grass",
  "Electric",
  "Psychic",
  "Fighting",
  "Darkness",
  "Metal",
  "Fairy",
  "Dragon",
  "Colorless",
];
