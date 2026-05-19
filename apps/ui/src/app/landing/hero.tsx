"use client";

import Link from "next/link";
import { Sparkles, Terminal } from "lucide-react";
import { i18n } from "@shipeasy/sdk/client";

export interface HeroStat {
  label: string;
  value: string;
}

export function LandingHero({ stats }: { stats?: HeroStat[] | null }) {
  return (
    <section className="lp-hero" id="top">
      <div className="mx-auto max-w-[1200px] px-7">
        <div className="lp-reveal lp-in mb-6 flex justify-center">
          <span className="lp-badge lp-accent">
            <span style={{ fontSize: "10.5px", letterSpacing: "0.04em" }}>NEW</span>
            <span style={{ color: "var(--se-fg-2)" }}>
              {i18n.t(
                "landing.hero.badge",
                "Shipeasy speaks MCP — installs in any AI agent in 12 seconds",
              )}
            </span>
          </span>
        </div>

        <h1 className="lp-reveal lp-in lp-d1">
          Ship experiments <em>10×</em>{" "}
          {i18n.t("landing.hero.title_suffix", "faster, just by asking Claude.")}
        </h1>

        <p className="lp-hero-sub lp-reveal lp-in lp-d2">
          {i18n.t(
            "landing.hero.sub",
            "Killswitches, configs, A/B tests, and auto-collected metrics — spun up from a single sentence. The platform that lives inside your conversation.",
          )}
        </p>

        <div className="lp-hero-cta lp-reveal lp-in lp-d3">
          <Link className="lp-btn lp-btn-primary" href="/auth/signin">
            <Sparkles className="size-3.5" /> {i18n.t("landing.hero.cta_primary", "Get started")}
          </Link>
          <a
            className="lp-btn lp-btn-ghost lp-btn-mono"
            href="https://docs.shipeasy.ai"
            target="_blank"
            rel="noreferrer"
          >
            <Terminal className="size-3.5" /> npx shipeasy init
          </a>
        </div>

        <div className="lp-hero-meta lp-reveal lp-in lp-d3">
          {Array.isArray(stats) && stats.length > 0 ? (
            stats.map((s, i) => (
              <span key={`${s.label}-${i}`}>
                <b>{s.value}</b> {s.label}
              </span>
            ))
          ) : (
            <>
              <span>
                {i18n.t("landing.hero.meta_install", "{{seconds}}s install", { seconds: 12 })}
              </span>
              <span>{i18n.t("landing.hero.meta_tools", "{{count}} MCP tools", { count: 4 })}</span>
              <span>
                {i18n.t("landing.hero.meta_config", "{{count}} config files", { count: 0 })}
              </span>
              <span>{i18n.t("landing.hero.meta_experiments", "∞ experiments")}</span>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
