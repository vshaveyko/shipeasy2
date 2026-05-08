"use client";

import { useState, useTransition } from "react";
import type { JsonSchema } from "@shipeasy/core";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LinkButton } from "@/components/ui/link-button";
import { SchemaBuilder } from "@/components/configs/schema-builder";
import { ValueForm } from "@/components/configs/value-form";
import { createConfigAction } from "../actions";

const PERMISSIVE_SCHEMA: JsonSchema = {
  type: "object",
  properties: {},
  additionalProperties: true,
};

export default function NewConfigValuePage() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [schema, setSchema] = useState<JsonSchema>(PERMISSIVE_SCHEMA);
  const [value, setValue] = useState<unknown>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    if (!name) {
      setError("Key is required");
      return;
    }
    startTransition(async () => {
      try {
        await createConfigAction({
          name,
          description: description || undefined,
          schema,
          value,
        });
      } catch (err) {
        setError((err as Error).message);
      }
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="New config"
        description="Define the shape with the schema editor on the left, then provide a default value."
        actions={
          <LinkButton variant="ghost" size="sm" href="/dashboard/configs/values">
            Cancel
          </LinkButton>
        }
      />

      <Card>
        <CardHeader className="border-b pb-4">
          <CardTitle>Basics</CardTitle>
          <CardDescription>Identify the config and its purpose</CardDescription>
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
            <Label htmlFor="config-description">Description</Label>
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

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="border-b pb-4">
            <CardTitle>Schema</CardTitle>
            <CardDescription>
              Define the shape of the JSON object this config returns.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <SchemaBuilder value={schema} onChange={setSchema} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b pb-4">
            <CardTitle>Default value</CardTitle>
            <CardDescription>
              The value returned by all SDKs in every env until you change it.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <ValueForm schema={schema} value={value} onChange={setValue} />
          </CardContent>
        </Card>
      </div>

      {error ? (
        <div
          role="alert"
          className="rounded-[var(--radius-md)] border border-[color-mix(in_oklab,var(--se-danger)_30%,transparent)] bg-[var(--se-danger-soft)] px-4 py-2 text-[13px] text-[var(--se-danger)]"
        >
          {error}
        </div>
      ) : null}

      <div className="flex justify-end gap-2">
        <LinkButton variant="ghost" size="sm" href="/dashboard/configs/values">
          Cancel
        </LinkButton>
        <Button size="sm" type="button" onClick={submit} disabled={pending}>
          Create config
        </Button>
      </div>
    </div>
  );
}
