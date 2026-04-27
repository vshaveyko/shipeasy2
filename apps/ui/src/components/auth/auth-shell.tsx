import type { ReactNode } from "react";
import { BrandMark } from "@/components/dashboard/brand-mark";

/**
 * Split-pane auth layout matching the design's editorial signin/create/sent pages.
 * Left: brand, testimonial quote, fake MCP chat, fine-print footer.
 * Right: the interactive form (passed in as children).
 */
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div
      className="grid min-h-screen w-full overflow-x-hidden lg:grid-cols-[minmax(420px,1.1fr)_minmax(440px,1fr)]"
      style={{
        backgroundImage: `
          radial-gradient(900px 500px at 80% 110%, color-mix(in oklab, var(--se-accent) 12%, transparent), transparent 60%),
          radial-gradient(700px 400px at 15% -10%, color-mix(in oklab, var(--se-purple) 10%, transparent), transparent 55%)
        `,
        backgroundColor: "var(--se-bg)",
      }}
    >
      <aside className="relative hidden flex-col overflow-hidden border-r border-[var(--se-line)] px-14 py-12 lg:flex">
        <div className="flex items-center gap-2.5 text-[15px] font-semibold">
          <BrandMark size={26} />
          Shipeasy
        </div>

        <div className="mt-auto max-w-[480px]">
          <div
            className="mb-6 text-[38px] leading-[1.15] tracking-[-0.015em] text-foreground"
            style={{ fontFamily: "var(--se-serif)", fontStyle: "italic" }}
          >
            &ldquo;We now ship{" "}
            <span
              className="text-[var(--se-accent)]"
              style={{
                fontFamily: "var(--se-sans)",
                fontStyle: "normal",
                fontWeight: 500,
                fontSize: 32,
              }}
            >
              20×
            </span>{" "}
            more experiments.
            <br />
            And kill them faster.&rdquo;
          </div>
          <div className="flex items-center gap-3">
            <div
              className="grid size-9 place-items-center rounded-full font-mono text-[13px] font-semibold text-white"
              style={{ background: "#7c5cff" }}
            >
              M
            </div>
            <div className="text-[13px]">
              <b className="block font-medium">Maya Chen</b>
              <span className="text-[var(--se-fg-3)] text-[12px]">Staff Engineer · Acme Co.</span>
            </div>
          </div>
        </div>

        <div
          className="mt-9 rounded-[var(--radius-lg)] border border-[var(--se-line)] p-[18px]"
          style={{
            background: "color-mix(in oklab, var(--se-bg-1) 80%, transparent)",
            backdropFilter: "blur(12px)",
          }}
        >
          <div className="mb-2.5 flex items-center gap-2 border-b border-[var(--se-line)] pb-2.5">
            <div className="flex gap-1">
              <span className="size-2 rounded-full bg-[var(--se-bg-4)]" />
              <span className="size-2 rounded-full bg-[var(--se-bg-4)]" />
              <span className="size-2 rounded-full bg-[var(--se-bg-4)]" />
            </div>
            <div className="ml-auto font-mono text-[11px] text-[var(--se-fg-3)]">
              claude · mcp.shipeasy
            </div>
          </div>
          <div className="flex flex-col gap-0 font-mono text-[11.5px] leading-[1.7]">
            <div className="text-foreground">
              <b className="text-[var(--se-accent)]">›</b> <b>maya</b>: try 3-step checkout, ramp to
              50%, ship if aov improves
            </div>
            <div className="text-[var(--se-fg-3)]">
              <span className="text-[var(--se-accent)]">✓</span> created exp_8f2a21 · checkout_v3
            </div>
            <div className="text-[var(--se-fg-3)]">
              <span className="text-[var(--se-accent)]">✓</span> instrumented src/checkout/page.tsx
            </div>
            <div className="text-[var(--se-fg-3)]">
              <span className="text-[var(--se-accent)]">✓</span> live at 50% · results in ~11 days
            </div>
          </div>
        </div>

        <div className="mt-7 flex justify-between gap-4 border-t border-[var(--se-line)] pt-5 text-[11.5px] text-[var(--se-fg-4)]">
          <span>© {new Date().getFullYear()} Shipeasy, Inc.</span>
          <span className="flex gap-3">
            <a href="https://docs.shipeasy.ai" className="text-[var(--se-fg-3)]">
              Docs
            </a>
            <a href="https://status.shipeasy.ai" className="text-[var(--se-fg-3)]">
              Status
            </a>
            <a href="https://docs.shipeasy.ai/privacy" className="text-[var(--se-fg-3)]">
              Privacy
            </a>
          </span>
        </div>
      </aside>

      <main className="flex w-full min-w-0 items-center justify-center px-4 py-8 sm:px-8 sm:py-12 lg:px-12">
        <div className="w-full max-w-full min-w-0 sm:max-w-[380px]">{children}</div>
      </main>
    </div>
  );
}
