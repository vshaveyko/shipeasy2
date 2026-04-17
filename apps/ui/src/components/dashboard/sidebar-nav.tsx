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
    "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
    active
      ? "bg-muted font-medium text-foreground"
      : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
  );
  return item.external ? (
    <a href={item.href} className={className} target="_blank" rel="noreferrer">
      <Icon className="size-4 shrink-0" />
      <span>{item.label}</span>
    </a>
  ) : (
    <Link href={item.href} className={className}>
      <Icon className="size-4 shrink-0" />
      <span>{item.label}</span>
    </Link>
  );
}

function Group({ group, pathname }: { group: NavGroup; pathname: string }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="px-2 text-[0.7rem] font-medium tracking-wider text-muted-foreground uppercase">
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

  const groups: NavGroup[] = current
    ? current.nav
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
    <nav className="flex h-full flex-col gap-6 p-4 text-sm">
      <ProductSwitcher />

      <div className="flex flex-1 flex-col gap-6">
        {groups.map((group) => (
          <Group key={group.title} group={group} pathname={pathname} />
        ))}
      </div>

      <Group group={SHARED_NAV} pathname={pathname} />
    </nav>
  );
}
