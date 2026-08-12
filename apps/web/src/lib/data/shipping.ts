export interface Address {
  id: string;
  label: string;
  name: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postal: string;
  country: string;
  current?: boolean;
}

export interface Shipment {
  id: string;
  orderNumber: string;
  status: "In Transit" | "Delivered" | "Processing" | "Out for Delivery";
  carrier: string;
  trackingNumber: string;
  estimatedDelivery: string;
  deliveredDate?: string;
  items: { name: string; image: string; quantity: number }[];
  progress: number; // 0-100 timeline progress
}

export const addresses: Address[] = [
  {
    id: "addr-001",
    label: "Home",
    name: "Alex Trainer",
    line1: "12 Pallet Lane",
    line2: "Unit 4",
    city: "Celadon City",
    state: "Kanto",
    postal: "10001",
    country: "United States",
    current: true,
  },
  {
    id: "addr-002",
    label: "Previous",
    name: "Alex Trainer",
    line1: "88 Route 7",
    city: "Saffron City",
    state: "Kanto",
    postal: "10002",
    country: "United States",
  },
];

export const shipments: Shipment[] = [
  {
    id: "ship-001",
    orderNumber: "PV-10482",
    status: "In Transit",
    carrier: "FedEx",
    trackingNumber: "7712 3345 8912 0023",
    estimatedDelivery: "August 12",
    items: [
      {
        name: "Pokémon 151 Booster Bundle",
        image: "/images/placeholder-card.png",
        quantity: 1,
      },
      {
        name: "Charizard ex PSA 10",
        image: "/images/placeholder-card.png",
        quantity: 1,
      },
    ],
    progress: 65,
  },
  {
    id: "ship-002",
    orderNumber: "PV-10471",
    status: "Delivered",
    carrier: "USPS",
    trackingNumber: "9400 1000 0000 0000 0000",
    estimatedDelivery: "July 28",
    deliveredDate: "July 26",
    items: [
      {
        name: "Obsidian Flames Booster Box",
        image: "/images/placeholder-card.png",
        quantity: 1,
      },
    ],
    progress: 100,
  },
  {
    id: "ship-003",
    orderNumber: "PV-10458",
    status: "Processing",
    carrier: "UPS",
    trackingNumber: "1Z 999 AA1 01 2345 6784",
    estimatedDelivery: "August 15",
    items: [
      {
        name: "Paldean Fates Elite Trainer Box",
        image: "/images/placeholder-card.png",
        quantity: 2,
      },
      {
        name: "Card Sleeves — 100 pack",
        image: "/images/placeholder-card.png",
        quantity: 1,
      },
    ],
    progress: 25,
  },
];
