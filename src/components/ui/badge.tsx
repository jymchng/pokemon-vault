import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border border-transparent px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap transition-all focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground",
        secondary: "bg-secondary text-secondary-foreground",
        destructive: "bg-destructive/10 text-destructive",
        outline: "border-border text-foreground",
        ghost: "hover:bg-muted hover:text-muted-foreground",
        success: "bg-success/10 text-success",
        info: "bg-accent-blue/10 text-accent-blue",
        warning: "bg-accent-yellow/10 text-accent-yellow",
        premium:
          "bg-gradient-to-r from-accent-yellow/20 to-accent-purple/20 text-accent-yellow",
        // Rarity
        common: "bg-rarity-common/10 text-rarity-common",
        uncommon: "bg-rarity-uncommon/10 text-rarity-uncommon",
        rare: "bg-rarity-rare/10 text-rarity-rare",
        ultra: "bg-rarity-ultra/10 text-rarity-ultra",
        secret: "bg-rarity-secret/10 text-rarity-secret",
        // Grade
        psa: "bg-grade-psa/10 text-grade-psa",
        cgc: "bg-grade-cgc/10 text-grade-cgc",
        bgs: "bg-grade-bgs/10 text-grade-bgs",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Badge({
  className,
  variant = "default",
  render,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ variant }), className),
      },
      props,
    ),
    render,
    state: {
      slot: "badge",
      variant,
    },
  });
}

export { Badge, badgeVariants };
