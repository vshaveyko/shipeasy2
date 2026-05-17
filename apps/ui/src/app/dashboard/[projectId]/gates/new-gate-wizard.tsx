"use client";

import { useState, useTransition } from "react";
import { Shield } from "lucide-react";
import { toast } from "sonner";

import { BigModalWizard, type WizardStep } from "@/components/shell/big-modal-wizard";
import { Input } from "@/components/ui/input";
import { Field, FieldHint, FieldLabel } from "@/components/ui/field";
import { createGateAction } from "./actions";

const KEY_PATTERN = /^[a-z0-9][a-z0-9_-]{0,59}$/;

export interface NewGateWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
}

export function NewGateWizard({ open, onOpenChange, projectId }: NewGateWizardProps) {
  const [step, setStep] = useState(0);
  const [key, setKey] = useState("");
  const [pending, startTransition] = useTransition();

  function resetAndClose(next: boolean) {
    if (!next) {
      setStep(0);
      setKey("");
    }
    onOpenChange(next);
  }

  const trimmed = key.trim();
  const keyValid = KEY_PATTERN.test(trimmed);

  const steps: WizardStep[] = [
    {
      id: "identity",
      label: "Identity",
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
            Creating the gate lands you in the full editor where you can stack rollouts, conditions,
            and the public floor.
          </p>
        </>
      ),
      isValid: () => keyValid,
    },
    {
      id: "preview",
      label: "Preview",
      hint: <>Confirm the key. The gate ships paused at 0% so nothing changes for users yet.</>,
      content: (
        <div className="flex flex-col gap-3">
          <div className="rounded-[var(--radius-md)] border border-[var(--se-line)] bg-[var(--se-bg-2)] p-4">
            <div className="t-caps dim-2 mb-1.5">Key</div>
            <div className="flex items-center gap-2">
              <Shield className="size-3.5 text-[var(--se-info)]" />
              <span className="font-mono text-[14px] text-[var(--se-fg)]">{trimmed || "—"}</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <SummaryTile label="Initial rollout" value="0%" />
            <SummaryTile label="State" value="Paused" />
          </div>
        </div>
      ),
      aside: (
        <>
          <div className="t-caps dim-2">SDK snippet</div>
          <pre className="t-mono-xs overflow-x-auto rounded-[var(--radius-sm)] border border-[var(--se-line)] bg-[var(--se-bg-1)] p-2.5 text-[var(--se-fg-2)]">
            {`const on = await shipeasy.gate(\n  "${trimmed || "your_key"}"\n);`}
          </pre>
          <p className="t-sm dim">
            Returns <code className="font-mono">false</code> while paused. Adjust the rollout in the
            editor.
          </p>
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
      fd.append("rollout_pct", "0");
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
    <BigModalWizard
      open={open}
      onOpenChange={resetAndClose}
      kind="gates"
      title="Name your gatekeeper"
      eyebrow={{ project: projectId, area: "Gates" }}
      steps={steps}
      current={step}
      onStepChange={setStep}
      onSubmit={handleSubmit}
      submitLabel="Create gate"
      submitting={pending}
    />
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
