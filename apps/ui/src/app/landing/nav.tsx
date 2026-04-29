"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { flags, i18n } from "@shipeasy/sdk/client";
import { useFlags, useMounted } from "./use-mounted";

/**
 * Landing nav — static, no session lookup. The single CTA points at
 * /auth/signin, which is responsible for routing signed-in users straight
 * through to the dashboard.
 */
export function LandingNav() {
  const [scrolled, setScrolled] = useState(false);
  const mounted = useMounted();
  useFlags();
  const showBeta = mounted ? flags.get("landing_beta_badge") : false;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav className={`lp-nav ${scrolled ? "lp-scrolled" : ""}`}>
      <div className="mx-auto flex h-[60px] max-w-[1200px] items-center justify-between px-7">
        <Link
          href="/"
          className="flex items-center gap-2.5 text-[15px] font-semibold tracking-[-0.01em]"
        >
          <span className="lp-brand-mark" aria-hidden />
          <span>Shipeasy</span>
          {showBeta ? (
            <span className="lp-badge ml-2">
              <span className="lp-dot" />
              beta
            </span>
          ) : null}
        </Link>

        <div className="hidden gap-7 text-[13.5px] text-[var(--se-fg-2)] md:flex">
          <a className="hover:text-[var(--se-fg)]" href="#features">
            Features
          </a>
          <a className="hover:text-[var(--se-fg)]" href="#how">
            How it works
          </a>
          <a className="hover:text-[var(--se-fg)]" href="#pricing">
            Pricing
          </a>
          <a className="hover:text-[var(--se-fg)]" href="#faq">
            FAQ
          </a>
          <a
            className="hover:text-[var(--se-fg)]"
            href="https://docs.shipeasy.ai"
            target="_blank"
            rel="noreferrer"
          >
            Docs
          </a>
        </div>

        <div className="flex items-center gap-2.5">
          <Link className="lp-btn lp-btn-primary" href="/auth/signin">
            {i18n.tEl(
              "landing.nav.cta",
              "Install with Claude",
              undefined,
              "Primary CTA in the landing nav",
            )}{" "}
            <ArrowRight className="size-3.5" />
          </Link>
        </div>
      </div>
    </nav>
  );
}
