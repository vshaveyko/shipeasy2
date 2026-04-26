import { auth } from "@/auth";

import "./landing/landing.css";
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

export default async function LandingPage() {
  const session = await auth();
  const signedIn = Boolean(session?.user);

  return (
    <div
      className="relative min-h-screen overflow-x-hidden"
      style={{ background: "var(--se-bg)", color: "var(--se-fg)" }}
    >
      <div aria-hidden className="lp-bg-grid" />
      <div aria-hidden className="lp-bg-spot" />
      <ScrollProgress />
      <RevealOnScroll />

      <LandingNav signedIn={signedIn} />
      <LandingHero />
      <LandingMarquee />
      <StickyFeatures />
      <LandingWorkflow />
      <LandingTestimonials />
      <LandingPricing />
      <LandingFaq />
      <LandingCtaFooter />
    </div>
  );
}
