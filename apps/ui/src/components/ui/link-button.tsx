import Link, { type LinkProps } from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { type VariantProps } from "class-variance-authority";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type LinkButtonProps = LinkProps &
  Omit<ComponentProps<"a">, keyof LinkProps> &
  VariantProps<typeof buttonVariants> & {
    children?: ReactNode;
  };

export function LinkButton({
  className,
  variant = "default",
  size = "default",
  ...props
}: LinkButtonProps) {
  return (
    <Link
      data-slot="link-button"
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}
