import Link from "next/link";
import { AlertTriangle, Bell, Plug, Settings, FlaskConical, KeyRound } from "lucide-react";

export const SETTINGS_TABS = [
  { key: "general", label: "General", Icon: Settings },
  { key: "experiments", label: "Experiment defaults", Icon: FlaskConical },
  { key: "notifications", label: "Notifications", Icon: Bell },
  { key: "integrations", label: "Integrations", Icon: Plug },
  { key: "billing", label: "Billing & usage", Icon: KeyRound },
  { key: "danger", label: "Danger zone", Icon: AlertTriangle },
] as const;

export type SettingsTabKey = (typeof SETTINGS_TABS)[number]["key"];

export function isSettingsTab(v: unknown): v is SettingsTabKey {
  return typeof v === "string" && SETTINGS_TABS.some((t) => t.key === v);
}

export function NavRail({ projectId, active }: { projectId: string; active: SettingsTabKey }) {
  return (
    <nav aria-label="Settings sections" className="nav-rail">
      {SETTINGS_TABS.map(({ key, label, Icon }) => {
        const href =
          key === "general"
            ? `/dashboard/${projectId}/settings`
            : `/dashboard/${projectId}/settings?tab=${key}`;
        return (
          <Link
            key={key}
            href={href}
            className={active === key ? "active" : undefined}
            aria-current={active === key ? "page" : undefined}
          >
            <Icon className="size-[13px]" aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
