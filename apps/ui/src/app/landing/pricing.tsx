"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { CheckIcon } from "./icons";

interface Plan {
  name: string;
  monthly: string;
  annual: string;
  per: string;
  desc: string;
  features: string[];
  cta: { label: string; href: string; primary?: boolean };
  featured?: boolean;
  popular?: boolean;
}

const PLANS: Plan[] = [
  {
    name: "Hobby",
    monthly: "$0",
    annual: "$0",
    per: "/ forever",
    desc: "Side projects and solo work.",
    features: [
      "3 experiments",
      "Unlimited killswitches",
      "100k events / mo",
      "MCP + Claude integration",
    ],
    cta: { label: "Start free", href: "/auth/signin" },
  },
  {
    name: "Team",
    monthly: "$49",
    annual: "$39",
    per: "/ seat / mo",
    desc: "Small teams shipping experiments weekly.",
    features: [
      "Unlimited experiments",
      "10M events / mo",
      "Sequential + Bayesian stats",
      "Auto-ramp + guardrails",
      "Slack digests · SSO",
    ],
    cta: { label: "Start 14-day trial", href: "/auth/signin", primary: true },
    featured: true,
    popular: true,
  },
  {
    name: "Enterprise",
    monthly: "Custom",
    annual: "Custom",
    per: "",
    desc: "Self-hosted, audit logs, SLAs.",
    features: ["Everything in Team", "Self-hosted option", "SOC 2 Type II", "Dedicated support"],
    cta: { label: "Talk to us", href: "mailto:hi@shipeasy.ai" },
  },
];

export function LandingPricing() {
  const [period, setPeriod] = useState<"monthly" | "annual">("monthly");

  return (
    <section className="lp-section" id="pricing">
      <div className="mx-auto max-w-[1200px] px-7">
        <div className="lp-sec-head lp-reveal lp-in">
          <div className="lp-sec-eyebrow">Pricing</div>
          <h2 className="lp-sec-title">
            Free to start. <em>Fair</em> as you grow.
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
              Monthly
            </button>
            <button
              role="tab"
              aria-selected={period === "annual"}
              className={period === "annual" ? "lp-active" : ""}
              onClick={() => setPeriod("annual")}
            >
              Annual{" "}
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
              <div className="lp-plan-desc">{p.desc}</div>
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
                  {p.cta.label} <ArrowRight className="size-3.5" />
                </a>
              ) : (
                <Link
                  className={`lp-btn lp-cta ${p.cta.primary ? "lp-btn-primary" : "lp-btn-ghost"}`}
                  href={p.cta.href}
                >
                  {p.cta.label} <ArrowRight className="size-3.5" />
                </Link>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
