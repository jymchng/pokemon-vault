import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center text-foreground">
      <p className="text-6xl font-semibold text-primary">404</p>
      <h1 className="text-xl font-semibold">Page not found</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        This card isn&apos;t in your collection. The page you&apos;re looking
        for doesn&apos;t exist or has moved.
      </p>
      <div className="flex items-center gap-3">
        <Button render={<Link href="/" />}>Back to Home</Button>
        <Button variant="outline" render={<Link href="/store" />}>
          Browse Store
        </Button>
      </div>
    </div>
  );
}
