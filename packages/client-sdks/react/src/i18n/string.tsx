import React, { type HTMLAttributes } from "react";
import { useShipEasyI18n } from "../context";

interface ShipEasyI18nStringProps extends HTMLAttributes<HTMLElement> {
  labelKey: string;
  variables?: Record<string, string | number>;
  desc?: string;
  as?: string;
  /** Fallback text rendered when no translation is loaded for the key. */
  defaultValue?: string;
}

export function ShipEasyI18nString({
  labelKey,
  variables,
  desc,
  as: Tag = "span",
  defaultValue,
  ...rest
}: ShipEasyI18nStringProps) {
  const { t } = useShipEasyI18n();
  const translated = t(labelKey, variables);
  // The i18n shim returns the key itself when no profile is loaded; show
  // the declared defaultValue instead so SSR renders human copy.
  const text = translated === labelKey && defaultValue ? defaultValue : translated;
  return React.createElement(
    Tag,
    {
      "data-label": labelKey,
      "data-variables": variables ? JSON.stringify(variables) : undefined,
      "data-label-desc": desc,
      ...rest,
    },
    text,
  );
}
