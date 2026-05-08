"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FlaskConical,
  ToggleLeft,
  Layers,
  Activity,
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
import { projectIdFromPathname, projectPath } from "@/lib/project-path";

type NavItem = {
  /** Path relative to the project root (e.g. "/gates"), or absolute for workspace items / external. */
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

// Project-scoped sections: hrefs are RELATIVE to the active project root.
// e.g. "/gates" → /dashboard/<projectId>/gates. "" → project home.
const PROJECT_SECTIONS: NavSection[] = [
  {
    items: [
      { href: "", label: "Home", icon: LayoutDashboard, exact: true },
      { href: "/gates", label: "Gates", icon: ToggleLeft },
      { href: "/configs/values", label: "Configs", icon: Layers },
      { href: "/experiments", label: "Experiments", icon: FlaskConical },
      { href: "/metrics", label: "Metrics", icon: Activity },
      { href: "/i18n", label: "String Manager", icon: Languages },
      { href: "/feedback", label: "Feedback", icon: Bug },
    ],
  },
  {
    title: "Connect",
    items: [
      { href: "/keys", label: "SDK Keys", icon: KeyRound },
      { href: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

// Workspace sections: hrefs are absolute, not project-scoped.
const WORKSPACE_SECTIONS: NavSection[] = [
  {
    title: "Workspace",
    items: [
      { href: "/dashboard/projects", label: "Projects", icon: FolderKanban },
      { href: "/dashboard/team", label: "Team", icon: Users },
      { href: "/dashboard/billing", label: "Billing", icon: CreditCard },
      { href: "https://docs.shipeasy.ai", label: "Docs", icon: Radio, external: true },
    ],
  },
];

function isActive(pathname: string, href: string, exact?: boolean, external?: boolean): boolean {
  if (external) return false;
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLink({ item, href, pathname }: { item: NavItem; href: string; pathname: string }) {
  const active = isActive(pathname, href, item.exact, item.external);
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
      <a href={href} className={className} target="_blank" rel="noreferrer">
        {content}
      </a>
    );
  }
  return (
    <Link href={href} className={className}>
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
  // Prefer the projectId from the URL if present (so the nav reflects what
  // the user is actually browsing rather than what the cookie says).
  const urlProjectId = projectIdFromPathname(pathname);
  const effectiveProjectId = urlProjectId ?? activeProjectId;

  const projectScopedActive = !!effectiveProjectId;

  return (
    <nav className="flex h-full flex-col">
      {/* Brand / Logo */}
      <div className="flex items-center gap-2.5 px-3 pt-4 pb-3">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <BrandMark size={22} />
          <span className="text-[14px] font-semibold tracking-[-0.01em]">Shipeasy</span>
        </Link>
      </div>

      {/* Project switcher — TOP of nav, scopes everything below */}
      <div className="px-3 pb-2">
        {projects.length > 0 ? (
          <ProjectSwitcher
            projects={projects}
            activeProjectId={effectiveProjectId}
            planLabel={planLabel}
          />
        ) : (
          <Link
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
          </Link>
        )}
      </div>

      {/* Nav items — scrollable */}
      <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-3 pb-3">
        {/* Project-scoped group: visually bracketed with a left rail to make
            the scoping unmistakable. */}
        {projectScopedActive && (
          <div className="relative">
            <div
              aria-hidden
              className="pointer-events-none absolute left-0 top-1 bottom-1 w-px bg-[var(--se-line)]"
            />
            <div className="px-2.5 pb-1 pt-1 font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--se-fg-4)]">
              In this project
            </div>
            <div className="flex flex-col gap-3 pl-1">
              {PROJECT_SECTIONS.map((section, i) => (
                <div key={i} className="flex flex-col gap-0.5">
                  {section.title && (
                    <div className="px-2.5 pb-1 pt-1 font-mono text-[10px] font-normal uppercase tracking-[0.08em] text-[var(--se-fg-4)]">
                      {section.title}
                    </div>
                  )}
                  <ul className="flex flex-col gap-0.5">
                    {section.items.map((item) => {
                      const href = projectPath(effectiveProjectId, item.href);
                      return (
                        <li key={item.href}>
                          <NavLink item={item} href={href} pathname={pathname} />
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}

        {WORKSPACE_SECTIONS.map((section, i) => (
          <div key={i} className="flex flex-col gap-0.5">
            {section.title && (
              <div className="px-2.5 pb-1 pt-1 font-mono text-[10px] font-normal uppercase tracking-[0.08em] text-[var(--se-fg-4)]">
                {section.title}
              </div>
            )}
            <ul className="flex flex-col gap-0.5">
              {section.items.map((item) => (
                <li key={item.href}>
                  <NavLink item={item} href={item.href} pathname={pathname} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </nav>
  );
}
