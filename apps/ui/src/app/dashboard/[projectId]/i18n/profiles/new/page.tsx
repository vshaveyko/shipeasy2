import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LinkButton } from "@/components/ui/link-button";
import { createProfileAction } from "../actions";

export default function NewProfilePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="New profile"
        description="A profile groups label chunks for a locale + environment pair, e.g. en:prod or fr:staging."
        actions={
          <LinkButton variant="ghost" size="sm" href="/dashboard/i18n/profiles">
            Cancel
          </LinkButton>
        }
      />

      <form action={createProfileAction} className="max-w-lg">
        <Card>
          <CardHeader className="border-b pb-4">
            <CardTitle>Profile details</CardTitle>
            <CardDescription>
              The name is used as the profile identifier. Use a consistent naming convention across
              environments, e.g. <code>en:prod</code>, <code>en:staging</code>, <code>fr:prod</code>
              .
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="grid gap-1.5">
              <Label htmlFor="profile-name">Name</Label>
              <Input
                id="profile-name"
                name="name"
                placeholder="en:prod"
                className="font-mono"
                required
                pattern="[a-z0-9][a-z0-9_:.\-]*"
                title="lowercase, digits, _, :, ., - only"
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                Lowercase, digits, <code>_</code> <code>:</code> <code>.</code> <code>-</code> only.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <LinkButton variant="ghost" size="sm" href="/dashboard/i18n/profiles">
                Cancel
              </LinkButton>
              <Button size="sm" type="submit">
                Create profile
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
