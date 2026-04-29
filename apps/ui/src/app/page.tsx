import "./landing/landing.css";
import { LandingProviders } from "./landing/providers";
import { AnnouncementBar } from "./landing/announcement-bar";
import { LandingNav } from "./landing/nav";
import { ScrollProgress } from "./landing/scroll-progress";
import { LandingHero } from "./landing/hero";
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

/**
 * Statically rendered: no `await auth()` so Next 16 doesn't ship two SSR
 * runtimes worth of code for this route. The signed-in CTA lives on the
 * client and resolves via /api/auth/session.
 */
export const dynamic = "force-static";
export const revalidate = false;

export default function LandingPage() {
  return (
    <div
      className="relative min-h-screen"
      style={{ background: "var(--se-bg)", color: "var(--se-fg)" }}
    >
      <div aria-hidden className="lp-bg-grid" />
      <div aria-hidden className="lp-bg-spot" />
      <ScrollProgress />
      <RevealOnScroll />

      <LandingProviders>
        <AnnouncementBar />
        <LandingNav />
        <LandingHero />
        <LandingMarquee />
        <StickyFeatures />
        <LandingWorkflow />
        <TestimonialsGate>
          <LandingTestimonials />
        </TestimonialsGate>
        <LandingPricing />
        <LandingFaq />
        <LandingCtaFooter />
      </LandingProviders>
    </div>
  );
}
