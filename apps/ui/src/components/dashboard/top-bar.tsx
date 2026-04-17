import Link from "next/link";
import { ChevronsUpDown } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SignOutButton } from "@/components/dashboard/sign-out-button";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { LinkButton } from "@/components/ui/link-button";
import { ThemeToggle } from "@/components/theme-toggle";
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
import { Logo } from "@shipeasy/shared/Logo";

type TopBarProps = {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  projectName?: string;
  planLabel?: string;
};

export function TopBar({ user, projectName = "Default project", planLabel = "Free" }: TopBarProps) {
  const initials =
    user.name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) ?? "?";

  return (
    <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center justify-between gap-4 border-b bg-background px-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard" className="flex items-center gap-2 font-bold text-base">
          <Logo className="size-5" />
          ShipEasy
        </Link>
        <span className="text-muted-foreground">/</span>
        <DropdownMenu>
          <DropdownMenuTrigger
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "h-8 gap-2 font-normal",
            )}
          >
            <span className="font-medium">{projectName}</span>
            <Badge variant="secondary" className="text-[10px]">
              {planLabel}
            </Badge>
            <ChevronsUpDown className="size-3.5 text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuGroup>
              <DropdownMenuLabel>Projects</DropdownMenuLabel>
              <DropdownMenuItem>{projectName}</DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled>+ New project (coming soon)</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex items-center gap-2">
        <LinkButton
          variant="ghost"
          size="sm"
          href="https://docs.shipeasy.ai"
          target="_blank"
          rel="noreferrer"
        >
          Docs
        </LinkButton>
        <ThemeToggle />
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label={user.name ?? "Account menu"}
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "gap-2")}
          >
            <Avatar size="sm">
              <AvatarImage src={user.image ?? undefined} alt={user.name ?? ""} />
              <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
            </Avatar>
            <span className="hidden text-sm font-medium sm:inline">{user.name}</span>
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
