"use client";

import Link from "next/link";
import { Sparkles, Terminal } from "lucide-react";
import { i18n } from "@shipeasy/sdk/client";

export function LandingHero() {
  return (
    <section className="lp-hero" id="top">
      <div className="mx-auto max-w-[1200px] px-7">
        <div className="lp-reveal lp-in mb-6 flex justify-center">
          <span className="lp-badge lp-accent">
            <span style={{ fontSize: "10.5px", letterSpacing: "0.04em" }}>NEW</span>
            <span style={{ color: "var(--se-fg-2)" }}>
              {i18n.tEl("landing.hero.badge", undefined, "Announcement badge in hero")}
            </span>
          </span>
        </div>

        <h1 className="lp-reveal lp-in lp-d1">
          Ship experiments <em>10×</em>{" "}
          {i18n.tEl("landing.hero.title_suffix", undefined, "Hero headline suffix after '10×'")}
        </h1>

        <p className="lp-hero-sub lp-reveal lp-in lp-d2">
          {i18n.tEl("landing.hero.sub", undefined, "Hero subheadline")}
        </p>

        <div className="lp-hero-cta lp-reveal lp-in lp-d3">
          <Link className="lp-btn lp-btn-primary" href="/auth/signin">
            <Sparkles className="size-3.5" />{" "}
            {i18n.tEl("landing.hero.cta_primary", undefined, "Primary CTA button")}
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
          <span>
            {i18n.tEl(
              "landing.hero.meta_install",
              { seconds: 12 },
              "Hero stat: install time with {seconds} variable",
            )}
          </span>
          <span>
            {i18n.tEl(
              "landing.hero.meta_tools",
              { count: 4 },
              "Hero stat: MCP tools count with {count} variable",
            )}
          </span>
          <span>
            {i18n.tEl(
              "landing.hero.meta_config",
              { count: 0 },
              "Hero stat: config files with {count} variable",
            )}
          </span>
          <span>
            {i18n.tEl("landing.hero.meta_experiments", undefined, "Hero stat: experiments")}
          </span>
        </div>
      </div>
    </section>
  );
}
