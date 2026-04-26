"use client";

import { useConfig } from "@shipeasy/react";

interface Stat {
  label: string;
  value: string;
}

const DEFAULT_STATS: Stat[] = [
  { label: "p50 evaluation", value: "<8ms" },
  { label: "envs dev · staging · prod", value: "3" },
  { label: "first", value: "MCP" },
];

/**
 * Hero stat line. The `landing_hero_stats` config holds an array of
 * { label, value } pairs so marketing can tweak the launch metrics
 * without a redeploy. Falls back to compile-time defaults when the
 * config isn't set.
 */
export function LandingHeroStats() {
  const stats = useConfig<Stat[]>("landing_hero_stats") ?? DEFAULT_STATS;

  return (
    <div className="mt-5 flex justify-center gap-6 font-mono text-[11.5px] text-[var(--se-fg-3)]">
      {stats.map((s, i) => (
        <span key={`${s.label}-${i}`}>
          <b className="font-medium text-[var(--se-fg-2)]">{s.value}</b> {s.label}
        </span>
      ))}
    </div>
  );
}
