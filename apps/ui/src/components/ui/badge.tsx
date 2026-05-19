import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-4xl border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-all focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground [a]:hover:bg-primary/80",
        secondary: "bg-secondary text-secondary-foreground [a]:hover:bg-secondary/80",
        destructive:
          "bg-destructive/10 text-destructive focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:focus-visible:ring-destructive/40 [a]:hover:bg-destructive/20",
        outline: "border-border text-foreground [a]:hover:bg-muted [a]:hover:text-muted-foreground",
        ghost: "hover:bg-muted hover:text-muted-foreground dark:hover:bg-muted/50",
        link: "text-primary underline-offset-4 hover:underline",
      },
      intent: {
        none: "",
        running:
          "border-[color-mix(in_oklab,var(--se-accent)_30%,transparent)] bg-[var(--se-accent-soft)] text-[var(--se-accent)]",
        success:
          "border-[color-mix(in_oklab,var(--se-accent)_30%,transparent)] bg-[var(--se-accent-soft)] text-[var(--se-accent)]",
        info: "border-[color-mix(in_oklab,var(--se-info)_30%,transparent)] bg-[var(--se-info-soft)] text-[var(--se-info)]",
        warn: "border-[color-mix(in_oklab,var(--se-warn)_30%,transparent)] bg-[var(--se-warn-soft)] text-[var(--se-warn)]",
        danger:
          "border-[color-mix(in_oklab,var(--se-danger)_30%,transparent)] bg-[var(--se-danger-soft)] text-[var(--se-danger)]",
        neutral: "border-[var(--se-line-2)] bg-[var(--se-bg-3)] text-[var(--se-fg-2)]",
      },
    },
    defaultVariants: {
      variant: "default",
      intent: "none",
    },
  },
);

function Badge({
  className,
  variant = "default",
  intent = "none",
  render,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ variant, intent }), className),
      },
      props,
    ),
    render,
    state: {
      slot: "badge",
      variant,
      intent,
    },
  });
}

export { Badge, badgeVariants };
