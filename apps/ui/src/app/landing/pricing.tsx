"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { i18n } from "@shipeasy/sdk/client";
import { CheckIcon } from "./icons";

interface Plan {
  name: string;
  monthly: string;
  annual: string;
  per: string;
  features: string[];
  cta: { href: string; primary?: boolean };
  featured?: boolean;
  popular?: boolean;
  keys: {
    descKey: string;
    ctaKey: string;
    descVars?: Record<string, string | number>;
    ctaVars?: Record<string, string | number>;
  };
}

const PLANS: Plan[] = [
  {
    name: "Hobby",
    monthly: "$0",
    annual: "$0",
    per: "/ forever",
    features: [
      "3 experiments",
      "Unlimited killswitches",
      "100k events / mo",
      "MCP + Claude integration",
    ],
    cta: { href: "/auth/signin" },
    keys: {
      descKey: "landing.pricing.plan_hobby_desc",
      ctaKey: "landing.pricing.plan_hobby_cta",
    },
  },
  {
    name: "Team",
    monthly: "$49",
    annual: "$39",
    per: "/ seat / mo",
    features: [
      "Unlimited experiments",
      "10M events / mo",
      "Sequential + Bayesian stats",
      "Auto-ramp + guardrails",
      "Slack digests · SSO",
    ],
    cta: { href: "/auth/signin", primary: true },
    featured: true,
    popular: true,
    keys: {
      descKey: "landing.pricing.plan_team_desc",
      ctaKey: "landing.pricing.plan_team_cta",
      descVars: { trialDays: 14 },
    },
  },
  {
    name: "Enterprise",
    monthly: "Custom",
    annual: "Custom",
    per: "",
    features: ["Everything in Team", "Self-hosted option", "SOC 2 Type II", "Dedicated support"],
    cta: { href: "mailto:hi@shipeasy.ai" },
    keys: {
      descKey: "landing.pricing.plan_enterprise_desc",
      ctaKey: "landing.pricing.plan_enterprise_cta",
    },
  },
];

export function LandingPricing() {
  const [period, setPeriod] = useState<"monthly" | "annual">("monthly");

  return (
    <section className="lp-section" id="pricing">
      <div className="mx-auto max-w-[1200px] px-7">
        <div className="lp-sec-head lp-reveal lp-in">
          <div className="lp-sec-eyebrow">
            {i18n.tEl("landing.pricing.eyebrow", undefined, "Pricing section eyebrow label")}
          </div>
          <h2 className="lp-sec-title">
            {i18n.tEl("landing.pricing.title", undefined, "Pricing section headline")}
          </h2>
        </div>

        <div className="lp-toggle-wrap lp-reveal lp-in">
          <div className="lp-toggle" role="tablist" aria-label="Billing period">
            <button
              role="tab"
              aria-selected={period === "monthly"}
              className={period === "monthly" ? "lp-active" : ""}
              onClick={() => setPeriod("monthly")}
            >
              {i18n.tEl(
                "landing.pricing.toggle_monthly",
                undefined,
                "Billing period toggle: monthly",
              )}
            </button>
            <button
              role="tab"
              aria-selected={period === "annual"}
              className={period === "annual" ? "lp-active" : ""}
              onClick={() => setPeriod("annual")}
            >
              {i18n.tEl(
                "landing.pricing.toggle_annual",
                undefined,
                "Billing period toggle: annual",
              )}{" "}
              <span
                style={{
                  color: "var(--se-accent)",
                  fontFamily: "var(--se-mono)",
                  fontSize: 11,
                  marginLeft: 4,
                }}
              >
                −20%
              </span>
            </button>
          </div>
        </div>

        <div className="lp-pricing">
          {PLANS.map((p, i) => (
            <div
              key={p.name}
              className={`lp-plan ${p.featured ? "lp-featured" : ""} lp-reveal lp-in lp-d${i + 1}`}
            >
              <div className="lp-plan-name">
                {p.name}
                {p.popular && (
                  <span className="lp-badge lp-accent" style={{ fontSize: 10 }}>
                    popular
                  </span>
                )}
              </div>
              <div className="lp-plan-price">
                <span>{period === "annual" ? p.annual : p.monthly}</span>
                {p.per && <span className="lp-per">{p.per}</span>}
              </div>
              <div className="lp-plan-desc">
                {i18n.tEl(p.keys.descKey, p.keys.descVars, `${p.name} plan description`)}
              </div>
              <ul>
                {p.features.map((f) => (
                  <li key={f}>
                    <CheckIcon size={14} />
                    {f}
                  </li>
                ))}
              </ul>
              {p.cta.href.startsWith("mailto:") ? (
                <a
                  className={`lp-btn lp-cta ${p.cta.primary ? "lp-btn-primary" : "lp-btn-ghost"}`}
                  href={p.cta.href}
                >
                  {i18n.tEl(p.keys.ctaKey, p.keys.ctaVars, `${p.name} plan CTA button`)}{" "}
                  <ArrowRight className="size-3.5" />
                </a>
              ) : (
                <Link
                  className={`lp-btn lp-cta ${p.cta.primary ? "lp-btn-primary" : "lp-btn-ghost"}`}
                  href={p.cta.href}
                >
                  {i18n.tEl(p.keys.ctaKey, p.keys.ctaVars, `${p.name} plan CTA button`)}{" "}
                  <ArrowRight className="size-3.5" />
                </Link>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
