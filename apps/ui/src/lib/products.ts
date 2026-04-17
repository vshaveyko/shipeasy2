import {
  Activity,
  FlaskConical,
  Gauge,
  Globe2,
  KeyRound,
  LayoutDashboard,
  Languages,
  Layers,
  Radio,
  Settings,
  ToggleLeft,
  Tags,
  FileText,
  FolderTree,
  PencilLine,
} from "lucide-react";
import type { ComponentType, SVGProps } from "react";

export type ProductId = "gates" | "configs" | "experiments" | "i18n";

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
];

export const SHARED_NAV: NavGroup = {
  title: "Project",
  items: [
    { href: "/dashboard/keys", label: "SDK Keys", icon: KeyRound },
    { href: "/dashboard/settings", label: "Settings", icon: Settings },
    {
      href: "https://docs.shipeasy.ai",
      label: "Docs",
      icon: Radio,
      external: true,
    },
  ],
};

export function getProductFromPath(pathname: string): Product | null {
  return (
    PRODUCTS.find((p) => pathname === p.basePath || pathname.startsWith(`${p.basePath}/`)) ?? null
  );
}

export function getProduct(id: ProductId): Product {
  const product = PRODUCTS.find((p) => p.id === id);
  if (!product) throw new Error(`Unknown product: ${id}`);
  return product;
}
