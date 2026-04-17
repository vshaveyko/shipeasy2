import { auth, signOut } from "@/auth";
import { PageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default async function SettingsPage() {
  const session = await auth();

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Manage your project, plan, and sign-in." />

      <Card>
        <CardHeader className="border-b pb-4">
          <CardTitle>Project</CardTitle>
          <CardDescription>Metadata visible to your team and SDKs.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <div className="grid gap-1.5">
            <Label htmlFor="project-name">Name</Label>
            <Input id="project-name" defaultValue="Default project" disabled />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="project-id">Project ID</Label>
            <Input id="project-id" defaultValue="proj_local" className="font-mono" disabled />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b pb-4">
          <CardTitle>Plan</CardTitle>
          <CardDescription>Limits and features for the current subscription.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">Free</div>
              <div className="text-xs text-muted-foreground">
                5 flags · 1 experiment · 30d results retention
              </div>
            </div>
            <Badge variant="secondary">current</Badge>
          </div>
          <Button variant="outline" size="sm" disabled>
            Upgrade
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b pb-4">
          <CardTitle>Account</CardTitle>
          <CardDescription>Signed in identity.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <div className="flex flex-col gap-0.5 text-sm">
            <span className="font-medium">{session?.user?.name}</span>
            <span className="text-muted-foreground">{session?.user?.email}</span>
          </div>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/" });
            }}
          >
            <Button variant="outline" size="sm" type="submit">
              Sign out
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
