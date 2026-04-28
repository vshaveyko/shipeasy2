import Link from "next/link";
import { Bell, Search } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SignOutButton } from "@/components/dashboard/sign-out-button";
import { BrandMark } from "@/components/dashboard/brand-mark";
import { buttonVariants } from "@/components/ui/button";
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

type TopBarProps = {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  projectName?: string;
  planLabel?: string;
};

export function TopBar({ user, projectName = "Default project" }: TopBarProps) {
  const initials =
    user.name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) ?? "?";

  return (
    <header className="sticky top-0 z-10 flex h-12 shrink-0 items-center gap-3 border-b bg-background px-4">
      {/* Mobile: show logo (sidebar is hidden on mobile) */}
      <Link
        href="/dashboard"
        className="flex items-center gap-2 text-[14px] font-semibold tracking-[-0.01em] md:hidden"
      >
        <BrandMark size={20} />
        Shipeasy
      </Link>

      {/* Desktop: breadcrumb shows project name */}
      <div className="hidden items-center gap-1.5 text-[13px] md:flex">
        <span className="text-muted-foreground">{projectName}</span>
      </div>

      {/* Search — center */}
      <div className="flex flex-1 items-center justify-center">
        <button
          type="button"
          className="flex h-8 w-[260px] items-center gap-2 rounded-md border border-[var(--se-line-2)] bg-[var(--se-bg-2)] px-3 text-[12.5px] text-muted-foreground transition-colors hover:border-[var(--se-line-3)] hover:bg-[var(--se-bg-3)]"
        >
          <Search className="size-3.5 shrink-0" />
          <span className="flex-1 text-left">Search or ask Claude…</span>
          <kbd className="inline-flex items-center gap-0.5 rounded border border-[var(--se-line-2)] bg-[var(--se-bg-3)] px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Right: bell + theme + user */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          aria-label="Notifications"
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "size-8 p-0 text-muted-foreground",
          )}
        >
          <Bell className="size-4" />
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label={user.name ?? "Account menu"}
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "gap-2")}
          >
            <Avatar size="sm">
              <AvatarImage src={user.image ?? undefined} alt={user.name ?? ""} />
              <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
            </Avatar>
            <span
              className="nav-user-name hidden text-sm font-medium sm:inline"
              data-user-name={user.name ?? ""}
              aria-hidden="true"
            />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuGroup>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium text-foreground">{user.name}</span>
                  <span className="text-xs text-muted-foreground">{user.email}</span>
                </div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem render={<Link href="/dashboard/settings" />}>
              Settings
            </DropdownMenuItem>
            <DropdownMenuItem render={<Link href="/dashboard/keys" />}>SDK Keys</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem render={<SignOutButton />} />
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
