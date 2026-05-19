"use client";

import { useMemo, useState, useTransition } from "react";
import { Shield } from "lucide-react";
import { toast } from "sonner";
import useSWR from "swr";

import { BigModalWizard, type WizardStep } from "@/components/shell/big-modal-wizard";
import { Input } from "@/components/ui/input";
import { Field, FieldHint, FieldLabel } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import { CodeBlock } from "@/components/ui/code-block";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AddGateDialog,
  StepGatesView,
  initialStack,
  type StackEntry,
  type StackSeed,
  type InitialAttribute,
} from "./[id]/gate-editor-client";
import "./[id]/gate-editor.css";
import { createGateAction } from "./actions";

const KEY_PATTERN = /^[a-z0-9][a-z0-9_-]{0,59}$/;

interface AttributeRow {
  id?: string;
  name: string;
  example?: string | null;
}

const attrFetcher = async (url: string): Promise<AttributeRow[]> => {
  const res = await fetch(url, { credentials: "same-origin" });
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
  const acc: AttributeRow[] = [];
  let page = (await res.json()) as
    | { data?: AttributeRow[]; next_cursor?: string | null }
    | AttributeRow[];
  if (Array.isArray(page)) return page;
  acc.push(...(page.data ?? []));
  let next = page.next_cursor ?? null;
  while (next) {
    const r = await fetch(`${url}?cursor=${encodeURIComponent(next)}`, {
      credentials: "same-origin",
    });
    if (!r.ok) break;
    page = (await r.json()) as { data?: AttributeRow[]; next_cursor?: string | null };
    acc.push(...(page.data ?? []));
    next = page.next_cursor ?? null;
  }
  return acc;
};

function rid() {
  return "g" + Math.random().toString(36).slice(2, 9);
}

export interface NewGateWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
}

export function NewGateWizard({ open, onOpenChange, projectId }: NewGateWizardProps) {
  const [step, setStep] = useState(0);
  const [key, setKey] = useState("");
  const [stack, setStack] = useState<StackEntry[]>(() =>
    initialStack({ initialRules: [], initialRolloutPct: 0, publicFloorPct: 0 }),
  );
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showTplPicker, setShowTplPicker] = useState(false);
  const [pending, startTransition] = useTransition();

  // Attributes only fetch once the user opens the wizard (Targeting step needs them).
  const { data: attributes } = useSWR<AttributeRow[]>(
    open ? "/api/admin/attributes" : null,
    attrFetcher,
  );

  function resetAndClose(next: boolean) {
    if (!next) {
      setStep(0);
      setKey("");
      setStack(initialStack({ initialRules: [], initialRolloutPct: 0, publicFloorPct: 0 }));
      setExpandedId(null);
      setShowTplPicker(false);
    }
    onOpenChange(next);
  }

  const trimmed = key.trim();
  const keyValid = KEY_PATTERN.test(trimmed);
  const displayKey = trimmed || "your_key";

  const attrList: InitialAttribute[] = useMemo(
    () => (attributes ?? []).map((a) => ({ k: a.name, ex: a.example ?? "" })),
    [attributes],
  );

  const publicFloor = stack[stack.length - 1];
  const publicFloorPct = publicFloor && publicFloor.type === "rollout" ? publicFloor.rolloutPct : 0;
  const movableCount = stack.filter((e) => !e.locked).length;

  // Stack handlers — same logic as GateEditorBody.
  function upd(id: string, patch: Partial<StackEntry>) {
    setStack((prev) => prev.map((e) => (e.id === id ? ({ ...e, ...patch } as StackEntry) : e)));
  }

  function move(idx: number, dir: -1 | 1) {
    const target = idx + dir;
    if (target < 0 || target >= stack.length) return;
    if (stack[target].locked || stack[idx].locked) return;
    setStack((prev) => {
      const next = prev.slice();
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  }

  function dup(idx: number) {
    if (stack[idx].locked) return;
    setStack((prev) => {
      const g = prev[idx];
      const copy: StackEntry =
        g.type === "condition"
          ? {
              ...g,
              id: rid(),
              name: (g.name ?? "Untitled") + " (copy)",
              rules: g.rules.map((r) => ({ ...r })),
            }
          : { ...g, id: rid(), name: (g.name ?? "Untitled") + " (copy)" };
      const next = prev.slice();
      next.splice(idx + 1, 0, copy);
      return next;
    });
  }

  function rm(idx: number) {
    if (stack[idx].locked) return;
    setStack((prev) => prev.filter((_, i) => i !== idx));
  }

  function addEntry(entry: StackSeed) {
    const lockedIdx = stack.findIndex((e) => e.locked);
    const newEntry = { ...entry, id: rid() } as StackEntry;
    setStack((prev) => {
      const next = prev.slice();
      next.splice(lockedIdx >= 0 ? lockedIdx : next.length, 0, newEntry);
      return next;
    });
    setExpandedId(newEntry.id);
    setShowTplPicker(false);
  }

  const steps: WizardStep[] = [
    {
      id: "details",
      label: "Details",
      title: "Identify the gate",
      hint: (
        <>
          The key is locked after the first publish — pick a stable name like{" "}
          <code className="font-mono text-[var(--se-fg-2)]">premium_features</code>. SDK consumers
          will fetch with{" "}
          <code className="font-mono text-[var(--se-fg-2)]">shipeasy.gate(&apos;…&apos;)</code>.
        </>
      ),
      content: (
        <Field>
          <FieldLabel htmlFor="new-gate-key" required>
            Key
          </FieldLabel>
          <Input
            id="new-gate-key"
            name="key"
            placeholder="premium_features"
            className="font-mono"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            pattern="[a-z0-9][a-z0-9_\-]{0,59}"
            autoFocus
          />
          <FieldHint>
            Lowercase letters, digits, <code className="font-mono">-</code> or{" "}
            <code className="font-mono">_</code>. Max 64 characters.
          </FieldHint>
        </Field>
      ),
      aside: (
        <>
          <div className="t-caps dim-2">What happens next</div>
          <p className="t-sm dim">
            Description, folder and owner are set in the full editor after create.
          </p>
        </>
      ),
      isValid: () => keyValid,
    },
    {
      id: "targeting",
      label: "Targeting",
      title: "Compose the gate stack",
      hint: (
        <>
          If any gate above passes, the gatekeeper returns <b>true</b> · otherwise falls through to{" "}
          <b>public {(publicFloorPct / 100).toFixed(0)}%</b>
        </>
      ),
      content: attributes ? (
        <StepGatesView
          stack={stack}
          expandedId={expandedId}
          setExpandedId={setExpandedId}
          attributes={attrList}
          publicFloorPct={publicFloorPct}
          movableCount={movableCount}
          totalCount={stack.length}
          onAddEntry={addEntry}
          onMove={move}
          onDup={dup}
          onRm={rm}
          onUpdEntry={upd}
          onPickTemplate={() => setShowTplPicker(true)}
          askClaudeEnabled={false}
          hideEvalFlow
          className="gke-embed"
        />
      ) : (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-[120px] w-full" />
          <Skeleton className="h-[120px] w-full" />
        </div>
      ),
      isValid: () => keyValid,
    },
    {
      id: "preview",
      label: "Preview",
      title: "Test against a fixture",
      hint: <>Confirm the shape. Submit creates the gate and opens the full editor.</>,
      content: (
        <div className="flex flex-col gap-3">
          <div className="rounded-[var(--radius-md)] border border-[var(--se-line)] bg-[var(--se-bg-2)] p-4">
            <div className="t-caps dim-2 mb-1.5">Key</div>
            <div className="flex items-center gap-2">
              <Shield className="size-3.5 text-[var(--se-info)]" />
              <span className="font-mono text-[14px] text-[var(--se-fg)]">{trimmed || "—"}</span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <SummaryTile label="Public floor" value={`${(publicFloorPct / 100).toFixed(0)}%`} />
            <SummaryTile
              label="Conditions"
              value={String(stack.filter((e) => e.type === "condition" && !e.locked).length)}
            />
            <SummaryTile
              label="Rollouts"
              value={String(stack.filter((e) => e.type === "rollout" && !e.locked).length)}
            />
          </div>
        </div>
      ),
      aside: (
        <>
          <div className="t-caps dim-2">SDK snippet</div>
          <pre className="t-mono-xs overflow-x-auto rounded-[var(--radius-sm)] border border-[var(--se-line)] bg-[var(--se-bg-1)] p-2.5 text-[var(--se-fg-2)]">
            {`const on = await shipeasy.gate(\n  "${displayKey}",\n  { user_id }\n);`}
          </pre>
          <p className="t-sm dim">
            Returns <code className="font-mono">true</code> for matched/in-rollout users.
          </p>
        </>
      ),
      isValid: () => keyValid,
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
      content: <GateIntegrate gateKey={displayKey} />,
      aside: (
        <>
          <div className="t-caps dim-2">After submit</div>
          <ul className="t-sm dim flex flex-col gap-1.5">
            <li>Lands you in the full editor</li>
            <li>Fixture preview + Ask Claude</li>
            <li>Description, folder, owner</li>
          </ul>
        </>
      ),
      isValid: () => keyValid,
    },
  ];

  function handleSubmit() {
    if (!keyValid) {
      setStep(0);
      return;
    }
    startTransition(async () => {
      const fd = new FormData();
      fd.append("key", trimmed);
      fd.append("rollout_pct", String(publicFloorPct / 100));
      fd.append("stack", JSON.stringify(stack));
      try {
        await createGateAction(fd);
      } catch (err) {
        const digest = (err as { digest?: string })?.digest;
        if (typeof digest === "string" && digest.startsWith("NEXT_REDIRECT")) throw err;
        toast.error(err instanceof Error ? err.message : "Failed to create gate");
      }
    });
  }

  return (
    <>
      <BigModalWizard
        open={open}
        onOpenChange={resetAndClose}
        kind="gates"
        title="Name your gatekeeper"
        eyebrow={{ project: projectId }}
        steps={steps}
        current={step}
        onStepChange={setStep}
        onSubmit={handleSubmit}
        submitLabel="Create gate"
        submitting={pending}
      />
      {showTplPicker ? (
        <AddGateDialog
          attributes={attrList}
          onClose={() => setShowTplPicker(false)}
          onPick={(seed) => addEntry(seed)}
        />
      ) : null}
    </>
  );
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--se-line)] bg-[var(--se-bg-2)] px-4 py-3">
      <div className="t-caps dim-2 mb-1">{label}</div>
      <div
        className="font-mono text-[15px] text-[var(--se-fg)]"
        style={{ fontVariantNumeric: "tabular-nums" }}
      >
        {value}
      </div>
    </div>
  );
}

function GateIntegrate({ gateKey }: { gateKey: string }) {
  const snippets = useMemo(() => buildSnippets(gateKey), [gateKey]);

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

function buildSnippets(key: string) {
  return {
    ts: `import { shipeasy } from '@shipeasy/sdk';

const passes = await shipeasy.gate('${key}', {
  user_id: ctx.user.id,
  attributes: {
    country: ctx.user.country,
    plan: ctx.user.plan,
  },
});

if (passes) {
  return renderGatedFeature();
}
return renderDefault();`,
    py: `from shipeasy import client

passes = client.gate(
    "${key}",
    user_id=ctx.user.id,
    attributes={
        "country": ctx.user.country,
        "plan": ctx.user.plan,
    },
)

if passes:
    return render_gated_feature()
return render_default()`,
    go: `passes, _ := shipeasy.Gate(ctx, "${key}", &shipeasy.Subject{
    UserID: ctx.User.ID,
    Attributes: map[string]any{
        "country": ctx.User.Country,
        "plan":    ctx.User.Plan,
    },
})

if passes {
    return renderGatedFeature()
}
return renderDefault()`,
    curl: `curl -H "Authorization: Bearer $SHIPEASY_KEY" \\
  -H "Content-Type: application/json" \\
  -X POST https://api.shipeasy.dev/v1/gates/${key}/evaluate \\
  -d '{ "user_id": "u_123", "attributes": { "country": "US" } }'`,
  };
}
