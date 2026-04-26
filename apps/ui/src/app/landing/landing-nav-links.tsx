"use client";

import { ShipEasyI18nString } from "@shipeasy/react";

/**
 * Translated nav menu items. Keys live in the active i18n profile.
 * Default English copy is the labelKey itself if the profile hasn't
 * loaded yet — use `desc` to seed the dashboard when scanning.
 */
export function LandingNavLinks() {
  return (
    <nav className="hidden items-center gap-7 text-[13.5px] text-[var(--se-fg-2)] md:flex">
      <a href="#features" className="hover:text-foreground">
        <ShipEasyI18nString
          labelKey="landing.nav.features"
          defaultValue="Features"
          desc="Top nav: Features section"
        />
      </a>
      <a href="#pricing" className="hover:text-foreground">
        <ShipEasyI18nString
          labelKey="landing.nav.pricing"
          defaultValue="Pricing"
          desc="Top nav: Pricing section"
        />
      </a>
      <a href="#install" className="hover:text-foreground">
        <ShipEasyI18nString
          labelKey="landing.nav.install"
          defaultValue="Install"
          desc="Top nav: Install section"
        />
      </a>
      <a
        href="https://docs.shipeasy.ai"
        target="_blank"
        rel="noreferrer"
        className="hover:text-foreground"
      >
        <ShipEasyI18nString
          labelKey="landing.nav.docs"
          defaultValue="Docs"
          desc="Top nav: Docs (external)"
        />
      </a>
    </nav>
  );
}
