"use client";

import { useRouter } from "next/navigation";
import { useShipEasyI18n } from "@shipeasy/i18n-react";

type Profile = { id: string; name: string };

export function ProfileFilter({ profiles, value }: { profiles: Profile[]; value?: string }) {
  const { t } = useShipEasyI18n();
  const router = useRouter();

  return (
    <select
      id="profile-filter"
      value={value ?? ""}
      onChange={(e) => {
        const v = e.target.value;
        router.push(v ? `/dashboard/i18n/keys?profile=${v}` : "/dashboard/i18n/keys");
      }}
      className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <option value="">{t("app.dashboard.i18n.keys._components.all_profiles")}</option>
      {profiles.map((p) => (
        <option key={p.id} value={p.id}>
          {p.name}
        </option>
      ))}
    </select>
  );
}
