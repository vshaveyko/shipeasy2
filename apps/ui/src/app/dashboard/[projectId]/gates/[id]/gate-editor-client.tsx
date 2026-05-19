"use client";

// Gatekeeper editor — 3-step wizard ported from the design handoff.
//
// Design source: project/app/gates-editor.html + steps + modals.
// Concept: a "gatekeeper" holds an ordered stack of sub-gates evaluated
// top-to-bottom. Each sub-gate is either a `condition` (single rule) or a
// `rollout` (% bucket on an attribute). The last entry is the locked
// `public` floor — its percentage is tunable, the rest of it isn't.

import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Bookmark,
  GitBranch as Branch,
  Check,
  ChevronDown,
  ChevronUp,
  Code as CodeIcon,
  Copy,
  Edit as EditIcon,
  Info,
  Lock,
  Plus,
  RefreshCw,
  Rocket,
  Shield,
  Sliders,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";
import { saveGatekeeperAction } from "./actions";
import "./gate-editor.css";

// ── Types ──────────────────────────────────────────────────────────────────

type Op = "eq" | "neq" | "in" | "not_in" | "gt" | "gte" | "lt" | "lte" | "contains" | "regex";

export interface Rule {
  attr: string;
  op: Op;
  value: string;
}

export type ConditionEntry = {
  id: string;
  type: "condition";
  name?: string;
  fromTemplate?: string | null;
  pass?: "all" | "any";
  rules: Rule[];
  locked?: boolean;
};
export type RolloutEntry = {
  id: string;
  type: "rollout";
  name?: string;
  fromTemplate?: string | null;
  rolloutPct: number; // 0–10000 basis points
  bucketBy?: string;
  salt?: string;
  locked?: boolean;
};
export type StackEntry = ConditionEntry | RolloutEntry;
export type StackSeed = Omit<ConditionEntry, "id"> | Omit<RolloutEntry, "id">;

interface Details {
  title: string;
  key: string;
  keyLocked: boolean;
  folder: string;
  group: string;
  description: string;
  owner: string;
}

export interface InitialAttribute {
  k: string;
  ex: string;
}

// ── Static config ──────────────────────────────────────────────────────────

const OP_LABELS: Record<Op, string> = {
  eq: "equals",
  neq: "≠",
  in: "in (csv)",
  not_in: "not in (csv)",
  gt: ">",
  gte: "≥",
  lt: "<",
  lte: "≤",
  contains: "contains",
  regex: "matches regex",
};

const STEPS = [
  {
    k: "details",
    label: "Where does this gatekeeper live?",
    tag: "1 · metadata",
    desc: "Title, description, and the SDK key consumers will fetch with. Most of these are answered when you draft the gatekeeper — the editor below is for tweaks and a fuller description.",
  },
  {
    k: "gates",
    label: "Stack the gates",
    tag: "2 · authoring",
    desc: "Gates evaluate top to bottom. The first one that returns true wins — everything below it is skipped. The last gate is hardcoded public rollout; you can dial it 0–100 but can't remove it.",
  },
  {
    k: "review",
    label: "Review and integrate",
    tag: "3 · publish",
    desc: "One last look at the stack and the SDK call sites this gatekeeper will be reachable from. Saving propagates to KV within ~30 s.",
  },
] as const;

type StepKey = (typeof STEPS)[number]["k"];

// ── Helpers ────────────────────────────────────────────────────────────────

function rid() {
  return "g" + Math.random().toString(36).slice(2, 9);
}

function autoTitle(g: StackEntry): string {
  if (g.locked) return "Public";
  if (g.type === "rollout") {
    const p = g.rolloutPct;
    if (p === 0) return "Rollout — off";
    if (p >= 10000) return "Rollout — everyone";
    return `${(p / 100).toFixed(p % 100 === 0 ? 0 : 2)}% on ${g.bucketBy || "user_id"}`;
  }
  const r = g.rules[0];
  if (!r) return g.name || "New condition";
  const opLabel = OP_LABELS[r.op] ?? r.op;
  // r.value may be string, number, boolean, or array (for `in`/`not_in`). The
  // editor stores comma-strings for arrays, but seeded/API rows may carry the
  // raw array — normalize both into the comma-separated string the rest of
  // this fn assumes.
  const raw = r.value;
  let v: string;
  if (raw == null) v = "";
  else if (Array.isArray(raw)) v = raw.map((x) => String(x)).join(", ");
  else v = String(raw);
  v = v.trim();
  if (!v) return r.attr;
  let shown = v;
  if ((r.op === "in" || r.op === "not_in") && v.includes(",")) {
    const parts = v
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    shown = parts.length > 2 ? `${parts[0]}, ${parts[1]} +${parts.length - 2}` : parts.join(", ");
  } else if (v.length > 28) {
    shown = v.slice(0, 26) + "…";
  }
  const quoted = /^-?\d+(\.\d+)?$/.test(v) ? shown : `"${shown}"`;
  return `${r.attr} ${opLabel} ${quoted}`;
}

function gateSummary(g: StackEntry): ReactNode {
  if (g.type === "rollout") {
    return (
      <>
        <span className="gke-tok-op">{(g.rolloutPct / 100).toFixed(0)}%</span>{" "}
        <span style={{ color: "var(--se-fg-3)" }}>bucket on </span>
        <span className="gke-tok-key">{g.bucketBy || "user_id"}</span>
      </>
    );
  }
  const r = g.rules[0];
  if (!r) return <span style={{ color: "var(--se-fg-4)" }}>no rule yet</span>;
  return (
    <>
      <span className="gke-tok-key">{r.attr}</span> <span className="gke-tok-op">{r.op}</span>{" "}
      <span className="gke-tok-val">&quot;{r.value}&quot;</span>
    </>
  );
}

// Match logic mirrors core/eval/gate.ts so the test panel agrees with /sdk/evaluate.
function matchRule(rule: Rule, user: Record<string, unknown>): boolean {
  const actual = user[rule.attr];
  switch (rule.op) {
    case "eq":
      return actual === rule.value;
    case "neq":
      return actual !== rule.value;
    case "in": {
      const list = rule.value
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      return list.includes(String(actual));
    }
    case "not_in": {
      const list = rule.value
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      return !list.includes(String(actual));
    }
    case "gt":
    case "gte":
    case "lt":
    case "lte": {
      const a = Number(actual);
      const b = Number(rule.value);
      if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
      if (rule.op === "gt") return a > b;
      if (rule.op === "gte") return a >= b;
      if (rule.op === "lt") return a < b;
      return a <= b;
    }
    case "contains":
      return typeof actual === "string" && actual.includes(rule.value);
    case "regex":
      try {
        return typeof actual === "string" && new RegExp(rule.value).test(actual);
      } catch {
        return false;
      }
  }
}

// FNV-1a 32-bit, good enough for the in-browser test panel.
function fnv1a(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h;
}

function evalEntry(entry: StackEntry, user: Record<string, unknown>): boolean {
  if (entry.type === "condition") {
    if (entry.rules.length === 0) return false;
    const mode = entry.pass ?? "all";
    if (mode === "any") return entry.rules.some((r) => matchRule(r, user));
    return entry.rules.every((r) => matchRule(r, user));
  }
  if (entry.rolloutPct <= 0) return false;
  if (entry.rolloutPct >= 10000) return true;
  const bucket = entry.bucketBy ?? "user_id";
  const id =
    (typeof user[bucket] === "string" ? (user[bucket] as string) : null) ??
    (typeof user.user_id === "string" ? (user.user_id as string) : null);
  if (!id) return false;
  const salt = entry.salt || "rollout";
  return fnv1a(`${salt}:${id}`) % 10000 < entry.rolloutPct;
}

// ── Initial seed: turn the saved row into an editable stack ───────────────

/** Coerce a stored rule value (string | number | boolean | array | unknown)
 *  into the comma-separated string shape the editor expects. The Drizzle
 *  schema types `value` as `unknown` so the API may legitimately hand back
 *  arrays for `in`/`not_in`, numbers for `gt`/`lt`, or booleans for `eq` —
 *  but the inline editor's `<input>` + autoTitle/matchRule helpers all
 *  assume `string`. Normalize on the way in. */
function normalizeRuleValue(v: unknown): string {
  if (v == null) return "";
  if (Array.isArray(v)) return v.map((x) => String(x)).join(", ");
  return String(v);
}

function normalizeRules(rules: Rule[]): Rule[] {
  return rules.map((r) => ({ ...r, value: normalizeRuleValue(r.value) }));
}

function normalizeStack(stack: StackEntry[]): StackEntry[] {
  return stack.map((e) => (e.type === "condition" ? { ...e, rules: normalizeRules(e.rules) } : e));
}

export function initialStack(opts: {
  initialRules: Rule[];
  initialRolloutPct: number; // 0–10000
  publicFloorPct: number; // 0–10000
  existingStack?: StackEntry[] | null;
}): StackEntry[] {
  if (opts.existingStack && opts.existingStack.length > 0) {
    return normalizeStack(opts.existingStack);
  }
  const stack: StackEntry[] = [];
  if (opts.initialRules.length > 0) {
    stack.push({
      id: rid(),
      type: "condition",
      name: "Migrated rules",
      pass: "all",
      rules: normalizeRules(opts.initialRules),
    });
  }
  // Always end with the locked public floor — seeded from the legacy rolloutPct
  // so existing gates keep the same boolean output before the user re-saves.
  stack.push({
    id: rid(),
    type: "rollout",
    locked: true,
    rolloutPct: opts.publicFloorPct,
    bucketBy: "user_id",
    salt: "public",
  });
  return stack;
}

// ── Overflow toolbar — collapses non-fitting buttons into a "More" dropdown.
// Children are measured once on mount + on every container resize. Each item
// supplies an inline render (full button) and a dropdown render (menu item)
// so the same action looks right in both contexts.

interface OverflowItem {
  key: string;
  /** Inline button when there's room. */
  inline: ReactNode;
  /** Full label for the dropdown row. */
  label: string;
  icon?: ReactNode;
  onSelect: () => void;
}

function OverflowToolbar({ items, className }: { items: OverflowItem[]; className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [splitAt, setSplitAt] = useState<number>(items.length);

  useLayoutEffect(() => {
    const el = containerRef.current;
    const measureEl = measureRef.current;
    if (!el || !measureEl) return;

    const recompute = () => {
      const containerW = el.clientWidth;
      const itemEls = Array.from(measureEl.children) as HTMLElement[];
      const triggerW = triggerRef.current?.offsetWidth ?? 32;
      const gap = 8;
      let used = 0;
      let firstHidden = items.length;
      for (let i = 0; i < itemEls.length; i++) {
        const w = itemEls[i].offsetWidth + (i > 0 ? gap : 0);
        // If adding this one + the dropdown trigger would overflow, hide from here.
        const wouldOverflow = used + w + (i < itemEls.length - 1 ? triggerW + gap : 0) > containerW;
        if (wouldOverflow) {
          firstHidden = i;
          break;
        }
        used += w;
      }
      setSplitAt(firstHidden);
    };

    const ro = new ResizeObserver(recompute);
    ro.observe(el);
    recompute();
    return () => ro.disconnect();
  }, [items.length]);

  const visible = items.slice(0, splitAt);
  const hidden = items.slice(splitAt);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ position: "relative", display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}
    >
      {/* Hidden measuring track — positioned absolutely so it doesn't take layout space. */}
      <div
        ref={measureRef}
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          gap: 8,
          visibility: "hidden",
          pointerEvents: "none",
          overflow: "hidden",
        }}
      >
        {items.map((it) => (
          <span key={it.key}>{it.inline}</span>
        ))}
      </div>
      {visible.map((it) => (
        <span key={it.key}>{it.inline}</span>
      ))}
      {hidden.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger
            ref={triggerRef}
            aria-label="More actions"
            className="gke-icbtn"
            title="More actions"
          >
            <MoreHorizontal className="size-3.5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {hidden.map((it) => (
              <DropdownMenuItem key={it.key} onClick={it.onSelect}>
                {it.icon}
                {it.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}

// ── Component ──────────────────────────────────────────────────────────────

export interface GateEditorBodyProps {
  gateId: string;
  gateName: string;
  initialRules: Rule[];
  /** UI scale 0–100. */
  initialRolloutPct: number;
  attributes: InitialAttribute[];
  initialDetails: Details;
  initialStack?: StackEntry[] | null;
  askClaudeEnabled?: boolean;
}

/**
 * The gatekeeper editor — extracted so the same JSX renders inside the
 * /gates/[id] standalone page and inside the UnifiedList detail pane on
 * /gates. The component owns all of its own state; the embed/standalone
 * differences live in the chrome around it.
 */
export function GateEditorBody({
  gateId,
  gateName,
  initialRules,
  initialRolloutPct, // 0–100 (legacy UI-scale)
  attributes,
  initialDetails,
  initialStack: existingStack,
  askClaudeEnabled = true,
}: GateEditorBodyProps) {
  const [step, setStep] = useState<StepKey>("gates");
  const [details, setDetails] = useState<Details>(initialDetails);
  const [stack, setStack] = useState<StackEntry[]>(() =>
    initialStack({
      initialRules,
      initialRolloutPct: initialRolloutPct * 100,
      publicFloorPct: initialRolloutPct * 100,
      existingStack,
    }),
  );
  const [expandedId, setExpandedId] = useState<string | null>(() => {
    const first = (existingStack ?? []).find((e) => !e.locked) ?? null;
    return first?.id ?? null;
  });

  const [showTplPicker, setShowTplPicker] = useState(false);
  const [showEditDetails, setShowEditDetails] = useState(false);
  const [isPending, startTransition] = useTransition();

  const movableCount = stack.filter((e) => !e.locked).length;
  const condCount = stack.filter((e) => e.type === "condition" && !e.locked).length;
  const rollCount = stack.filter((e) => e.type === "rollout" && !e.locked).length;
  const publicG = stack[stack.length - 1];

  const upd = (id: string, patch: Partial<StackEntry>) =>
    setStack((prev) => prev.map((e) => (e.id === id ? ({ ...e, ...patch } as StackEntry) : e)));

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
              name: (g.name ?? autoTitle(g)) + " (copy)",
              rules: g.rules.map((r) => ({ ...r })),
            }
          : { ...g, id: rid(), name: (g.name ?? autoTitle(g)) + " (copy)" };
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

  function onSave() {
    startTransition(async () => {
      try {
        await saveGatekeeperAction({
          gateId,
          title: details.title,
          description: details.description,
          folder: details.folder,
          group: details.group,
          owner_email: details.owner,
          stack,
        });
        toast.success("Gatekeeper saved");
      } catch (err) {
        toast.error("Save failed", { description: String(err) });
      }
    });
  }

  return (
    <div className="gke-root flex min-w-0 flex-col gap-[18px] [overflow-x:clip]">
      {/* Stepper */}
      <div className="gke-stepper">
        {STEPS.map((s, i) => {
          const idx = STEPS.findIndex((x) => x.k === step);
          const state = i === idx ? "current" : i < idx ? "done" : "";
          return (
            <div key={s.k} style={{ display: "contents" }}>
              {i > 0 && <div className={`gke-conn ${i <= idx ? "done" : ""}`} />}
              <button
                type="button"
                className={`gke-step ${state}`}
                data-tip={s.desc}
                onClick={() => setStep(s.k)}
              >
                <span className="num">{i < idx ? <Check className="size-3" /> : i + 1}</span>
                <span className="body">
                  <span className="lbl">
                    {s.label}
                    <Info className="gke-step-info size-3" aria-hidden />
                  </span>
                  <span className="tag">{s.tag}</span>
                </span>
              </button>
            </div>
          );
        })}
      </div>

      {step === "details" && (
        <div className="gke-stepwrap">
          <StepDetailsView details={details} onEdit={() => setShowEditDetails(true)} />
        </div>
      )}

      {step === "gates" && (
        <StepGatesView
          stack={stack}
          expandedId={expandedId}
          setExpandedId={setExpandedId}
          attributes={attributes}
          publicFloorPct={publicG?.type === "rollout" ? publicG.rolloutPct : 0}
          movableCount={movableCount}
          totalCount={stack.length}
          onAddEntry={addEntry}
          onMove={move}
          onDup={dup}
          onRm={rm}
          onUpdEntry={upd}
          onPickTemplate={() => setShowTplPicker(true)}
          askClaudeEnabled={askClaudeEnabled}
        />
      )}

      {step === "review" && (
        <div className="gke-stepwrap">
          <StepReviewView
            details={details}
            stack={stack}
            condCount={condCount}
            rollCount={rollCount}
            publicG={publicG}
            gateKey={gateName}
          />
        </div>
      )}

      {/* Footer */}
      <div className="gke-foot">
        <div className="meta">
          <span>
            {stack.length} gate{stack.length === 1 ? "" : "s"}
          </span>
          <span className="sep">·</span>
          <span style={{ color: "var(--se-accent)" }}>{movableCount} editable</span>
        </div>
        <div className="acts">
          {step !== "details" && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                const i = STEPS.findIndex((s) => s.k === step);
                if (i > 0) setStep(STEPS[i - 1].k);
              }}
            >
              <ArrowLeft className="size-3" /> Back
            </Button>
          )}
          <Button type="button" variant="secondary" size="sm" onClick={onSave} disabled={isPending}>
            <Check className="size-3" /> {isPending ? "Saving…" : "Save draft"}
          </Button>
          {step !== "review" ? (
            <Button
              type="button"
              size="sm"
              onClick={() => {
                const i = STEPS.findIndex((s) => s.k === step);
                if (i < STEPS.length - 1) setStep(STEPS[i + 1].k);
              }}
            >
              Next: {STEPS[STEPS.findIndex((s) => s.k === step) + 1].label}{" "}
              <ArrowRight className="size-3" />
            </Button>
          ) : (
            <Button type="button" size="sm" onClick={onSave} disabled={isPending}>
              <Rocket className="size-3" /> Publish
            </Button>
          )}
        </div>
      </div>

      {showEditDetails && (
        <EditDetailsDialog
          details={details}
          onClose={() => setShowEditDetails(false)}
          onSave={(d) => {
            setDetails(d);
            setShowEditDetails(false);
          }}
        />
      )}

      {showTplPicker && (
        <AddGateDialog
          attributes={attributes}
          onClose={() => setShowTplPicker(false)}
          onPick={(seed) => addEntry(seed)}
        />
      )}
    </div>
  );
}

// ── Step 1 — Details ──────────────────────────────────────────────────────

function StepDetailsView({ details, onEdit }: { details: Details; onEdit: () => void }) {
  return (
    <>
      <div className="gke-card">
        <div className="gke-hd">
          <span className="ttl">Identity</span>
          <span className="sub">{details.key}</span>
          <button
            type="button"
            className="gke-rowbtn"
            style={{ marginLeft: "auto" }}
            onClick={onEdit}
          >
            <EditIcon className="size-3" /> Edit details
          </button>
        </div>

        <div className="gke-row">
          <span className="lbl">Title</span>
          <div>
            <div className="gke-ed">
              <input value={details.title} readOnly />
            </div>
            <div className="help">The friendly name shown in lists and audit logs.</div>
          </div>
        </div>
        <div className="gke-row">
          <span className="lbl">Key</span>
          <div>
            <div className="gke-ed mono disabled">
              <input value={details.key} readOnly />
              <Lock className="size-3" />
            </div>
            <div className="help">
              SDK consumers fetch with <code>shipeasy.gate(&quot;{details.key}&quot;)</code>.
            </div>
          </div>
        </div>
        <div className="gke-row">
          <span className="lbl">Description</span>
          <div>
            <textarea className="gke-ta" value={details.description} readOnly />
            <div className="help">
              Markdown allowed. Surfaces in the consumer SDK and the audit feed.
            </div>
          </div>
        </div>
        <div className="gke-row">
          <span className="lbl">Folder · Group</span>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="gke-ed">
              <input value={details.folder} readOnly />
            </div>
            <div className="gke-ed">
              <input value={details.group} readOnly />
            </div>
          </div>
        </div>
        <div className="gke-row">
          <span className="lbl">Owner</span>
          <div>
            <div className="gke-ed">
              <input value={details.owner} readOnly />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Step 2 — Gates list with inline editor + test panel + attributes ─────

export function StepGatesView({
  stack,
  expandedId,
  setExpandedId,
  attributes,
  publicFloorPct,
  movableCount,
  totalCount,
  onAddEntry,
  onMove,
  onDup,
  onRm,
  onUpdEntry,
  onPickTemplate,
  askClaudeEnabled = true,
  hideEvalFlow = false,
  className,
}: {
  stack: StackEntry[];
  expandedId: string | null;
  setExpandedId: (id: string | null) => void;
  attributes: InitialAttribute[];
  publicFloorPct: number;
  movableCount: number;
  totalCount: number;
  onAddEntry: (e: StackSeed) => void;
  onMove: (idx: number, dir: -1 | 1) => void;
  onDup: (idx: number) => void;
  onRm: (idx: number) => void;
  onUpdEntry: (id: string, patch: Partial<StackEntry>) => void;
  onPickTemplate: () => void;
  askClaudeEnabled?: boolean;
  hideEvalFlow?: boolean;
  className?: string;
}) {
  return (
    <div className={`gke-step2${className ? ` ${className}` : ""}`}>
      <div className="gke-step2-main">
        <div className="gke-card">
          <div className="gke-toolbar">
            {/* Overflowing left cluster: primary "Add gate" + secondary blanks. */}
            <OverflowToolbar
              items={[
                {
                  key: "tpl",
                  label: "Add gate from template",
                  icon: <Plus className="size-3" />,
                  onSelect: onPickTemplate,
                  inline: (
                    <button type="button" className="gke-addroot" onClick={onPickTemplate}>
                      <Plus className="size-3" /> Add gate
                      <span style={{ fontFamily: "var(--se-mono)", fontSize: 10, opacity: 0.75 }}>
                        from template
                      </span>
                    </button>
                  ),
                },
                {
                  key: "blank-cond",
                  label: "Blank condition",
                  icon: <Plus className="size-3" />,
                  onSelect: () =>
                    onAddEntry({
                      type: "condition",
                      name: "Untitled condition",
                      pass: "all",
                      rules: [{ attr: attributes[0]?.k ?? "user.id", op: "eq", value: "" }],
                    }),
                  inline: (
                    <button
                      type="button"
                      className="gke-secondary"
                      onClick={() =>
                        onAddEntry({
                          type: "condition",
                          name: "Untitled condition",
                          pass: "all",
                          rules: [{ attr: attributes[0]?.k ?? "user.id", op: "eq", value: "" }],
                        })
                      }
                    >
                      <Plus className="size-3" /> Blank condition
                    </button>
                  ),
                },
                {
                  key: "blank-roll",
                  label: "Blank rollout",
                  icon: <Sliders className="size-3" />,
                  onSelect: () =>
                    onAddEntry({
                      type: "rollout",
                      name: "Untitled rollout",
                      rolloutPct: 1000,
                      bucketBy: "user_id",
                      salt: "rollout",
                    }),
                  inline: (
                    <button
                      type="button"
                      className="gke-secondary"
                      onClick={() =>
                        onAddEntry({
                          type: "rollout",
                          name: "Untitled rollout",
                          rolloutPct: 1000,
                          bucketBy: "user_id",
                          salt: "rollout",
                        })
                      }
                    >
                      <Sliders className="size-3" /> Blank rollout
                    </button>
                  ),
                },
              ]}
            />
            {/* Right side: Ask Claude pinned, never overflows. */}
            {askClaudeEnabled && (
              <button
                type="button"
                className="gke-secondary"
                style={{ marginLeft: "auto" }}
                onClick={() => {}}
              >
                <Sparkles className="size-3" /> Ask Claude
              </button>
            )}
          </div>

          {hideEvalFlow ? null : (
            <div className="gke-evalflow">
              <ArrowRight className="size-3" />
              <span>If any gate above passes, the gatekeeper returns </span>
              <b>true</b>
              <span className="arrow">·</span>
              <span>otherwise falls through to </span>
              <b>public {(publicFloorPct / 100).toFixed(0)}%</b>
            </div>
          )}

          <div className="gke-stack">
            {stack.map((g, idx) => {
              const expanded = expandedId === g.id;
              return (
                <div key={g.id}>
                  <div
                    role="button"
                    tabIndex={0}
                    className={`gke-gate t-${g.type} ${g.locked ? "locked" : ""} ${
                      expanded ? "expanded" : ""
                    }`}
                    onClick={() => setExpandedId(expanded ? null : g.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setExpandedId(expanded ? null : g.id);
                      }
                    }}
                  >
                    <div className="order">
                      <span className="n">{String(idx + 1).padStart(2, "0")}</span>
                    </div>
                    <div className="badge-ico">
                      {g.locked ? (
                        <Lock className="size-4" />
                      ) : g.type === "rollout" ? (
                        <Sliders className="size-4" />
                      ) : (
                        <Branch className="size-4" />
                      )}
                    </div>
                    <div className="body">
                      <div className="name">
                        {autoTitle(g)}
                        {g.type === "rollout" ? (
                          <span className="pill roll">rollout</span>
                        ) : (
                          <span className="pill cond">condition</span>
                        )}
                        {g.fromTemplate && !g.locked && (
                          <span className="pill tmpl">tpl · {g.fromTemplate}</span>
                        )}
                        {g.locked && (
                          <span className="pill">
                            <Lock
                              className="size-2.5"
                              style={{ marginRight: 2, verticalAlign: -1, display: "inline" }}
                            />{" "}
                            locked floor
                          </span>
                        )}
                      </div>
                      <div className="summary">{gateSummary(g)}</div>
                    </div>

                    {/* Rollout slider sits inline; conditions render nothing here. */}
                    <div onClick={(e) => e.stopPropagation()}>
                      {g.type === "rollout" && (
                        <div className="gke-mini">
                          <span className={`num ${g.rolloutPct === 0 ? "zero" : ""}`}>
                            {(g.rolloutPct / 100).toFixed(0)}%
                          </span>
                          <div className="track">
                            <div className="bar">
                              <div className="fill" style={{ width: `${g.rolloutPct / 100}%` }} />
                            </div>
                            <input
                              type="range"
                              min={0}
                              max={100}
                              value={Math.round(g.rolloutPct / 100)}
                              onChange={(e) =>
                                onUpdEntry(g.id, {
                                  rolloutPct: Number(e.target.value) * 100,
                                } as Partial<StackEntry>)
                              }
                              aria-label={`${autoTitle(g)} rollout`}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="gke-actions" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        className="gke-icbtn"
                        title="Move up"
                        disabled={idx === 0 || g.locked}
                        onClick={() => onMove(idx, -1)}
                      >
                        <ChevronUp className="size-3" />
                      </button>
                      <button
                        type="button"
                        className="gke-icbtn"
                        title="Move down"
                        disabled={idx >= stack.length - 2 || g.locked}
                        onClick={() => onMove(idx, 1)}
                      >
                        <ChevronDown className="size-3" />
                      </button>
                      <button
                        type="button"
                        className="gke-icbtn"
                        title={expanded ? "Collapse" : "Edit gate"}
                        onClick={() => setExpandedId(expanded ? null : g.id)}
                      >
                        {expanded ? (
                          <ChevronUp className="size-3" />
                        ) : (
                          <EditIcon className="size-3" />
                        )}
                      </button>
                      <button
                        type="button"
                        className="gke-icbtn"
                        title="Save as template"
                        disabled={g.locked}
                        onClick={() => toast.info("Templates are coming soon")}
                      >
                        <Bookmark className="size-3" />
                      </button>
                      <button
                        type="button"
                        className="gke-icbtn"
                        title="Duplicate"
                        disabled={g.locked}
                        onClick={() => onDup(idx)}
                      >
                        <Copy className="size-3" />
                      </button>
                      <button
                        type="button"
                        className="gke-icbtn danger"
                        title="Remove"
                        disabled={g.locked}
                        onClick={() => onRm(idx)}
                      >
                        <Trash2 className="size-3" />
                      </button>
                    </div>
                  </div>

                  {expanded && (
                    <InlineGateEditor
                      g={g}
                      onChange={(patch) => onUpdEntry(g.id, patch)}
                      attributes={attributes}
                    />
                  )}
                </div>
              );
            })}
          </div>

          <div className="gke-addcta">
            <button type="button" className="gke-addroot" onClick={onPickTemplate}>
              <Plus className="size-3" /> Add gate above the public floor
            </button>
          </div>
        </div>

        <div className="gke-hint">
          <BookOpen className="size-3.5" style={{ color: "var(--se-accent)", flexShrink: 0 }} />
          <div>
            <b>Tip.</b> Order matters. Put broad allows (employees, beta cohort) at the top so they
            don&apos;t get bucketed into a partial rollout below. Click a gate to expand it inline —
            the attributes panel populates the rule when you tap an entry.
          </div>
        </div>
      </div>

      <aside className="gke-step2-side">
        <TestPanel stack={stack} attributes={attributes} />
        <AttributesPanel
          attributes={attributes}
          onUse={(k) => {
            const target = stack.find((e) => e.id === expandedId);
            if (!target || target.locked || target.type === "rollout") {
              toast.error("Open a condition gate first");
              return;
            }
            onUpdEntry(target.id, {
              rules: [{ attr: k, op: "eq", value: "" }],
            } as Partial<StackEntry>);
          }}
        />
      </aside>
    </div>
  );
}

// ── Inline editor (single rule per condition; full slider per rollout) ────

function InlineGateEditor({
  g,
  onChange,
  attributes,
}: {
  g: StackEntry;
  onChange: (patch: Partial<StackEntry>) => void;
  attributes: InitialAttribute[];
}) {
  if (g.type === "rollout") {
    const isLocked = !!g.locked;
    return (
      <div className="gke-inline">
        <div className="gke-rolloutcard">
          <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
            <span className={`num-big ${g.rolloutPct === 0 ? "zero" : ""}`}>
              {(g.rolloutPct / 100).toFixed(0)}
              <span style={{ fontSize: 24 }}>%</span>
            </span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12.5, color: "var(--se-fg-2)" }}>
                {g.rolloutPct === 0 ? (
                  <>Off — this gate never passes.</>
                ) : g.rolloutPct >= 10000 ? (
                  <>Everyone falls into this bucket.</>
                ) : (
                  <>
                    Roughly{" "}
                    <b style={{ color: "var(--se-fg)" }}>{(g.rolloutPct / 100).toFixed(0)}%</b> of
                    evaluated users see{" "}
                    <span style={{ fontFamily: "var(--se-mono)", color: "var(--se-accent)" }}>
                      true
                    </span>
                    .
                  </>
                )}
              </div>
              <div className="lbl">% of audience</div>
            </div>
          </div>
          <div className="gke-rollouttrack">
            <div className="bg" />
            <div className="fill" style={{ width: `${g.rolloutPct / 100}%` }} />
            <div className="knob" style={{ left: `${g.rolloutPct / 100}%` }} />
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(g.rolloutPct / 100)}
              onChange={(e) => onChange({ rolloutPct: Number(e.target.value) * 100 })}
            />
          </div>
          <div className="gke-rolloutticks">
            {[0, 10, 25, 50, 75, 100].map((t) => (
              <span key={t}>{t}%</span>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 14 }}>
            <div>
              <div className="lbl" style={{ marginBottom: 6 }}>
                Bucket by
              </div>
              <div className="gke-ed">
                <select
                  value={g.bucketBy ?? "user_id"}
                  onChange={(e) => onChange({ bucketBy: e.target.value })}
                  disabled={isLocked}
                >
                  <option value="user_id">user_id</option>
                  {attributes.map((a) => (
                    <option key={a.k} value={a.k}>
                      {a.k}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <div className="lbl" style={{ marginBottom: 6 }}>
                Salt
              </div>
              <div className="gke-ed mono">
                <input
                  value={g.salt ?? ""}
                  placeholder="rollout"
                  disabled={isLocked}
                  onChange={(e) => onChange({ salt: e.target.value })}
                />
              </div>
            </div>
          </div>
          {isLocked && (
            <div className="gke-hint" style={{ marginTop: 14 }}>
              <Lock className="size-3.5" style={{ color: "var(--se-accent)", flexShrink: 0 }} />
              <div>
                <b>Public floor.</b> Hardcoded last gate — only the percentage is tunable.
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  const r = g.rules[0] ?? { attr: attributes[0]?.k ?? "user.id", op: "eq" as Op, value: "" };
  const updRule = (patch: Partial<Rule>) =>
    onChange({ rules: [{ ...r, ...patch }] } as Partial<StackEntry>);
  return (
    <div className="gke-inline">
      <div className="gke-rule">
        <div className="gke-cond">
          <div className="gke-ed mono">
            <select value={r.attr} onChange={(e) => updRule({ attr: e.target.value })}>
              {attributes.length === 0 ? (
                <option value={r.attr}>{r.attr || "—"}</option>
              ) : (
                attributes.map((a) => (
                  <option key={a.k} value={a.k}>
                    {a.k}
                  </option>
                ))
              )}
            </select>
          </div>
          <div className="gke-ed">
            <select value={r.op} onChange={(e) => updRule({ op: e.target.value as Op })}>
              {(Object.keys(OP_LABELS) as Op[]).map((op) => (
                <option key={op} value={op}>
                  {OP_LABELS[op]}
                </option>
              ))}
            </select>
          </div>
          <div className="gke-ed mono">
            <input
              value={r.value}
              onChange={(e) => updRule({ value: e.target.value })}
              placeholder={
                r.op === "in" || r.op === "not_in"
                  ? "comma, separated, list"
                  : r.op === "regex"
                    ? "^[a-z]+@example\\.com$"
                    : "value"
              }
            />
          </div>
        </div>
        {(r.op === "regex" || r.op === "in" || r.op === "not_in") && (
          <div className="gke-ophint">
            <BookOpen className="size-2.5" style={{ flexShrink: 0, opacity: 0.7 }} />
            {r.op === "regex" && (
              <>
                Full ECMAScript regex. Anchors recommended. Try{" "}
                <code>^[a-z]+@example\.(co|io)$</code>
              </>
            )}
            {(r.op === "in" || r.op === "not_in") && <>Whitespace around commas is trimmed.</>}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Test panel ────────────────────────────────────────────────────────────

function TestPanel({ stack, attributes }: { stack: StackEntry[]; attributes: InitialAttribute[] }) {
  const [userId, setUserId] = useState("usr_3b20a9f2");

  const sample = useMemo(() => {
    const o: Record<string, unknown> = { user_id: userId };
    for (const a of attributes) {
      o[a.k] = a.ex;
    }
    return o;
  }, [attributes, userId]);

  const verdicts = useMemo(() => {
    const out: Array<"pass" | "fail" | "skip"> = [];
    let passed = false;
    for (const g of stack) {
      if (passed) {
        out.push("skip");
        continue;
      }
      const ok = evalEntry(g, sample);
      out.push(ok ? "pass" : "fail");
      if (ok) passed = true;
    }
    return out;
  }, [stack, sample]);

  const overall = verdicts.some((v) => v === "pass");

  return (
    <div className="gke-card">
      <div className="gke-hd">
        <span className="ttl">Test against a user</span>
        <span className="sub">live</span>
        <button type="button" className="gke-icbtn" style={{ marginLeft: "auto" }} title="Re-run">
          <RefreshCw className="size-3" />
        </button>
      </div>
      <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
        <div className="gke-ed sm mono">
          <span className="pre">user_id</span>
          <input value={userId} onChange={(e) => setUserId(e.target.value)} />
        </div>
        <div className={`gke-result ${overall ? "" : "deny"}`}>
          <div className="label">verdict</div>
          <div className="v">{overall ? "PASS" : "DENY"}</div>
        </div>
        <div
          style={{
            background: "var(--se-bg-2)",
            borderRadius: "var(--gke-r-sm)",
            padding: "10px 12px",
            fontFamily: "var(--se-mono)",
            fontSize: 11,
            color: "var(--se-fg-2)",
            lineHeight: 1.7,
            border: "1px solid var(--se-line)",
          }}
        >
          {Object.entries(sample)
            .slice(0, 5)
            .map(([k, v]) => (
              <div key={k}>
                <span style={{ color: "var(--se-fg-4)" }}>{k}</span> = &quot;{String(v)}&quot;
              </div>
            ))}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 2 }}>
          {stack.map((g, i) => {
            const v = verdicts[i];
            return (
              <div key={g.id} className={`gke-testrow ${v}`}>
                <span
                  style={{
                    fontFamily: "var(--se-mono)",
                    fontSize: 10,
                    color: "var(--se-fg-4)",
                    width: 18,
                  }}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="pill">{v.toUpperCase()}</span>
                <span className="lbl">{autoTitle(g)}</span>
                <span className="meta">
                  {g.type === "rollout"
                    ? `${(g.rolloutPct / 100).toFixed(0)}%`
                    : `${g.rules.length} rule`}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Attributes sidebar ────────────────────────────────────────────────────

function AttributesPanel({
  attributes,
  onUse,
}: {
  attributes: InitialAttribute[];
  onUse: (k: string) => void;
}) {
  return (
    <div className="gke-card">
      <div className="gke-hd">
        <span className="ttl">Available attributes</span>
        <span className="sub">click to use in selected gate</span>
      </div>
      <div className="gke-attrs">
        <div className="grp">User</div>
        {attributes.length === 0 ? (
          <div style={{ padding: "20px 14px", fontSize: 12, color: "var(--se-fg-3)" }}>
            No attributes registered yet. Define them in Experiments.
          </div>
        ) : (
          attributes.map((a) => (
            <button key={a.k} type="button" className="attr" onClick={() => onUse(a.k)}>
              <span className="key">{a.k}</span>
              <span className="ex">{a.ex || ""}</span>
              <Plus className="size-3" style={{ color: "var(--se-accent)" }} />
            </button>
          ))
        )}
      </div>
    </div>
  );
}

// ── Step 3 — Review ───────────────────────────────────────────────────────

function StepReviewView({
  details,
  stack,
  condCount,
  rollCount,
  publicG,
  gateKey,
}: {
  details: Details;
  stack: StackEntry[];
  condCount: number;
  rollCount: number;
  publicG: StackEntry | undefined;
  gateKey: string;
}) {
  const tsSnippet = `import { shipeasy } from "@shipeasy/sdk";

// Returns true if any gate passes top-to-bottom.
const allowed = await shipeasy.gate("${gateKey}");

if (allowed) {
  enablePremiumFeatures();
}`;

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 18 }}>
        <div className="gke-card">
          <div className="gke-hd">
            <span className="ttl">Summary</span>
            <span className="sub">{details.key}</span>
          </div>
          <div className="gke-rv">
            <span className="lbl">Title</span>
            <span className="val">{details.title}</span>
          </div>
          <div className="gke-rv">
            <span className="lbl">Key</span>
            <span className="val mono">{details.key}</span>
          </div>
          <div className="gke-rv">
            <span className="lbl">Folder · Group</span>
            <span className="val mono">
              {details.folder || "—"} / {details.group || "—"}
            </span>
          </div>
          <div className="gke-rv">
            <span className="lbl">Description</span>
            <span className="val dim">{details.description || "—"}</span>
          </div>
          <div className="gke-rv">
            <span className="lbl">Owner</span>
            <span className="val">{details.owner || "—"}</span>
          </div>
          <div className="gke-rv">
            <span className="lbl">Gates</span>
            <span className="val">
              <b style={{ fontWeight: 500 }}>{stack.length}</b> total
              <span style={{ color: "var(--se-fg-3)" }}>
                {" "}
                · {condCount} condition{condCount === 1 ? "" : "s"} · {rollCount} rollout
                {rollCount === 1 ? "" : "s"} · 1 public floor at{" "}
                <b style={{ color: "var(--se-fg-2)", fontFamily: "var(--se-mono)" }}>
                  {publicG?.type === "rollout" ? `${(publicG.rolloutPct / 100).toFixed(0)}%` : "—"}
                </b>
              </span>
            </span>
          </div>
          <div className="gke-rv">
            <span className="lbl">Evaluation</span>
            <span className="val mono dim">top → bottom · short-circuit on first PASS</span>
          </div>
        </div>

        <div className="gke-card">
          <div className="gke-hd">
            <span className="ttl">Gate stack preview</span>
            <span className="sub">flow</span>
          </div>
          <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 8 }}>
            {stack.map((g, i) => (
              <div key={g.id}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 12px",
                    background: "var(--se-bg-2)",
                    border: "1px solid var(--se-line)",
                    borderRadius: "var(--gke-r-sm)",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--se-mono)",
                      fontSize: 11,
                      color: "var(--se-fg-4)",
                      width: 24,
                    }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 6,
                      display: "grid",
                      placeItems: "center",
                      background: g.locked
                        ? "var(--se-bg-3)"
                        : g.type === "rollout"
                          ? "color-mix(in oklab, var(--se-accent) 12%, var(--se-bg-3))"
                          : "color-mix(in oklab, var(--se-info) 12%, var(--se-bg-3))",
                      color: g.locked
                        ? "var(--se-fg-3)"
                        : g.type === "rollout"
                          ? "var(--se-accent)"
                          : "var(--se-info)",
                      border: "1px solid var(--se-line-2)",
                    }}
                  >
                    {g.locked ? (
                      <Lock className="size-2.5" />
                    ) : g.type === "rollout" ? (
                      <Sliders className="size-2.5" />
                    ) : (
                      <Branch className="size-2.5" />
                    )}
                  </div>
                  <span
                    style={{
                      flex: 1,
                      fontSize: 12.5,
                      color: "var(--se-fg-2)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {autoTitle(g)}
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--se-mono)",
                      fontSize: 10.5,
                      color: "var(--se-fg-3)",
                    }}
                  >
                    {g.type === "rollout"
                      ? `${(g.rolloutPct / 100).toFixed(0)}%`
                      : `${g.rules.length} rule${g.rules.length === 1 ? "" : "s"}`}
                  </span>
                </div>
                {i < stack.length - 1 && (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "center",
                      color: "var(--se-fg-4)",
                      fontFamily: "var(--se-mono)",
                      fontSize: 9.5,
                      letterSpacing: ".08em",
                      marginTop: 4,
                      marginBottom: 0,
                    }}
                  >
                    ↓ FAIL
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="gke-card">
        <div className="gke-hd">
          <span className="ttl">Integrate</span>
          <span className="sub">copy-paste into your codebase</span>
        </div>
        <div className="gke-sdk-tabs">
          <button type="button" className="active">
            TypeScript
          </button>
        </div>
        <div className="gke-sdk-body">
          <pre>{tsSnippet}</pre>
        </div>
      </div>

      <div className="gke-hint">
        <Rocket className="size-3.5" style={{ color: "var(--se-accent)", flexShrink: 0 }} />
        <div>
          <b>Publishing</b> creates a new version. Old SDK clients keep their cached result for ~30
          s before re-fetching. To stage instead, dial the public floor to 0% and roll specific
          gates first.
        </div>
      </div>
    </>
  );
}

// ── Modals ────────────────────────────────────────────────────────────────

function EditDetailsDialog({
  details,
  onClose,
  onSave,
}: {
  details: Details;
  onClose: () => void;
  onSave: (d: Details) => void;
}) {
  const [d, setD] = useState<Details>(details);
  useEffect(() => setD(details), [details]);
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[640px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <EditIcon className="size-4" /> Gatekeeper details
          </DialogTitle>
        </DialogHeader>
        <div className="gke-root flex flex-col gap-4">
          <Field label="Title" hint="human-readable name shown in lists">
            <div className="gke-ed">
              <input value={d.title} onChange={(e) => setD({ ...d, title: e.target.value })} />
            </div>
          </Field>
          <Field label="Key" hint="SDK consumers fetch with this">
            <div className={`gke-ed mono ${d.keyLocked ? "disabled" : ""}`}>
              <input
                value={d.key}
                readOnly={d.keyLocked}
                onChange={(e) => setD({ ...d, key: e.target.value })}
              />
              {d.keyLocked && <Lock className="size-3" />}
            </div>
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Folder">
              <div className="gke-ed">
                <input value={d.folder} onChange={(e) => setD({ ...d, folder: e.target.value })} />
              </div>
            </Field>
            <Field label="Group">
              <div className="gke-ed">
                <input value={d.group} onChange={(e) => setD({ ...d, group: e.target.value })} />
              </div>
            </Field>
          </div>
          <Field label="Description">
            <textarea
              className="gke-ta"
              value={d.description}
              onChange={(e) => setD({ ...d, description: e.target.value })}
              placeholder="What this gatekeeper protects, and when consumers should re-fetch it."
            />
          </Field>
          <Field label="Owner">
            <div className="gke-ed">
              <input value={d.owner} onChange={(e) => setD({ ...d, owner: e.target.value })} />
            </div>
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="button" size="sm" onClick={() => onSave(d)}>
              <Check className="size-3" /> Save details
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="t-caps dim-2">
        {label}
        {hint && (
          <span
            className="ml-2"
            style={{ textTransform: "none", letterSpacing: 0, color: "var(--se-fg-4)" }}
          >
            — {hint}
          </span>
        )}
      </span>
      {children}
    </div>
  );
}

export function AddGateDialog({
  attributes,
  onClose,
  onPick,
}: {
  attributes: InitialAttribute[];
  onClose: () => void;
  onPick: (seed: StackSeed) => void;
}) {
  const seeds: Array<{
    label: string;
    desc: string;
    seed: StackSeed;
    icon: ReactNode;
  }> = [
    {
      label: "Blank condition",
      desc: "Match any user attribute with a single rule.",
      icon: <Branch className="size-4" />,
      seed: {
        type: "condition",
        name: "New condition",
        pass: "all",
        rules: [{ attr: attributes[0]?.k ?? "user.id", op: "eq", value: "" }],
      },
    },
    {
      label: "Blank rollout",
      desc: "Sticky bucket on user_id at 10%.",
      icon: <Sliders className="size-4" />,
      seed: {
        type: "rollout",
        name: "New rollout",
        rolloutPct: 1000,
        bucketBy: "user_id",
        salt: "rollout",
      },
    },
    {
      label: "Canary 1%",
      desc: "Tiny rollout for early visibility.",
      icon: <Sparkles className="size-4" />,
      seed: {
        type: "rollout",
        name: "Canary",
        fromTemplate: "Canary %",
        rolloutPct: 100,
        bucketBy: "user_id",
        salt: "canary",
      },
    },
    {
      label: "Internal employees",
      desc: "Match by email domain. Edit the value after picking.",
      icon: <Shield className="size-4" />,
      seed: {
        type: "condition",
        name: "Employees",
        fromTemplate: "Email domain",
        pass: "all",
        rules: [{ attr: attributes[0]?.k ?? "email", op: "contains", value: "@example.com" }],
      },
    },
  ];

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[760px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="size-4" /> Add a gate
          </DialogTitle>
        </DialogHeader>
        <div
          className="gke-root"
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}
        >
          {seeds.map((s) => (
            <button
              key={s.label}
              type="button"
              className="gke-rowbtn"
              style={{
                padding: 14,
                alignItems: "flex-start",
                gap: 12,
                cursor: "pointer",
                textAlign: "left",
              }}
              onClick={() => onPick(s.seed)}
            >
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 8,
                  display: "grid",
                  placeItems: "center",
                  background: "var(--se-bg-3)",
                  border: "1px solid var(--se-line-2)",
                  flexShrink: 0,
                  color: "var(--se-fg-2)",
                }}
              >
                {s.icon}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: "var(--se-fg)" }}>
                  {s.label}
                </div>
                <div
                  style={{
                    fontSize: 11.5,
                    color: "var(--se-fg-3)",
                    lineHeight: 1.5,
                    marginTop: 3,
                  }}
                >
                  {s.desc}
                </div>
              </div>
            </button>
          ))}
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            <X className="size-3" /> Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Suppress unused-import warning for CodeIcon in some lint configs.
void CodeIcon;
