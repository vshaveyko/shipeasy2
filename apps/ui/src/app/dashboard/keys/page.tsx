import { KeyRound } from "lucide-react";

import { EmptyState } from "@/components/dashboard/empty-state";
import { PageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const KEY_TYPES = [
  {
    type: "server",
    label: "Server",
    description:
      "Full read of flags + experiments. Use from trusted backends only; never ship in a browser bundle.",
  },
  {
    type: "client",
    label: "Client",
    description:
      "Evaluate-only. Safe to include in web/mobile apps; used by /sdk/evaluate and /collect.",
  },
  {
    type: "admin",
    label: "Admin",
    description:
      "Scoped to admin REST endpoints (CLI). Generated once, shown once; rotate on suspicion.",
  },
];

export default function KeysPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="SDK Keys"
        description="Keys authenticate SDKs against your project. We show raw tokens once — store them securely."
        actions={
          <Button size="sm" disabled>
            Create key
          </Button>
        }
      />

      <EmptyState
        icon={KeyRound}
        title="No keys yet"
        description="Generate a server key to power your backend or a client key for browser/mobile SDKs."
      />

      <Card>
        <CardHeader className="border-b pb-4">
          <CardTitle>Key types</CardTitle>
          <CardDescription>Scopes and where each type is safe to use.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 pt-4 md:grid-cols-3">
          {KEY_TYPES.map((k) => (
            <div key={k.type} className="flex flex-col gap-2 rounded-lg border bg-background p-4">
              <Badge variant="secondary" className="w-fit">
                {k.label}
              </Badge>
              <div className="text-sm text-muted-foreground">{k.description}</div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
