"use client";

import { useMemo, useState, useTransition } from "react";
import { usePathname } from "next/navigation";
import type { JsonSchema } from "@shipeasy/core";

import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LinkButton } from "@/components/ui/link-button";
import { projectIdFromPathname } from "@/lib/project-path";
import { FieldsEditor, type ConfigField } from "@/components/configs/fields-editor";
import { createConfigAction } from "../actions";

function buildSchemaAndDefault(fields: ConfigField[]): {
  schema: JsonSchema;
  value: Record<string, unknown>;
  error: string | null;
} {
  const properties: Record<string, JsonSchema> = {};
  const required: string[] = [];
  const value: Record<string, unknown> = {};
  const seen = new Set<string>();

  for (const f of fields) {
    const name = f.name.trim();
    if (!name) return { schema: { type: "object" }, value: {}, error: "Every field needs a name" };
    if (seen.has(name))
      return { schema: { type: "object" }, value: {}, error: `Duplicate field name "${name}"` };
    seen.add(name);
    if (f.required) required.push(name);

    if (f.type === "string") {
      properties[name] = { type: "string" };
      value[name] = f.defaultValue;
    } else if (f.type === "number") {
      properties[name] = { type: "number" };
      const n = f.defaultValue === "" ? 0 : Number(f.defaultValue);
      if (!Number.isFinite(n)) {
        return {
          schema: { type: "object" },
          value: {},
          error: `"${name}" default must be a number`,
        };
      }
      value[name] = n;
    } else if (f.type === "boolean") {
      properties[name] = { type: "boolean" };
      value[name] = Boolean(f.defaultValue);
    } else if (f.type === "array") {
      properties[name] = { type: "array", items: { type: f.itemsType } };
      const raw = f.defaultValue
        .split(",")
        .map((v) => v.trim())
        .filter((v) => v.length > 0);
      if (f.itemsType === "number") {
        const arr: number[] = [];
        for (const v of raw) {
          const n = Number(v);
          if (!Number.isFinite(n)) {
            return {
              schema: { type: "object" },
              value: {},
              error: `"${name}" default contains a non-number "${v}"`,
            };
          }
          arr.push(n);
        }
        value[name] = arr;
      } else if (f.itemsType === "boolean") {
        value[name] = raw.map((v) => v === "true");
      } else {
        value[name] = raw;
      }
    } else {
      // enum
      if (f.values.length === 0) {
        return {
          schema: { type: "object" },
          value: {},
          error: `Enum field "${name}" needs at least one option`,
        };
      }
      properties[name] = { type: "string", enum: f.values };
      const def = f.defaultValue || f.values[0];
      if (!f.values.includes(def)) {
        return {
          schema: { type: "object" },
          value: {},
          error: `"${name}" default "${def}" is not in its options`,
        };
      }
      value[name] = def;
    }
  }

  return {
    schema: {
      type: "object",
      properties,
      ...(required.length ? { required } : {}),
      additionalProperties: false,
    },
    value,
    error: null,
  };
}

export default function NewConfigValuePage() {
  const pathname = usePathname();
  const projectId = projectIdFromPathname(pathname) ?? "";
  const cancelHref = `/dashboard/${projectId}/configs/values`;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [fields, setFields] = useState<ConfigField[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const built = useMemo(() => buildSchemaAndDefault(fields), [fields]);

  function submit() {
    setError(null);
    if (!name) {
      setError("Key is required");
      return;
    }
    if (built.error) {
      setError(built.error);
      return;
    }
    startTransition(async () => {
      try {
        await createConfigAction({
          name,
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
    <div className="space-y-5 p-6">
      <PageHeader
        title="New config"
        description="Define a key, the shape of its value, and the default each environment starts with."
        actions={
          <LinkButton variant="ghost" size="sm" href={cancelHref}>
            Cancel
          </LinkButton>
        }
      />

      <Card>
        <CardHeader className="border-b pb-4">
          <CardTitle>Basics</CardTitle>
          <CardDescription>How SDKs will look this config up.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <div className="grid gap-1.5">
            <Label htmlFor="config-key">Key</Label>
            <Input
              id="config-key"
              name="key"
              placeholder="pricing.thresholds"
              className="font-mono"
              required
              pattern="[a-z0-9](?:[a-z0-9_-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9_-]*[a-z0-9])?)*"
              title="Lowercase segments separated by dots, e.g. pricing.thresholds"
              value={name}
              onChange={(e) => setName(e.target.value)}
              data-testid="config-key-input"
            />
            <p className="text-xs text-muted-foreground">
              Used in SDK as <code className="font-mono">getConfig(&apos;{name || "…"}&apos;)</code>
            </p>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="config-description">Description (optional)</Label>
            <Input
              id="config-description"
              name="description"
              placeholder="Tiered pricing thresholds for plan upgrades"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3 border-b pb-4">
          <div className="space-y-1.5">
            <CardTitle>Fields</CardTitle>
            <CardDescription>
              Each field is a property on the returned object. The default value is what every SDK
              gets until you publish a change.
            </CardDescription>
          </div>
          <span className="shrink-0 text-[11px] uppercase tracking-wide text-muted-foreground">
            {fields.length} {fields.length === 1 ? "field" : "fields"}
          </span>
        </CardHeader>
        <CardContent className="pt-4">
          <FieldsEditor fields={fields} onChange={setFields} />
        </CardContent>
      </Card>

      {error ? (
        <div
          role="alert"
          className="rounded-[var(--radius-md)] border border-[color-mix(in_oklab,var(--se-danger)_30%,transparent)] bg-[var(--se-danger-soft)] px-4 py-2 text-[13px] text-[var(--se-danger)]"
        >
          {error}
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-2">
        <p className="text-[12px] text-muted-foreground">
          Fields and defaults can be edited any time. Schema changes do not bump value versions.
        </p>
        <div className="flex gap-2">
          <LinkButton variant="ghost" size="sm" href={cancelHref}>
            Cancel
          </LinkButton>
          <Button size="sm" type="button" onClick={submit} disabled={pending}>
            {pending ? "Creating…" : "Create config"}
          </Button>
        </div>
      </div>
    </div>
  );
}
