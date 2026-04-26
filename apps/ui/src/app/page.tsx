import { auth } from "@/auth";

import "./landing/landing.css";
import { LandingNav } from "./landing/nav";
import { LandingHero } from "./landing/hero";
import { LandingTicker } from "./landing/ticker";
import { LandingFeaturesTabs } from "./landing/features-tabs";
import {
  LandingHowItWorks,
  LandingCli,
  LandingDashboard,
  LandingUseCases,
  LandingPricing,
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
      <RevealOnScroll />
      <LandingNav signedIn={signedIn} />
      <LandingHero />
      <LandingTicker />
      <LandingFeaturesTabs />
      <LandingHowItWorks />
      <LandingCli />
      <LandingDashboard />
      <LandingUseCases />
      <LandingPricing />
      <LandingFaq />
      <LandingCtaFooter />
    </div>
  );
}
