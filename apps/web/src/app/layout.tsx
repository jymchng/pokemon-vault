import type { Metadata, Viewport } from "next";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "./globals.css";
import { Providers } from "@/components/providers";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#08090B",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://pokemon-vault.example.com"),
  title: {
    default: "Pokémon Vault — Premium Pokémon Trading Card Store",
    template: "%s | Pokémon Vault",
  },
  description:
    "Discover, collect, and buy Pokémon trading cards, booster packs, sealed products, and graded collectibles. Track your collection and earn collector rewards.",
  keywords: [
    "pokemon cards",
    "pokemon tcg",
    "trading cards",
    "booster packs",
    "graded cards",
    "PSA",
    "collection",
    "pokemon collectibles",
    "card store",
  ],
  authors: [{ name: "Pokémon Vault" }],
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "Pokémon Vault",
    title: "Pokémon Vault — Premium Pokémon Trading Card Store",
    description:
      "Discover, collect, and buy Pokémon trading cards, booster packs, sealed products, and graded collectibles.",
    images: [
      {
        url: "/images/og-card.png",
        width: 1200,
        height: 630,
        alt: "Pokémon Vault",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Pokémon Vault",
    description:
      "Discover, collect, and buy Pokémon trading cards, booster packs, and graded collectibles.",
    images: ["/images/og-card.png"],
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <body className="flex min-h-full flex-col bg-background font-sans text-foreground">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
