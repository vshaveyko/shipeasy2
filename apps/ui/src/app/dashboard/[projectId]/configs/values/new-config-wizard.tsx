"use client";

import { useMemo, useState, useTransition } from "react";
import {
  Braces,
  Check,
  ChevronDown,
  ChevronRight,
  ClipboardPaste,
  Copy,
  Edit3,
  List,
  Plus,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";

import { BigModalWizard, type WizardStep } from "@/components/shell/big-modal-wizard";
import { Button } from "@/components/ui/button";
import { CodeBlock } from "@/components/ui/code-block";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { createConfigAction } from "./actions";
import { EditFieldDialog } from "./new/edit-field-dialog";
import { EditValueDialog } from "./new/edit-value-dialog";
import { ImportJsonDialog } from "./new/import-json-dialog";
import { PasteJsonDialog } from "./new/paste-json-dialog";
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
} from "./new/wizard-helpers";

// Match the server-side `configNameSchema` shape: exactly two segments
// separated by `.`, each `[a-z0-9](?:[a-z0-9_-]*[a-z0-9])?`. The folder
// segment may also be the reserved `_default` namespace.
const KEY_PATTERN =
  /^(?:_default|[a-z0-9](?:[a-z0-9_-]*[a-z0-9])?)\.[a-z0-9](?:[a-z0-9_-]*[a-z0-9])?$/;

export interface NewConfigWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onCreated?: () => void;
}

export function NewConfigWizard({
  open,
  onOpenChange,
  projectId,
  onCreated,
}: NewConfigWizardProps) {
  const [step, setStep] = useState(0);
  const [key, setKey] = useState("");
  const [description, setDescription] = useState("");
  const [fields, setFields] = useState<WizField[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [jsonView, setJsonView] = useState(false);
  const [editFieldId, setEditFieldId] = useState<string | null>(null);
  const [editValueId, setEditValueId] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [pasteOpen, setPasteOpen] = useState(false);
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

  const trimmed = key.trim();
  const keyValid = KEY_PATTERN.test(trimmed);
  const displayKey = trimmed || "your_config";

  function resetAndClose(next: boolean) {
    if (!next) {
      setStep(0);
      setKey("");
      setDescription("");
      setFields([]);
      setExpanded({});
      setJsonView(false);
      setEditFieldId(null);
      setEditValueId(null);
      setImportOpen(false);
      setPasteOpen(false);
    }
    onOpenChange(next);
  }

  function handleSubmit() {
    if (!keyValid) {
      setStep(0);
      return;
    }
    if (built.error) {
      setStep(1);
      return;
    }
    startTransition(async () => {
      try {
        await createConfigAction({
          name: trimmed,
          description: description.trim() || undefined,
          schema: built.schema,
          value: built.value,
        });
        onCreated?.();
      } catch (err) {
        const digest = (err as { digest?: string })?.digest;
        if (typeof digest === "string" && digest.startsWith("NEXT_REDIRECT")) throw err;
        // Other errors surface via the Server Action redirect chain — list pane refresh handles it.
      }
    });
  }

  const steps: WizardStep[] = [
    {
      id: "details",
      label: "Details",
      hint: (
        <>
          The key is how SDK consumers fetch this config — pick a stable, dot-separated name like{" "}
          <code className="font-mono text-[var(--se-fg-2)]">features.shipping</code>.
        </>
      ),
      content: (
        <StepDetails
          keyValue={key}
          setKeyValue={setKey}
          description={description}
          setDescription={setDescription}
        />
      ),
      aside: (
        <>
          <div className="t-caps dim-2">What happens next</div>
          <ul className="t-sm dim flex flex-col gap-1.5">
            <li>Schema → field types, descriptions, required flags.</li>
            <li>Defaults → the value SDK consumers receive on first read.</li>
            <li>Review → ship to dev/staging/prod from the editor.</li>
          </ul>
        </>
      ),
      isValid: () => keyValid,
    },
    {
      id: "schema",
      label: "Schema",
      hint: <>Click a row to edit it. Defaults come next.</>,
      content: (
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
      ),
      isValid: () => keyValid,
    },
    {
      id: "values",
      label: "Defaults",
      hint: (
        <>
          These are what consumers receive on the first read. Click any row to open an editor sized
          to the field type.
        </>
      ),
      content: (
        <StepValues
          fields={fields}
          expanded={expanded}
          setExpanded={setExpanded}
          openEditValue={setEditValueId}
          missing={missing}
          openPaste={() => setPasteOpen(true)}
        />
      ),
      isValid: () => keyValid && !built.error,
    },
    {
      id: "review",
      label: "Review",
      hint: <>Confirm the shape. Submit creates the config and opens the full editor.</>,
      content: (
        <StepReview
          keyValue={trimmed}
          description={description}
          fields={fields}
          built={built}
          fieldCount={fieldCount}
        />
      ),
      isValid: () => keyValid && !built.error,
    },
  ];

  return (
    <>
      <BigModalWizard
        open={open}
        onOpenChange={resetAndClose}
        kind="configs"
        title="Name your config"
        eyebrow={{ project: projectId, area: "Configs" }}
        steps={steps}
        current={step}
        onStepChange={setStep}
        onSubmit={handleSubmit}
        submitLabel={pending ? "Creating…" : "Create config"}
        submitting={pending}
      />
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
    </>
  );
}

// ── Step 1: Details ─────────────────────────────────────────────────

function StepDetails({
  keyValue,
  setKeyValue,
  description,
  setDescription,
}: {
  keyValue: string;
  setKeyValue: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--se-line)] bg-[var(--se-bg-1)]">
        <DetailsRow label="Key" required>
          <input
            id="config-key"
            aria-label="Key"
            value={keyValue}
            onChange={(e) => setKeyValue(e.target.value)}
            placeholder="features.shipping"
            data-testid="config-key-input"
            autoFocus
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

        <DetailsRow label="Description">
          <textarea
            id="config-description"
            aria-label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What this config does, who owns it, and when to update it."
            className="min-h-[88px] w-full rounded-md border border-[var(--se-line-2)] bg-[var(--se-bg-2)] px-3 py-2.5 text-[13.5px] leading-[1.55] outline-none transition-colors hover:border-[var(--se-line-3)] hover:bg-[var(--se-bg-3)] focus:border-[var(--se-accent)] focus:bg-[var(--se-bg-1)]"
          />
          <div className="mt-2 text-[11.5px] leading-[1.55] text-[var(--se-fg-3)]">
            Surfaces in the configs list and audit log entries.
          </div>
        </DetailsRow>
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
    <div className="grid grid-cols-[160px_minmax(0,1fr)] items-start gap-5 border-b border-[var(--se-line)] px-4 py-3 last:border-b-0">
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
    <div className="flex flex-col gap-3">
      <div className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--se-line-2)] bg-[var(--se-bg-1)]">
        <div className="flex items-center gap-2 border-b border-[var(--se-line-2)] bg-[var(--se-bg-2)] px-4 py-2.5">
          <Button type="button" size="sm" onClick={onAddRoot}>
            <Plus className="size-3.5" /> Add field
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={openImport}>
            <Braces className="size-3" /> Import JSON
          </Button>
          <span className="font-mono text-[11px] text-[var(--se-fg-3)]">
            {fieldCount} field{fieldCount === 1 ? "" : "s"}
          </span>
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

// ── Step 3: Defaults ────────────────────────────────────────────────

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
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2.5">
        {missing > 0 ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[color-mix(in_oklab,var(--se-warn)_35%,transparent)] bg-[var(--se-warn-soft)] px-2.5 py-0.5 font-mono text-[10.5px] tracking-[0.04em] uppercase text-[var(--se-warn)]">
            {missing} required missing
          </span>
        ) : fieldCount > 0 ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[color-mix(in_oklab,var(--se-accent)_35%,transparent)] bg-[var(--se-accent-soft)] px-2.5 py-0.5 font-mono text-[10.5px] tracking-[0.04em] uppercase text-[var(--se-accent)]">
            <Check className="size-2.5" /> All required set
          </span>
        ) : null}
        <span className="font-mono text-[11px] text-[var(--se-fg-3)]">
          {fieldCount} field{fieldCount === 1 ? "" : "s"}
        </span>
      </div>

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
            Define some fields in Schema first.
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

// ── Step 4: Review + Integrate ──────────────────────────────────────

function StepReview({
  keyValue,
  description,
  fields,
  built,
  fieldCount,
}: {
  keyValue: string;
  description: string;
  fields: WizField[];
  built: { value: Record<string, unknown>; error: string | null };
  fieldCount: number;
}) {
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
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-1 items-start gap-3 lg:grid-cols-[1.1fr_1fr]">
        <div className="flex flex-col gap-3">
          <ReviewCard title="Metadata" sub="step 1">
            <ReviewItem
              label="Key"
              value={
                <span className="flex items-center gap-2 font-mono">
                  <SlidersHorizontal className="size-3.5 text-[var(--se-accent)]" />
                  {keyValue || "—"}
                </span>
              }
            />
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

        <div className="flex flex-col gap-3 lg:sticky lg:top-2">
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
            {built.error ? (
              <div className="px-4 py-3 text-[12.5px] text-[var(--se-danger)]">{built.error}</div>
            ) : null}
            <pre className="m-0 max-h-[260px] overflow-auto bg-[var(--se-bg-1)] px-4 py-3.5 font-mono text-[12px] leading-[1.65] whitespace-pre text-[var(--se-fg-2)]">
              {JSON.stringify(valuesObj, null, 2)}
            </pre>
          </ReviewCard>

          <ReviewCard title="SDK integration" sub="step 4">
            <div className="px-4 py-3.5">
              <Integrate configKey={keyValue || "your_config"} />
            </div>
          </ReviewCard>
        </div>
      </div>
    </div>
  );
}

function Integrate({ configKey }: { configKey: string }) {
  const snippets = useMemo(() => buildSnippets(configKey), [configKey]);
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

const cfg = await shipeasy.getConfig('${key}');
console.log(cfg);`,
    py: `from shipeasy import client

cfg = client.get_config("${key}")
print(cfg)`,
    go: `cfg, _ := shipeasy.GetConfig(ctx, "${key}")
fmt.Printf("%+v\\n", cfg)`,
    curl: `curl -H "Authorization: Bearer $SHIPEASY_KEY" \\
  https://api.shipeasy.dev/v1/configs/${key}`,
  };
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
