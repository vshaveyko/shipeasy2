import { ArrowRight } from "lucide-react";

import { auth } from "@/auth";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { PRODUCTS } from "@/lib/products";

export default async function OverviewPage() {
  const session = await auth();
  const firstName = session?.user?.name?.split(" ")[0];

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Workspace overview"
        title={firstName ? `Welcome back, ${firstName}` : "Overview"}
        description="Pick a product to work in, or keep tabs on everything at a glance."
      />

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Gates + configs" value="0" hint="across environments" />
        <StatCard label="Running experiments" value="0" hint="live with traffic" accent />
        <StatCard label="Published locales" value="0" hint="string profiles live" />
        <StatCard label="Plan" value="Free" hint="upgrade for more limits" />
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        {PRODUCTS.map((p) => (
          <a
            key={p.id}
            href={p.rootHref}
            className="group flex flex-col gap-3 rounded-[var(--radius-lg)] border border-[var(--se-line)] bg-[var(--se-bg-1)] p-5 transition-colors hover:border-[var(--se-line-2)] hover:bg-[var(--se-bg-2)]"
          >
            <div className="flex items-center justify-between">
              <span
                className="grid size-9 place-items-center rounded-[8px]"
                style={{
                  background: "var(--se-accent-soft)",
                  color: "var(--se-accent)",
                  border: "1px solid color-mix(in oklab, var(--se-accent) 30%, transparent)",
                }}
              >
                <p.icon className="size-4" />
              </span>
              <ArrowRight className="size-3.5 text-[var(--se-fg-4)] transition-colors group-hover:text-[var(--se-accent)]" />
            </div>
            <div className="text-[15px] font-medium tracking-[-0.01em]">{p.name}</div>
            <div className="text-[12.5px] leading-[1.5] text-[var(--se-fg-2)]">{p.tagline}</div>
          </a>
        ))}
      </div>
    </div>
  );
}
