"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/ui/status-badge";
import type { ConfigActivity, ConfigDetail } from "@/lib/handlers/configs";
import { CONFIG_ENVS } from "@/components/dashboard/env-tabs";
import { ConfigEditorBody } from "./[id]/editor";

interface JsonSchemaField {
  type?: string;
  description?: string;
}

export function ReadConfigView({
  initial,
  initialActivity,
  hideCrumb,
  onDeleted,
}: {
  initial: ConfigDetail;
  initialActivity: ConfigActivity[];
  hideCrumb?: boolean;
  onDeleted?: () => void;
}) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <div className="flex h-full min-h-0 flex-col">
        <div className="flex shrink-0 items-center gap-2 border-b border-[var(--se-line)] bg-[var(--se-bg-1)] px-6 py-2">
          <span className="t-mono-xs dim-2 mr-auto">Editing</span>
          <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
            Done
          </Button>
        </div>
        <div className="min-h-0 flex-1">
          <ConfigEditorBody
            initial={initial}
            initialActivity={initialActivity}
            hideCrumb={hideCrumb}
            onDeleted={onDeleted}
          />
        </div>
      </div>
    );
  }

  const schemaProps =
    (initial.schema?.properties as Record<string, JsonSchemaField> | undefined) ?? {};
  const fieldCount = Object.keys(schemaProps).length;
  const envCount = Object.keys(initial.envs ?? {}).length;
  const draftCount = Object.keys(initial.drafts ?? {}).length;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center gap-3 border-b border-[var(--se-line)] bg-[var(--se-bg-1)] px-6 py-3">
        {hideCrumb ? null : (
          <div className="crumbs flex items-center gap-2 font-mono text-[13px] text-[var(--se-fg-3)]">
            <span>Configs</span>
            <span className="text-[var(--se-fg-4)]">/</span>
            <span className="text-foreground">{initial.name}</span>
          </div>
        )}
        <div
          className={
            hideCrumb ? "ml-auto flex items-center gap-2" : "ml-auto flex items-center gap-2"
          }
        >
          <Button
            size="sm"
            variant="outline"
            onClick={() => setEditing(true)}
            aria-label="Edit config"
          >
            <Pencil className="size-3" /> Edit
          </Button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-6">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <div className="t-mono-xs text-[var(--se-fg-3)]">config key</div>
            <div className="font-mono text-[18px] font-medium mt-1">{initial.name}</div>
          </div>
          <span className="se-badge">
            {fieldCount} {fieldCount === 1 ? "field" : "fields"}
          </span>
          <StatusBadge tone={envCount === 3 ? "success" : envCount === 0 ? "neutral" : "info"}>
            {envCount} of 3 envs
          </StatusBadge>
          {draftCount > 0 ? <StatusBadge tone="warn">{draftCount} draft</StatusBadge> : null}
        </div>

        {initial.description ? (
          <p className="text-[13px] text-[var(--se-fg-2)]">{initial.description}</p>
        ) : null}

        <div>
          <div className="t-caps dim-2 mb-2">Schema</div>
          {fieldCount === 0 ? (
            <p className="rounded-md border border-dashed border-[var(--se-line)] px-3 py-3 text-center text-[12px] text-[var(--se-fg-3)]">
              No fields declared.
            </p>
          ) : (
            <div className="grid gap-1.5">
              {Object.entries(schemaProps).map(([k, v]) => (
                <div
                  key={k}
                  className="grid grid-cols-[1fr_120px_2fr] items-center gap-3 rounded-md border border-[var(--se-line)] bg-[var(--se-bg-1)] px-3 py-2"
                >
                  <span className="font-mono text-[12.5px] text-[var(--se-fg)]">{k}</span>
                  <span className="font-mono text-[11px] uppercase tracking-wider text-[var(--se-fg-3)]">
                    {v.type ?? "any"}
                  </span>
                  <span className="text-[12px] text-[var(--se-fg-2)] truncate">
                    {v.description ?? ""}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="t-caps dim-2 mb-2">Published values</div>
          <Tabs defaultValue="prod">
            <TabsList>
              {CONFIG_ENVS.map((env) => (
                <TabsTrigger key={env} value={env}>
                  {env}
                </TabsTrigger>
              ))}
            </TabsList>
            {CONFIG_ENVS.map((env) => {
              const value = initial.values?.[env];
              const meta = initial.envs?.[env];
              return (
                <TabsContent key={env} value={env} className="mt-3">
                  <div className="rounded-[var(--radius-md)] border border-[var(--se-line)] bg-[var(--se-bg-2)] p-4">
                    {meta ? (
                      <div className="flex flex-col gap-3">
                        <div className="flex flex-wrap items-center gap-3 text-[12px] text-[var(--se-fg-3)]">
                          <span className="font-mono">v{meta.version}</span>
                          <span className="font-mono">{meta.publishedAt?.slice(0, 10)}</span>
                          <span className="ml-auto">by {meta.publishedBy}</span>
                        </div>
                        <pre className="overflow-x-auto rounded-md border border-[var(--se-line)] bg-[var(--se-bg-1)] p-3 font-mono text-[12px] text-[var(--se-fg-2)]">
                          {value === undefined ? "—" : JSON.stringify(value, null, 2)}
                        </pre>
                      </div>
                    ) : (
                      <span className="t-sm dim-2">No publish to {env} yet.</span>
                    )}
                  </div>
                </TabsContent>
              );
            })}
          </Tabs>
        </div>
      </div>
    </div>
  );
}
