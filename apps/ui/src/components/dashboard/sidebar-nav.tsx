"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FlaskConical,
  ToggleLeft,
  Layers,
  Languages,
  Bug,
  KeyRound,
  Radio,
  Users,
  FolderKanban,
  CreditCard,
  Settings,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { BrandMark } from "@/components/dashboard/brand-mark";
import { ProjectSwitcher } from "@/components/dashboard/project-switcher";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  external?: boolean;
  exact?: boolean;
};

type NavSection = {
  title?: string;
  items: NavItem[];
};

const MAIN_SECTIONS: NavSection[] = [
  {
    items: [
      { href: "/dashboard", label: "Home", icon: LayoutDashboard, exact: true },
      { href: "/dashboard/gates", label: "Gates", icon: ToggleLeft },
      { href: "/dashboard/configs/values", label: "Configs", icon: Layers },
      { href: "/dashboard/experiments", label: "Experiments", icon: FlaskConical },
      { href: "/dashboard/i18n", label: "String Manager", icon: Languages },
      { href: "/dashboard/bugs", label: "Feedback", icon: Bug },
    ],
  },
  {
    title: "Connect",
    items: [
      { href: "/dashboard/keys", label: "SDK Keys", icon: KeyRound },
      { href: "https://docs.shipeasy.ai", label: "Docs", icon: Radio, external: true },
    ],
  },
  {
    title: "Workspace",
    items: [
      { href: "/dashboard/team", label: "Team", icon: Users },
      { href: "/dashboard/projects", label: "Projects", icon: FolderKanban },
      { href: "/dashboard/billing", label: "Billing", icon: CreditCard },
      { href: "/dashboard/settings", label: "Settings", icon: Settings },
    ],
  },
];

function isActive(pathname: string, item: NavItem): boolean {
  if (item.exact) return pathname === item.href;
  if (item.external) return false;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

function NavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const active = isActive(pathname, item);
  const Icon = item.icon;
  const className = cn(
    "flex items-center gap-2.5 rounded-md px-2.5 py-[7px] text-[13px] transition-colors relative",
    active
      ? "bg-[color-mix(in_oklab,var(--se-accent)_10%,transparent)] text-foreground"
      : "text-muted-foreground hover:bg-[var(--se-bg-2)] hover:text-foreground",
  );
  const content = (
    <>
      {active && (
        <span className="absolute -left-[3px] top-1/2 h-3.5 w-[3px] -translate-y-1/2 rounded bg-[var(--se-accent)]" />
      )}
      <Icon className="size-3.5 shrink-0" />
      <span className="flex-1">{item.label}</span>
    </>
  );
  if (item.external) {
    return (
      <a href={item.href} className={className} target="_blank" rel="noreferrer">
        {content}
      </a>
    );
  }
  return (
    <Link href={item.href} className={className}>
      {content}
    </Link>
  );
}

interface Project {
  id: string;
  name: string;
  domain: string | null;
}

interface SidebarNavProps {
  projectName?: string;
  planLabel?: string;
  projects?: Project[];
  activeProjectId?: string;
}

export function SidebarNav({
  projectName = "Default project",
  planLabel,
  projects = [],
  activeProjectId = "",
}: SidebarNavProps) {
  const pathname = usePathname();

  return (
    <nav className="flex h-full flex-col">
      {/* Brand / Logo */}
      <div className="flex items-center gap-2.5 px-3 py-4">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <BrandMark size={22} />
          <span className="text-[14px] font-semibold tracking-[-0.01em]">Shipeasy</span>
        </Link>
      </div>

      {/* Nav items — scrollable */}
      <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-3 pb-3">
        {MAIN_SECTIONS.map((section, i) => (
          <div key={i} className="flex flex-col gap-0.5">
            {section.title && (
              <div className="px-2.5 pb-1 pt-1 font-mono text-[10px] font-normal uppercase tracking-[0.08em] text-[var(--se-fg-4)]">
                {section.title}
              </div>
            )}
            <ul className="flex flex-col gap-0.5">
              {section.items.map((item) => (
                <li key={item.href}>
                  <NavLink item={item} pathname={pathname} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Project switcher at bottom */}
      <div className="shrink-0 border-t border-[var(--se-line)] px-3 py-2">
        {projects.length > 0 ? (
          <ProjectSwitcher
            projects={projects}
            activeProjectId={activeProjectId}
            planLabel={planLabel}
          />
        ) : (
          <a
            href="/dashboard/projects"
            className="flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left transition-colors hover:bg-[var(--se-bg-2)]"
          >
            <div
              className="grid size-6 shrink-0 place-items-center rounded-md font-mono text-[10px] font-bold"
              style={{ background: "var(--se-accent)", color: "#fff" }}
            >
              {projectName.slice(0, 1).toUpperCase()}
            </div>
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-[12.5px] font-medium leading-tight">
                {projectName}
              </span>
              {planLabel && (
                <span className="truncate font-mono text-[10.5px] leading-tight text-muted-foreground">
                  {planLabel}
                </span>
              )}
            </div>
          </a>
        )}
      </div>
    </nav>
  );
}
