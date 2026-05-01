import "./landing/landing.css";
import { shipeasy } from "@shipeasy/sdk/server";
import { AnnouncementBar, type AnnouncementBarConfig } from "./landing/announcement-bar";
import { LandingNav } from "./landing/nav";
import { ScrollProgress } from "./landing/scroll-progress";
import { LandingHero, type HeroStat } from "./landing/hero";
import { LandingMarquee } from "./landing/marquee";
import { StickyFeatures } from "./landing/sticky-features";
import { LandingPricing } from "./landing/pricing";
import {
  LandingWorkflow,
  LandingTestimonials,
  LandingFaq,
  LandingCtaFooter,
} from "./landing/sections-static";
import { RevealOnScroll } from "./landing/reveal-on-scroll";
import { TestimonialsGate } from "./landing/testimonials-gate";

export default async function LandingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[]>>;
}) {
  const params = await searchParams;
  // Reconstruct query string so the server SDK can apply ?se_ks_* / ?se_cf_* overrides.
  const qs = new URLSearchParams(params as Record<string, string>).toString();
  const rawUrl = qs ? `?${qs}` : "";

  // initOnce() is idempotent — reuses the blob fetched by layout. urlOverrides applies
  // ?se_ks_* / ?se_cf_* params from the request URL to server-rendered content.
  const seConfig = await shipeasy({
    apiKey: process.env.SHIPEASY_SERVER_KEY,
    urlOverrides: rawUrl,
  });
  const flagValues = seConfig.flags;
  const configs = seConfig.configs;

  const showTestimonials = flagValues["landing_show_testimonials"] ?? false;
  const showBeta = flagValues["landing_beta_badge"] ?? false;
  const announcementCfg = configs["landing_announcement_bar"] as AnnouncementBarConfig | undefined;
  const heroStats = configs["landing_hero_stats"] as HeroStat[] | undefined;

  return (
    <div
      className="relative min-h-screen"
      style={{ background: "var(--se-bg)", color: "var(--se-fg)" }}
    >
      <div aria-hidden className="lp-bg-grid" />
      <div aria-hidden className="lp-bg-spot" />
      <ScrollProgress />
      <RevealOnScroll />

      <AnnouncementBar cfg={announcementCfg} />
      <LandingNav showBeta={showBeta} />
      <LandingHero stats={heroStats} />
      <LandingMarquee />
      <StickyFeatures />
      <LandingWorkflow />
      <TestimonialsGate show={showTestimonials}>
        <LandingTestimonials />
      </TestimonialsGate>
      <LandingPricing />
      <LandingFaq />
      <LandingCtaFooter />
    </div>
  );
}
