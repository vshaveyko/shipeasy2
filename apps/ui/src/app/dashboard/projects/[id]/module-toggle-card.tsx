"use client";

import { useState, useTransition, type ReactNode } from "react";
import type { ProjectModuleKey } from "@shipeasy/core";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { toggleModuleAction } from "./actions";

interface Props {
  moduleKey: ProjectModuleKey;
  title: string;
  description: string;
  icon: ReactNode;
  initialEnabled: boolean;
}

export function ModuleToggleCard({ moduleKey, title, description, icon, initialEnabled }: Props) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const onToggle = (next: boolean) => {
    setEnabled(next);
    setError(null);
    startTransition(async () => {
      const result = await toggleModuleAction(moduleKey, next);
      if (!result.ok) {
        // Revert and surface — server-side failures (auth, DB) shouldn't leave
        // the UI lying about the persisted state.
        setEnabled(!next);
        setError(result.error ?? "Save failed");
      }
    });
  };

  return (
    <Card className={enabled ? undefined : "opacity-70"}>
      <CardHeader className="flex flex-row items-start gap-4 space-y-0 pb-3">
        <div className="grid size-9 shrink-0 place-items-center rounded-md border bg-muted/50 text-muted-foreground">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <CardTitle className="text-base">{title}</CardTitle>
          <CardDescription className="mt-0.5 text-xs">{description}</CardDescription>
        </div>
        <Switch
          checked={enabled}
          onCheckedChange={onToggle}
          disabled={isPending}
          label={`Enable ${title}`}
        />
      </CardHeader>
      <CardContent className="pt-0 pb-3">
        <div className="flex items-center justify-between text-[11px]">
          <span
            className={
              enabled
                ? "font-medium uppercase tracking-wider text-emerald-500"
                : "font-medium uppercase tracking-wider text-muted-foreground"
            }
          >
            {enabled ? "Enabled" : "Disabled"}
          </span>
          {error ? (
            <span className="text-destructive">{error}</span>
          ) : isPending ? (
            <span className="text-muted-foreground">Saving…</span>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
