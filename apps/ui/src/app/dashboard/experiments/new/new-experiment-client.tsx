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
import { useShipEasyI18n } from "@shipeasy/i18n-react";

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
  const { t } = useShipEasyI18n();
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
        title={t("app.dashboard.experiments.new.new_experiment")}
        description={t(
          "app.dashboard.experiments.new.define_a_hypothesis_split_your_traffic_and_pre_register_your",
        )}
        actions={
          <LinkButton variant="ghost" size="sm" href="/dashboard/experiments">
            {t("common.cancel")}
          </LinkButton>
        }
      />

      {/* Quick profiles */}
      <Card>
        <CardHeader className="border-b pb-4">
          <CardTitle>{t("app.dashboard.experiments.new.quick_setup")}</CardTitle>
          <CardDescription>
            {t(
              "app.dashboard.experiments.new.pick_a_template_pre_fills_metric_type_aggregation_and_guardr",
            )}
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
            <CardTitle>{t("common.basics")}</CardTitle>
            <CardDescription>
              {t("app.dashboard.experiments.new.identify_the_experiment_and_frame_the_hypothesis")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="grid gap-1.5">
              <Label htmlFor="exp-key">
                {t("common.name")}{" "}
                <span className="text-muted-foreground">
                  {t("app.dashboard.experiments.new.slug")}
                </span>
              </Label>
              <div className="flex rounded-lg border focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50">
                <span className="flex items-center rounded-l-lg bg-muted px-3 text-sm text-muted-foreground border-r">
                  {t("app.dashboard.experiments.new.exp")}
                </span>
                <Input
                  id="exp-key"
                  name="name"
                  placeholder={t("app.dashboard.experiments.new.checkout_redesign_q2")}
                  className="font-mono rounded-l-none border-0 shadow-none focus-visible:ring-0"
                  required
                  pattern="[a-z0-9][a-z0-9_\-]{0,59}"
                  title={t(
                    "app.dashboard.experiments.new.lowercase_letters_digits_or_max_64_chars_total",
                  )}
                />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="exp-question">{t("app.dashboard.experiments.new.hypothesis")}</Label>
              <Input
                id="exp-question"
                name="question"
                placeholder={t(
                  "app.dashboard.experiments.new.does_the_new_checkout_increase_completed_purchases",
                )}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="exp-success">
                {t("app.dashboard.experiments.new.success_definition")}
              </Label>
              <Input
                id="exp-success"
                name="success"
                placeholder={t(
                  "app.dashboard.experiments.new.conversion_rate_up_2pp_with_no_load_time_regression",
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Universe */}
        <Card>
          <CardHeader className="border-b pb-4">
            <CardTitle>{t("app.dashboard.experiments.new.universe")}</CardTitle>
            <CardDescription>
              {t("app.dashboard.experiments.new.which_users_are_eligible_for_this_experiment")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="grid gap-1.5">
              <Label htmlFor="exp-universe">{t("app.dashboard.experiments.new.universe")}</Label>
              <select
                id="exp-universe"
                name="universe"
                className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                defaultValue="default"
              >
                <option value="default">
                  {t("app.dashboard.experiments.new.default_no_holdout")}
                </option>
              </select>
              <p className="text-xs text-muted-foreground">
                {t(
                  "app.dashboard.experiments.new.holdouts_are_configured_on_the_universe_not_the_experiment",
                )}
              </p>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="exp-gate">{t("app.dashboard.experiments.new.targeting_gate")}</Label>
              <select
                id="exp-gate"
                name="targeting_gate"
                className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                defaultValue=""
              >
                <option value="">{t("app.dashboard.experiments.new.none_all_users")}</option>
                {gates.map((g) => (
                  <option key={g.id} value={g.name}>
                    {g.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                {t("app.dashboard.experiments.new.only_users_who_pass_this_gate_are_enrolled")}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Traffic split */}
        <Card className="lg:col-span-2">
          <CardHeader className="border-b pb-4">
            <CardTitle>{t("app.dashboard.experiments.new.traffic_split")}</CardTitle>
            <CardDescription>
              {t(
                "app.dashboard.experiments.new.allocation_of_the_universe_groups_split_that_traffic_evenly",
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="grid gap-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="exp-allocation">
                  {t("app.dashboard.experiments.new.allocation_of_universe")}
                </Label>
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
                <span>{t("app.dashboard.experiments.new.group_name")}</span>
                <span className="w-12 text-center">{t("app.dashboard.experiments.new.split")}</span>
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
                {t("app.dashboard.experiments.new.add_variant")}
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Statistical power */}
        <Card>
          <CardHeader className="border-b pb-4">
            <CardTitle>{t("app.dashboard.experiments.new.statistical_power")}</CardTitle>
            <CardDescription>
              {t("app.dashboard.experiments.new.estimated_runtime_at_0_05")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="grid gap-1.5">
              <Label htmlFor="pc-daily-users">
                {t("app.dashboard.experiments.new.daily_users")}
              </Label>
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
                <span className="text-muted-foreground">
                  {t("app.dashboard.experiments.new.users_day")}
                </span>
                <span className="font-medium">{dailyUsers !== "" ? dailyUsersNum : "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {t("app.dashboard.experiments.new.days_needed")}
                </span>
                <span className="font-medium">{daysNeeded !== null ? daysNeeded : "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {t("app.dashboard.experiments.new.confidence")}
                </span>
                <span className="font-medium">80%</span>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div className="h-full w-4/5 rounded-full bg-foreground" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              {t(
                "app.dashboard.experiments.new.add_a_goal_metric_and_set_mde_to_get_precise_estimates",
              )}
            </p>
          </CardContent>
        </Card>

        {/* Statistical config */}
        <Card className="lg:col-span-2">
          <CardHeader className="border-b pb-4">
            <CardTitle>{t("app.dashboard.experiments.new.statistical_config")}</CardTitle>
            <CardDescription>
              {t(
                "app.dashboard.experiments.new.confidence_level_minimum_running_days_and_sample_size_requir",
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="grid gap-1.5">
                <Label htmlFor="exp-sig-threshold">
                  {t("app.dashboard.experiments.new.significance_level")}
                </Label>
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
                <Label htmlFor="exp-min-days">
                  {t("app.dashboard.experiments.new.minimum_running_days")}
                </Label>
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
                <Label htmlFor="exp-min-sample">
                  {t("app.dashboard.experiments.new.min_sample_size")}
                </Label>
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
            <CardTitle>{t("app.dashboard.experiments.new.params")}</CardTitle>
            <CardDescription>
              {t(
                "app.dashboard.experiments.new.optional_typed_parameters_each_group_can_carry_e_g_button_co",
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-4">
            {params.map((p, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <Input
                  name={`param_name_${idx}`}
                  value={p.name}
                  onChange={(e) => updateParam(idx, "name", e.target.value)}
                  placeholder={t("app.dashboard.experiments.new.param_name")}
                  className="font-mono"
                />
                <select
                  name={`param_type_${idx}`}
                  value={p.type}
                  onChange={(e) => updateParam(idx, "type", e.target.value)}
                  className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <option value="string">{t("app.dashboard.experiments.new.string")}</option>
                  <option value="number">{t("app.dashboard.experiments.new.number")}</option>
                  <option value="bool">{t("app.dashboard.experiments.new.bool")}</option>
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
              {t("app.dashboard.experiments.new.add_param")}
            </button>
          </CardContent>
        </Card>

        {/* Metrics */}
        <Card className="lg:col-span-3">
          <CardHeader className="border-b pb-4">
            <CardTitle>{t("app.dashboard.experiments.new.metrics")}</CardTitle>
            <CardDescription>
              {t(
                "app.dashboard.experiments.new.one_goal_metric_pre_register_plus_guardrails_and_optional_se",
              )}
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
                  {t("app.dashboard.experiments.new.pre_filled_from")} {profile.label}{" "}
                  {t("app.dashboard.experiments.new.template")}
                </span>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                {t(
                  "app.dashboard.experiments.new.add_guardrail_and_secondary_metrics_after_saving_the_experim",
                )}
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="col-span-full flex justify-end gap-2">
          <LinkButton variant="ghost" size="sm" href="/dashboard/experiments">
            {t("common.cancel")}
          </LinkButton>
          <Button size="sm" type="submit">
            {t("app.dashboard.experiments.new.save_draft")}
          </Button>
        </div>
      </form>
    </div>
  );
}
