import { Layers, ToggleLeft } from "lucide-react";

import { EmptyState } from "@/components/dashboard/empty-state";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/link-button";

export default function ConfigsOverviewPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Configs"
        description="Feature gates turn features on and off. Dynamic configs hold JSON values you change without deploying."
        actions={
          <>
            <LinkButton variant="outline" size="sm" href="/dashboard/configs/gates/new">
              New gate
            </LinkButton>
            <LinkButton size="sm" href="/dashboard/configs/values/new">
              New config
            </LinkButton>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Gates" value="0" hint="Boolean on/off toggles" />
        <StatCard label="Dynamic configs" value="0" hint="JSON values" />
        <StatCard label="Active rollouts" value="0" hint="Rules in play" />
        <StatCard label="Last change" value="—" hint="Audit feed" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="border-b pb-4">
            <CardTitle>Gates</CardTitle>
            <CardDescription>
              Boolean rollouts with targeting rules — the fastest way to dark-ship a feature.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <EmptyState
              icon={ToggleLeft}
              title="No gates yet"
              description="Create a gate to start rolling features out to targeted users, percentages, or rules."
              action={
                <LinkButton size="sm" href="/dashboard/configs/gates/new">
                  Create gate
                </LinkButton>
              }
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b pb-4">
            <CardTitle>Dynamic configs</CardTitle>
            <CardDescription>
              JSON values you can tune remotely — feature copy, thresholds, buckets.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <EmptyState
              icon={Layers}
              title="No configs yet"
              description="Configs store JSON values you can update without a deploy."
              action={
                <LinkButton size="sm" href="/dashboard/configs/values/new">
                  Create config
                </LinkButton>
              }
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
