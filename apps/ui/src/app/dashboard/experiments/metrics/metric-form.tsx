"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createMetricAction } from "./actions";
import { useShipEasyI18n } from "@shipeasy/react";

export function MetricForm() {
  const { t } = useShipEasyI18n();
  const [aggregation, setAggregation] = useState("count_users");
  const needsValuePath = aggregation === "sum" || aggregation === "avg";

  return (
    <Card>
      <CardHeader className="border-b pb-4">
        <CardTitle>{t("app.dashboard.experiments.metrics.new_metric")}</CardTitle>
        <CardDescription>
          {t(
            "app.dashboard.experiments.metrics.define_a_metric_by_picking_an_event_and_aggregation_type",
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-4">
        <form action={createMetricAction} className="grid gap-3 sm:grid-cols-4">
          <div className="grid gap-1.5">
            <Label htmlFor="metric-name">{t("common.name")}</Label>
            <Input
              id="metric-name"
              name="name"
              placeholder={t("app.dashboard.experiments.metrics.purchase_rate")}
              className="font-mono"
              required
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="metric-event">
              {t("app.dashboard.experiments.metrics.event_name")}
            </Label>
            <Input
              id="metric-event"
              name="event_name"
              placeholder={t("app.dashboard.experiments.metrics.purchase")}
              className="font-mono"
              required
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="metric-agg">{t("app.dashboard.experiments.metrics.aggregation")}</Label>
            <select
              id="metric-agg"
              name="aggregation"
              value={aggregation}
              onChange={(e) => setAggregation(e.target.value)}
              className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <option value="count_users">
                {t("app.dashboard.experiments.metrics.count_users")}
              </option>
              <option value="count_events">
                {t("app.dashboard.experiments.metrics.count_events")}
              </option>
              <option value="sum">sum</option>
              <option value="avg">avg</option>
              <option value="retention_Nd">
                {t("app.dashboard.experiments.metrics.retention_nd")}
              </option>
            </select>
          </div>
          {needsValuePath && (
            <div className="grid gap-1.5">
              <Label htmlFor="metric-value-path">
                {t("app.dashboard.experiments.metrics.value_path")}
              </Label>
              <Input
                id="metric-value-path"
                name="value_path"
                placeholder={t("app.dashboard.experiments.metrics.amount")}
                className="font-mono"
              />
            </div>
          )}
          <div className="grid gap-1.5">
            <Label htmlFor="metric-winsorize">
              {t("app.dashboard.experiments.metrics.winsorize")}
            </Label>
            <Input
              id="metric-winsorize"
              name="winsorize_pct"
              type="number"
              min={50}
              max={100}
              defaultValue={99}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="metric-mde">
              {t("app.dashboard.experiments.metrics.min_detectable_effect")}
            </Label>
            <Input
              id="metric-mde"
              name="min_detectable_effect"
              type="number"
              step="0.001"
              placeholder="0.05"
            />
          </div>
          <div className="flex items-end">
            <Button size="sm" type="submit">
              {t("app.dashboard.experiments.metrics.new_metric")}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
