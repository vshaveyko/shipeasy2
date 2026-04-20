"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { addExperimentMetricAction } from "./actions";
import { useShipEasyI18n } from "@shipeasy/i18n-react";

type Role = "guardrail" | "secondary";

interface Metric {
  id: string;
  name: string;
}

interface AttachedMetric {
  metricId: string;
  name: string;
}

interface Props {
  experimentId: string;
  allMetrics: Metric[];
  guardrailMetrics: AttachedMetric[];
  secondaryMetrics: AttachedMetric[];
}

function AttachForm({
  experimentId,
  metrics,
  role,
  onCancel,
}: {
  experimentId: string;
  metrics: Metric[];
  role: Role;
  onCancel: () => void;
}) {
  const { t } = useShipEasyI18n();
  return (
    <form
      action={addExperimentMetricAction}
      onSubmit={() => onCancel()}
      className="flex items-end gap-3 mt-2"
    >
      <input type="hidden" name="experiment_id" value={experimentId} />
      <input type="hidden" name="role" value={role} />
      <div className="grid gap-1.5">
        <Label htmlFor="attach-metric">{t("app.dashboard.experiments._id.metric")}</Label>
        <select
          id="attach-metric"
          name="metric_id"
          className="h-8 w-48 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {metrics.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </div>
      <Button size="sm" type="submit">
        {t("app.dashboard.experiments._id.attach")}
      </Button>
      <Button size="sm" variant="ghost" type="button" onClick={onCancel}>
        {t("common.cancel")}
      </Button>
    </form>
  );
}

export function MetricsPanel({
  experimentId,
  allMetrics,
  guardrailMetrics,
  secondaryMetrics,
}: Props) {
  const { t } = useShipEasyI18n();
  const [openRole, setOpenRole] = useState<Role | null>(null);

  const guardrailIds = new Set(guardrailMetrics.map((m) => m.metricId));
  const secondaryIds = new Set(secondaryMetrics.map((m) => m.metricId));
  const availableForGuardrail = allMetrics.filter((m) => !guardrailIds.has(m.id));
  const availableForSecondary = allMetrics.filter((m) => !secondaryIds.has(m.id));

  return (
    <>
      <Card>
        <CardHeader className="border-b pb-4">
          <CardTitle>{t("app.dashboard.experiments._id.guardrails")}</CardTitle>
          <CardDescription>
            {t("app.dashboard.experiments._id.metrics_we_never_want_to_regress")}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4 space-y-2">
          {guardrailMetrics.length > 0 ? (
            <ul className="space-y-1 text-sm">
              {guardrailMetrics.map((m) => (
                <li key={m.metricId} className="font-mono">
                  {m.name}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              {t("app.dashboard.experiments._id.none_attached")}
            </p>
          )}
          {openRole === null && (
            <Button
              aria-label={t("app.dashboard.experiments._id.add_guardrail")}
              size="sm"
              variant="outline"
              type="button"
              onClick={() => setOpenRole("guardrail")}
            >
              {t("app.dashboard.experiments._id.attach")}
            </Button>
          )}
          {openRole === "guardrail" && (
            <AttachForm
              experimentId={experimentId}
              metrics={availableForGuardrail}
              role="guardrail"
              onCancel={() => setOpenRole(null)}
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b pb-4">
          <CardTitle>{t("app.dashboard.experiments._id.secondary_metrics")}</CardTitle>
          <CardDescription>
            {t("app.dashboard.experiments._id.optional_observational_metrics")}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4 space-y-2">
          {secondaryMetrics.length > 0 ? (
            <ul className="space-y-1 text-sm">
              {secondaryMetrics.map((m) => (
                <li key={m.metricId} className="font-mono">
                  {m.name}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              {t("app.dashboard.experiments._id.none_attached")}
            </p>
          )}
          {openRole === null && (
            <Button
              aria-label={t("app.dashboard.experiments._id.add_secondary")}
              size="sm"
              variant="outline"
              type="button"
              onClick={() => setOpenRole("secondary")}
            >
              {t("app.dashboard.experiments._id.attach")}
            </Button>
          )}
          {openRole === "secondary" && (
            <AttachForm
              experimentId={experimentId}
              metrics={availableForSecondary}
              role="secondary"
              onCancel={() => setOpenRole(null)}
            />
          )}
        </CardContent>
      </Card>
    </>
  );
}
