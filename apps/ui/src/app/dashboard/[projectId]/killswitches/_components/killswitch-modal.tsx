"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { createKillswitch, updateKillswitch } from "@/actions/killswitches";

export type KillswitchModalProps =
  | {
      open: boolean;
      onOpenChange: (v: boolean) => void;
      mode: "create";
      initial?: never;
    }
  | {
      open: boolean;
      onOpenChange: (v: boolean) => void;
      mode: "edit";
      initial: {
        id: string;
        name: string;
        description: string | null;
        value: boolean;
        switches: Record<string, boolean>;
      };
    };

const SEGMENT_RE = /^[a-z0-9](?:[a-z0-9_-]*[a-z0-9])?$/;

function splitName(name: string): { folder: string; leaf: string } {
  const idx = name.indexOf(".");
  if (idx === -1) return { folder: "", leaf: name };
  return { folder: name.slice(0, idx), leaf: name.slice(idx + 1) };
}

export function KillswitchModal(props: KillswitchModalProps) {
  const { open, onOpenChange, mode } = props;
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [folder, setFolder] = useState("");
  const [leaf, setLeaf] = useState("");
  const [description, setDescription] = useState("");
  const [value, setValue] = useState(false);
  const [switches, setSwitches] = useState<Array<{ key: string; on: boolean }>>([]);
  const [error, setError] = useState<string | null>(null);

  // Seed state when opening, clear when closing.
  useEffect(() => {
    if (!open) {
      setError(null);
      return;
    }
    if (mode === "edit") {
      const { folder: f, leaf: l } = splitName(props.initial.name);
      setFolder(f);
      setLeaf(l);
      setDescription(props.initial.description ?? "");
      setValue(props.initial.value);
      setSwitches(Object.entries(props.initial.switches).map(([key, on]) => ({ key, on })));
    } else {
      setFolder("");
      setLeaf("");
      setDescription("");
      setValue(false);
      setSwitches([]);
    }
  }, [open, mode, props]);

  function validate(): string | null {
    if (!SEGMENT_RE.test(folder)) return "Folder must be lowercase, no dots.";
    if (!SEGMENT_RE.test(leaf)) return "Name must be lowercase, no dots.";
    const seenKeys = new Set<string>();
    for (const s of switches) {
      if (!SEGMENT_RE.test(s.key)) return `Switch key '${s.key}' is invalid (lowercase, no dots).`;
      if (seenKeys.has(s.key)) return `Switch key '${s.key}' duplicated.`;
      seenKeys.add(s.key);
    }
    return null;
  }

  function submit() {
    const err = validate();
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    const switchesMap: Record<string, boolean> = {};
    for (const s of switches) switchesMap[s.key] = s.on;

    startTransition(async () => {
      try {
        if (mode === "create") {
          await createKillswitch({
            name: `${folder}.${leaf}`,
            description: description.trim() || undefined,
            value,
            switches: Object.keys(switchesMap).length > 0 ? switchesMap : undefined,
          });
        } else {
          await updateKillswitch(props.initial.id, {
            description: description.trim() || null,
            value,
            switches: switchesMap,
          });
        }
        onOpenChange(false);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to save killswitch");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "New killswitch" : "Edit killswitch"}</DialogTitle>
          <DialogDescription>
            Killswitches deliver{" "}
            <code className="font-mono text-[12px]">{`{ value, switches }`}</code> to clients.
            Switch entries take precedence over the default value.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
            <Field label="Folder">
              <input
                type="text"
                value={folder}
                onChange={(e) => setFolder(e.target.value)}
                placeholder="checkout"
                disabled={mode === "edit"}
                aria-label="Folder"
                className="rounded-md border border-[var(--se-line)] bg-[var(--se-bg-1)] px-2.5 py-1.5 text-[13px] font-mono outline-none focus:border-[var(--se-accent)] disabled:bg-[var(--se-bg-2)] disabled:text-[var(--se-fg-3)]"
              />
            </Field>
            <span className="pb-2 text-[var(--se-fg-3)]">·</span>
            <Field label="Name">
              <input
                type="text"
                value={leaf}
                onChange={(e) => setLeaf(e.target.value)}
                placeholder="payments_off"
                disabled={mode === "edit"}
                aria-label="Name"
                className="rounded-md border border-[var(--se-line)] bg-[var(--se-bg-1)] px-2.5 py-1.5 text-[13px] font-mono outline-none focus:border-[var(--se-accent)] disabled:bg-[var(--se-bg-2)] disabled:text-[var(--se-fg-3)]"
              />
            </Field>
          </div>

          <Field label="Description (optional)">
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              aria-label="Description"
              className="rounded-md border border-[var(--se-line)] bg-[var(--se-bg-1)] px-2.5 py-1.5 text-[13px] outline-none focus:border-[var(--se-accent)]"
            />
          </Field>

          <Field label="Default value">
            <ToggleRow
              checked={value}
              onChange={setValue}
              label={value ? "ON" : "OFF"}
              ariaLabel="Default value"
            />
          </Field>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-[12px] font-medium uppercase tracking-wide text-[var(--se-fg-3)]">
                Switches
              </label>
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
        </div>

        <DialogFooter>
          <DialogClose
            render={
              <Button variant="ghost" size="sm" type="button" disabled={pending}>
                Cancel
              </Button>
            }
          />
          <Button size="sm" type="button" onClick={submit} disabled={pending}>
            {pending ? "Saving…" : mode === "create" ? "Create" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <label className="text-[12px] font-medium uppercase tracking-wide text-[var(--se-fg-3)]">
        {label}
      </label>
      {children}
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
