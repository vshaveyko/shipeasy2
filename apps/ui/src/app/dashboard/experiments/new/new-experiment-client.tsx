"use client";

import { useState } from "react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LinkButton } from "@/components/ui/link-button";
import { cn } from "@/lib/utils";
import { createExperimentAction } from "../actions";

const PROFILES = [
  {
    id: "conversion",
    emoji: "🎯",
    label: "Conversion",
    tag: "binary",
    hint: "Did the user complete the target action?",
    metric: "conversion_rate",
  },
  {
    id: "revenue",
    emoji: "💰",
    label: "Revenue",
    tag: "sum",
    hint: "Total revenue generated per user",
    metric: "revenue_per_user",
  },
  {
    id: "retention",
    emoji: "🔄",
    label: "Retention",
    tag: "binary",
    hint: "Did the user return on day N?",
    metric: "d7_retention",
  },
  {
    id: "performance",
    emoji: "⚡",
    label: "Performance",
    tag: "mean",
    hint: "Mean latency or load time (lower = better)",
    metric: "p50_latency_ms",
  },
  {
    id: "onboarding",
    emoji: "🚀",
    label: "Onboarding",
    tag: "composite",
    hint: "Activation + D7 retention bundle",
    metric: "activation_rate",
  },
] as const;

type Group = { name: string; pct: number };
type Param = { name: string; type: string };

const DEFAULT_GROUPS: Group[] = [
  { name: "control", pct: 50 },
  { name: "test", pct: 50 },
];

function computeDaysNeeded(dailyUsers: number, groups: number, allocationPct: number): number {
  if (dailyUsers <= 0) return 0;
  const mde = 0.05;
  const requiredN = Math.ceil((2 * 7.85 * 0.25) / (mde * mde));
  const usersPerDay = (dailyUsers * allocationPct) / 100;
  const usersPerGroup = usersPerDay / groups;
  return Math.max(1, Math.ceil(requiredN / usersPerGroup));
}

interface Props {
  gates: { id: string; name: string }[];
}

export default function NewExperimentClient({ gates }: Props) {
  const [selectedProfile, setSelectedProfile] = useState("conversion");
  const [allocation, setAllocation] = useState(100);
  const [groups, setGroups] = useState<Group[]>(DEFAULT_GROUPS);
  const [params, setParams] = useState<Param[]>([]);
  const [dailyUsers, setDailyUsers] = useState<string>("");

  function distributeEvenly(count: number) {
    const base = Math.floor(100 / count);
    const remainder = 100 - base * count;
    return Array.from({ length: count }, (_, i) => base + (i < remainder ? 1 : 0));
  }

  function addGroup() {
    const newName = `variant_${groups.length}`;
    const count = groups.length + 1;
    const pcts = distributeEvenly(count);
    setGroups(
      groups
        .map((g, i) => ({ ...g, pct: pcts[i] }))
        .concat({ name: newName, pct: pcts[count - 1] }),
    );
  }

  function removeGroup(idx: number) {
    if (groups.length <= 2) return;
    const next = groups.filter((_, i) => i !== idx);
    const pcts = distributeEvenly(next.length);
    setGroups(next.map((g, i) => ({ ...g, pct: pcts[i] })));
  }

  function updateGroupName(idx: number, name: string) {
    setGroups(groups.map((g, i) => (i === idx ? { ...g, name } : g)));
  }

  function addParam() {
    setParams([...params, { name: "", type: "string" }]);
  }

  function removeParam(idx: number) {
    setParams(params.filter((_, i) => i !== idx));
  }

  function updateParam(idx: number, field: "name" | "type", value: string) {
    setParams(params.map((p, i) => (i === idx ? { ...p, [field]: value } : p)));
  }

  const profile = PROFILES.find((p) => p.id === selectedProfile)!;
  const dailyUsersNum = dailyUsers !== "" ? Number(dailyUsers) : 0;
  const daysNeeded =
    dailyUsersNum > 0 ? computeDaysNeeded(dailyUsersNum, groups.length, allocation) : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="New experiment"
        description="Define a hypothesis, split your traffic, and pre-register your goal metric."
        actions={
          <LinkButton variant="ghost" size="sm" href="/dashboard/experiments">
            Cancel
          </LinkButton>
        }
      />

      {/* Quick profiles */}
      <Card>
        <CardHeader className="border-b pb-4">
          <CardTitle>Quick setup</CardTitle>
          <CardDescription>
            Pick a template: pre-fills metric type, aggregation, and guardrails.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 pt-4 sm:grid-cols-2 lg:grid-cols-5">
          {PROFILES.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setSelectedProfile(p.id)}
              className={cn(
                "relative flex flex-col items-start gap-1.5 rounded-lg border p-3 text-left text-sm transition-colors",
                selectedProfile === p.id
                  ? "border-foreground/60 bg-muted"
                  : "bg-background hover:border-foreground/30 hover:bg-muted/50",
              )}
            >
              {selectedProfile === p.id && (
                <span className="absolute right-2 top-2 flex size-4 items-center justify-center rounded-full bg-foreground text-[10px] text-background">
                  ✓
                </span>
              )}
              <span className="text-xl">{p.emoji}</span>
              <div className="flex items-center gap-1.5">
                <span className="font-medium">{p.label}</span>
                <span className="rounded bg-muted px-1 py-0.5 text-[10px] font-medium text-muted-foreground">
                  {p.tag}
                </span>
              </div>
              <span className="text-xs text-muted-foreground">{p.hint}</span>
            </button>
          ))}
        </CardContent>
      </Card>

      <form action={createExperimentAction} className="grid gap-6 lg:grid-cols-3" noValidate>
        <input type="hidden" name="profile" value={selectedProfile} />
        <input type="hidden" name="goal_metric" value={profile.metric} />
        <input type="hidden" name="group_count" value={groups.length} />
        <input type="hidden" name="param_count" value={params.length} />

        {/* Basics */}
        <Card className="lg:col-span-2">
          <CardHeader className="border-b pb-4">
            <CardTitle>Basics</CardTitle>
            <CardDescription>Identify the experiment and frame the hypothesis.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="grid gap-1.5">
              <Label htmlFor="exp-key">
                Name <span className="text-muted-foreground">(slug)</span>
              </Label>
              <div className="flex rounded-lg border focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50">
                <span className="flex items-center rounded-l-lg bg-muted px-3 text-sm text-muted-foreground border-r">
                  exp_
                </span>
                <Input
                  id="exp-key"
                  name="name"
                  placeholder="checkout_redesign_q2"
                  className="font-mono rounded-l-none border-0 shadow-none focus-visible:ring-0"
                  required
                  pattern="[a-z0-9][a-z0-9_\-]{0,59}"
                  title="Lowercase letters, digits, _ or -; max 64 chars total"
                />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="exp-question">Hypothesis</Label>
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

        {/* Universe */}
        <Card>
          <CardHeader className="border-b pb-4">
            <CardTitle>Universe</CardTitle>
            <CardDescription>Which users are eligible for this experiment.</CardDescription>
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
                <option value="default">default (no holdout)</option>
              </select>
              <p className="text-xs text-muted-foreground">
                Holdouts are configured on the universe, not the experiment.
              </p>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="exp-gate">Targeting gate</Label>
              <select
                id="exp-gate"
                name="targeting_gate"
                className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                defaultValue=""
              >
                <option value="">None (all users)</option>
                {gates.map((g) => (
                  <option key={g.id} value={g.name}>
                    {g.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                Only users who pass this gate are enrolled.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Traffic split */}
        <Card className="lg:col-span-2">
          <CardHeader className="border-b pb-4">
            <CardTitle>Traffic split</CardTitle>
            <CardDescription>
              Allocation % of the universe. Groups split that traffic evenly.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="grid gap-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="exp-allocation">Allocation (% of universe)</Label>
                <span className="text-xl font-semibold tabular-nums">{allocation}%</span>
              </div>
              <input
                type="range"
                name="allocation"
                min={1}
                max={100}
                value={allocation}
                onChange={(e) => setAllocation(Number(e.target.value))}
                className="w-full accent-foreground"
              />
            </div>

            {/* Groups */}
            <div className="space-y-2">
              <div className="grid grid-cols-[1fr_auto_auto] gap-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground px-1">
                <span>Group name</span>
                <span className="w-12 text-center">Split</span>
                <span className="w-6" />
              </div>
              {groups.map((g, idx) => (
                <div key={idx} className="grid grid-cols-[1fr_auto_auto] items-center gap-2">
                  <input type="hidden" name={`group_weight_${idx}`} value={g.pct * 100} />
                  <div className="flex items-center gap-2 rounded-lg border px-3 py-1.5">
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{
                        background:
                          idx === 0
                            ? "hsl(var(--foreground))"
                            : `hsl(${(idx * 137) % 360} 70% 55%)`,
                      }}
                    />
                    <Input
                      value={g.name}
                      onChange={(e) => updateGroupName(idx, e.target.value)}
                      name={`group_name_${idx}`}
                      className="h-auto border-0 p-0 font-mono text-sm shadow-none focus-visible:ring-0"
                    />
                  </div>
                  <span className="w-12 text-center text-sm font-medium tabular-nums">
                    {g.pct}%
                  </span>
                  <button
                    type="button"
                    onClick={() => removeGroup(idx)}
                    disabled={groups.length <= 2}
                    className="flex size-6 items-center justify-center rounded text-muted-foreground transition-colors hover:text-foreground disabled:opacity-20"
                  >
                    ×
                  </button>
                </div>
              ))}

              {/* Visual split bar */}
              <div className="flex h-2 overflow-hidden rounded-full mt-2">
                {groups.map((g, idx) => (
                  <div
                    key={idx}
                    className="transition-all"
                    style={{
                      width: `${(g.pct / 100) * allocation}%`,
                      background:
                        idx === 0 ? "hsl(var(--foreground))" : `hsl(${(idx * 137) % 360} 70% 55%)`,
                    }}
                  />
                ))}
                <div
                  className="flex-1 bg-muted"
                  style={{ display: allocation < 100 ? "block" : "none" }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {groups.map((g) => `${g.pct}% ${g.name}`).join(" · ")}{" "}
                {allocation < 100 && `· ${100 - allocation}% not in experiment`}
              </p>

              <button
                type="button"
                onClick={addGroup}
                className="mt-1 flex w-full items-center justify-center gap-1 rounded-lg border border-dashed px-3 py-2 text-sm text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
              >
                + Add variant
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Statistical power */}
        <Card>
          <CardHeader className="border-b pb-4">
            <CardTitle>Statistical power</CardTitle>
            <CardDescription>Estimated runtime at α=0.05.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="grid gap-1.5">
              <Label htmlFor="pc-daily-users">Daily users</Label>
              <Input
                id="pc-daily-users"
                type="number"
                min={1}
                placeholder="1000"
                value={dailyUsers}
                onChange={(e) => setDailyUsers(e.target.value)}
              />
            </div>
            <div className="rounded-lg bg-muted/50 p-4 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Users/day</span>
                <span className="font-medium">{dailyUsers !== "" ? dailyUsersNum : "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Days needed</span>
                <span className="font-medium">{daysNeeded !== null ? daysNeeded : "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Confidence</span>
                <span className="font-medium">80%</span>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div className="h-full w-4/5 rounded-full bg-foreground" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Add a goal metric and set MDE to get precise estimates.
            </p>
          </CardContent>
        </Card>

        {/* Statistical config */}
        <Card className="lg:col-span-2">
          <CardHeader className="border-b pb-4">
            <CardTitle>Statistical config</CardTitle>
            <CardDescription>
              Confidence level, minimum running days, and sample size requirements.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="grid gap-1.5">
                <Label htmlFor="exp-sig-threshold">Significance level (α)</Label>
                <Input
                  id="exp-sig-threshold"
                  name="significance_threshold"
                  type="number"
                  step="0.001"
                  min={0.001}
                  max={0.5}
                  defaultValue={0.05}
                  placeholder="0.05"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="exp-min-days">Minimum running days</Label>
                <Input
                  id="exp-min-days"
                  name="min_runtime_days"
                  type="number"
                  min={0}
                  max={365}
                  defaultValue={0}
                  placeholder="0"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="exp-min-sample">Min sample size</Label>
                <Input
                  id="exp-min-sample"
                  name="min_sample_size"
                  type="number"
                  min={1}
                  defaultValue={100}
                  placeholder="100"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Params schema */}
        <Card className="lg:col-span-3">
          <CardHeader className="border-b pb-4">
            <CardTitle>Params</CardTitle>
            <CardDescription>
              Optional typed parameters each group can carry (e.g. button_color: string).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-4">
            {params.map((p, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <Input
                  name={`param_name_${idx}`}
                  value={p.name}
                  onChange={(e) => updateParam(idx, "name", e.target.value)}
                  placeholder="param name"
                  className="font-mono"
                />
                <select
                  name={`param_type_${idx}`}
                  value={p.type}
                  onChange={(e) => updateParam(idx, "type", e.target.value)}
                  className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <option value="string">string</option>
                  <option value="number">number</option>
                  <option value="bool">bool</option>
                </select>
                <button
                  type="button"
                  onClick={() => removeParam(idx)}
                  className="flex size-6 items-center justify-center rounded text-muted-foreground hover:text-foreground"
                >
                  ×
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addParam}
              className="flex w-full items-center justify-center gap-1 rounded-lg border border-dashed px-3 py-2 text-sm text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
            >
              + Add param
            </button>
          </CardContent>
        </Card>

        {/* Metrics */}
        <Card className="lg:col-span-3">
          <CardHeader className="border-b pb-4">
            <CardTitle>Metrics</CardTitle>
            <CardDescription>
              One goal metric (pre-register) plus guardrails and optional secondary metrics.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="rounded-lg border bg-muted/20 p-4 text-sm">
              <div className="flex items-center gap-3">
                <span className="rounded bg-blue-500/10 px-2 py-0.5 text-xs font-medium text-blue-600 dark:text-blue-400">
                  goal
                </span>
                <span className="font-mono">{profile.metric}</span>
                <span className="text-muted-foreground text-xs">
                  pre-filled from {profile.label} template
                </span>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Add guardrail and secondary metrics after saving the experiment.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="col-span-full flex justify-end gap-2">
          <LinkButton variant="ghost" size="sm" href="/dashboard/experiments">
            Cancel
          </LinkButton>
          <Button size="sm" type="submit">
            Save draft
          </Button>
        </div>
      </form>
    </div>
  );
}
