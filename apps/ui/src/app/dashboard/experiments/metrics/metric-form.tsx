"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createMetricAction } from "./actions";

export function MetricForm() {
  const [aggregation, setAggregation] = useState("count_users");
  const needsValuePath = aggregation === "sum" || aggregation === "avg";

  return (
    <Card>
      <CardHeader className="border-b pb-4">
        <CardTitle>New metric</CardTitle>
        <CardDescription>
          Define a metric by picking an event and aggregation type.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-4">
        <form action={createMetricAction} className="grid gap-3 sm:grid-cols-4">
          <div className="grid gap-1.5">
            <Label htmlFor="metric-name">Name</Label>
            <Input
              id="metric-name"
              name="name"
              placeholder="purchase-rate"
              className="font-mono"
              required
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="metric-event">Event name</Label>
            <Input
              id="metric-event"
              name="event_name"
              placeholder="purchase"
              className="font-mono"
              required
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="metric-agg">Aggregation</Label>
            <select
              id="metric-agg"
              name="aggregation"
              value={aggregation}
              onChange={(e) => setAggregation(e.target.value)}
              className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <option value="count_users">count_users</option>
              <option value="count_events">count_events</option>
              <option value="sum">sum</option>
              <option value="avg">avg</option>
              <option value="retention_Nd">retention_Nd</option>
            </select>
          </div>
          {needsValuePath && (
            <div className="grid gap-1.5">
              <Label htmlFor="metric-value-path">Value path</Label>
              <Input
                id="metric-value-path"
                name="value_path"
                placeholder="amount"
                className="font-mono"
              />
            </div>
          )}
          <div className="grid gap-1.5">
            <Label htmlFor="metric-winsorize">Winsorize %</Label>
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
            <Label htmlFor="metric-mde">Min detectable effect</Label>
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
              New metric
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
