import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LinkButton } from "@/components/ui/link-button";
import { createGateAction } from "../actions";

export default function NewGatePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="New gate"
        description="A gate is a named boolean rollout rule. Define a key, a default, and targeting rules."
        actions={
          <LinkButton variant="ghost" size="sm" href="/dashboard/configs/gates">
            Cancel
          </LinkButton>
        }
      />

      <form action={createGateAction} className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="border-b pb-4">
            <CardTitle>Basics</CardTitle>
            <CardDescription>Identify the gate and what it controls.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="grid gap-1.5">
              <Label htmlFor="gate-key">Key</Label>
              <Input
                id="gate-key"
                name="key"
                placeholder="new_checkout_flow"
                className="font-mono"
                required
                pattern="[a-z0-9][a-z0-9_\-]{0,63}"
                title="Lowercase letters, digits, _ or -; max 64 chars"
              />
              <p className="text-xs text-muted-foreground">
                Lowercase, snake_case. Used from SDKs as getGate(&apos;new_checkout_flow&apos;).
              </p>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="gate-description">Description</Label>
              <Input
                id="gate-description"
                name="description"
                placeholder="Rolls out the redesigned checkout to % of users"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b pb-4">
            <CardTitle>Defaults</CardTitle>
            <CardDescription>Value returned when no rule matches.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="grid gap-1.5">
              <Label htmlFor="gate-default">Default state</Label>
              <select
                id="gate-default"
                name="default"
                className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                defaultValue="off"
              >
                <option value="off">Off (return false)</option>
                <option value="on">On (return true)</option>
              </select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="gate-env">Environment</Label>
              <select
                id="gate-env"
                name="env"
                className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                defaultValue="production"
              >
                <option value="development">Development</option>
                <option value="staging">Staging</option>
                <option value="production">Production</option>
              </select>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader className="border-b pb-4">
            <CardTitle>Targeting rules</CardTitle>
            <CardDescription>
              Add rules to override the default for specific users, attributes, or percentages.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              Rules builder is wired up once the gate is saved.
            </div>
          </CardContent>
        </Card>

        <div className="col-span-full flex justify-end gap-2">
          <LinkButton variant="ghost" size="sm" href="/dashboard/configs/gates">
            Cancel
          </LinkButton>
          <Button size="sm" type="submit">
            Create gate
          </Button>
        </div>
      </form>
    </div>
  );
}
