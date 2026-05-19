"use client";

import * as React from "react";
import {
  BeakerIcon,
  CheckIcon,
  GaugeIcon,
  PowerIcon,
  RocketIcon,
  SlidersHorizontalIcon,
  ShieldIcon,
  XIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";

export type WizardKind = "configs" | "gates" | "killswitches" | "metrics" | "experiments";

export type WizardStep = {
  id: string;
  /** Short — used in stepper + footer. */
  label: React.ReactNode;
  /** Long — used as h2 title. Falls back to `label`. */
  title?: React.ReactNode;
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
  eyebrow?: { project?: React.ReactNode };
  steps: WizardStep[];
  current: number;
  onStepChange: (index: number) => void;
  onSubmit: () => void | Promise<void>;
  /** Defaults to per-kind canonical CTA. */
  submitLabel?: React.ReactNode;
  submitting?: boolean;
};

type KindMeta = {
  Icon: React.ComponentType<{ className?: string }>;
  chip: string;
  label: string;
  publishCta: string;
};

const kindStyles: Record<WizardKind, KindMeta> = {
  configs: {
    Icon: SlidersHorizontalIcon,
    chip: "bg-[var(--se-accent-soft)] text-[var(--se-accent)] border-[color-mix(in_oklab,var(--se-accent)_30%,transparent)]",
    label: "config",
    publishCta: "Create & publish v1",
  },
  gates: {
    Icon: ShieldIcon,
    chip: "bg-[var(--se-info-soft)] text-[var(--se-info)] border-[color-mix(in_oklab,var(--se-info)_30%,transparent)]",
    label: "gate",
    publishCta: "Create gate",
  },
  killswitches: {
    Icon: PowerIcon,
    chip: "bg-[var(--se-warn-soft)] text-[var(--se-warn)] border-[color-mix(in_oklab,var(--se-warn)_30%,transparent)]",
    label: "killswitch",
    publishCta: "Arm killswitch",
  },
  metrics: {
    Icon: GaugeIcon,
    chip: "bg-[color-mix(in_oklab,var(--se-purple)_18%,transparent)] text-[var(--se-purple)] border-[color-mix(in_oklab,var(--se-purple)_30%,transparent)]",
    label: "metric",
    publishCta: "Register metric",
  },
  experiments: {
    Icon: BeakerIcon,
    chip: "bg-[color-mix(in_oklab,#ff8445_18%,transparent)] text-[#ff8445] border-[color-mix(in_oklab,#ff8445_30%,transparent)]",
    label: "experiment",
    publishCta: "Start experiment",
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
  submitLabel,
  submitting = false,
}: BigModalWizardProps) {
  const step = steps[current];
  const isFirst = current === 0;
  const isLast = current === steps.length - 1;
  const canAdvance = step?.isValid ? step.isValid() : true;
  const meta = kindStyles[kind];
  const cta = submitLabel ?? meta.publishCta;
  const nextStep = steps[current + 1];

  const next = React.useCallback(() => {
    if (!canAdvance || submitting) return;
    if (isLast) {
      void onSubmit();
    } else {
      onStepChange(current + 1);
    }
  }, [canAdvance, submitting, isLast, onSubmit, onStepChange, current]);

  function back() {
    if (!isFirst) onStepChange(current - 1);
  }

  React.useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Enter") return;
      const t = e.target as HTMLElement | null;
      if (!t) return;
      // Don't hijack Enter inside textareas, contenteditable, or buttons.
      const tag = t.tagName;
      if (tag === "TEXTAREA" || tag === "BUTTON" || t.isContentEditable) return;
      // Inputs: only advance when meta/ctrl is held (matches design hint `↵ next`).
      if (tag === "INPUT" && !e.metaKey && !e.ctrlKey) return;
      e.preventDefault();
      next();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, next]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="big-modal" showClose={false}>
        {/* Eyebrow — mono crumb above the modal frame (visually). */}
        <div className="flex h-9 items-center justify-between border-b border-[var(--se-line)] px-4 text-[11px] uppercase tracking-[0.06em] text-[var(--se-fg-3)]">
          <div className="font-mono flex min-w-0 items-center gap-1.5 truncate">
            {eyebrow?.project ? (
              <>
                <span className="truncate">{eyebrow.project}</span>
                <span className="text-[var(--se-fg-4)]">·</span>
              </>
            ) : null}
            <span>{meta.label}</span>
            <span className="text-[var(--se-fg-4)]">·</span>
            <span>new</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 rounded-md border border-[var(--se-line-2)] bg-[var(--se-bg-2)] px-2 py-0.5">
              <Kbd>Esc</Kbd>
              <span className="text-[10.5px] normal-case tracking-normal text-[var(--se-fg-3)]">
                to cancel
              </span>
            </span>
          </div>
        </div>

        {/* Header — stem + title + compact stepper + close */}
        <header className="flex shrink-0 items-center gap-3.5 border-b border-[var(--se-line)] bg-gradient-to-b from-[var(--se-bg-1)] to-[var(--se-bg-2)] px-4 py-2.5">
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
            <div className="font-mono text-[9.5px] uppercase tracking-[0.08em] text-[var(--se-accent)]">
              Step {current + 1} of {steps.length} · {meta.label}
            </div>
            <div className="flex min-w-0 items-center gap-2">
              <DialogTitle className="t-h3 truncate font-medium leading-[1.25] tracking-[-0.012em]">
                {step?.title ?? step?.label ?? title}
              </DialogTitle>
              <ValidityPill valid={canAdvance} />
            </div>
            {step?.hint ? (
              <DialogDescription className="t-sm dim line-clamp-1 max-w-[80ch]">
                {step.hint}
              </DialogDescription>
            ) : null}
          </div>
          <CompactStepper steps={steps} current={current} onSelect={(i) => onStepChange(i)} />
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Close (Esc)"
            title="Close (Esc)"
            className="grid size-7 shrink-0 place-items-center rounded-md text-[var(--se-fg-3)] outline-none transition-colors hover:bg-[var(--se-bg-3)] hover:text-[var(--se-fg)] focus-visible:bg-[var(--se-bg-3)]"
          >
            <XIcon className="size-3.5" />
          </button>
        </header>

        {/* Body */}
        <div className="relative min-h-0 overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(900px_320px_at_100%_0%,color-mix(in_oklab,var(--se-accent)_3%,transparent),transparent_60%)]" />
          <div
            className={cn(
              "relative grid h-full min-h-0 gap-3.5 overflow-y-auto px-5 py-4",
              step?.aside ? "grid-cols-1 md:grid-cols-[minmax(0,1fr)_320px]" : "grid-cols-1",
            )}
          >
            <div className="flex min-w-0 flex-col gap-3">{step?.content}</div>
            {step?.aside ? (
              <aside className="sticky top-2 hidden h-fit flex-col gap-3 rounded-[var(--radius-lg)] border border-[var(--se-line)] bg-gradient-to-b from-[var(--se-bg-2)] to-[var(--se-bg-1)] p-3.5 md:flex">
                {step.aside}
              </aside>
            ) : null}
          </div>
        </div>

        {/* Footer */}
        <footer className="flex shrink-0 items-center gap-3 border-t border-[var(--se-line)] bg-gradient-to-b from-[var(--se-bg-2)] to-[var(--se-bg-1)] px-5 py-3">
          <div className="font-mono flex items-center gap-1.5 text-[11px] text-[var(--se-fg-3)]">
            <span>
              step <b className="text-[var(--se-fg-2)] font-semibold">{current + 1}</b>/
              <b className="text-[var(--se-fg-2)] font-semibold">{steps.length}</b>
            </span>
            <span className="text-[var(--se-fg-4)]">·</span>
            <span>not yet persisted</span>
            <span className="text-[var(--se-fg-4)]">·</span>
            <Kbd>↵</Kbd>
            <span>next</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            {!isFirst ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={back}
                disabled={submitting}
              >
                Back
              </Button>
            ) : null}
            <Button type="button" size="sm" onClick={next} disabled={!canAdvance || submitting}>
              {isLast ? (
                <>
                  <RocketIcon className="size-3" />
                  {cta}
                </>
              ) : (
                <>
                  Next
                  {nextStep ? (
                    <span className="hidden text-[var(--se-accent-fg)]/70 md:inline">
                      · {nextStep.label}
                    </span>
                  ) : null}
                </>
              )}
            </Button>
          </div>
        </footer>
      </DialogContent>
    </Dialog>
  );
}

function ValidityPill({ valid }: { valid: boolean }) {
  if (valid) {
    return (
      <span
        className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[color-mix(in_oklab,var(--se-accent)_30%,transparent)] bg-[var(--se-accent-soft)] px-1.5 py-px text-[9.5px] font-medium uppercase tracking-[0.04em] text-[var(--se-accent)]"
        title="Step inputs are valid"
      >
        <CheckIcon className="size-2.5" />
        valid
      </span>
    );
  }
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[var(--se-line-2)] bg-[var(--se-bg-3)] px-1.5 py-px text-[9.5px] font-medium uppercase tracking-[0.04em] text-[var(--se-fg-3)]"
      title="Fill in required fields to continue"
    >
      incomplete
    </span>
  );
}

function CompactStepper({
  steps,
  current,
  onSelect,
}: {
  steps: WizardStep[];
  current: number;
  onSelect: (i: number) => void;
}) {
  return (
    <ol className="hidden shrink-0 items-center gap-1 md:flex" role="list" data-slot="stepper">
      {steps.map((s, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <React.Fragment key={s.id}>
            <li>
              <button
                type="button"
                onClick={() => onSelect(i)}
                aria-current={active ? "step" : undefined}
                title={typeof s.label === "string" ? s.label : undefined}
                className={cn(
                  "grid size-5 place-items-center rounded-full border text-[10.5px] font-medium transition-colors outline-none",
                  done && "border-transparent bg-[var(--se-accent)] text-[var(--se-accent-fg)]",
                  active &&
                    "border-[color-mix(in_oklab,var(--se-accent)_50%,transparent)] bg-[var(--se-accent-soft)] text-[var(--se-accent)] ring-2 ring-[color-mix(in_oklab,var(--se-accent)_22%,transparent)]",
                  !done &&
                    !active &&
                    "border-[var(--se-line-2)] bg-[var(--se-bg-2)] text-[var(--se-fg-3)] hover:border-[var(--se-line-3)] hover:text-[var(--se-fg-2)]",
                )}
              >
                {done ? <CheckIcon className="size-3" /> : i + 1}
              </button>
            </li>
            {i < steps.length - 1 ? (
              <span
                aria-hidden
                className={cn(
                  "h-px w-3",
                  i < current ? "bg-[var(--se-accent)]" : "bg-[var(--se-line-2)]",
                )}
              />
            ) : null}
          </React.Fragment>
        );
      })}
    </ol>
  );
}
