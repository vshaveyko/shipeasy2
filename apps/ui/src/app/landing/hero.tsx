import Link from "next/link";
import { Sparkles, Terminal } from "lucide-react";

export function LandingHero() {
  return (
    <section className="lp-hero" id="top">
      <div className="mx-auto max-w-[1200px] px-7">
        <div className="lp-reveal lp-in mb-6 flex justify-center">
          <span className="lp-badge lp-accent">
            <span style={{ fontSize: "10.5px", letterSpacing: "0.04em" }}>NEW</span>
            <span style={{ color: "var(--se-fg-2)" }}>
              Shipeasy speaks MCP — installs in Claude in 12 seconds
            </span>
          </span>
        </div>

        <h1 className="lp-reveal lp-in lp-d1">
          Ship experiments <em>10×</em> faster, just by asking Claude.
        </h1>

        <p className="lp-hero-sub lp-reveal lp-in lp-d2">
          Killswitches, configs, A/B tests, and auto-collected metrics — spun up from a single
          sentence. The platform that lives inside your conversation.
        </p>

        <div className="lp-hero-cta lp-reveal lp-in lp-d3">
          <Link className="lp-btn lp-btn-primary" href="/auth/signin">
            <Sparkles className="size-3.5" /> Install with Claude
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
            <b>12s</b> install
          </span>
          <span>
            <b>4</b> MCP tools
          </span>
          <span>
            <b>0</b> config files
          </span>
          <span>
            <b>∞</b> experiments
          </span>
        </div>
      </div>
    </section>
  );
}
