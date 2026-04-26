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
import { useShipEasyI18n } from "@shipeasy/react";

const VALUE_TYPES = [
  { id: "string", label: "String", emoji: "Aa", description: "Text value, same for all users" },
  { id: "number", label: "Number", emoji: "123", description: "Numeric threshold or coefficient" },
  { id: "boolean", label: "Boolean", emoji: "T/F", description: "True or false flag-like value" },
  { id: "object", label: "Object", emoji: "{}", description: "JSON object for structured config" },
  { id: "array", label: "Array", emoji: "[]", description: "JSON array of values" },
] as const;

type ValueType = (typeof VALUE_TYPES)[number]["id"];

export default function NewConfigValuePage() {
  const { t } = useShipEasyI18n();
  const [valueType, setValueType] = useState<ValueType>("string");
  const [preview, setPreview] = useState("");

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("app.dashboard.configs.values.new.new_config")}
        description={t(
          "app.dashboard.configs.values.new.a_dynamic_config_stores_a_value_your_sdks_fetch_without_a_re",
        )}
        actions={
          <LinkButton variant="ghost" size="sm" href="/dashboard/configs/values">
            {t("common.cancel")}
          </LinkButton>
        }
      />

      {/* Type selector */}
      <Card>
        <CardHeader className="border-b pb-4">
          <CardTitle>{t("app.dashboard.configs.values.new.value_type")}</CardTitle>
          <CardDescription>
            {t(
              "app.dashboard.configs.values.new.all_users_receive_the_same_value_use_gates_for_per_user_targ",
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 pt-4 sm:grid-cols-3 lg:grid-cols-5">
          {VALUE_TYPES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setValueType(t.id);
                setPreview("");
              }}
              className={cn(
                "relative flex flex-col items-start gap-1.5 rounded-lg border p-3 text-left text-sm transition-colors",
                valueType === t.id
                  ? "border-foreground/60 bg-muted"
                  : "bg-background hover:border-foreground/30 hover:bg-muted/50",
              )}
            >
              {valueType === t.id && (
                <span className="absolute right-2 top-2 flex size-4 items-center justify-center rounded-full bg-foreground text-[10px] text-background">
                  ✓
                </span>
              )}
              <span className="font-mono text-base font-semibold text-muted-foreground">
                {t.emoji}
              </span>
              <span className="font-medium">{t.label}</span>
              <span className="text-xs text-muted-foreground">{t.description}</span>
            </button>
          ))}
        </CardContent>
      </Card>

      <form action={createConfigAction} className="grid gap-6 lg:grid-cols-3">
        <input type="hidden" name="value_type" value={valueType} />

        {/* Basics */}
        <Card className="lg:col-span-2">
          <CardHeader className="border-b pb-4">
            <CardTitle>{t("common.basics")}</CardTitle>
            <CardDescription>
              {t("app.dashboard.configs.values.new.identify_the_config_and_its_purpose")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="grid gap-1.5">
              <Label htmlFor="config-key">{t("common.key")}</Label>
              <Input
                id="config-key"
                name="key"
                placeholder={t("app.dashboard.configs.values.new.pricing_thresholds")}
                className="font-mono"
                required
                pattern="[a-z0-9][a-z0-9_\-]{0,63}"
                title={t("common.lowercase_letters_digits_or_max_64_chars")}
              />
              <p className="text-xs text-muted-foreground">
                {t("app.dashboard.configs.values.new.used_in_sdk_as")}{" "}
                <code className="font-mono">
                  {t("app.dashboard.configs.values.new.getconfig_apos_apos")}
                </code>
              </p>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="config-description">{t("common.description")}</Label>
              <Input
                id="config-description"
                name="description"
                placeholder={t(
                  "app.dashboard.configs.values.new.tiered_pricing_thresholds_for_plan_upgrades",
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Environment */}
        <Card>
          <CardHeader className="border-b pb-4">
            <CardTitle>{t("app.dashboard.configs.values.new.environment")}</CardTitle>
            <CardDescription>
              {t("app.dashboard.configs.values.new.where_this_config_value_lives")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="grid gap-1.5">
              <Label htmlFor="config-env">
                {t("app.dashboard.configs.values.new.environment")}
              </Label>
              <select
                id="config-env"
                name="env"
                className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                defaultValue="production"
              >
                <option value="development">
                  {t("app.dashboard.configs.values.new.development")}
                </option>
                <option value="staging">{t("app.dashboard.configs.values.new.staging")}</option>
                <option value="production">
                  {t("app.dashboard.configs.values.new.production")}
                </option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Default value */}
        <Card className="lg:col-span-3">
          <CardHeader className="border-b pb-4">
            <CardTitle>{t("app.dashboard.configs.values.new.default_value")}</CardTitle>
            <CardDescription>
              {t(
                "app.dashboard.configs.values.new.the_value_returned_when_no_targeting_rule_matches_all_users_",
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="grid gap-1.5">
              <Label htmlFor="config-value">{t("app.dashboard.configs.values.new.value")}</Label>
              {valueType === "string" && (
                <Input
                  id="config-value"
                  name="value"
                  type="text"
                  placeholder={t("app.dashboard.configs.values.new.my_string_value")}
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
                  {t("app.dashboard.configs.values.new.all_users_receive")}
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
            {t("common.cancel")}
          </LinkButton>
          <Button size="sm" type="submit">
            {t("app.dashboard.configs.values.new.create_config")}
          </Button>
        </div>
      </form>
    </div>
  );
}
