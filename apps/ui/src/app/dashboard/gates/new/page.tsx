"use client";

import { useState } from "react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LinkButton } from "@/components/ui/link-button";
import { cn } from "@/lib/utils";
import { createGateAction } from "../actions";

const PROFILES = [
  {
    id: "rollout",
    label: "Rollout",
    emoji: "📈",
    description: "Gradually expose to % of users",
    defaultPct: 10,
  },
  {
    id: "targeted",
    label: "Targeted",
    emoji: "🎯",
    description: "Match specific attributes or IDs",
    defaultPct: 100,
  },
  {
    id: "killswitch",
    label: "Killswitch",
    emoji: "🛑",
    description: "Off by default, flip on in emergencies",
    defaultPct: 0,
  },
  {
    id: "beta",
    label: "Beta",
    emoji: "🧪",
    description: "Early-access group, invite-only",
    defaultPct: 0,
  },
] as const;

export default function NewGatePage() {
  const [selectedProfile, setSelectedProfile] = useState<string>("rollout");
  const [rolloutPct, setRolloutPct] = useState(10);
  const [killswitch, setKillswitch] = useState(false);

  const profile = PROFILES.find((p) => p.id === selectedProfile);

  function handleProfileSelect(id: string) {
    setSelectedProfile(id);
    const p = PROFILES.find((p) => p.id === id);
    if (p) {
      setRolloutPct(p.defaultPct);
      setKillswitch(id === "killswitch");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="New gate"
        description="A gate is a named boolean rollout rule. Pick a profile to pre-fill defaults."
        actions={
          <LinkButton variant="ghost" size="sm" href="/dashboard/gates">
            Cancel
          </LinkButton>
        }
      />

      {/* Quick profiles */}
      <Card>
        <CardHeader className="border-b pb-4">
          <CardTitle>Quick setup</CardTitle>
          <CardDescription>
            Choose a pattern — we&apos;ll pre-fill the rollout and targeting defaults.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 pt-4 sm:grid-cols-2 lg:grid-cols-4">
          {PROFILES.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => handleProfileSelect(p.id)}
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
              <span className="font-medium">{p.label}</span>
              <span className="text-xs text-muted-foreground">{p.description}</span>
            </button>
          ))}
        </CardContent>
      </Card>

      <form action={createGateAction} className="grid gap-6 lg:grid-cols-3">
        {/* Pass profile as hidden input so action can use defaults */}
        <input type="hidden" name="profile" value={selectedProfile} />
        <input type="hidden" name="rollout_pct" value={rolloutPct} />

        {/* Basics */}
        <Card className="lg:col-span-2">
          <CardHeader className="border-b pb-4">
            <CardTitle>Basics</CardTitle>
            <CardDescription>Identify the gate and what it controls.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="grid gap-1.5">
              <Label htmlFor="gate-key">Key</Label>
              <div className="flex rounded-lg border focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50">
                <span className="flex items-center rounded-l-lg bg-muted px-3 text-sm text-muted-foreground border-r">
                  flag_
                </span>
                <Input
                  id="gate-key"
                  name="key"
                  placeholder="new_checkout_flow"
                  className="font-mono rounded-l-none border-0 shadow-none focus-visible:ring-0"
                  required
                  pattern="[a-z0-9][a-z0-9_\-]{0,59}"
                  title="Lowercase letters, digits, _ or -; max 64 chars total"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Used in SDK as <code className="font-mono">getGate(&apos;flag_...&apos;)</code>
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

        {/* Rollout */}
        <Card>
          <CardHeader className="border-b pb-4">
            <CardTitle>Rollout percentage</CardTitle>
            <CardDescription>Percentage of eligible users who see this gate as ON.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="grid gap-3">
              <div className="flex items-center justify-between">
                <Label>Percentage</Label>
                <span className="text-2xl font-semibold tabular-nums">{rolloutPct}%</span>
              </div>
              <input
                type="range"
                name="rollout_pct_slider"
                min={0}
                max={100}
                value={rolloutPct}
                onChange={(e) => setRolloutPct(Number(e.target.value))}
                className="w-full accent-foreground"
              />
              {/* Visual split bar */}
              <div className="flex h-2 overflow-hidden rounded-full">
                <div className="bg-foreground transition-all" style={{ width: `${rolloutPct}%` }} />
                <div className="flex-1 bg-muted" />
              </div>
              <div className="flex justify-between text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <span className="inline-block size-2 rounded-full bg-foreground" /> ON
                </span>
                <span className="flex items-center gap-1">
                  OFF <span className="inline-block size-2 rounded-full bg-muted-foreground/40" />
                </span>
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="gate-default">Default (no match)</Label>
              <select
                id="gate-default"
                name="default"
                className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                defaultValue="off"
              >
                <option value="off">Off (false)</option>
                <option value="on">On (true)</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Targeting rules */}
        <Card className="lg:col-span-2">
          <CardHeader className="border-b pb-4">
            <CardTitle>Targeting rules</CardTitle>
            <CardDescription>
              Rules evaluated in order — first match wins. Overrides the rollout % for matched
              users.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="rounded-lg border border-dashed p-6 text-center">
              <p className="text-sm text-muted-foreground">
                Rules builder attaches once the gate is saved.
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Match on user ID, email, plan, country, or any custom attribute.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Killswitch */}
        <Card>
          <CardHeader className="border-b pb-4">
            <CardTitle>Force off</CardTitle>
            <CardDescription>
              Force the gate OFF for everyone, overriding all rules.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <label className="flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                name="killswitch"
                value="true"
                checked={killswitch}
                onChange={(e) => setKillswitch(e.target.checked)}
                className="peer sr-only"
              />
              <div className="relative h-6 w-11 rounded-full bg-muted transition-colors peer-checked:bg-foreground">
                <div className="absolute left-0.5 top-0.5 size-5 rounded-full bg-background shadow transition-transform peer-checked:translate-x-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium">Enable killswitch</span>
                <span className="text-xs text-muted-foreground">
                  Gate returns false for all users
                </span>
              </div>
            </label>
          </CardContent>
        </Card>

        <div className="col-span-full flex justify-end gap-2">
          <LinkButton variant="ghost" size="sm" href="/dashboard/gates">
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
