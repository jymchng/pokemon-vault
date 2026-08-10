import type { Order } from "@/lib/types";

export const orders: Order[] = [
  {
    id: "ord-10482",
    number: "PV-10482",
    date: "2026-08-08",
    items: [
      {
        productId: "prod-009",
        name: "Pokémon 151 Booster Bundle",
        image: "/images/placeholder-card.png",
        price: 39.99,
        quantity: 1,
      },
      {
        productId: "prod-001",
        name: "Charizard ex — PSA 10",
        image: "/images/placeholder-card.png",
        price: 189.99,
        quantity: 1,
      },
    ],
    total: 229.98,
    status: "Shipped",
    trackingNumber: "7712 3345 8912 0023",
    estimatedDelivery: "August 12",
    address: "12 Pallet Lane, Celadon City, Kanto 10001",
  },
  {
    id: "ord-10471",
    number: "PV-10471",
    date: "2026-07-24",
    items: [
      {
        productId: "prod-011",
        name: "Obsidian Flames Booster Box",
        image: "/images/placeholder-card.png",
        price: 143.99,
        quantity: 1,
      },
    ],
    total: 143.99,
    status: "Delivered",
    deliveredDate: "July 26",
    trackingNumber: "9400 1000 0000 0000 0000",
    estimatedDelivery: "July 28",
    address: "12 Pallet Lane, Celadon City, Kanto 10001",
  },
  {
    id: "ord-10458",
    number: "PV-10458",
    date: "2026-07-10",
    items: [
      {
        productId: "prod-010",
        name: "Scarlet & Violet Elite Trainer Box",
        image: "/images/placeholder-card.png",
        price: 49.99,
        quantity: 2,
      },
      {
        productId: "prod-012",
        name: "Dragon Shield Card Sleeves — 100",
        image: "/images/placeholder-card.png",
        price: 11.99,
        quantity: 1,
      },
    ],
    total: 111.97,
    status: "Processing",
    trackingNumber: "1Z 999 AA1 01 2345 6784",
    estimatedDelivery: "August 15",
    address: "12 Pallet Lane, Celadon City, Kanto 10001",
  },
  {
    id: "ord-10439",
    number: "PV-10439",
    date: "2026-06-28",
    items: [
      {
        productId: "prod-005",
        name: "Pokémon 151 Booster Pack",
        image: "/images/placeholder-card.png",
        price: 5.99,
        quantity: 6,
      },
    ],
    total: 35.94,
    status: "Delivered",
    deliveredDate: "July 2",
    trackingNumber: "9400 1000 0000 0000 1234",
    estimatedDelivery: "July 3",
    address: "88 Route 7, Saffron City, Kanto 10002",
  },
  {
    id: "ord-10412",
    number: "PV-10412",
    date: "2026-06-12",
    items: [
      {
        productId: "prod-018",
        name: "Umbreon ex — Twilight Masquerade",
        image: "/images/placeholder-card.png",
        price: 145.0,
        quantity: 1,
      },
      {
        productId: "prod-013",
        name: "Top Loaders — 25 pack",
        image: "/images/placeholder-card.png",
        price: 8.49,
        quantity: 2,
      },
    ],
    total: 161.98,
    status: "Delivered",
    deliveredDate: "June 16",
    trackingNumber: "1Z 999 AA1 01 2345 0001",
    estimatedDelivery: "June 17",
    address: "12 Pallet Lane, Celadon City, Kanto 10001",
  },
];

export function getOrderById(id: string): Order | undefined {
  return orders.find((o) => o.id === id || o.number === id);
}

export const orderStatuses = [
  "Order Placed",
  "Processing",
  "Packed",
  "Shipped",
  "Delivered",
] as const;
