"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createAttributeAction } from "./actions";
import { useShipEasyI18n } from "@shipeasy/i18n-react";

export function AttributeForm() {
  const { t } = useShipEasyI18n();
  const [attrType, setAttrType] = useState("string");

  return (
    <Card>
      <CardHeader className="border-b pb-4">
        <CardTitle>{t("app.dashboard.experiments.attributes.new_attribute")}</CardTitle>
        <CardDescription>
          {t(
            "app.dashboard.experiments.attributes.declare_an_attribute_for_use_in_targeting_rules",
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-4">
        <form action={createAttributeAction} className="flex flex-wrap items-end gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="attr-name">{t("common.name")}</Label>
            <Input
              id="attr-name"
              name="name"
              placeholder={t("app.dashboard.experiments.attributes.country")}
              className="font-mono"
              required
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="attr-type">{t("app.dashboard.experiments.attributes.type")}</Label>
            <select
              id="attr-type"
              name="type"
              value={attrType}
              onChange={(e) => setAttrType(e.target.value)}
              className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <option value="string">{t("app.dashboard.experiments.attributes.string")}</option>
              <option value="number">{t("app.dashboard.experiments.attributes.number")}</option>
              <option value="boolean">{t("app.dashboard.experiments.attributes.boolean")}</option>
              <option value="enum">enum</option>
              <option value="date">date</option>
            </select>
          </div>
          {attrType === "enum" && (
            <div className="grid gap-1.5">
              <Label htmlFor="attr-enum-values">
                {t("app.dashboard.experiments.attributes.enum_values")}
              </Label>
              <Input
                id="attr-enum-values"
                name="enum_values"
                placeholder={t("app.dashboard.experiments.attributes.free_pro_enterprise")}
                className="font-mono"
              />
            </div>
          )}
          <Button size="sm" type="submit">
            {t("app.dashboard.experiments.attributes.add_attribute")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
