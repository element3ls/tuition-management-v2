import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  // Base — 4px radius per brand spec, pill-like but not fully round
  "group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-[4px] border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-all [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        // ── Semantic status tones (use these in tables / status cells) ──
        success:     "bg-emerald-50  text-emerald-700  dark:bg-emerald-950 dark:text-emerald-400",
        warning:     "bg-amber-50    text-amber-700    dark:bg-amber-950  dark:text-amber-400",
        error:       "bg-red-50      text-red-700      dark:bg-red-950    dark:text-red-400",
        info:        "bg-sky-50      text-sky-700      dark:bg-sky-950    dark:text-sky-400",

        // ── Brand tones ──
        brand:       "bg-secondary text-secondary-foreground",          // periwinkle tint, navy text
        neutral:     "bg-muted text-muted-foreground",                  // gray

        // ── shadcn-compat variants (keep for existing code) ──
        default:     "bg-primary text-primary-foreground",
        secondary:   "bg-secondary text-secondary-foreground",
        destructive: "bg-destructive/10 text-destructive dark:bg-destructive/20",
        outline:     "border-border text-foreground",
        ghost:       "hover:bg-muted hover:text-muted-foreground",
        link:        "text-primary underline-offset-4 hover:underline",
      },
    },
    defaultVariants: {
      variant: "neutral",
    },
  }
);

function Badge({
  className,
  variant = "neutral",
  render,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      { className: cn(badgeVariants({ variant }), className) },
      props
    ),
    render,
    state: { slot: "badge", variant },
  });
}

export { Badge, badgeVariants };
