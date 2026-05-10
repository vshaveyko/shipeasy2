"use client";

import { useMemo, useState, useTransition } from "react";
import {
  ArrowRight,
  Braces,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardPaste,
  Code,
  Copy,
  Edit3,
  List,
  Plus,
  Rocket,
  Trash2,
} from "lucide-react";

import { Page, PageBody } from "@/components/dashboard/page";
import { Button } from "@/components/ui/button";
import { LinkButton } from "@/components/ui/link-button";
import { cn } from "@/lib/utils";
import { createConfigAction } from "../actions";
import { EditFieldDialog } from "./edit-field-dialog";
import { EditValueDialog } from "./edit-value-dialog";
import { ImportJsonDialog } from "./import-json-dialog";
import { PasteJsonDialog } from "./paste-json-dialog";
import { IntegrationSnippetDialog } from "@/components/integration";
import {
  TYPE_OPTS,
  addChild,
  blankField,
  buildSchemaAndDefault,
  countAllFields,
  countMissingRequired,
  fieldToJson,
  findField,
  flatten,
  removeField as removeFieldHelper,
  updateField as updateFieldHelper,
  type WizField,
} from "./wizard-helpers";

const STEPS = [
  { k: "details", label: "Details", tag: "1 · metadata" },
  { k: "schema", label: "Schema", tag: "2 · structure" },
  { k: "values", label: "Default values", tag: "3 · prefill" },
  { k: "review", label: "Review & integrate", tag: "4 · publish" },
] as const;

export function NewConfigWizard({
  projectId,
  draftFields,
}: {
  projectId: string;
  draftFields: boolean;
}) {
  const cancelHref = `/dashboard/${projectId}/configs/values`;

  const [stepIdx, setStepIdx] = useState(0);
  const [key, setKey] = useState("");
  const [description, setDescription] = useState("");
  const [group, setGroup] = useState("platform");
  const [owner, setOwner] = useState("");
  const [fields, setFields] = useState<WizField[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [jsonView, setJsonView] = useState(false);
  const [editFieldId, setEditFieldId] = useState<string | null>(null);
  const [editValueId, setEditValueId] = useState<string | null>(null);
  const [sdkOpen, setSdkOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const editFieldField = useMemo(
    () => (editFieldId ? findField(fields, editFieldId) : null),
    [fields, editFieldId],
  );
  const editValueField = useMemo(
    () => (editValueId ? findField(fields, editValueId) : null),
    [fields, editValueId],
  );

  const fieldCount = useMemo(() => countAllFields(fields), [fields]);
  const missing = useMemo(() => countMissingRequired(fields), [fields]);
  const built = useMemo(() => buildSchemaAndDefault(fields), [fields]);

  const next = () => setStepIdx((i) => Math.min(i + 1, STEPS.length - 1));
  const prev = () => setStepIdx((i) => Math.max(i - 1, 0));

  function publish() {
    setError(null);
    if (!key.trim()) {
      setError("Key is required");
      setStepIdx(0);
      return;
    }
    if (built.error) {
      setError(built.error);
      setStepIdx(1);
      return;
    }
    startTransition(async () => {
      try {
        await createConfigAction({
          name: key,
          description: description || undefined,
          schema: built.schema,
          value: built.value,
        });
      } catch (err) {
        setError((err as Error).message);
      }
    });
  }

  return (
    <Page className="px-6">
      <PageBody className="space-y-5">
        <h1 className="sr-only">New config</h1>
        <Stepper stepIdx={stepIdx} onJump={setStepIdx} />

        {stepIdx === 0 ? (
          <StepDetails
            keyValue={key}
            setKeyValue={setKey}
            description={description}
            setDescription={setDescription}
            group={group}
            setGroup={setGroup}
            owner={owner}
            setOwner={setOwner}
            draftFields={draftFields}
          />
        ) : null}

        {stepIdx === 1 ? (
          <StepSchema
            fields={fields}
            setFields={setFields}
            expanded={expanded}
            setExpanded={setExpanded}
            openEditField={setEditFieldId}
            jsonView={jsonView}
            setJsonView={setJsonView}
            openImport={() => setImportOpen(true)}
          />
        ) : null}

        {stepIdx === 2 ? (
          <StepValues
            fields={fields}
            expanded={expanded}
            setExpanded={setExpanded}
            openEditValue={setEditValueId}
            missing={missing}
            openPaste={() => setPasteOpen(true)}
          />
        ) : null}

        {stepIdx === 3 ? (
          <StepReview
            keyValue={key}
            description={description}
            fields={fields}
            built={built}
            openSdk={() => setSdkOpen(true)}
            draftFields={draftFields}
          />
        ) : null}

        {error ? (
          <div
            role="alert"
            className="rounded-[var(--radius-md)] border border-[color-mix(in_oklab,var(--se-danger)_30%,transparent)] bg-[var(--se-danger-soft)] px-4 py-2 text-[13px] text-[var(--se-danger)]"
          >
            {error}
          </div>
        ) : null}

        <div className="sticky bottom-4 z-10 flex items-center justify-between gap-3 rounded-[var(--radius-md)] border border-[var(--se-line-2)] bg-[var(--se-bg-1)] px-5 py-3 shadow-[0_12px_32px_-8px_rgba(0,0,0,0.5)]">
          <div className="flex items-center gap-2 font-mono text-[11.5px] text-[var(--se-fg-3)]">
            <span>{STEPS[stepIdx].label}</span>
            <span className="text-[var(--se-fg-4)]">·</span>
            <span>
              {fieldCount} field{fieldCount === 1 ? "" : "s"}
            </span>
            <span className="text-[var(--se-fg-4)]">·</span>
            <span>{draftFields ? "draft v3" : "draft"}</span>
          </div>
          <div className="flex items-center gap-2">
            <LinkButton variant="ghost" size="sm" href={cancelHref}>
              Cancel
            </LinkButton>
            <Button type="button" variant="ghost" size="sm" onClick={prev} disabled={stepIdx === 0}>
              <ChevronLeft className="size-3" /> Back
            </Button>
            {stepIdx < STEPS.length - 1 ? (
              <Button type="button" size="sm" onClick={next}>
                Continue <ArrowRight className="size-3" />
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                onClick={publish}
                disabled={pending}
                data-testid="publish-button"
              >
                <Rocket className="size-3" />
                {pending ? "Creating…" : "Create config"}
              </Button>
            )}
          </div>
        </div>
      </PageBody>

      <EditFieldDialog
        field={editFieldField}
        onClose={() => setEditFieldId(null)}
        onSave={(id, patch) => setFields((fs) => updateFieldHelper(fs, id, patch))}
        onDelete={(id) => setFields((fs) => removeFieldHelper(fs, id))}
      />
      <EditValueDialog
        field={editValueField}
        onClose={() => setEditValueId(null)}
        onSave={(id, patch) => setFields((fs) => updateFieldHelper(fs, id, patch))}
      />
      <IntegrationSnippetDialog
        open={sdkOpen}
        onOpenChange={setSdkOpen}
        kind="config"
        name={key || "new_config"}
      />
      <ImportJsonDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImport={(next) => setFields(next)}
      />
      <PasteJsonDialog
        open={pasteOpen}
        onClose={() => setPasteOpen(false)}
        fields={fields}
        onApply={(next) => setFields(next)}
      />
    </Page>
  );
}

// ── Stepper ─────────────────────────────────────────────────────────

function Stepper({ stepIdx, onJump }: { stepIdx: number; onJump: (i: number) => void }) {
  return (
    <div
      role="tablist"
      aria-label="Wizard steps"
      className="flex items-center gap-0 rounded-[var(--radius-md)] border border-[var(--se-line-2)] bg-[var(--se-bg-1)] px-5 py-3.5"
    >
      {STEPS.flatMap((s, i) => {
        const state = i < stepIdx ? "done" : i === stepIdx ? "current" : "idle";
        const items: React.ReactNode[] = [
          <button
            key={s.k}
            type="button"
            role="tab"
            aria-selected={state === "current"}
            onClick={() => onJump(i)}
            className={cn(
              "flex shrink-0 items-center gap-2.5 rounded-[8px] p-2 transition-colors",
              state === "current" && "text-foreground",
              state === "done" && "text-[var(--se-fg-2)]",
              state === "idle" && "text-[var(--se-fg-3)] hover:text-[var(--se-fg-2)]",
            )}
          >
            <span
              className={cn(
                "grid size-[26px] shrink-0 place-items-center rounded-full border font-mono text-[12px] font-medium transition-all",
                state === "done" &&
                  "border-[var(--se-accent)] bg-[var(--se-accent)] text-[var(--se-accent-fg)]",
                state === "current" &&
                  "border-[var(--se-accent)] bg-[var(--se-bg-1)] text-foreground shadow-[0_0_0_3px_color-mix(in_oklab,var(--se-accent)_22%,transparent)]",
                state === "idle" &&
                  "border-[var(--se-line-2)] bg-[var(--se-bg-3)] text-[var(--se-fg-3)]",
              )}
            >
              {state === "done" ? <Check className="size-3" /> : i + 1}
            </span>
            <span className="flex flex-col items-start leading-[1.2]">
              <span className="text-[13.5px] font-medium tracking-[-0.005em]">{s.label}</span>
              <span
                className={cn(
                  "mt-0.5 font-mono text-[10px] tracking-[0.06em] uppercase",
                  state === "current" ? "text-[var(--se-accent)]" : "text-[var(--se-fg-4)]",
                )}
              >
                {s.tag}
              </span>
            </span>
          </button>,
        ];
        if (i < STEPS.length - 1) {
          items.push(
            <span
              key={`${s.k}-c`}
              className={cn(
                "mx-1.5 h-px min-w-[18px] flex-1",
                i < stepIdx ? "bg-[var(--se-accent)]" : "bg-[var(--se-line-2)]",
              )}
            />,
          );
        }
        return items;
      })}
    </div>
  );
}

// ── Step head ───────────────────────────────────────────────────────

function StepHead({
  stem,
  title,
  description,
  right,
}: {
  stem: string;
  title: string;
  description: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-6 px-1">
      <div>
        <div className="font-mono text-[11px] tracking-[0.06em] uppercase text-[var(--se-accent)]">
          {stem}
        </div>
        <h2 className="mt-1.5 mb-1 text-[24px] font-semibold tracking-[-0.015em]">{title}</h2>
        <p className="m-0 max-w-[64ch] text-[13.5px] leading-[1.55] text-[var(--se-fg-2)]">
          {description}
        </p>
      </div>
      {right}
    </div>
  );
}

// ── Step 1: Details ─────────────────────────────────────────────────

function StepDetails({
  keyValue,
  setKeyValue,
  description,
  setDescription,
  group,
  setGroup,
  owner,
  setOwner,
  draftFields,
}: {
  keyValue: string;
  setKeyValue: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  group: string;
  setGroup: (v: string) => void;
  owner: string;
  setOwner: (v: string) => void;
  draftFields: boolean;
}) {
  return (
    <div className="flex flex-col gap-4">
      <StepHead
        stem="step 1 of 4 · metadata"
        title="Name and describe this config"
        description="The key is how SDK consumers fetch this config. Description helps your team find and audit it later."
      />

      <div className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--se-line-2)] bg-[var(--se-bg-1)]">
        <div className="flex items-center gap-3 border-b border-[var(--se-line-2)] bg-[var(--se-bg-2)] px-4 py-3">
          <span className="text-[13.5px] font-medium tracking-[-0.005em]">
            Configuration metadata
          </span>
          <span className="font-mono text-[10.5px] tracking-[0.06em] uppercase text-[var(--se-fg-3)]">
            key · description{draftFields ? " · group · owner" : ""}
          </span>
        </div>

        <DetailsRow label="Key" required>
          <input
            id="config-key"
            aria-label="Key"
            value={keyValue}
            onChange={(e) => setKeyValue(e.target.value)}
            placeholder="features.shipping"
            data-testid="config-key-input"
            className="h-9 w-full rounded-md border border-[var(--se-line-2)] bg-[var(--se-bg-2)] px-3 font-mono text-[13.5px] font-medium outline-none transition-colors hover:border-[var(--se-line-3)] hover:bg-[var(--se-bg-3)] focus:border-[var(--se-accent)] focus:bg-[var(--se-bg-1)]"
          />
          <div className="mt-2 text-[11.5px] leading-[1.55] text-[var(--se-fg-3)]">
            Lowercase, dot-separated. Example{" "}
            <code className="rounded-[3px] bg-[var(--se-bg-3)] px-1.5 py-px font-mono text-[11px] text-[var(--se-fg-2)]">
              features.shipping
            </code>
            .
          </div>
        </DetailsRow>

        {draftFields ? (
          <DetailsRow label="Group">
            <select
              aria-label="Group"
              value={group}
              onChange={(e) => setGroup(e.target.value)}
              className="h-9 w-full rounded-md border border-[var(--se-line-2)] bg-[var(--se-bg-2)] px-3 text-[13.5px] outline-none transition-colors hover:border-[var(--se-line-3)] hover:bg-[var(--se-bg-3)] focus:border-[var(--se-accent)] focus:bg-[var(--se-bg-1)]"
            >
              <option value="commerce">commerce</option>
              <option value="platform">platform</option>
              <option value="ml">ml</option>
              <option value="growth">growth</option>
            </select>
            <div className="mt-2 text-[11.5px] leading-[1.55] text-[var(--se-fg-3)]">
              Used to organize configs in the dashboard sidebar.
            </div>
          </DetailsRow>
        ) : null}

        <DetailsRow label="Description">
          <textarea
            aria-label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What this config does, who owns it, and when to update it."
            className="min-h-[104px] w-full rounded-md border border-[var(--se-line-2)] bg-[var(--se-bg-2)] px-3 py-2.5 text-[13.5px] leading-[1.55] outline-none transition-colors hover:border-[var(--se-line-3)] hover:bg-[var(--se-bg-3)] focus:border-[var(--se-accent)] focus:bg-[var(--se-bg-1)]"
          />
          <div className="mt-2 text-[11.5px] leading-[1.55] text-[var(--se-fg-3)]">
            Surfaces in the configs list and audit log entries.
          </div>
        </DetailsRow>

        {draftFields ? (
          <DetailsRow label="Owner">
            <input
              aria-label="Owner"
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
              placeholder="Growth team"
              className="h-9 w-full rounded-md border border-[var(--se-line-2)] bg-[var(--se-bg-2)] px-3 text-[13.5px] outline-none transition-colors hover:border-[var(--se-line-3)] hover:bg-[var(--se-bg-3)] focus:border-[var(--se-accent)] focus:bg-[var(--se-bg-1)]"
            />
            <div className="mt-2 text-[11.5px] leading-[1.55] text-[var(--se-fg-3)]">
              Team or individual responsible. Pinged on validation failures.
            </div>
          </DetailsRow>
        ) : null}
      </div>
    </div>
  );
}

function DetailsRow({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[200px_minmax(0,1fr)] items-start gap-6 border-b border-[var(--se-line)] px-5 py-4 last:border-b-0">
      <span className="flex items-center gap-1.5 pt-2.5 font-mono text-[11px] tracking-[0.06em] uppercase text-[var(--se-fg-3)]">
        {label}
        {required ? <span className="text-[var(--se-accent)]">*</span> : null}
      </span>
      <div>{children}</div>
    </div>
  );
}

// ── Step 2: Schema ──────────────────────────────────────────────────

function StepSchema({
  fields,
  setFields,
  expanded,
  setExpanded,
  openEditField,
  jsonView,
  setJsonView,
  openImport,
}: {
  fields: WizField[];
  setFields: React.Dispatch<React.SetStateAction<WizField[]>>;
  expanded: Record<string, boolean>;
  setExpanded: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  openEditField: (id: string) => void;
  jsonView: boolean;
  setJsonView: (v: boolean) => void;
  openImport: () => void;
}) {
  const flat = useMemo(() => flatten(fields, expanded), [fields, expanded]);
  const fieldCount = useMemo(() => countAllFields(fields), [fields]);

  function onAddRoot() {
    const nf = blankField();
    setFields((fs) => [...fs, nf]);
    openEditField(nf.id);
  }
  function onAddChild(id: string) {
    setFields((fs) => addChild(fs, id));
    setExpanded((e) => ({ ...e, [id]: true }));
  }
  function onRemove(id: string) {
    setFields((fs) => removeFieldHelper(fs, id));
  }

  return (
    <div className="flex flex-col gap-4">
      <StepHead
        stem="step 2 of 4 · structure"
        title="Define the schema"
        description="Add fields, pick types, and describe what each one controls. Click a row to edit it. Default values come next."
        right={
          <span className="font-mono text-[11px] text-[var(--se-fg-3)]">
            {fieldCount} field{fieldCount === 1 ? "" : "s"}
          </span>
        }
      />

      <div className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--se-line-2)] bg-[var(--se-bg-1)]">
        <div className="flex items-center gap-2 border-b border-[var(--se-line-2)] bg-[var(--se-bg-2)] px-4 py-2.5">
          <Button type="button" size="sm" onClick={onAddRoot}>
            <Plus className="size-3.5" /> Add field
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={openImport}>
            <Braces className="size-3" /> Import JSON
          </Button>
          <div className="flex-1" />
          <div className="flex overflow-hidden rounded-md border border-[var(--se-line-2)] bg-[var(--se-bg-1)]">
            <button
              type="button"
              onClick={() => setJsonView(false)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-[12px]",
                !jsonView
                  ? "bg-[var(--se-bg-3)] text-foreground shadow-[inset_0_0_0_1px_var(--se-line-2)]"
                  : "text-[var(--se-fg-3)] hover:text-[var(--se-fg-2)]",
              )}
              aria-pressed={!jsonView}
            >
              <List className="size-3" /> Table
            </button>
            <button
              type="button"
              onClick={() => setJsonView(true)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-[12px]",
                jsonView
                  ? "bg-[var(--se-bg-3)] text-foreground shadow-[inset_0_0_0_1px_var(--se-line-2)]"
                  : "text-[var(--se-fg-3)] hover:text-[var(--se-fg-2)]",
              )}
              aria-pressed={jsonView}
            >
              <Braces className="size-3" /> JSONSchema
            </button>
          </div>
        </div>

        {!jsonView ? (
          fields.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
              <p className="text-[13px] text-[var(--se-fg-2)]">No fields yet.</p>
              <p className="max-w-[44ch] text-[12px] text-[var(--se-fg-3)]">
                Each field becomes a property on the config object. Click <b>Add field</b> to start.
              </p>
              <Button type="button" variant="outline" size="sm" onClick={onAddRoot}>
                <Plus className="size-3.5" /> Add field
              </Button>
            </div>
          ) : (
            <div className="flex flex-col">
              <div
                className="grid items-stretch border-b border-[var(--se-line-2)] bg-[var(--se-bg-3)]"
                style={{ gridTemplateColumns: "minmax(0,1.05fr) 130px minmax(0,1.6fr) auto" }}
              >
                {["Field name", "Type", "Description", ""].map((h, i) => (
                  <div
                    key={i}
                    className="px-3.5 py-2 font-mono text-[10px] tracking-[0.08em] uppercase text-[var(--se-fg-3)]"
                  >
                    {h}
                  </div>
                ))}
              </div>
              {flat.map(({ field, depth }) => (
                <SchemaRow
                  key={field.id}
                  field={field}
                  depth={depth}
                  expanded={!!expanded[field.id]}
                  onToggle={(id) => setExpanded((e) => ({ ...e, [id]: !e[id] }))}
                  onEdit={openEditField}
                  onAddChild={onAddChild}
                  onRemove={onRemove}
                />
              ))}
            </div>
          )
        ) : (
          <pre className="m-0 max-h-[560px] overflow-auto bg-[var(--se-bg-1)] px-5 py-4 font-mono text-[12.5px] leading-[1.7] text-[var(--se-fg-2)]">
            {JSON.stringify(buildSchemaAndDefault(fields).schema, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}

function SchemaRow({
  field,
  depth,
  expanded,
  onToggle,
  onEdit,
  onAddChild,
  onRemove,
}: {
  field: WizField;
  depth: number;
  expanded: boolean;
  onToggle: (id: string) => void;
  onEdit: (id: string) => void;
  onAddChild: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const expandable = field.type === "object";
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onEdit(field.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onEdit(field.id);
        }
      }}
      className="group/row grid cursor-default items-stretch border-b border-[var(--se-line)] transition-colors hover:bg-[color-mix(in_oklab,var(--se-accent)_3%,var(--se-bg-1))] last:border-b-0"
      style={{ gridTemplateColumns: "minmax(0,1.05fr) 130px minmax(0,1.6fr) auto" }}
    >
      <div className="flex min-w-0 items-center gap-2 px-3.5 py-2.5">
        <span className="flex shrink-0 items-stretch">
          {Array.from({ length: depth }, (_, i) => (
            <span key={i} className="ml-2.5 w-5 border-l border-[var(--se-line-2)]" aria-hidden />
          ))}
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (expandable) onToggle(field.id);
          }}
          aria-label={expanded ? "Collapse" : "Expand"}
          className={cn(
            "grid size-[18px] shrink-0 place-items-center rounded-[3px] text-[var(--se-fg-3)]",
            expandable ? "hover:bg-[var(--se-bg-3)] hover:text-foreground" : "invisible",
          )}
        >
          {expanded ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
        </button>
        <span className="overflow-hidden font-mono text-[13px] font-medium text-foreground text-ellipsis whitespace-nowrap">
          {field.key}
          {field.required ? (
            <span className="ml-px font-semibold text-[var(--se-accent)]">*</span>
          ) : (
            <span className="text-[var(--se-fg-4)]">?</span>
          )}
        </span>
      </div>
      <div className="flex items-center border-l border-[var(--se-line)] px-3.5 py-2.5">
        <TypePill field={field} />
      </div>
      <div
        className={cn(
          "flex min-w-0 items-center overflow-hidden border-l border-[var(--se-line)] px-3.5 py-2.5 text-[12.5px] leading-[1.45] whitespace-nowrap text-ellipsis",
          field.description ? "text-[var(--se-fg-2)]" : "italic text-[var(--se-fg-4)]",
        )}
      >
        {field.description || "No description"}
      </div>
      <div
        className="flex items-center gap-1 px-2.5 opacity-50 transition-opacity group-hover/row:opacity-100"
        onClick={(e) => e.stopPropagation()}
      >
        {expandable ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => onAddChild(field.id)}
            aria-label="Add child field"
            className="text-[var(--se-fg-3)] hover:text-foreground"
          >
            <Plus className="size-3" />
          </Button>
        ) : null}
        <Button type="button" variant="outline" size="xs" onClick={() => onEdit(field.id)}>
          <Edit3 className="size-3" /> Edit
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => onRemove(field.id)}
          aria-label={`Remove field ${field.key}`}
          className="text-[var(--se-fg-3)] hover:bg-[var(--se-danger-soft)] hover:text-[var(--se-danger)]"
        >
          <Trash2 className="size-3" />
        </Button>
      </div>
    </div>
  );
}

function TypePill({ field }: { field: WizField }) {
  const opt = TYPE_OPTS.find((t) => t.k === field.type);
  const colorClass = (() => {
    switch (field.type) {
      case "string":
      case "email":
      case "url":
      case "uuid":
        return "text-[var(--se-accent)] border-[color-mix(in_oklab,var(--se-accent)_30%,var(--se-line-2))]";
      case "number":
      case "date":
      case "datetime":
        return "text-[#f0c674] border-[color-mix(in_oklab,#f0c674_30%,var(--se-line-2))]";
      case "boolean":
        return "text-[#74c7ec] border-[color-mix(in_oklab,#74c7ec_30%,var(--se-line-2))]";
      case "object":
        return "text-[#a78bfa] border-[color-mix(in_oklab,#a78bfa_30%,var(--se-line-2))]";
      case "array":
        return "text-[#c084fc] border-[color-mix(in_oklab,#c084fc_30%,var(--se-line-2))]";
      case "enum":
        return "text-[#74c7ec] border-[color-mix(in_oklab,#74c7ec_30%,var(--se-line-2))]";
      default:
        return "text-[var(--se-fg-3)] border-[var(--se-line-2)]";
    }
  })();
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-[4px] border bg-[var(--se-bg-3)] px-2 py-0.5 font-mono text-[10.5px] tracking-[0.02em] lowercase",
        colorClass,
      )}
    >
      <span className="text-[10px] font-semibold opacity-85">{opt?.glyph}</span>
      {field.type}
      {field.type === "array" && field.itemsType ? `<${field.itemsType}>` : ""}
    </span>
  );
}

// ── Step 3: Values ──────────────────────────────────────────────────

function StepValues({
  fields,
  expanded,
  setExpanded,
  openEditValue,
  missing,
  openPaste,
}: {
  fields: WizField[];
  expanded: Record<string, boolean>;
  setExpanded: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  openEditValue: (id: string) => void;
  missing: number;
  openPaste: () => void;
}) {
  const flat = useMemo(() => flatten(fields, expanded), [fields, expanded]);
  const fieldCount = useMemo(() => countAllFields(fields), [fields]);

  return (
    <div className="flex flex-col gap-4">
      <StepHead
        stem="step 3 of 4 · prefill"
        title="Set default values"
        description="These are what consumers receive when they fetch this config. Click any row to open an editor sized to the field type."
        right={
          <div className="flex items-center gap-2.5">
            {missing > 0 ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[color-mix(in_oklab,var(--se-warn)_35%,transparent)] bg-[var(--se-warn-soft)] px-2.5 py-0.5 font-mono text-[10.5px] tracking-[0.04em] uppercase text-[var(--se-warn)]">
                {missing} required missing
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[color-mix(in_oklab,var(--se-accent)_35%,transparent)] bg-[var(--se-accent-soft)] px-2.5 py-0.5 font-mono text-[10.5px] tracking-[0.04em] uppercase text-[var(--se-accent)]">
                <Check className="size-2.5" /> All required set
              </span>
            )}
            <span className="font-mono text-[11px] text-[var(--se-fg-3)]">
              {fieldCount} field{fieldCount === 1 ? "" : "s"}
            </span>
          </div>
        }
      />

      <div className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--se-line-2)] bg-[var(--se-bg-1)]">
        <div className="flex items-center gap-2 border-b border-[var(--se-line-2)] bg-[var(--se-bg-2)] px-4 py-2.5">
          <span className="flex items-center gap-2 font-mono text-[11.5px] text-[var(--se-fg-3)]">
            <Edit3 className="size-3" />
            Click a row to edit its value
          </span>
          <div className="flex-1" />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={openPaste}
            disabled={fields.length === 0}
          >
            <ClipboardPaste className="size-3" /> Paste JSON
          </Button>
        </div>

        {fields.length === 0 ? (
          <div className="px-6 py-10 text-center text-[13px] text-[var(--se-fg-3)]">
            Define some fields in Step 2 first.
          </div>
        ) : (
          <div className="flex flex-col">
            <div
              className="grid items-stretch border-b border-[var(--se-line-2)] bg-[var(--se-bg-3)]"
              style={{ gridTemplateColumns: "minmax(0,1fr) 130px minmax(0,1.5fr) auto" }}
            >
              {["Field name", "Type", "Default value", ""].map((h, i) => (
                <div
                  key={i}
                  className="px-3.5 py-2 font-mono text-[10px] tracking-[0.08em] uppercase text-[var(--se-fg-3)]"
                >
                  {h}
                </div>
              ))}
            </div>
            {flat.map(({ field, depth }) => (
              <ValueRow
                key={field.id}
                field={field}
                depth={depth}
                expanded={!!expanded[field.id]}
                onToggle={(id) => setExpanded((e) => ({ ...e, [id]: !e[id] }))}
                onEdit={openEditValue}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ValueRow({
  field,
  depth,
  expanded,
  onToggle,
  onEdit,
}: {
  field: WizField;
  depth: number;
  expanded: boolean;
  onToggle: (id: string) => void;
  onEdit: (id: string) => void;
}) {
  const expandable = field.type === "object";
  const editable = field.type !== "object";
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => {
        if (editable) onEdit(field.id);
      }}
      onKeyDown={(e) => {
        if (editable && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onEdit(field.id);
        }
      }}
      className="group/row grid cursor-default items-stretch border-b border-[var(--se-line)] transition-colors hover:bg-[color-mix(in_oklab,var(--se-accent)_3%,var(--se-bg-1))] last:border-b-0"
      style={{ gridTemplateColumns: "minmax(0,1fr) 130px minmax(0,1.5fr) auto" }}
    >
      <div className="flex min-w-0 items-center gap-2 px-3.5 py-2.5">
        <span className="flex shrink-0 items-stretch">
          {Array.from({ length: depth }, (_, i) => (
            <span key={i} className="ml-2.5 w-5 border-l border-[var(--se-line-2)]" aria-hidden />
          ))}
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (expandable) onToggle(field.id);
          }}
          aria-label={expanded ? "Collapse" : "Expand"}
          className={cn(
            "grid size-[18px] shrink-0 place-items-center rounded-[3px] text-[var(--se-fg-3)]",
            expandable ? "hover:bg-[var(--se-bg-3)] hover:text-foreground" : "invisible",
          )}
        >
          {expanded ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
        </button>
        <span className="overflow-hidden font-mono text-[13px] font-medium text-foreground text-ellipsis whitespace-nowrap">
          {field.key}
          {field.required ? (
            <span className="ml-px font-semibold text-[var(--se-accent)]">*</span>
          ) : (
            <span className="text-[var(--se-fg-4)]">?</span>
          )}
        </span>
      </div>
      <div className="flex items-center border-l border-[var(--se-line)] px-3.5 py-2.5">
        <TypePill field={field} />
      </div>
      <div className="flex min-w-0 items-center gap-2 border-l border-[var(--se-line)] bg-[color-mix(in_oklab,var(--se-bg-2)_50%,transparent)] px-3.5 py-2.5 font-mono text-[12.5px] text-foreground group-hover/row:bg-[color-mix(in_oklab,var(--se-bg-2)_70%,transparent)]">
        <ValueSummary field={field} />
      </div>
      <div
        className="flex items-center gap-1 px-2.5 opacity-50 transition-opacity group-hover/row:opacity-100"
        onClick={(e) => e.stopPropagation()}
      >
        {editable ? (
          <Button type="button" variant="outline" size="xs" onClick={() => onEdit(field.id)}>
            <Edit3 className="size-3" /> Edit
          </Button>
        ) : (
          <span className="px-2 text-[11px] text-[var(--se-fg-4)]">edit children individually</span>
        )}
      </div>
    </div>
  );
}

function ValueSummary({ field }: { field: WizField }) {
  if (field.type === "object") {
    const n = (field.children ?? []).length;
    return (
      <span className="italic text-[var(--se-fg-4)]">
        {`{ ${n} ${n === 1 ? "field" : "fields"} }`}
      </span>
    );
  }
  if (field.type === "array") {
    const arr = Array.isArray(field.arrayValue) ? field.arrayValue : [];
    if (arr.length === 0) return <span className="italic text-[var(--se-fg-4)]">[ empty ]</span>;
    return (
      <>
        {arr.slice(0, 3).map((v, i) => (
          <span
            key={i}
            className="inline-flex items-center rounded-[4px] border border-[color-mix(in_oklab,var(--se-accent)_25%,transparent)] bg-[color-mix(in_oklab,var(--se-accent)_12%,transparent)] px-1.5 py-px font-mono text-[11px] text-[var(--se-accent)]"
          >
            &quot;{String(v ?? "")}&quot;
          </span>
        ))}
        {arr.length > 3 ? (
          <span className="text-[11.5px] text-[var(--se-fg-3)]">+{arr.length - 3} more</span>
        ) : null}
      </>
    );
  }
  if (field.type === "boolean")
    return <span className="text-[#74c7ec]">{String(!!field.value)}</span>;
  if (field.type === "enum") {
    return field.value ? (
      <span className="inline-flex items-center rounded-[4px] border border-[color-mix(in_oklab,#74c7ec_25%,transparent)] bg-[color-mix(in_oklab,#74c7ec_12%,transparent)] px-1.5 py-px font-mono text-[11px] text-[#74c7ec]">
        {String(field.value)}
      </span>
    ) : (
      <span className="italic text-[var(--se-fg-4)]">— pick one —</span>
    );
  }
  if (field.type === "number") {
    return field.value === "" || field.value == null ? (
      <span className="italic text-[var(--se-fg-4)]">—</span>
    ) : (
      <span className="text-[#f0c674]">{String(field.value)}</span>
    );
  }
  if (!field.value) return <span className="italic text-[var(--se-fg-4)]">—</span>;
  return <span className="text-[var(--se-accent)]">&quot;{String(field.value)}&quot;</span>;
}

// ── Step 4: Review ──────────────────────────────────────────────────

const VERSIONS = [
  { v: "v3", state: "draft" as const, who: "You · just now", note: "Initial draft" },
  { v: "v2", state: "live" as const, who: "Maya Patel · 2h ago", note: "Published · 8 services" },
  { v: "v1", state: "archived" as const, who: "Jin Kobayashi · 3d ago", note: "Initial schema" },
];

function StepReview({
  keyValue,
  description,
  fields,
  built,
  openSdk,
  draftFields,
}: {
  keyValue: string;
  description: string;
  fields: WizField[];
  built: { value: Record<string, unknown>; error: string | null };
  openSdk: () => void;
  draftFields: boolean;
}) {
  const fieldCount = useMemo(() => countAllFields(fields), [fields]);
  const valuesObj = useMemo(() => {
    const o: Record<string, unknown> = {};
    for (const f of fields) o[f.key] = fieldToJson(f);
    return o;
  }, [fields]);

  function copyJson() {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(JSON.stringify(valuesObj, null, 2)).catch(() => {});
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <StepHead
        stem="step 4 of 4 · publish"
        title="Review & integrate"
        description="Double-check the metadata and values. After publish, the SDK snippet stays available from this config's row in the configs list."
        right={
          built.error ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[color-mix(in_oklab,var(--se-danger)_35%,transparent)] bg-[var(--se-danger-soft)] px-2.5 py-0.5 font-mono text-[10.5px] tracking-[0.04em] uppercase text-[var(--se-danger)]">
              {built.error}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[color-mix(in_oklab,var(--se-accent)_35%,transparent)] bg-[var(--se-accent-soft)] px-2.5 py-0.5 font-mono text-[10.5px] tracking-[0.04em] uppercase text-[var(--se-accent)]">
              <Check className="size-2.5" /> Ready to publish
            </span>
          )
        }
      />

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[1.1fr_1fr]">
        <div className="flex flex-col gap-4">
          <ReviewCard title="Metadata" sub="step 1">
            <ReviewItem label="Key" value={<span className="font-mono">{keyValue || "—"}</span>} />
            <ReviewItem
              label="Description"
              value={
                description ? (
                  <span className="text-[var(--se-fg-2)]">{description}</span>
                ) : (
                  <em className="text-[var(--se-fg-4)]">—</em>
                )
              }
            />
          </ReviewCard>

          {draftFields ? (
            <ReviewCard title="Versions" sub={`${VERSIONS.length} total`}>
              <div className="flex flex-col">
                {VERSIONS.map((v, i) => (
                  <div
                    key={v.v}
                    className="relative flex items-start gap-3 border-b border-[var(--se-line)] px-4 py-3 last:border-b-0"
                  >
                    <span
                      className={cn(
                        "absolute left-[23px] top-0 bottom-0 w-px bg-[var(--se-line-2)]",
                        i === 0 && "top-[18px]",
                        i === VERSIONS.length - 1 && "bottom-auto h-[18px]",
                      )}
                      aria-hidden
                    />
                    <span
                      className={cn(
                        "mt-1 size-[9px] shrink-0 rounded-full ring-[3px] ring-[var(--se-bg-1)]",
                        v.state === "live" &&
                          "bg-[var(--se-accent)] [box-shadow:0_0_0_5px_color-mix(in_oklab,var(--se-accent)_30%,transparent)]",
                        v.state === "draft" && "bg-[var(--se-warn)]",
                        v.state === "archived" && "bg-[var(--se-fg-4)]",
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 font-mono text-[13px] font-medium">
                        <b>{v.v}</b>
                        {v.state === "live" ? (
                          <span className="se-badge se-badge-live">
                            <span className="dot" />
                            LIVE
                          </span>
                        ) : null}
                        {v.state === "draft" ? (
                          <span className="se-badge se-badge-paused">
                            <span className="dot" />
                            DRAFT
                          </span>
                        ) : null}
                        {v.state === "archived" ? <span className="se-badge">archived</span> : null}
                      </div>
                      <div className="mt-0.5 font-mono text-[11px] text-[var(--se-fg-3)]">
                        {v.who} · {v.note}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ReviewCard>
          ) : null}

          <ReviewCard
            title="Schema"
            sub={`step 2 · ${fieldCount} field${fieldCount === 1 ? "" : "s"}`}
          >
            {fields.length === 0 ? (
              <div className="px-4 py-3 text-[13px] text-[var(--se-fg-3)]">No fields defined.</div>
            ) : (
              fields.map((f) => (
                <div
                  key={f.id}
                  className="grid grid-cols-[170px_1fr] items-start gap-3.5 border-b border-[var(--se-line)] px-4 py-3 last:border-b-0"
                >
                  <span className="pt-0.5 font-mono text-[10.5px] tracking-[0.06em] uppercase text-[var(--se-fg-3)]">
                    {f.key}
                  </span>
                  <span className="flex flex-wrap items-center gap-2 text-[13.5px] leading-[1.55]">
                    <TypePill field={f} />
                    {f.description ? (
                      <span className="text-[12px] text-[var(--se-fg-3)]">{f.description}</span>
                    ) : null}
                  </span>
                </div>
              ))
            )}
          </ReviewCard>
        </div>

        <div className="flex flex-col gap-4 lg:sticky lg:top-4">
          <ReviewCard
            title="Default values · JSON"
            sub="step 3"
            right={
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                onClick={copyJson}
                aria-label="Copy JSON"
              >
                <Copy className="size-3" />
              </Button>
            }
          >
            <pre className="m-0 max-h-[420px] overflow-auto bg-[var(--se-bg-1)] px-4 py-3.5 font-mono text-[12px] leading-[1.65] whitespace-pre text-[var(--se-fg-2)]">
              {JSON.stringify(valuesObj, null, 2)}
            </pre>
          </ReviewCard>

          <div
            className="overflow-hidden rounded-[var(--radius-md)] border bg-[linear-gradient(180deg,color-mix(in_oklab,var(--se-accent)_8%,var(--se-bg-1)),var(--se-bg-1))]"
            style={{
              borderColor: "color-mix(in oklab, var(--se-accent) 35%, var(--se-line-2))",
            }}
          >
            <div
              className="flex items-center gap-3 border-b px-4 py-3"
              style={{
                borderColor: "color-mix(in oklab, var(--se-accent) 25%, var(--se-line-2))",
              }}
            >
              <span className="text-[13.5px] font-medium text-foreground">SDK integration</span>
              <span className="font-mono text-[10.5px] tracking-[0.06em] uppercase text-[var(--se-fg-3)]">
                view code in 7 languages
              </span>
            </div>
            <div className="flex flex-col gap-3.5 px-5 py-4">
              <p className="m-0 text-[13.5px] leading-[1.55] text-[var(--se-fg-2)]">
                After publish, copy a typed SDK snippet for TypeScript, Python, Ruby, Go, Java,
                Rust, or cURL.
              </p>
              <div className="flex flex-wrap gap-1.5">
                {["TypeScript", "Python", "Ruby", "Go", "Java", "Rust", "cURL"].map((l) => (
                  <span
                    key={l}
                    className="rounded-[4px] border border-[var(--se-line-2)] bg-[var(--se-bg-2)] px-2 py-0.5 font-mono text-[11px] text-[var(--se-fg-3)]"
                  >
                    {l}
                  </span>
                ))}
              </div>
              <Button type="button" onClick={openSdk} className="justify-center">
                <Code className="size-3" /> View SDK snippet
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ReviewCard({
  title,
  sub,
  right,
  children,
}: {
  title: string;
  sub: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--se-line-2)] bg-[var(--se-bg-1)]">
      <div className="flex items-center gap-3 border-b border-[var(--se-line-2)] bg-[var(--se-bg-2)] px-4 py-3">
        <span className="text-[13.5px] font-medium tracking-[-0.005em]">{title}</span>
        <span className="font-mono text-[10.5px] tracking-[0.06em] uppercase text-[var(--se-fg-3)]">
          {sub}
        </span>
        {right ? <span className="ml-auto">{right}</span> : null}
      </div>
      <div className="flex flex-col">{children}</div>
    </div>
  );
}

function ReviewItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[170px_1fr] items-start gap-3.5 border-b border-[var(--se-line)] px-4 py-3 last:border-b-0">
      <span className="pt-0.5 font-mono text-[10.5px] tracking-[0.06em] uppercase text-[var(--se-fg-3)]">
        {label}
      </span>
      <span className="text-[13.5px] leading-[1.55]">{value}</span>
    </div>
  );
}
