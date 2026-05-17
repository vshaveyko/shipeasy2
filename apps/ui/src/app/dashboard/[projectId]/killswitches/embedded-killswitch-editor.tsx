"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { updateKillswitch } from "@/actions/killswitches";
import type { KillswitchRow } from "./killswitches-content";

type EnvKey = "dev" | "staging" | "prod";

const ENVS: EnvKey[] = ["dev", "staging", "prod"];

const SWITCH_KEY_RE = /^[a-z0-9](?:[a-z0-9_-]*[a-z0-9])?$/;

export function EmbeddedKillswitchEditor({ row }: { row: KillswitchRow }) {
  // Seed from prod (or staging/dev fallback) — same precedence as the row's display badge.
  const seed = row.envs.prod ?? row.envs.staging ?? row.envs.dev;
  const [description, setDescription] = useState(row.description ?? "");
  const [value, setValue] = useState<boolean>(seed?.value ?? false);
  const [switches, setSwitches] = useState<Array<{ key: string; on: boolean }>>(
    Object.entries(seed?.switches ?? {}).map(([key, on]) => ({ key, on })),
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function validate(): string | null {
    const seen = new Set<string>();
    for (const s of switches) {
      if (!SWITCH_KEY_RE.test(s.key))
        return `Switch key '${s.key}' is invalid (lowercase, no dots).`;
      if (seen.has(s.key)) return `Switch key '${s.key}' duplicated.`;
      seen.add(s.key);
    }
    return null;
  }

  function save() {
    const err = validate();
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    const map: Record<string, boolean> = {};
    for (const s of switches) map[s.key] = s.on;
    startTransition(async () => {
      try {
        await updateKillswitch(row.id, {
          description: description.trim() || null,
          value,
          switches: map,
        });
        toast.success("Killswitch saved");
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Save failed");
      }
    });
  }

  return (
    <div className="flex min-w-0 flex-col gap-5 px-6 py-5">
      {/* Per-env quick view */}
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
              <div className="rounded-[var(--radius-md)] border border-[var(--se-line)] bg-[var(--se-bg-2)] p-3">
                <div className="t-caps dim-2 mb-1.5">Published {env} state</div>
                {envState ? (
                  <div className="flex flex-wrap items-center gap-3">
                    <span className={`se-badge ${envState.value ? "se-badge-killed" : ""}`}>
                      <span className="dot" /> {envState.value ? "ON" : "OFF"}
                    </span>
                    <span className="t-mono-xs dim">
                      {envState.switches ? Object.keys(envState.switches).length : 0} switches · v
                      {envState.version}
                    </span>
                    <span className="t-mono-xs dim-2 ml-auto">
                      {envState.publishedAt?.slice(0, 10)}
                    </span>
                  </div>
                ) : (
                  <span className="t-sm dim-2">No publish to {env} yet.</span>
                )}
              </div>
            </TabsContent>
          );
        })}
      </Tabs>

      {/* Edit form — writes to all envs at once (matches current update semantics). */}
      <div className="flex flex-col gap-3">
        <label className="t-caps dim-2 block">Description</label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Why this killswitch exists, who owns it"
          className="rounded-md border border-[var(--se-line)] bg-[var(--se-bg-1)] px-2.5 py-1.5 text-[13px] outline-none focus:border-[var(--se-accent)]"
          aria-label="Description"
        />
      </div>

      <div className="flex flex-col gap-3">
        <label className="t-caps dim-2 block">Default value</label>
        <ToggleRow
          checked={value}
          onChange={setValue}
          label={value ? "ON" : "OFF"}
          ariaLabel="Default value"
        />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label className="t-caps dim-2 block">Switches</label>
          <button
            type="button"
            onClick={() => setSwitches((s) => [...s, { key: "", on: true }])}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[12px] text-[var(--se-fg-2)] hover:bg-[var(--se-bg-2)]"
          >
            <Plus className="size-3" /> Add switch
          </button>
        </div>
        {switches.length === 0 ? (
          <p className="rounded-md border border-dashed border-[var(--se-line)] px-3 py-4 text-center text-[12px] text-[var(--se-fg-3)]">
            No switches. The client receives the default value for everything.
          </p>
        ) : (
          <div className="grid gap-2">
            {switches.map((s, i) => (
              <div key={i} className="grid grid-cols-[1fr_88px_32px] items-center gap-2">
                <input
                  type="text"
                  value={s.key}
                  onChange={(e) =>
                    setSwitches((arr) =>
                      arr.map((x, j) => (j === i ? { ...x, key: e.target.value } : x)),
                    )
                  }
                  placeholder="eu_only"
                  aria-label={`Switch key ${i + 1}`}
                  className="rounded-md border border-[var(--se-line)] bg-[var(--se-bg-1)] px-2.5 py-1.5 text-[12px] font-mono outline-none focus:border-[var(--se-accent)]"
                />
                <ToggleRow
                  checked={s.on}
                  onChange={(v) =>
                    setSwitches((arr) => arr.map((x, j) => (j === i ? { ...x, on: v } : x)))
                  }
                  label={s.on ? "ON" : "OFF"}
                  ariaLabel={s.key ? `Switch value for ${s.key}` : `Switch ${i + 1} value`}
                />
                <button
                  type="button"
                  onClick={() => setSwitches((arr) => arr.filter((_, j) => j !== i))}
                  className="grid size-8 place-items-center rounded-md text-[var(--se-fg-3)] hover:bg-[var(--se-bg-2)] hover:text-[var(--se-danger)]"
                  aria-label={`Remove switch ${s.key}`}
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {error ? (
        <div className="rounded-md border border-[var(--se-danger)]/30 bg-[var(--se-danger)]/5 px-3 py-2 text-[12px] text-[var(--se-danger)]">
          {error}
        </div>
      ) : null}

      <div className="flex justify-end gap-2 border-t border-[var(--se-line)] pt-3">
        <Button size="sm" type="button" onClick={save} disabled={pending}>
          {pending ? "Saving…" : "Save killswitch"}
        </Button>
      </div>
    </div>
  );
}

function ToggleRow({
  checked,
  onChange,
  label,
  ariaLabel,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  ariaLabel?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="inline-flex items-center gap-2 rounded-md border border-[var(--se-line-2)] bg-[var(--se-bg-2)] px-2.5 py-1 text-[12px] font-mono"
      aria-pressed={checked}
      aria-label={ariaLabel}
    >
      <span
        className="relative inline-block h-4 w-7 rounded-full transition-colors"
        style={{ background: checked ? "var(--se-accent)" : "var(--se-fg-4)" }}
      >
        <span
          className="absolute top-0.5 left-0.5 size-3 rounded-full bg-white transition-transform"
          style={{ transform: checked ? "translateX(12px)" : "translateX(0)" }}
        />
      </span>
      {label}
    </button>
  );
}
