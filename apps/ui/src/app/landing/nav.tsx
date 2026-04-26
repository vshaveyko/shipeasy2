import Link from "next/link";
import { Sparkles } from "lucide-react";

interface Props {
  signedIn: boolean;
}

export function LandingNav({ signedIn }: Props) {
  return (
    <nav
      className="sticky top-0 z-20 border-b border-[var(--se-line)] backdrop-blur-xl"
      style={{ background: "color-mix(in oklab, var(--se-bg) 72%, transparent)" }}
    >
      <div className="mx-auto flex h-14 max-w-[1240px] items-center justify-between px-7">
        <Link
          href="/"
          className="flex items-center gap-2.5 text-[15px] font-semibold tracking-[-0.01em]"
        >
          <span className="lp-brand-mark" aria-hidden />
          <span>Shipeasy</span>
          <span className="lp-pill ml-2">
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
          <a className="hover:text-[var(--se-fg)]" href="#dashboard">
            Dashboard
          </a>
          <a className="hover:text-[var(--se-fg)]" href="#pricing">
            Pricing
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
          {signedIn ? (
            <Link className="lp-btn lp-btn-ghost" href="/dashboard">
              Open dashboard
            </Link>
          ) : (
            <>
              <Link className="lp-btn lp-btn-ghost hidden sm:inline-flex" href="/auth/signin">
                Sign in
              </Link>
              <Link className="lp-btn lp-btn-primary" href="/auth/signin">
                <Sparkles className="size-3.5" /> Install with Claude
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
