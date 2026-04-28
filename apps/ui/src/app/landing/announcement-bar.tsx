"use client";

import { flags } from "@shipeasy/sdk/client";
import { useFlags, useMounted } from "./use-mounted";

interface AnnouncementBarConfig {
  enabled?: boolean;
  text?: string;
  href?: string;
  accent?: "green" | "amber" | "blue";
}

export function AnnouncementBar() {
  const mounted = useMounted();
  useFlags(); // re-render when flag evaluations update
  const cfg = flags.getConfig<AnnouncementBarConfig>("landing_announcement_bar");
  if (!mounted || !cfg?.enabled || !cfg.text) return null;
  const color =
    cfg.accent === "amber"
      ? "var(--se-warn, #f59e0b)"
      : cfg.accent === "blue"
        ? "#60a5fa"
        : "var(--se-accent, #4ade80)";
  const inner = (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        fontFamily: "var(--se-mono, ui-monospace)",
        fontSize: 12,
        letterSpacing: "0.02em",
        color: "var(--se-fg-2, rgba(245,245,244,0.78))",
      }}
    >
      <span
        aria-hidden
        style={{
          width: 6,
          height: 6,
          borderRadius: 9999,
          background: color,
          boxShadow: `0 0 0 3px color-mix(in oklab, ${color} 25%, transparent)`,
        }}
      />
      {cfg.text}
    </span>
  );
  return (
    <div
      role="region"
      aria-label="Announcement"
      style={{
        position: "relative",
        zIndex: 5,
        textAlign: "center",
        padding: "8px 16px",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0)) , var(--se-bg-1, #111112)",
      }}
    >
      {cfg.href ? (
        <a href={cfg.href} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}>
          {inner}
        </a>
      ) : (
        inner
      )}
    </div>
  );
}
