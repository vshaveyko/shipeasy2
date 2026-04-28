"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Check, ChevronsUpDown } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { PRODUCTS, getProductFromPath } from "@/lib/products";

export function ProductSwitcher() {
  const pathname = usePathname();
  const current = getProductFromPath(pathname);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Switch product"
        className={cn(
          "flex w-full items-center gap-2 rounded-md border bg-background px-2.5 py-2 text-left text-sm transition-colors",
          "hover:bg-muted/60",
        )}
      >
        {current ? (
          <>
            <span className="flex size-8 shrink-0 items-center justify-center rounded bg-muted">
              <current.icon className="size-4" />
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate font-medium text-foreground">{current.name}</span>
              <span className="truncate text-[11px] text-muted-foreground">{current.tagline}</span>
            </span>
          </>
        ) : (
          <>
            <span className="flex size-8 shrink-0 items-center justify-center rounded bg-muted text-muted-foreground">
              <ChevronsUpDown className="size-4" />
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate font-medium text-foreground">
                Choose a product
              </span>
              <span className="truncate text-[11px] text-muted-foreground">
                Feature flags, A/B tests, i18n
              </span>
            </span>
          </>
        )}
        <ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Products
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {PRODUCTS.map((p) => {
            const isCurrent = current?.id === p.id;
            return (
              <DropdownMenuItem
                key={p.id}
                className="gap-2 py-2"
                render={<Link href={p.rootHref} />}
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded bg-muted">
                  <p.icon className="size-4" />
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-medium">{p.name}</span>
                  <span className="truncate text-[11px] text-muted-foreground">{p.tagline}</span>
                </span>
                {isCurrent ? <Check className="size-3.5 shrink-0 text-foreground" /> : null}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
