import Link from "next/link";
import { Logo } from "./logo";

const columns = [
  {
    title: "Shop",
    links: [
      { label: "Store", href: "/store" },
      { label: "Booster Packs", href: "/packs" },
      { label: "New Releases", href: "/store?filter=new" },
      { label: "Graded Cards", href: "/store?category=graded" },
    ],
  },
  {
    title: "Collect",
    links: [
      { label: "My Collection", href: "/collection" },
      { label: "Wishlist", href: "/wishlist" },
      { label: "Sets", href: "/sets" },
      { label: "Rewards", href: "/rewards" },
    ],
  },
  {
    title: "Support",
    links: [
      { label: "Orders", href: "/orders" },
      { label: "Shipping", href: "/collection/shipping" },
      { label: "Account", href: "/account" },
      { label: "Checkout", href: "/checkout" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-border bg-sidebar">
      <div className="mx-auto max-w-6xl px-5 py-10">
        <div className="grid gap-10 md:grid-cols-4">
          <div className="flex flex-col gap-3">
            <Logo />
            <p className="max-w-xs text-xs leading-relaxed text-muted-foreground">
              Your premium Pokémon trading-card store and digital collection
              manager. Discover, collect, and trade with confidence.
            </p>
          </div>
          {columns.map((col) => (
            <div key={col.title} className="flex flex-col gap-2">
              <p className="text-[10px] font-semibold tracking-widest text-muted uppercase">
                {col.title}
              </p>
              {col.links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          ))}
        </div>
        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-border pt-6 text-[11px] text-muted sm:flex-row">
          <p>
            © {new Date().getFullYear()} Pokémon Vault. Demo storefront — not
            affiliated with The Pokémon Company.
          </p>
          <p className="flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-success" />
            All cards authenticated
          </p>
        </div>
      </div>
    </footer>
  );
}
