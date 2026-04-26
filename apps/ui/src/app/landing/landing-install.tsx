"use client";

import { Terminal } from "lucide-react";
import { useFlag } from "@shipeasy/react";

/**
 * The install section is killswitched behind `landing_install_section`.
 * Flipping the gate OFF in devtools instantly removes the marketing
 * surface — the canonical "kill a feature" demo.
 */
export function LandingInstall() {
  const enabled = useFlag("landing_install_section");
  // Default ON when undefined — server returns false until the SDK
  // resolves; we want the section visible by default for unauth visits.
  // Treat unset as enabled.
  if (
    enabled === false &&
    typeof window !== "undefined" &&
    (window as unknown as { __shipeasy?: unknown }).__shipeasy
  ) {
    return null;
  }

  return (
    <section id="install" className="relative z-[1] px-7 py-24">
      <div className="mx-auto max-w-[1240px]">
        <div className="mx-auto mb-12 max-w-[62ch] text-center">
          <div className="t-caps dim-2 mb-3">Install in seconds</div>
          <h2 className="text-[40px] font-medium tracking-[-0.02em] leading-[1.08]">
            Three steps from zero to first experiment
          </h2>
        </div>
        <ol className="grid gap-4 md:grid-cols-3">
          {[
            {
              n: "01",
              t: "Sign in with GitHub",
              d: "One OAuth hop. Project + SDK keys auto-provisioned on first login.",
            },
            {
              n: "02",
              t: "Install the Claude MCP",
              d: "Run `claude mcp install shipeasy`. Done — Claude has your workspace in scope.",
            },
            {
              n: "03",
              t: "Ask Claude to ship",
              d: "“Try 3-step checkout, ramp to 50%.” The MCP wires the SDK, rolls out, reports.",
            },
          ].map((s) => (
            <li
              key={s.n}
              className="flex flex-col gap-3 rounded-[12px] border border-[var(--se-line)] p-6"
              style={{ background: "var(--se-bg-1)" }}
            >
              <div className="font-mono text-[11px] tracking-[0.08em] text-[var(--se-fg-4)]">
                STEP {s.n}
              </div>
              <div className="text-[17px] font-medium tracking-[-0.01em]">{s.t}</div>
              <div className="text-[13px] leading-[1.55] text-[var(--se-fg-2)]">{s.d}</div>
            </li>
          ))}
        </ol>
        <div
          className="mx-auto mt-10 flex max-w-[640px] items-center gap-3 rounded-[10px] border border-[var(--se-line-2)] px-4 py-3 font-mono text-[13px]"
          style={{ background: "var(--se-bg-2)" }}
        >
          <Terminal className="size-3.5 text-[var(--se-fg-3)]" />
          <span className="text-[var(--se-fg-3)]">$</span>
          <span className="text-foreground">claude mcp install shipeasy</span>
        </div>
      </div>
    </section>
  );
}
