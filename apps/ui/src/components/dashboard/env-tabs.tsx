"use client";

import { cn } from "@/lib/utils";

export const CONFIG_ENVS = ["dev", "staging", "prod"] as const;
export type ConfigEnv = (typeof CONFIG_ENVS)[number];

type EnvTabsProps = {
  value: ConfigEnv;
  onChange?: (env: ConfigEnv) => void;
  className?: string;
  /** If true, tabs render as static labels (no interaction). */
  readOnly?: boolean;
};

export function EnvTabs({ value, onChange, className, readOnly }: EnvTabsProps) {
  return (
    <div className={cn("env-tabs", className)} role="tablist" aria-label="Environment">
      {CONFIG_ENVS.map((env) => {
        const active = env === value;
        const Component = readOnly || !onChange ? "div" : "button";
        return (
          <Component
            key={env}
            type={Component === "button" ? "button" : undefined}
            role="tab"
            aria-selected={active}
            className={cn("env-tab", active && "active")}
            onClick={Component === "button" ? () => onChange?.(env) : undefined}
          >
            {env}
          </Component>
        );
      })}
    </div>
  );
}
