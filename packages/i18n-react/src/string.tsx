import React, { type HTMLAttributes } from "react";
import { useShipEasyI18n } from "./context";

interface ShipEasyI18nStringProps extends HTMLAttributes<HTMLElement> {
  labelKey: string;
  variables?: Record<string, string | number>;
  desc?: string;
  as?: string;
}

export function ShipEasyI18nString({
  labelKey,
  variables,
  desc,
  as: Tag = "span",
  ...rest
}: ShipEasyI18nStringProps) {
  const { t } = useShipEasyI18n();
  // Use createElement to avoid polymorphic JSX type-narrowing issues
  return React.createElement(
    Tag,
    {
      "data-label": labelKey,
      "data-variables": variables ? JSON.stringify(variables) : undefined,
      "data-label-desc": desc,
      ...rest,
    },
    t(labelKey, variables),
  );
}
