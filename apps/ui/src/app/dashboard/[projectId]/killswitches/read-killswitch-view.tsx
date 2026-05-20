"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmbeddedKillswitchEditor } from "./embedded-killswitch-editor";
import type { KillswitchRow } from "./killswitches-content";

type EnvKey = "dev" | "staging" | "prod";
const ENVS: EnvKey[] = ["dev", "staging", "prod"];

export function ReadKillswitchView({ row }: { row: KillswitchRow }) {
  const [editing, setEditing] = useState(false);
  if (editing) {
    return (
      <div className="flex min-w-0 flex-col">
        <div className="flex items-center justify-end gap-2 border-b border-[var(--se-line)] bg-[var(--se-bg-1)] px-6 py-2">
          <span className="t-mono-xs dim-2 mr-auto">Editing</span>
          <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
            Done
          </Button>
        </div>
        <EmbeddedKillswitchEditor row={row} />
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-5 px-6 py-5">
      <div className="flex items-center justify-end">
        <Button
          size="sm"
          variant="outline"
          onClick={() => setEditing(true)}
          aria-label="Edit killswitch"
        >
          <Pencil className="size-3" /> Edit
        </Button>
      </div>

      {row.description ? (
        <p className="text-[13px] text-[var(--se-fg-2)]">{row.description}</p>
      ) : (
        <p className="text-[12px] text-[var(--se-fg-4)] italic">No description.</p>
      )}

      <Tabs defaultValue="prod">
        <TabsList>
          {ENVS.map((env) => (
            <TabsTrigger key={env} value={env}>
              {env}
            </TabsTrigger>
          ))}
        </TabsList>
        {ENVS.map((env) => {
          const envState = row.envs[env];
          return (
            <TabsContent key={env} value={env} className="mt-3">
              <div className="rounded-[var(--radius-md)] border border-[var(--se-line)] bg-[var(--se-bg-2)] p-4">
                {envState ? (
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <StatusBadge tone={envState.value ? "danger" : "success"}>
                        {envState.value ? "ON" : "OFF"}
                      </StatusBadge>
                      <span className="t-mono-xs dim">v{envState.version}</span>
                      <span className="t-mono-xs dim-2 ml-auto">
                        published {envState.publishedAt?.slice(0, 10)}
                      </span>
                    </div>
                    <div>
                      <div className="t-caps dim-2 mb-2">Switches</div>
                      {envState.switches && Object.keys(envState.switches).length > 0 ? (
                        <div className="grid gap-1.5">
                          {Object.entries(envState.switches).map(([k, on]) => (
                            <div
                              key={k}
                              className="grid grid-cols-[1fr_60px] items-center gap-2 rounded-md border border-[var(--se-line)] bg-[var(--se-bg-1)] px-3 py-2"
                            >
                              <span className="font-mono text-[12.5px] text-[var(--se-fg)]">
                                {k}
                              </span>
                              <StatusBadge tone={on ? "danger" : "success"}>
                                {on ? "ON" : "OFF"}
                              </StatusBadge>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="rounded-md border border-dashed border-[var(--se-line)] px-3 py-3 text-center text-[12px] text-[var(--se-fg-3)]">
                          No switches. Clients receive the default value.
                        </p>
                      )}
                    </div>
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
  );
}
