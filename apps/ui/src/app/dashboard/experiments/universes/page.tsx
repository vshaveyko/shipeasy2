import { Globe2 } from "lucide-react";
import { auth } from "@/auth";
import { listUniverses } from "@/lib/handlers/universes";
import { EmptyState } from "@/components/dashboard/empty-state";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createUniverseAction, deleteUniverseAction } from "./actions";

export default async function UniversesPage() {
  const session = await auth();
  const projectId = session?.user?.project_id;

  let universes: Awaited<ReturnType<typeof listUniverses>> = [];
  if (projectId) {
    try {
      universes = await listUniverses({
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
        title="Universes"
        description="A universe groups experiments that share a holdout. Users held out of a universe see no experiment inside it."
      />

      <p className="text-sm text-muted-foreground">
        One default universe is always present. Create a custom universe to reserve a percentage of
        users as a long-term holdout.
      </p>

      <Card>
        <CardHeader className="border-b pb-4">
          <CardTitle>New universe</CardTitle>
          <CardDescription>Create a custom universe for holdout experiments.</CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <form action={createUniverseAction} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="grid gap-1.5">
              <Label htmlFor="universe-name">Name</Label>
              <Input
                id="universe-name"
                name="name"
                placeholder="holdout_2025"
                className="font-mono"
                required
                pattern="[a-z0-9][a-z0-9_\-]{0,63}"
                title="Lowercase letters, digits, _ or -; max 64 chars"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="universe-unit-type">Unit type</Label>
              <select
                id="universe-unit-type"
                name="unit_type"
                defaultValue="user_id"
                className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <option value="user_id">user_id</option>
                <option value="device_id">device_id</option>
                <option value="session_id">session_id</option>
                <option value="account_id">account_id</option>
              </select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="universe-holdout-lo">Holdout lo (bp)</Label>
              <Input
                id="universe-holdout-lo"
                name="holdout_lo"
                type="number"
                min={0}
                max={10000}
                placeholder="0"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="universe-holdout-hi">Holdout hi (bp)</Label>
              <Input
                id="universe-holdout-hi"
                name="holdout_hi"
                type="number"
                min={0}
                max={10000}
                placeholder="1000"
              />
            </div>
            <div className="flex items-end">
              <Button size="sm" type="submit">
                Create universe
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {universes.length === 0 ? (
        <EmptyState
          icon={Globe2}
          title="One default universe"
          description="Your project starts with a 'default' universe and no holdout. Create a custom universe once you want to reserve a % of users as a long-term control."
        />
      ) : (
        <div className="rounded-lg border">
          {universes.map((u) => (
            <div
              key={u.id}
              className="flex items-center justify-between border-b px-4 py-3 last:border-0"
            >
              <div>
                <span className="font-mono text-sm font-medium">{u.name}</span>
                {u.holdoutRange && (
                  <span className="ml-2 text-xs text-muted-foreground">
                    holdout [{(u.holdoutRange as number[])[0]}–{(u.holdoutRange as number[])[1]}]
                  </span>
                )}
              </div>
              {u.name !== "default" && (
                <form action={deleteUniverseAction}>
                  <input type="hidden" name="id" value={u.id} />
                  <Button
                    size="sm"
                    variant="ghost"
                    type="submit"
                    className="text-destructive hover:text-destructive"
                  >
                    Delete
                  </Button>
                </form>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
