import type { Metadata } from "next";
import { KeyRound, Zap } from "lucide-react";
import { auth } from "@/auth";
import { listKeys } from "@/lib/handlers/keys";

export const metadata: Metadata = { title: "SDK Keys" };
import { EmptyState } from "@/components/dashboard/empty-state";
import { HeroEmptyState } from "@/components/dashboard/hero-empty-state";
import { Page, PageBody, PageHeader } from "@/components/dashboard/page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { createKeyAction } from "./actions";
import { CopyKeyButton } from "./copy-key-button";
import { RevokeKeyButton } from "./revoke-key-button";

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

export default async function KeysPage({
  searchParams,
}: {
  searchParams: Promise<{ new_key?: string; show?: string }>;
}) {
  const session = await auth();
  const projectId = session?.user?.project_id;
  const { new_key, show } = await searchParams;
  const showRevoked = show === "revoked";

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

  const activeKeys = keys.filter((k) => !k.revoked_at);
  const revokedKeys = keys.filter((k) => k.revoked_at);
  const visibleKeys = (showRevoked ? [...activeKeys, ...revokedKeys] : activeKeys).sort((a, b) => {
    const aRevoked = a.revoked_at ? 1 : 0;
    const bRevoked = b.revoked_at ? 1 : 0;
    if (aRevoked !== bRevoked) return aRevoked - bRevoked;
    return Date.parse(b.created_at ?? "") - Date.parse(a.created_at ?? "");
  });

  if (keys.length === 0 && !new_key) {
    return (
      <Page>
        <PageHeader
          title="SDK Keys"
          description="Keys authenticate SDKs against your project. We show raw tokens once — store them securely."
        />
        <PageBody>
          <HeroEmptyState
            kind="keys"
            extraAction={
              <form action={createKeyAction}>
                <input type="hidden" name="type" value="server" />
                <Button size="lg" type="submit" className="h-10 px-4 text-[14px]">
                  <Zap className="size-3.5" /> Create your first key
                </Button>
              </form>
            }
          />
        </PageBody>
      </Page>
    );
  }

  return (
    <Page>
      <PageHeader
        title="SDK Keys"
        description="Keys authenticate SDKs against your project. We show raw tokens once — store them securely."
      />
      <PageBody className="space-y-6">
        {new_key && (
          <Card className="border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/20">
            <CardHeader className="border-b pb-4">
              <CardTitle className="text-sm">New key — copy it now</CardTitle>
              <CardDescription>This raw token will not be shown again.</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <code className="flex-1 overflow-x-auto rounded bg-background px-3 py-2 font-mono text-xs">
                  {new_key}
                </code>
                <CopyKeyButton value={new_key} />
              </div>
            </CardContent>
          </Card>
        )}

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
            <div className="flex items-center justify-between border-b bg-muted/40 px-4 py-2 text-xs text-muted-foreground">
              <div>
                {activeKeys.length} active
                {revokedKeys.length > 0 ? ` · ${revokedKeys.length} revoked` : ""}
              </div>
              {revokedKeys.length > 0 && (
                <a
                  href={showRevoked ? "/dashboard/keys" : "/dashboard/keys?show=revoked"}
                  className="font-medium hover:text-foreground hover:underline"
                >
                  {showRevoked ? "Hide revoked" : "Show revoked"}
                </a>
              )}
            </div>
            <div
              className="grid gap-3 border-b bg-muted/20 px-4 py-2 text-[10px] uppercase tracking-wide text-muted-foreground"
              style={{ gridTemplateColumns: "70px minmax(0,1fr) 130px 130px 80px" }}
            >
              <span>Type</span>
              <span>Key ID</span>
              <span>Created</span>
              <span>Expires</span>
              <span />
            </div>
            {visibleKeys.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                No active keys. Use “Create key” above or{" "}
                <a className="underline" href={`/dashboard/${projectId}/keys?show=revoked`}>
                  show revoked
                </a>
                .
              </div>
            ) : (
              visibleKeys.map((key) => (
                <div
                  key={key.id}
                  className={`grid items-center gap-3 border-b px-4 py-3 last:border-0 ${
                    key.revoked_at ? "opacity-60" : ""
                  }`}
                  style={{ gridTemplateColumns: "70px minmax(0,1fr) 130px 130px 80px" }}
                >
                  <Badge variant="secondary" className="w-fit">
                    {key.type}
                  </Badge>
                  <span className="truncate font-mono text-xs text-muted-foreground">{key.id}</span>
                  <span className="text-xs text-muted-foreground">
                    {key.created_at ? new Date(key.created_at).toLocaleDateString() : "—"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {key.revoked_at ? (
                      <Badge variant="destructive">revoked</Badge>
                    ) : key.expires_at ? (
                      new Date(key.expires_at).toLocaleDateString()
                    ) : (
                      "Never"
                    )}
                  </span>
                  <span className="flex justify-end">
                    {!key.revoked_at && <RevokeKeyButton id={key.id} />}
                  </span>
                </div>
              ))
            )}
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
      </PageBody>
    </Page>
  );
}
