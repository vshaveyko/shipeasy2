import { KeyRound } from "lucide-react";
import { auth } from "@/auth";
import { listKeys } from "@/lib/handlers/keys";
import { EmptyState } from "@/components/dashboard/empty-state";
import { PageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { createKeyAction, revokeKeyAction } from "./actions";

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

export default async function KeysPage() {
  const session = await auth();
  const projectId = session?.user?.project_id;

  let keys: Awaited<ReturnType<typeof listKeys>> = [];
  if (projectId) {
    try {
      keys = await listKeys({
        projectId,
        actorEmail: session?.user?.email ?? "unknown",
        source: "jwt",
      });
    } catch {
      // DB not available in dev without wrangler
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="SDK Keys"
        description="Keys authenticate SDKs against your project. We show raw tokens once — store them securely."
      />

      <Card>
        <CardHeader className="border-b pb-4">
          <CardTitle>Create key</CardTitle>
          <CardDescription>Choose a key type and generate a new token.</CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <form action={createKeyAction} className="flex items-end gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="key-type">Type</Label>
              <select
                id="key-type"
                name="type"
                className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <option value="server">Server</option>
                <option value="client">Client</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <Button size="sm" type="submit">
              Create key
            </Button>
          </form>
        </CardContent>
      </Card>

      {keys.length === 0 ? (
        <EmptyState
          icon={KeyRound}
          title="No keys yet"
          description="Generate a server key to power your backend or a client key for browser/mobile SDKs."
        />
      ) : (
        <div className="rounded-lg border">
          {keys.map((key) => (
            <div
              key={key.id}
              className="flex items-center justify-between border-b px-4 py-3 last:border-0"
            >
              <div className="flex items-center gap-3">
                <Badge variant="secondary">{key.type}</Badge>
                <span className="font-mono text-xs text-muted-foreground">{key.id}</span>
                {key.revoked_at && <Badge variant="destructive">revoked</Badge>}
              </div>
              {!key.revoked_at && (
                <form action={revokeKeyAction}>
                  <input type="hidden" name="id" value={key.id} />
                  <Button
                    size="sm"
                    variant="ghost"
                    type="submit"
                    className="text-destructive hover:text-destructive"
                  >
                    Revoke
                  </Button>
                </form>
              )}
            </div>
          ))}
        </div>
      )}

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
