"use client";

import { useState } from "react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LinkButton } from "@/components/ui/link-button";
import { cn } from "@/lib/utils";
import { createConfigAction } from "../actions";

const VALUE_TYPES = [
  { id: "string", label: "String", emoji: "Aa", description: "Text value, same for all users" },
  { id: "number", label: "Number", emoji: "123", description: "Numeric threshold or coefficient" },
  { id: "boolean", label: "Boolean", emoji: "T/F", description: "True or false flag-like value" },
  { id: "object", label: "Object", emoji: "{}", description: "JSON object for structured config" },
  { id: "array", label: "Array", emoji: "[]", description: "JSON array of values" },
] as const;

type ValueType = (typeof VALUE_TYPES)[number]["id"];

export default function NewConfigValuePage() {
  const [valueType, setValueType] = useState<ValueType>("string");
  const [preview, setPreview] = useState("");
  const [configKey, setConfigKey] = useState("");

  return (
    <div className="space-y-6">
      <PageHeader
        title="New config"
        description="A dynamic config stores a value your SDKs fetch without a redeploy."
        actions={
          <LinkButton variant="ghost" size="sm" href="/dashboard/configs/values">
            Cancel
          </LinkButton>
        }
      />

      {/* Type selector */}
      <Card>
        <CardHeader className="border-b pb-4">
          <CardTitle>Value type</CardTitle>
          <CardDescription>
            All users receive the same value. Use gates for per-user targeting.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 pt-4 sm:grid-cols-3 lg:grid-cols-5">
          {VALUE_TYPES.map((vt) => (
            <button
              key={vt.id}
              type="button"
              onClick={() => {
                setValueType(vt.id);
                setPreview("");
              }}
              className={cn(
                "relative flex flex-col items-start gap-1.5 rounded-lg border p-3 text-left text-sm transition-colors",
                valueType === vt.id
                  ? "border-foreground/60 bg-muted"
                  : "bg-background hover:border-foreground/30 hover:bg-muted/50",
              )}
            >
              {valueType === vt.id && (
                <span className="absolute right-2 top-2 flex size-4 items-center justify-center rounded-full bg-foreground text-[10px] text-background">
                  ✓
                </span>
              )}
              <span className="font-mono text-base font-semibold text-muted-foreground">
                {vt.emoji}
              </span>
              <span className="font-medium">{vt.label}</span>
              <span className="text-xs text-muted-foreground">{vt.description}</span>
            </button>
          ))}
        </CardContent>
      </Card>

      <form action={createConfigAction} className="grid gap-6 lg:grid-cols-3">
        <input type="hidden" name="value_type" value={valueType} />

        {/* Basics */}
        <Card className="lg:col-span-2">
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
                placeholder="pricing-thresholds"
                className="font-mono"
                required
                pattern="[a-z0-9][a-z0-9_\-]{0,63}"
                title="Lowercase letters, digits, - or _. Max 64 chars."
                value={configKey}
                onChange={(e) => setConfigKey(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Used in SDK as{" "}
                <code className="font-mono">getConfig(&apos;{configKey || "…"}&apos;)</code>
              </p>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="config-description">Description</Label>
              <Input
                id="config-description"
                name="description"
                placeholder="Tiered pricing thresholds for plan upgrades"
              />
            </div>
          </CardContent>
        </Card>

        {/* Environment */}
        <Card>
          <CardHeader className="border-b pb-4">
            <CardTitle>Environment</CardTitle>
            <CardDescription>Where this config value lives</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="grid gap-1.5">
              <Label htmlFor="config-env">Environment</Label>
              <select
                id="config-env"
                name="env"
                className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                defaultValue="production"
              >
                <option value="development">Development</option>
                <option value="staging">Staging</option>
                <option value="production">Production</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Default value */}
        <Card className="lg:col-span-3">
          <CardHeader className="border-b pb-4">
            <CardTitle>Default value</CardTitle>
            <CardDescription>
              The value returned when no targeting rule matches. All users receive this.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="grid gap-1.5">
              <Label htmlFor="config-value">Value</Label>
              {valueType === "string" && (
                <Input
                  id="config-value"
                  name="value"
                  type="text"
                  placeholder="my-string-value"
                  value={preview}
                  onChange={(e) => setPreview(e.target.value)}
                />
              )}
              {valueType === "number" && (
                <Input
                  id="config-value"
                  name="value"
                  type="number"
                  placeholder="0"
                  value={preview}
                  onChange={(e) => setPreview(e.target.value)}
                />
              )}
              {valueType === "boolean" && (
                <select
                  id="config-value"
                  name="value"
                  className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  value={preview || "false"}
                  onChange={(e) => setPreview(e.target.value)}
                >
                  <option value="true">true</option>
                  <option value="false">false</option>
                </select>
              )}
              {(valueType === "object" || valueType === "array") && (
                <textarea
                  id="config-value"
                  name="value"
                  rows={5}
                  placeholder={
                    valueType === "object"
                      ? '{\n  "key": "value"\n}'
                      : '[\n  "item1",\n  "item2"\n]'
                  }
                  value={preview}
                  onChange={(e) => setPreview(e.target.value)}
                  className="w-full rounded-lg border border-input bg-transparent px-3 py-2 font-mono text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                />
              )}
            </div>

            {/* Live preview */}
            {preview && (
              <div className="rounded-lg border border-dashed bg-muted/30 px-4 py-3">
                <p className="mb-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  All users receive
                </p>
                <code className="font-mono text-sm">
                  {valueType === "string" ? `"${preview}"` : preview}
                </code>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="col-span-full flex justify-end gap-2">
          <LinkButton variant="ghost" size="sm" href="/dashboard/configs/values">
            Cancel
          </LinkButton>
          <Button size="sm" type="submit">
            Create config
          </Button>
        </div>
      </form>
    </div>
  );
}
