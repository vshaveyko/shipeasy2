import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LinkButton } from "@/components/ui/link-button";

export default function NewConfigValuePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="New dynamic config"
        description="A dynamic config stores a JSON value SDKs can fetch without a redeploy."
        actions={
          <LinkButton variant="ghost" size="sm" href="/dashboard/configs/values">
            Cancel
          </LinkButton>
        }
      />

      <form className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="border-b pb-4">
            <CardTitle>Basics</CardTitle>
            <CardDescription>Identify the config and its shape.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="grid gap-1.5">
              <Label htmlFor="config-key">Key</Label>
              <Input
                id="config-key"
                name="key"
                placeholder="pricing_thresholds"
                className="font-mono"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="config-description">Description</Label>
              <Input
                id="config-description"
                name="description"
                placeholder="Tiered pricing thresholds"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b pb-4">
            <CardTitle>Environment</CardTitle>
            <CardDescription>Where this config value lives.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="grid gap-1.5">
              <Label htmlFor="config-env">Environment</Label>
              <select
                id="config-env"
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
            <CardTitle>Default JSON</CardTitle>
            <CardDescription>The value returned when no targeting rule matches.</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              JSON editor attaches once the config is saved.
            </div>
          </CardContent>
        </Card>

        <div className="col-span-full flex justify-end gap-2">
          <LinkButton variant="ghost" size="sm" href="/dashboard/configs/values">
            Cancel
          </LinkButton>
          <Button size="sm" type="submit" disabled>
            Create config
          </Button>
        </div>
      </form>
    </div>
  );
}
