"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { addExperimentMetricAction } from "./actions";

interface Metric {
  id: string;
  name: string;
}

interface Props {
  experimentId: string;
  metrics: Metric[];
  role: "guardrail" | "secondary";
}

export function MetricAttachForm({ experimentId, metrics, role }: Props) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <Button size="sm" variant="outline" type="button" onClick={() => setOpen(true)}>
        {role === "guardrail" ? "Add guardrail" : "Add secondary metric"}
      </Button>
    );
  }

  return (
    <form action={addExperimentMetricAction} className="flex items-end gap-3 mt-2">
      <input type="hidden" name="experiment_id" value={experimentId} />
      <input type="hidden" name="role" value={role} />
      <div className="grid gap-1.5">
        <Label htmlFor="attach-metric">Metric</Label>
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
        Attach
      </Button>
      <Button size="sm" variant="ghost" type="button" onClick={() => setOpen(false)}>
        Cancel
      </Button>
    </form>
  );
}
