import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LinkButton } from "@/components/ui/link-button";

const PROFILES = [
  { id: "conversion", label: "Conversion", hint: "Binary — did the user do X?" },
  { id: "revenue", label: "Revenue", hint: "Sum of value per user" },
  { id: "retention", label: "Retention", hint: "Did the user return on day N?" },
  { id: "performance", label: "Performance", hint: "Mean load time (lower = better)" },
  { id: "onboarding", label: "Onboarding", hint: "Activation + D7 retention" },
];

export default function NewExperimentPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="New experiment"
        description="Fill in the basics; you can tune guardrails and traffic split before starting."
        actions={
          <LinkButton variant="ghost" size="sm" href="/dashboard/experiments">
            Cancel
          </LinkButton>
        }
      />

      <Card>
        <CardHeader className="border-b pb-4">
          <CardTitle>Quick setup</CardTitle>
          <CardDescription>
            Pick a template — we&apos;ll pre-fill metric type, aggregation, and guardrails.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 pt-4 sm:grid-cols-2 lg:grid-cols-5">
          {PROFILES.map((profile) => (
            <button
              key={profile.id}
              type="button"
              className="flex flex-col items-start gap-1 rounded-lg border bg-background p-3 text-left text-sm transition-colors hover:border-foreground/40 hover:bg-muted"
            >
              <span className="font-medium">{profile.label}</span>
              <span className="text-xs text-muted-foreground">{profile.hint}</span>
            </button>
          ))}
        </CardContent>
      </Card>

      <form className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="border-b pb-4">
            <CardTitle>Basics</CardTitle>
            <CardDescription>Identify the experiment and what it tests.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="grid gap-1.5">
              <Label htmlFor="exp-key">Name</Label>
              <Input
                id="exp-key"
                name="name"
                placeholder="checkout_redesign_q2"
                className="font-mono"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="exp-question">Hypothesis / question</Label>
              <Input
                id="exp-question"
                name="question"
                placeholder="Does the new checkout increase completed purchases?"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="exp-success">Success definition</Label>
              <Input
                id="exp-success"
                name="success"
                placeholder="Conversion rate up ≥ 2pp with no load-time regression"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b pb-4">
            <CardTitle>Universe</CardTitle>
            <CardDescription>Which users are eligible.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="grid gap-1.5">
              <Label htmlFor="exp-universe">Universe</Label>
              <select
                id="exp-universe"
                name="universe"
                className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                defaultValue="default"
              >
                <option value="default">default — no holdout</option>
              </select>
              <p className="text-xs text-muted-foreground">
                Holdouts are configured on the universe, not the experiment.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="border-b pb-4">
            <CardTitle>Traffic split</CardTitle>
            <CardDescription>
              Allocation % of the universe, divided equally between groups by default.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="grid gap-1.5">
              <Label htmlFor="exp-allocation">Allocation (% of universe)</Label>
              <Input
                id="exp-allocation"
                type="number"
                name="allocation"
                defaultValue={100}
                min={1}
                max={100}
              />
            </div>
            <div className="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
              Preview: 50% control · 50% test · 0% not-in-experiment
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b pb-4">
            <CardTitle>Statistical power</CardTitle>
            <CardDescription>Estimated days to detect the MDE.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-4 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Daily users</span>
              <span className="font-medium">—</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Days needed</span>
              <span className="font-medium">—</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Power</span>
              <span className="font-medium">80%</span>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader className="border-b pb-4">
            <CardTitle>Metrics</CardTitle>
            <CardDescription>
              One goal metric (pre-register) plus guardrails and optional secondary metrics.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              Metric picker will attach once metrics exist for this project.
            </div>
          </CardContent>
        </Card>

        <div className="col-span-full flex justify-end gap-2">
          <LinkButton variant="ghost" size="sm" href="/dashboard/experiments">
            Cancel
          </LinkButton>
          <Button variant="outline" size="sm" type="submit" disabled>
            Save draft
          </Button>
          <Button size="sm" type="submit" disabled>
            Create &amp; review
          </Button>
        </div>
      </form>
    </div>
  );
}
