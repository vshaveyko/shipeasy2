"use client";

import { useEffect, useState } from "react";
import { BookOpen, Code, Sparkles } from "lucide-react";

import { BigModalWizard, type WizardStep } from "@/components/shell/big-modal-wizard";

import {
  ONBOARDING_STEPS,
  StepDone,
  StepInit,
  StepInstall,
  StepStarters,
  StepVerify,
  type FrameworkId,
} from "./onboarding-wizard";

export interface NewMetricWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId?: string;
  onComplete?: () => void;
}

const STEP_HINTS: Record<number, React.ReactNode> = {
  0: "Tailor the install snippet to where the events come from.",
  1: "Initialize once — auto-collection turns on whatever you flip on.",
  2: (
    <>
      Drop a single <code>log()</code> call anywhere; we&apos;ll detect it live.
    </>
  ),
  3: "Pick common starters now — edit, rename, archive any of them later.",
  4: "All set — events flow within seconds. Open the dashboard to see them land.",
};

export function NewMetricWizard({
  open,
  onOpenChange,
  projectId,
  onComplete,
}: NewMetricWizardProps) {
  const [step, setStep] = useState(0);
  const [fw, setFw] = useState<FrameworkId>("react");
  const [picked, setPicked] = useState<string[]>(["user_checkout", "feature_used"]);
  const [pingStatus, setPingStatus] = useState<"waiting" | "received">("waiting");

  useEffect(() => {
    if (!open) {
      setStep(0);
      setPingStatus("waiting");
    }
  }, [open]);

  useEffect(() => {
    if (open && step === 2 && pingStatus === "waiting") {
      const t = setTimeout(() => setPingStatus("received"), 2400);
      return () => clearTimeout(t);
    }
  }, [open, step, pingStatus]);

  function togglePick(id: string) {
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  }

  const aside = (
    <>
      <div className="t-caps dim-2">Need help</div>
      <a
        className="inline-flex items-center gap-2 text-[12.5px] text-[var(--se-fg-2)] hover:text-[var(--se-fg)]"
        href="https://docs.shipeasy.ai"
        target="_blank"
        rel="noreferrer"
      >
        <BookOpen className="size-3" /> Read the docs
      </a>
      <a
        className="inline-flex items-center gap-2 text-[12.5px] text-[var(--se-fg-2)] hover:text-[var(--se-fg)]"
        href="https://docs.shipeasy.ai/examples"
        target="_blank"
        rel="noreferrer"
      >
        <Code className="size-3" /> Browse examples
      </a>
      <span className="inline-flex items-center gap-2 text-[12.5px] text-[var(--se-fg-3)]">
        <Sparkles className="size-3" /> Ask Claude
      </span>
      <p className="t-sm dim mt-2">
        These steps install the SDK, verify the first event lands, and register a starter set you
        can refine later.
      </p>
    </>
  );

  const steps: WizardStep[] = [
    {
      id: "install",
      label: ONBOARDING_STEPS[0],
      hint: STEP_HINTS[0],
      content: <StepInstall fw={fw} setFw={setFw} />,
      aside,
    },
    {
      id: "init",
      label: ONBOARDING_STEPS[1],
      hint: STEP_HINTS[1],
      content: <StepInit fw={fw} />,
      aside,
    },
    {
      id: "verify",
      label: ONBOARDING_STEPS[2],
      hint: STEP_HINTS[2],
      content: (
        <StepVerify
          status={pingStatus}
          onSimulate={() => setPingStatus("received")}
          onReset={() => setPingStatus("waiting")}
        />
      ),
      aside,
      isValid: () => pingStatus === "received",
    },
    {
      id: "starters",
      label: ONBOARDING_STEPS[3],
      hint: STEP_HINTS[3],
      content: <StepStarters picked={picked} togglePick={togglePick} />,
      aside,
    },
    {
      id: "done",
      label: ONBOARDING_STEPS[4],
      hint: STEP_HINTS[4],
      content: <StepDone picked={picked} />,
    },
  ];

  function handleSubmit() {
    if (onComplete) onComplete();
    else onOpenChange(false);
  }

  return (
    <BigModalWizard
      open={open}
      onOpenChange={onOpenChange}
      kind="metrics"
      title="Set up Metrics"
      eyebrow={{ project: projectId, area: "Metrics" }}
      steps={steps}
      current={step}
      onStepChange={setStep}
      onSubmit={handleSubmit}
      submitLabel="Open dashboard"
    />
  );
}
