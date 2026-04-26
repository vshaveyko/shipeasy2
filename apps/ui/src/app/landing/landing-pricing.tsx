"use client";

import { useExperiment } from "@shipeasy/react";

/**
 * Pricing card. Variant params come from the `landing_pricing` experiment;
 * `control` keeps the launch number, `variant_b` tests a higher anchor.
 */
export function LandingPricing() {
  const { params } = useExperiment(
    "landing_pricing",
    {
      headline: "Start free, pay as you ship",
      price: "$29",
      period: "/mo",
      cta: "Start free",
    },
    undefined,
    {
      // Variant params declared inline so URL-driven overrides flip the
      // displayed copy without a worker round-trip. The dashboard remains
      // the source of truth for naturally-enrolled users.
      control: {
        headline: "Start free, pay as you ship",
        price: "$29",
        cta: "Start free",
      },
      variant_b: {
        headline: "Built for teams shipping daily",
        price: "$49",
        cta: "Get started",
      },
    },
  );

  return (
    <section
      id="pricing"
      className="relative z-[1] border-t border-[var(--se-line)] py-24"
      style={{ background: "var(--se-bg-1)" }}
    >
      <div className="mx-auto max-w-[1240px] px-7">
        <div className="mx-auto mb-10 max-w-[62ch] text-center">
          <div className="t-caps dim-2 mb-3">Pricing</div>
          <h2 className="text-[40px] font-medium tracking-[-0.02em] leading-[1.08]">
            {params.headline}
          </h2>
        </div>
        <div
          className="mx-auto flex max-w-[440px] flex-col items-center gap-4 rounded-[14px] border border-[var(--se-line-2)] p-8"
          style={{ background: "var(--se-bg-2)" }}
        >
          <div className="text-[14px] font-medium text-[var(--se-fg-2)]">Pro</div>
          <div className="flex items-baseline gap-1">
            <span
              className="text-[56px] font-medium tracking-[-0.03em]"
              style={{ fontVariantNumeric: "tabular-nums" }}
              data-testid="landing-price"
            >
              {params.price}
            </span>
            <span className="text-[14px] text-[var(--se-fg-3)]">{params.period}</span>
          </div>
          <p className="text-center text-[13px] leading-[1.5] text-[var(--se-fg-2)]">
            All four products. Unlimited environments. Pay only for what you evaluate.
          </p>
          <a
            href="/auth/signin"
            className="mt-2 inline-flex h-10 items-center rounded-[8px] bg-[var(--se-accent)] px-4 text-[13.5px] font-medium text-[var(--se-accent-fg)]"
          >
            {params.cta}
          </a>
        </div>
      </div>
    </section>
  );
}
