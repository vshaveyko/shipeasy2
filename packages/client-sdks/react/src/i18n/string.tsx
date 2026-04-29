import React, { type HTMLAttributes } from "react";
import { labelAttrs } from "@shipeasy/sdk/client";
import { useShipEasyI18n } from "../context";

interface ShipEasyI18nStringProps extends HTMLAttributes<HTMLElement> {
  labelKey: string;
  /** Source-of-truth English copy. Rendered when the profile fetch fails. */
  fallback: string;
  variables?: Record<string, string | number>;
  desc?: string;
  as?: string;
}

export function ShipEasyI18nString({
  labelKey,
  fallback,
  variables,
  desc,
  as: Tag = "span",
  ...rest
}: ShipEasyI18nStringProps) {
  const { t } = useShipEasyI18n();
  const text = t(labelKey, fallback, variables);
  return React.createElement(Tag, { ...labelAttrs(labelKey, variables, desc), ...rest }, text);
}
