"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import {
  PRODUCTS,
  SHARED_NAV,
  getProductFromPath,
  type NavGroup,
  type NavItem,
} from "@/lib/products";
import { ProductSwitcher } from "@/components/dashboard/product-switcher";

function isActive(pathname: string, item: NavItem) {
  if (item.exact || item.href === "/dashboard") return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

function NavItemLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const active = isActive(pathname, item);
  const Icon = item.icon;
  const className = cn(
    "relative flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] transition-colors",
    active
      ? "bg-[color-mix(in_oklab,var(--se-accent)_10%,transparent)] text-foreground before:absolute before:left-[-12px] before:top-1/2 before:h-3.5 before:w-[3px] before:-translate-y-1/2 before:rounded before:bg-[var(--se-accent)]"
      : "text-muted-foreground hover:bg-[var(--se-bg-2)] hover:text-foreground",
  );
  return item.external ? (
    <a href={item.href} className={className} target="_blank" rel="noreferrer">
      <Icon className="size-3.5 shrink-0" />
      <span className="flex-1">{item.label}</span>
    </a>
  ) : (
    <Link href={item.href} className={className}>
      <Icon className="size-3.5 shrink-0" />
      <span className="flex-1">{item.label}</span>
    </Link>
  );
}

function Group({ group, pathname }: { group: NavGroup; pathname: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="px-2.5 pt-2 pb-1 font-mono text-[10px] font-normal uppercase tracking-[0.08em] text-[var(--se-fg-4)]">
        {group.title}
      </div>
      <ul className="flex flex-col gap-0.5">
        {group.items.map((item) => (
          <li key={item.href}>
            <NavItemLink item={item} pathname={pathname} />
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SidebarNav() {
  const pathname = usePathname();
  const current = getProductFromPath(pathname);

  const isSharedNavPage = SHARED_NAV.items.some(
    (item) => pathname === item.href || (!item.external && pathname.startsWith(`${item.href}/`)),
  );

  const groups: NavGroup[] = current
    ? current.nav
    : isSharedNavPage
      ? []
      : [
          {
            title: "Products",
            items: PRODUCTS.map((p) => ({
              href: p.rootHref,
              label: p.name,
              icon: p.icon,
              description: p.tagline,
            })),
          },
        ];

  return (
    <nav className="flex h-full flex-col gap-3 p-3 text-sm">
      <ProductSwitcher />

      <div className="flex flex-1 flex-col gap-2">
        {groups.map((group) => (
          <Group key={group.title} group={group} pathname={pathname} />
        ))}
      </div>

      {!isSharedNavPage && <Group group={SHARED_NAV} pathname={pathname} />}
    </nav>
  );
}
