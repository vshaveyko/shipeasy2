"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Power, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { BigModalWizard, type WizardStep } from "@/components/shell/big-modal-wizard";
import { CodeBlock } from "@/components/ui/code-block";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createKillswitch } from "@/actions/killswitches";

const SEGMENT_RE = /^[a-z0-9](?:[a-z0-9_-]*[a-z0-9])?$/;

export interface NewKillswitchWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
}

export function NewKillswitchWizard({ open, onOpenChange, projectId }: NewKillswitchWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [folder, setFolder] = useState("");
  const [leaf, setLeaf] = useState("");
  const [description, setDescription] = useState("");
  const [value, setValue] = useState(false);
  const [switches, setSwitches] = useState<Array<{ key: string; on: boolean }>>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function resetAndClose(next: boolean) {
    if (!next) {
      setStep(0);
      setFolder("");
      setLeaf("");
      setDescription("");
      setValue(false);
      setSwitches([]);
      setError(null);
    }
    onOpenChange(next);
  }

  const folderValid = SEGMENT_RE.test(folder);
  const leafValid = SEGMENT_RE.test(leaf);
  const detailsValid = folderValid && leafValid;
  const switchesValid = (() => {
    const seen = new Set<string>();
    for (const s of switches) {
      if (!SWITCH_KEY_OK(s.key)) return false;
      if (seen.has(s.key)) return false;
      seen.add(s.key);
    }
    return true;
  })();

  const fullName = `${folder || "folder"}.${leaf || "leaf"}`;

  const steps: WizardStep[] = [
    {
      id: "details",
      label: "Details",
      title: "Identify the killswitch",
      hint: (
        <>
          Killswitches publish a <code className="font-mono">{"{ value, switches }"}</code> payload
          to every client. Pick a <code className="font-mono">folder.name</code> path — both
          immutable after publish.
        </>
      ),
      content: (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
            <FieldLabel label="Folder" required>
              <input
                type="text"
                value={folder}
                onChange={(e) => setFolder(e.target.value)}
                placeholder="checkout"
                aria-label="Folder"
                autoFocus
                className="rounded-md border border-[var(--se-line)] bg-[var(--se-bg-1)] px-2.5 py-1.5 text-[13px] font-mono outline-none focus:border-[var(--se-accent)]"
              />
            </FieldLabel>
            <span className="pb-2 text-[var(--se-fg-3)]">·</span>
            <FieldLabel label="Name" required>
              <input
                type="text"
                value={leaf}
                onChange={(e) => setLeaf(e.target.value)}
                placeholder="payments_off"
                aria-label="Name"
                className="rounded-md border border-[var(--se-line)] bg-[var(--se-bg-1)] px-2.5 py-1.5 text-[13px] font-mono outline-none focus:border-[var(--se-accent)]"
              />
            </FieldLabel>
          </div>
          <FieldLabel label="Description (optional)">
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Why this killswitch exists, who owns it"
              aria-label="Description"
              className="rounded-md border border-[var(--se-line)] bg-[var(--se-bg-1)] px-2.5 py-1.5 text-[13px] outline-none focus:border-[var(--se-accent)]"
            />
          </FieldLabel>
          {!detailsValid && (folder.length > 0 || leaf.length > 0) ? (
            <p className="text-[12px] text-[var(--se-danger)]">
              Folder + name must be lowercase letters, digits, <code className="font-mono">-</code>{" "}
              or <code className="font-mono">_</code> · no dots.
            </p>
          ) : null}
        </div>
      ),
      aside: (
        <>
          <div className="t-caps dim-2">Full key</div>
          <div className="font-mono text-[13px] text-[var(--se-fg)]">{fullName}</div>
          <p className="t-sm dim">
            Folder organises the dashboard rail. Both halves are immutable after publish.
          </p>
        </>
      ),
      isValid: () => detailsValid,
    },
    {
      id: "scope",
      label: "Scope & fallback",
      title: "Scope & fallback",
      hint: (
        <>
          The default value ships to every client. Optional switches let you override the answer per
          named key (e.g. <code className="font-mono">eu_only</code>,{" "}
          <code className="font-mono">internal</code>).
        </>
      ),
      content: (
        <div className="flex flex-col gap-5">
          <FieldLabel label="Default value">
            <ToggleRow
              checked={value}
              onChange={setValue}
              label={value ? "ON · killswitch active" : "OFF · feature live"}
              ariaLabel="Default value"
            />
          </FieldLabel>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="t-caps dim-2">Switches</span>
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
                No switches — clients receive the default for every key.
              </p>
            ) : (
              <div className="grid gap-2">
                {switches.map((s, i) => (
                  <div key={i} className="grid grid-cols-[1fr_120px_32px] items-center gap-2">
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
                      aria-label={`Remove switch ${s.key || i + 1}`}
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {!switchesValid ? (
              <p className="text-[12px] text-[var(--se-danger)]">
                Each key must be lowercase / no dots, and unique within this killswitch.
              </p>
            ) : null}
          </div>
        </div>
      ),
      aside: (
        <>
          <div className="t-caps dim-2">Eval order</div>
          <ul className="t-sm dim flex flex-col gap-1.5">
            <li>
              <span className="font-mono text-[var(--se-fg-2)]">switches[key]</span> matches → use
              switch
            </li>
            <li>else → use default value</li>
          </ul>
          <p className="t-sm dim">
            Publishes to dev · staging · prod at once. Promote per env later if needed.
          </p>
        </>
      ),
      isValid: () => detailsValid && switchesValid,
    },
    {
      id: "integrate",
      label: "Integrate",
      title: "Wire it up",
      hint: (
        <>
          Drop one of these into your codebase. The first call hydrates a local cache; later calls
          are sub-millisecond.
        </>
      ),
      content: <KillswitchIntegrate name={fullName} hasSwitches={switches.length > 0} />,
      isValid: () => detailsValid && switchesValid,
    },
  ];

  function handleSubmit() {
    if (!detailsValid || !switchesValid) {
      setError("Fix the field errors above first.");
      setStep(detailsValid ? 1 : 0);
      return;
    }
    const map: Record<string, boolean> = {};
    for (const s of switches) map[s.key] = s.on;
    startTransition(async () => {
      try {
        await createKillswitch({
          name: `${folder}.${leaf}`,
          description: description.trim() || undefined,
          value,
          switches: Object.keys(map).length > 0 ? map : undefined,
        });
        toast.success(`Created ${folder}.${leaf}`);
        resetAndClose(false);
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to create killswitch");
      }
    });
  }

  return (
    <BigModalWizard
      open={open}
      onOpenChange={resetAndClose}
      kind="killswitches"
      title="New killswitch"
      eyebrow={{ project: projectId }}
      steps={steps}
      current={step}
      onStepChange={setStep}
      onSubmit={handleSubmit}
      submitting={pending}
    />
  );
}

function FieldLabel({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-1.5">
      <label className="text-[12px] font-medium uppercase tracking-wide text-[var(--se-fg-3)]">
        {label}
        {required ? <span className="ml-1 text-[var(--se-danger)]">*</span> : null}
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
      <Power
        className="size-3"
        style={{ color: checked ? "var(--se-danger)" : "var(--se-fg-4)" }}
      />
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

function KillswitchIntegrate({ name, hasSwitches }: { name: string; hasSwitches: boolean }) {
  const snippets = useMemo(() => buildSnippets(name, hasSwitches), [name, hasSwitches]);
  return (
    <Tabs defaultValue="ts">
      <TabsList>
        <TabsTrigger value="ts">TypeScript</TabsTrigger>
        <TabsTrigger value="py">Python</TabsTrigger>
        <TabsTrigger value="go">Go</TabsTrigger>
        <TabsTrigger value="curl">cURL</TabsTrigger>
      </TabsList>
      <TabsContent value="ts" className="mt-3">
        <CodeBlock language="ts">{snippets.ts}</CodeBlock>
      </TabsContent>
      <TabsContent value="py" className="mt-3">
        <CodeBlock language="py">{snippets.py}</CodeBlock>
      </TabsContent>
      <TabsContent value="go" className="mt-3">
        <CodeBlock language="go">{snippets.go}</CodeBlock>
      </TabsContent>
      <TabsContent value="curl" className="mt-3">
        <CodeBlock language="bash">{snippets.curl}</CodeBlock>
      </TabsContent>
    </Tabs>
  );
}

function buildSnippets(name: string, hasSwitches: boolean) {
  const lookup = hasSwitches ? `'${name}', { switchKey: 'eu_only' }` : `'${name}'`;
  return {
    ts: `import { shipeasy } from '@shipeasy/sdk';

const killed = await shipeasy.killswitch(${lookup});

if (killed) {
  return showFallback();
}
return renderFeature();`,
    py: `from shipeasy import client

killed = client.killswitch(
    "${name}"${hasSwitches ? ',\n    switch_key="eu_only"' : ""},
)

if killed:
    return show_fallback()
return render_feature()`,
    go: `killed, _ := shipeasy.Killswitch(ctx, "${name}"${hasSwitches ? ', "eu_only"' : ""})

if killed {
    return showFallback()
}
return renderFeature()`,
    curl: `curl -H "Authorization: Bearer $SHIPEASY_KEY" \\
  https://api.shipeasy.dev/v1/killswitches/${encodeURIComponent(name)}/value${hasSwitches ? "?switch_key=eu_only" : ""}`,
  };
}

function SWITCH_KEY_OK(s: string): boolean {
  return SEGMENT_RE.test(s);
}
