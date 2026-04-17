import { ArrowRight } from "lucide-react";

import { auth } from "@/auth";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/link-button";
import { PRODUCTS } from "@/lib/products";

export default async function OverviewPage() {
  const session = await auth();
  const firstName = session?.user?.name?.split(" ")[0];

  return (
    <div className="space-y-8">
      <PageHeader
        title={firstName ? `Welcome back, ${firstName}` : "Overview"}
        description="Pick a product to work in, or keep tabs on everything at a glance."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Gates + configs" value="0" hint="Across environments" />
        <StatCard label="Running experiments" value="0" hint="Live with traffic" />
        <StatCard label="Published locales" value="0" hint="String profiles live" />
        <StatCard label="Plan" value="Free" hint="Upgrade for more limits" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {PRODUCTS.map((p) => (
          <Card key={p.id}>
            <CardHeader className="border-b pb-4">
              <div className="flex items-center gap-2">
                <span className="flex size-8 shrink-0 items-center justify-center rounded bg-muted">
                  <p.icon className="size-4" />
                </span>
                <div className="flex flex-col">
                  <CardTitle>{p.name}</CardTitle>
                  <CardDescription>{p.tagline}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <LinkButton variant="outline" size="sm" href={p.rootHref}>
                Open {p.name}
                <ArrowRight className="size-3.5" />
              </LinkButton>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
