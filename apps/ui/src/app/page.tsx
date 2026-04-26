import Link from "next/link";
import { ArrowRight, Power, SlidersHorizontal, FlaskConical, LineChart } from "lucide-react";

import { auth } from "@/auth";
import { BrandMark } from "@/components/dashboard/brand-mark";
import { RotatingVerb } from "./landing-hero";
import { LandingProviders } from "./landing/providers";
import { LandingNavLinks } from "./landing/landing-nav-links";
import { LandingHeroTagline } from "./landing/landing-hero-tagline";
import { LandingPricing } from "./landing/landing-pricing";
import { LandingInstall } from "./landing/landing-install";
import { LandingHeroStats } from "./landing/landing-hero-stats";

export default async function LandingPage() {
  const session = await auth();
  const sdkKey = process.env.NEXT_PUBLIC_SHIPEASY_CLIENT_KEY ?? "";
  const edgeUrl = process.env.NEXT_PUBLIC_SHIPEASY_EDGE_URL;

  const content = (
    <div className="relative min-h-screen overflow-hidden bg-[var(--se-bg)] text-foreground">
      {/* Grid background — masked to the top center */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.55]"
        style={{
          backgroundImage:
            "linear-gradient(to right, var(--se-line) 1px, transparent 1px), linear-gradient(to bottom, var(--se-line) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
          maskImage: "radial-gradient(ellipse 90% 60% at 50% 20%, black 40%, transparent 75%)",
        }}
      />

      {/* Nav */}
      <header
        className="sticky top-0 z-20 border-b border-[var(--se-line)] backdrop-blur-xl"
        style={{ background: "color-mix(in oklab, var(--se-bg) 72%, transparent)" }}
      >
        <div className="mx-auto flex h-14 max-w-[1240px] items-center justify-between px-7">
          <Link href="/" className="flex items-center gap-2.5 text-[15px] font-semibold">
            <BrandMark size={22} />
            Shipeasy
          </Link>
          <LandingNavLinks />
          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--se-line-2)] bg-[var(--se-bg-2)] px-2 py-1 font-mono text-[11px] text-[var(--se-fg-2)]">
              <span
                className="size-1.5 rounded-full bg-[var(--se-accent)]"
                style={{
                  boxShadow: "0 0 0 3px color-mix(in oklab, var(--se-accent) 25%, transparent)",
                }}
              />
              beta
            </span>
            {session ? (
              <Link
                href="/dashboard"
                className="inline-flex h-9 items-center rounded-[8px] border border-[var(--se-line-2)] bg-transparent px-3.5 text-[13.5px] font-medium hover:bg-[var(--se-bg-2)]"
              >
                Open dashboard
              </Link>
            ) : (
              <Link
                href="/auth/signin"
                className="inline-flex h-9 items-center gap-2 rounded-[8px] bg-[var(--se-accent)] px-3.5 text-[13.5px] font-medium text-[var(--se-accent-fg)]"
                style={{
                  boxShadow:
                    "0 1px 0 rgba(255,255,255,.25) inset, 0 6px 20px -6px color-mix(in oklab, var(--se-accent) 55%, transparent)",
                }}
              >
                Sign in <ArrowRight className="size-3.5" />
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative z-[1] px-7 pb-24 pt-[72px]">
        <div className="mx-auto max-w-[1240px]">
          <div className="mb-7 flex items-center justify-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--se-line-2)] bg-[var(--se-bg-2)] px-2 py-1 font-mono text-[11px] text-[var(--se-fg-2)]">
              <span className="size-1.5 rounded-full bg-[var(--se-accent)]" />
              Experimentation, as easy as asking Claude
            </span>
          </div>

          <h1
            className="mx-auto max-w-[13ch] text-center font-medium tracking-[-0.035em]"
            style={{ fontSize: "clamp(44px, 6.4vw, 82px)", lineHeight: 1.02 }}
          >
            Tell Claude to <RotatingVerb /> it.
            <br />
            Shipeasy{" "}
            <em
              className="text-foreground"
              style={{
                fontFamily: "var(--se-serif)",
                fontStyle: "italic",
                fontWeight: 400,
                letterSpacing: "-0.02em",
              }}
            >
              ships
            </em>{" "}
            it.
          </h1>

          <LandingHeroTagline />

          <div className="mt-7 flex justify-center gap-2.5">
            <Link
              href="/auth/signin"
              className="inline-flex h-10 items-center gap-2 rounded-[8px] bg-[var(--se-accent)] px-4 text-[13.5px] font-medium text-[var(--se-accent-fg)]"
              style={{
                boxShadow:
                  "0 1px 0 rgba(255,255,255,.25) inset, 0 6px 20px -6px color-mix(in oklab, var(--se-accent) 55%, transparent)",
              }}
            >
              Start free <ArrowRight className="size-3.5" />
            </Link>
            <a
              href="https://docs.shipeasy.ai"
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-10 items-center gap-2 rounded-[8px] border border-[var(--se-line-2)] bg-transparent px-4 text-[13.5px] font-medium hover:bg-[var(--se-bg-2)]"
            >
              Read the docs
            </a>
          </div>

          <LandingHeroStats />

          {/* Split canvas: chat left, experiment card right */}
          <div
            className="relative mt-14 grid overflow-hidden rounded-[18px] border border-[var(--se-line-2)] lg:grid-cols-[1.05fr_1.15fr]"
            style={{
              background: "linear-gradient(180deg, var(--se-bg-2), var(--se-bg-1))",
              isolation: "isolate",
            }}
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 z-0"
              style={{
                background:
                  "radial-gradient(ellipse 60% 60% at 50% 0%, color-mix(in oklab, var(--se-accent) 10%, transparent), transparent 70%), linear-gradient(180deg, rgba(255,255,255,0.04), transparent 30%)",
              }}
            />
            <div className="relative z-[1] border-r border-[var(--se-line)] p-7 lg:border-r">
              <div className="t-caps dim-3 mb-4 flex items-center gap-2">
                claude
                <span className="h-px flex-1 bg-[var(--se-line)]" />
              </div>
              <div className="flex flex-col gap-3.5 text-[13.5px]">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 grid size-[22px] flex-shrink-0 place-items-center rounded-[5px] border border-[var(--se-line-2)] bg-[var(--se-bg-3)] font-mono text-[10px] font-semibold text-[var(--se-fg-2)]">
                    M
                  </div>
                  <div className="flex-1 leading-[1.55] text-foreground">
                    Try 3-step checkout, ramp to 50%, ship if AOV improves
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div
                    className="mt-0.5 grid size-[22px] flex-shrink-0 place-items-center rounded-[5px] font-mono text-[10px] font-semibold text-white"
                    style={{ background: "linear-gradient(135deg, #d97a57, #a54f2a)" }}
                  >
                    C
                  </div>
                  <div className="flex-1">
                    <div className="leading-[1.55] text-[var(--se-fg-2)]">
                      I&rsquo;ll create an experiment, instrument the checkout, and start a 50%
                      rollout.
                    </div>
                    <div className="mt-2.5 flex items-center gap-2.5 rounded-[8px] border border-[var(--se-line)] bg-[var(--se-bg-2)] px-3 py-2.5 font-mono text-[11.5px] text-[var(--se-fg-2)]">
                      <span className="text-[var(--se-fg-4)]">›</span>
                      <span>mcp</span>
                      <span className="text-[var(--se-fg-4)]">›</span>
                      <span className="text-foreground">shipeasy.create_experiment</span>
                      <span className="ml-auto flex items-center gap-1.5 text-[var(--se-accent)]">
                        <span
                          className="size-[5px] rounded-full bg-[var(--se-accent)]"
                          style={{
                            animation: "pulse 1.8s ease-in-out infinite",
                          }}
                        />
                        running
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative z-[1] p-7">
              <div className="t-caps dim-3 mb-4 flex items-center gap-2">
                shipeasy
                <span className="h-px flex-1 bg-[var(--se-line)]" />
              </div>
              <div
                className="overflow-hidden rounded-[12px] border border-[var(--se-line-2)]"
                style={{ background: "var(--se-bg-2)" }}
              >
                <div className="flex items-center justify-between border-b border-[var(--se-line)] px-4 py-3.5">
                  <div className="flex items-center gap-2.5 text-[14px] font-medium">
                    <div
                      className="grid size-[22px] place-items-center rounded-[5px]"
                      style={{
                        background: "var(--se-accent-soft)",
                        color: "var(--se-accent)",
                      }}
                    >
                      <FlaskConical className="size-3" />
                    </div>
                    checkout_v3
                  </div>
                  <div className="flex items-center gap-1.5 font-mono text-[10.5px] tracking-[0.06em] text-[var(--se-accent)]">
                    <span
                      className="size-1.5 rounded-full bg-[var(--se-accent)]"
                      style={{
                        boxShadow:
                          "0 0 0 3px color-mix(in oklab, var(--se-accent) 22%, transparent)",
                      }}
                    />
                    RUNNING
                  </div>
                </div>
                <div className="flex flex-col gap-3.5 p-4">
                  <div
                    className="grid overflow-hidden rounded-[8px] border border-[var(--se-line)]"
                    style={{ gridTemplateColumns: "repeat(3,1fr)" }}
                  >
                    {[
                      { k: "allocation", v: "50%" },
                      { k: "variants", v: "2" },
                      { k: "universe", v: "default" },
                    ].map((s, i) => (
                      <div
                        key={s.k}
                        className="flex flex-col gap-1 p-3"
                        style={{
                          borderRight: i < 2 ? "1px solid var(--se-line)" : undefined,
                        }}
                      >
                        <div className="t-caps dim-3">{s.k}</div>
                        <div className="font-medium" style={{ fontVariantNumeric: "tabular-nums" }}>
                          {s.v}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-col gap-2">
                    {[
                      { label: "control", pct: 50 },
                      { label: "variant_b", pct: 50 },
                    ].map((g) => (
                      <div key={g.label} className="flex items-center gap-3">
                        <span className="w-[90px] font-mono text-[11.5px] text-[var(--se-fg-2)]">
                          {g.label}
                        </span>
                        <div
                          className="relative h-1.5 flex-1 overflow-hidden rounded-full"
                          style={{ background: "var(--se-bg-3)" }}
                        >
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${g.pct}%`,
                              background: "var(--se-accent)",
                            }}
                          />
                        </div>
                        <span
                          className="w-[42px] text-right font-mono text-[11.5px]"
                          style={{ fontVariantNumeric: "tabular-nums" }}
                        >
                          {g.pct}%
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="text-[12px] text-[var(--se-fg-3)]">
                    Results in ~11 days · AOV primary metric, conversion guardrail
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section
        id="features"
        className="relative z-[1] border-y border-[var(--se-line)] py-24"
        style={{ background: "var(--se-bg-1)" }}
      >
        <div className="mx-auto max-w-[1240px] px-7">
          <div className="mx-auto mb-14 max-w-[62ch] text-center">
            <div className="t-caps dim-2 mb-3">Four pillars, one platform</div>
            <h2 className="text-[40px] font-medium tracking-[-0.02em] leading-[1.08]">
              Shutoffs, configs, experiments, metrics
              <br />
              <em
                className="text-[var(--se-fg-2)]"
                style={{ fontFamily: "var(--se-serif)", fontStyle: "italic", fontWeight: 400 }}
              >
                all instrumented for you
              </em>
            </h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: Power,
                name: "Killswitches",
                desc: "Instantly kill a feature globally — edge-cached, <10ms to propagate.",
              },
              {
                icon: SlidersHorizontal,
                name: "Configs",
                desc: "Typed JSON with per-env overrides, draft & publish flow, audit trail.",
              },
              {
                icon: FlaskConical,
                name: "Experiments",
                desc: "Sequential A/B with CUPED. One prompt to create, ramp, ship.",
              },
              {
                icon: LineChart,
                name: "Metrics",
                desc: "Auto-collected events + conversion funnels. No manual instrumentation.",
              },
            ].map((f) => (
              <div
                key={f.name}
                className="flex flex-col gap-3 rounded-[12px] border border-[var(--se-line)] p-5 transition-colors hover:border-[var(--se-line-2)]"
                style={{ background: "var(--se-bg-2)" }}
              >
                <div
                  className="grid size-9 place-items-center rounded-[8px]"
                  style={{
                    background: "var(--se-accent-soft)",
                    color: "var(--se-accent)",
                    border: "1px solid color-mix(in oklab, var(--se-accent) 30%, transparent)",
                  }}
                >
                  <f.icon className="size-4" />
                </div>
                <div className="text-[15px] font-medium tracking-[-0.01em]">{f.name}</div>
                <div className="text-[13px] leading-[1.5] text-[var(--se-fg-2)]">{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <LandingPricing />

      <LandingInstall />

      {/* Footer */}
      <footer
        className="relative z-[1] border-t border-[var(--se-line)] px-7 py-8"
        style={{ background: "var(--se-bg-1)" }}
      >
        <div className="mx-auto flex max-w-[1240px] items-center justify-between gap-6 text-[12px] text-[var(--se-fg-3)]">
          <span className="flex items-center gap-2.5">
            <BrandMark size={18} />© {new Date().getFullYear()} Shipeasy, Inc.
          </span>
          <span className="flex gap-5">
            <a href="https://docs.shipeasy.ai">Docs</a>
            <a href="https://status.shipeasy.ai">Status</a>
            <a href="https://docs.shipeasy.ai/privacy">Privacy</a>
            <a href="https://docs.shipeasy.ai/terms">Terms</a>
          </span>
        </div>
      </footer>

      <style>{`@keyframes pulse { 0%, 100% { opacity: 1 } 50% { opacity: 0.3 } }`}</style>
    </div>
  );

  if (!sdkKey) {
    // No client SDK key configured — render without provider so the landing
    // page still works in dev/build environments without ShipEasy creds.
    return content;
  }

  return (
    <LandingProviders sdkKey={sdkKey} edgeUrl={edgeUrl}>
      {content}
    </LandingProviders>
  );
}
