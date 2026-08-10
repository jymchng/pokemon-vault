import Image from "next/image";
import { cn } from "@/lib/utils";

export function CardArt({
  src,
  alt,
  className,
  imgClassName,
  priority = false,
  sizes = "300px",
}: {
  src: string;
  alt: string;
  className?: string;
  imgClassName?: string;
  priority?: boolean;
  sizes?: string;
}) {
  return (
    <div
      className={cn(
        "relative aspect-[2.5/3.5] overflow-hidden rounded-xl border border-border bg-muted",
        className,
      )}
    >
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        className={cn(
          "object-cover transition-opacity duration-300",
          imgClassName,
        )}
      />
    </div>
  );
}

export function CardArtSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("skeleton aspect-[2.5/3.5] rounded-xl", className)} />
  );
}
