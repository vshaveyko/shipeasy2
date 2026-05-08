import {
  Activity,
  FlaskConical,
  FolderKanban,
  Gauge,
  Globe2,
  KeyRound,
  LayoutDashboard,
  Languages,
  Layers,
  Bug,
  Radio,
  Settings,
  ToggleLeft,
  Tags,
  FileText,
  FolderTree,
  PencilLine,
  Users,
  CreditCard,
} from "lucide-react";
import type { ComponentType, SVGProps } from "react";

export type ProductId = "gates" | "configs" | "experiments" | "i18n" | "feedback";

export type NavItem = {
  href: string;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  description?: string;
  external?: boolean;
  /** Match only the exact href, never sub-paths. */
  exact?: boolean;
};

export type NavGroup = {
  title: string;
  items: NavItem[];
};

export type Product = {
  id: ProductId;
  name: string;
  tagline: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  /** URL prefix that identifies this product. */
  basePath: string;
  /** Additional URL prefixes that should resolve to this product. */
  extraPaths?: string[];
  /** Landing page to route users to when they pick this product. */
  rootHref: string;
  nav: NavGroup[];
};

export const PRODUCTS: Product[] = [
  {
    id: "gates",
    name: "Gates",
    tagline: "Feature flags & targeted rollouts",
    icon: ToggleLeft,
    basePath: "/dashboard/gates",
    rootHref: "/dashboard/gates",
    nav: [
      {
        title: "Ship",
        items: [
          {
            href: "/dashboard/gates",
            label: "Gates",
            icon: ToggleLeft,
          },
        ],
      },
    ],
  },
  {
    id: "configs",
    name: "Configs",
    tagline: "Dynamic values & remote config",
    icon: Layers,
    basePath: "/dashboard/configs",
    rootHref: "/dashboard/configs/values",
    nav: [
      {
        title: "Ship",
        items: [
          {
            href: "/dashboard/configs/values",
            label: "Configs",
            icon: Layers,
          },
        ],
      },
    ],
  },
  {
    id: "experiments",
    name: "Experiments",
    tagline: "A/B tests, universes & metrics",
    icon: FlaskConical,
    basePath: "/dashboard/experiments",
    rootHref: "/dashboard/experiments",
    nav: [
      {
        title: "Ship",
        items: [
          {
            href: "/dashboard/experiments",
            label: "Experiments",
            icon: FlaskConical,
            exact: true,
          },
          {
            href: "/dashboard/experiments/universes",
            label: "Universes",
            icon: Globe2,
          },
        ],
      },
      {
        title: "Measure",
        items: [
          {
            href: "/dashboard/experiments/metrics",
            label: "Metrics",
            icon: Gauge,
          },
          {
            href: "/dashboard/experiments/events",
            label: "Events",
            icon: Activity,
          },
          {
            href: "/dashboard/experiments/attributes",
            label: "Attributes",
            icon: Tags,
          },
        ],
      },
    ],
  },
  {
    id: "i18n",
    name: "String Manager",
    tagline: "Localized labels & translations",
    icon: Languages,
    basePath: "/dashboard/i18n",
    rootHref: "/dashboard/i18n",
    nav: [
      {
        title: "Strings",
        items: [
          {
            href: "/dashboard/i18n",
            label: "Overview",
            icon: LayoutDashboard,
            exact: true,
          },
          {
            href: "/dashboard/i18n/profiles",
            label: "Profiles",
            icon: FolderTree,
          },
          {
            href: "/dashboard/i18n/keys",
            label: "Keys",
            icon: FileText,
          },
          {
            href: "/dashboard/i18n/drafts",
            label: "Drafts",
            icon: PencilLine,
          },
        ],
      },
    ],
  },
  {
    id: "feedback",
    name: "Feedback",
    tagline: "Bug reports & feature requests from the in-page nub",
    icon: Bug,
    basePath: "/dashboard/feedback",
    extraPaths: ["/dashboard/bugs", "/dashboard/feature-requests"],
    rootHref: "/dashboard/feedback",
    nav: [
      {
        title: "Inbox",
        items: [
          {
            href: "/dashboard/feedback",
            label: "Bugs & requests",
            icon: Bug,
            exact: true,
          },
          {
            href: "/dashboard/feedback?connectors=open",
            label: "Connectors",
            icon: Radio,
          },
        ],
      },
    ],
  },
];

export const SHARED_NAV: NavGroup = {
  title: "Project",
  items: [
    { href: "/dashboard/projects", label: "Projects", icon: FolderKanban },
    { href: "/dashboard/team", label: "Team", icon: Users },
    { href: "/dashboard/keys", label: "SDK Keys", icon: KeyRound },
    { href: "/dashboard/billing", label: "Billing", icon: CreditCard },
    { href: "/dashboard/settings", label: "Settings", icon: Settings },
    {
      href: "https://docs.shipeasy.ai",
      label: "Docs",
      icon: Radio,
      external: true,
    },
  ],
};

/**
 * Strip a leading /dashboard/<projectId> segment so the remaining path can
 * be matched against the workspace-relative basePaths declared above.
 * Returns the original path if it doesn't include a projectId segment.
 */
function stripProjectPrefix(pathname: string): string {
  const m = pathname.match(/^\/dashboard\/([^/]+)(\/.*)?$/);
  if (!m) return pathname;
  const seg = m[1]!;
  // Workspace-scoped segments are kept as-is.
  if (seg === "projects" || seg === "team" || seg === "billing") return pathname;
  // Legacy paths like /dashboard/gates already match basePaths directly.
  const KNOWN_PRODUCT_SEGMENTS = new Set([
    "gates",
    "configs",
    "experiments",
    "metrics",
    "i18n",
    "feedback",
    "keys",
    "settings",
    "bugs",
    "feature-requests",
  ]);
  if (KNOWN_PRODUCT_SEGMENTS.has(seg)) return pathname;
  // Otherwise treat the segment as a projectId and strip it.
  return `/dashboard${m[2] ?? ""}`;
}

export function getProductFromPath(pathname: string): Product | null {
  const stripped = stripProjectPrefix(pathname);
  return (
    PRODUCTS.find((p) => {
      const paths = [p.basePath, ...(p.extraPaths ?? [])];
      return paths.some((bp) => stripped === bp || stripped.startsWith(`${bp}/`));
    }) ?? null
  );
}

export function getProduct(id: ProductId): Product {
  const product = PRODUCTS.find((p) => p.id === id);
  if (!product) throw new Error(`Unknown product: ${id}`);
  return product;
}
