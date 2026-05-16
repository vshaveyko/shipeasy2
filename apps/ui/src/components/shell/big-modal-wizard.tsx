"use client";

import * as React from "react";
import { BeakerIcon, GaugeIcon, PowerIcon, SlidersHorizontalIcon, ShieldIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { Stepper } from "@/components/ui/stepper";

export type WizardKind = "configs" | "gates" | "killswitches" | "metrics" | "experiments";

export type WizardStep = {
  id: string;
  label: React.ReactNode;
  hint?: React.ReactNode;
  content: React.ReactNode;
  aside?: React.ReactNode;
  /** Block Next when this returns false. */
  isValid?: () => boolean;
};

export type BigModalWizardProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kind: WizardKind;
  title: React.ReactNode;
  eyebrow?: { project?: React.ReactNode; area?: React.ReactNode };
  steps: WizardStep[];
  current: number;
  onStepChange: (index: number) => void;
  onSubmit: () => void | Promise<void>;
  submitLabel?: React.ReactNode;
  saveDraftLabel?: React.ReactNode;
  onSaveDraft?: () => void | Promise<void>;
  submitting?: boolean;
};

const kindStyles: Record<
  WizardKind,
  { Icon: React.ComponentType<{ className?: string }>; chip: string; label: string }
> = {
  configs: {
    Icon: SlidersHorizontalIcon,
    chip: "bg-[var(--se-accent-soft)] text-[var(--se-accent)] border-[color-mix(in_oklab,var(--se-accent)_30%,transparent)]",
    label: "Config",
  },
  gates: {
    Icon: ShieldIcon,
    chip: "bg-[var(--se-info-soft)] text-[var(--se-info)] border-[color-mix(in_oklab,var(--se-info)_30%,transparent)]",
    label: "Gate",
  },
  killswitches: {
    Icon: PowerIcon,
    chip: "bg-[var(--se-warn-soft)] text-[var(--se-warn)] border-[color-mix(in_oklab,var(--se-warn)_30%,transparent)]",
    label: "Killswitch",
  },
  metrics: {
    Icon: GaugeIcon,
    chip: "bg-[color-mix(in_oklab,var(--se-purple)_18%,transparent)] text-[var(--se-purple)] border-[color-mix(in_oklab,var(--se-purple)_30%,transparent)]",
    label: "Metric",
  },
  experiments: {
    Icon: BeakerIcon,
    chip: "bg-[color-mix(in_oklab,#ff8445_18%,transparent)] text-[#ff8445] border-[color-mix(in_oklab,#ff8445_30%,transparent)]",
    label: "Experiment",
  },
};

export function BigModalWizard({
  open,
  onOpenChange,
  kind,
  title,
  eyebrow,
  steps,
  current,
  onStepChange,
  onSubmit,
  submitLabel = "Create",
  saveDraftLabel = "Save draft",
  onSaveDraft,
  submitting = false,
}: BigModalWizardProps) {
  const step = steps[current];
  const isFirst = current === 0;
  const isLast = current === steps.length - 1;
  const canAdvance = step?.isValid ? step.isValid() : true;
  const meta = kindStyles[kind];

  function next() {
    if (!canAdvance) return;
    if (isLast) {
      void onSubmit();
    } else {
      onStepChange(current + 1);
    }
  }

  function back() {
    if (!isFirst) onStepChange(current - 1);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="big-modal" showClose={false}>
        {/* Eyebrow */}
        <div className="flex h-9 items-center justify-between border-b border-[var(--se-line)] px-4 text-[11.5px] text-[var(--se-fg-3)]">
          <div className="t-mono-xs flex items-center gap-1.5 truncate">
            {eyebrow?.project ? <span>{eyebrow.project}</span> : null}
            {eyebrow?.project && eyebrow?.area ? <span className="dim-3">·</span> : null}
            {eyebrow?.area ? <span>{eyebrow.area}</span> : null}
          </div>
          <div className="flex items-center gap-1.5">
            <Kbd>Esc</Kbd>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="text-[var(--se-fg-3)] outline-none transition-colors hover:text-[var(--se-fg)] focus-visible:text-[var(--se-fg)]"
            >
              close
            </button>
          </div>
        </div>

        {/* Head */}
        <header className="flex shrink-0 items-start gap-3 border-b border-[var(--se-line)] px-5 pb-3.5 pt-4">
          <span
            aria-hidden
            className={cn(
              "grid size-[30px] shrink-0 place-items-center rounded-md border",
              meta.chip,
            )}
          >
            <meta.Icon className="size-4" />
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="t-caps dim-2">New {meta.label}</span>
            <DialogTitle className="t-h2 truncate">{title}</DialogTitle>
          </div>
          <div className="hidden min-w-[280px] max-w-[420px] flex-1 items-center md:flex">
            <Stepper
              steps={steps.map((s) => ({ id: s.id, label: s.label }))}
              current={current}
              onSelect={(i) => i <= current && onStepChange(i)}
            />
          </div>
        </header>

        {/* Body */}
        <div className="relative min-h-0 overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_85%_-10%,color-mix(in_oklab,var(--se-accent)_3%,transparent)_0%,transparent_60%)]" />
          <div className="relative grid h-full min-h-0 grid-cols-1 gap-4 overflow-y-auto px-5 py-4 md:grid-cols-[minmax(0,1fr)_320px]">
            <div className="flex min-w-0 flex-col gap-3">
              {step?.hint ? (
                <DialogDescription className="max-w-[80ch] text-[12.5px]">
                  {step.hint}
                </DialogDescription>
              ) : null}
              <div className="flex min-w-0 flex-1 flex-col gap-3">{step?.content}</div>
            </div>
            {step?.aside ? (
              <aside className="sticky top-2 hidden h-fit flex-col gap-3 rounded-md border border-[var(--se-line)] bg-gradient-to-b from-[var(--se-bg-2)] to-[var(--se-bg-1)] p-3.5 md:flex">
                {step.aside}
              </aside>
            ) : null}
          </div>
        </div>

        {/* Footer */}
        <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-[var(--se-line)] bg-gradient-to-b from-[var(--se-bg-2)] to-[var(--se-bg-1)] px-5 py-3">
          <div className="t-mono-xs dim-2 flex items-center gap-1.5">
            <span>
              Step {current + 1} of {steps.length}
            </span>
            <span className="dim-3">·</span>
            <span className="truncate">{step?.label}</span>
          </div>
          <div className="flex items-center gap-2">
            {onSaveDraft ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => void onSaveDraft()}
                disabled={submitting}
              >
                {saveDraftLabel}
              </Button>
            ) : null}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={back}
              disabled={isFirst || submitting}
            >
              Back
            </Button>
            <Button type="button" size="sm" onClick={next} disabled={!canAdvance || submitting}>
              {isLast ? submitLabel : "Next"}
              <Kbd className="ml-1.5 hidden border-current/30 bg-transparent text-current/80 md:inline-flex">
                ⏎
              </Kbd>
            </Button>
          </div>
        </footer>
      </DialogContent>
    </Dialog>
  );
}
