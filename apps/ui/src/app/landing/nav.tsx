"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";

/**
 * The landing page is a static export (no `await auth()` server call), so we
 * fetch the session client-side and swap the CTA once it resolves. Showing
 * the signed-out variant first is fine: it links to /auth/signin which
 * detects an existing session and forwards to /dashboard.
 */
export function LandingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    let cancelled = false;
    fetch("/api/auth/session", { credentials: "same-origin" })
      .then((r) => (r.ok ? (r.json() as Promise<{ user?: unknown } | null>) : null))
      .then((session) => {
        if (!cancelled) setSignedIn(Boolean(session?.user));
      })
      .catch(() => {
        if (!cancelled) setSignedIn(false);
      });

    return () => {
      cancelled = true;
      window.removeEventListener("scroll", onScroll);
    };
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
          <span className="lp-badge ml-2">
            <span className="lp-dot" />
            beta
          </span>
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
          {signedIn === true ? (
            <Link className="lp-btn lp-btn-ghost" href="/dashboard">
              Open dashboard
            </Link>
          ) : (
            <>
              <Link className="lp-btn lp-btn-ghost hidden sm:inline-flex" href="/auth/signin">
                Sign in
              </Link>
              <Link className="lp-btn lp-btn-primary" href="/auth/signin">
                Install with Claude <ArrowRight className="size-3.5" />
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
