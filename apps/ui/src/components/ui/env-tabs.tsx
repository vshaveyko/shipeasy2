"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

function EnvTabs({
  value,
  onValueChange,
  envs = ["prod", "staging", "dev"] as const,
  className,
}: {
  value: string;
  onValueChange: (env: string) => void;
  envs?: readonly string[];
  className?: string;
}) {
  return (
    <div role="tablist" className={cn("env-tabs", className)}>
      {envs.map((env) => (
        <button
          key={env}
          type="button"
          role="tab"
          aria-selected={env === value}
          className={cn("env-tab", env === value && "active")}
          onClick={() => onValueChange(env)}
        >
          {env}
        </button>
      ))}
    </div>
  );
}

export { EnvTabs };
