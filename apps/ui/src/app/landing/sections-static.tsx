import Link from "next/link";
import { ArrowRight, BookOpen, Check, Copy } from "lucide-react";

const wrap = "mx-auto max-w-[1240px] px-7";

/* ──────────────────────────────────────────── How it works */
export function LandingHowItWorks() {
  return (
    <section className="lp-section" id="how">
      <div className={wrap}>
        <div className="lp-sec-head">
          <div className="lp-reveal lp-in">
            <div className="lp-sec-eyebrow">
              <span className="lp-num">02</span> / install
            </div>
            <h2 className="lp-sec-title">
              Installed with Claude in <em>seconds</em>.
            </h2>
          </div>
          <p className="lp-sec-sub lp-reveal lp-d1 lp-in">
            Shipeasy is MCP-native. One command adds four tools to Claude and wires your project —
            no servers, no SDK config, no YAML.
          </p>
        </div>

        <div className="lp-steps lp-reveal lp-d2 lp-in">
          <div className="lp-step">
            <div className="lp-step-num">STEP 01 · 12 SECONDS</div>
            <h4>Install the MCP server</h4>
            <p>
              Run one command. Claude picks up the server, discovers your codebase, and registers
              four tools.
            </p>
            <div className="lp-step-viz">
              <div>
                <span className="lp-prompt">$ </span>
                <span className="lp-cmd">claude mcp add shipeasy</span>
              </div>
              <div className="lp-out mt-1.5">✓ connected · 4 tools</div>
            </div>
          </div>

          <div className="lp-step">
            <div className="lp-step-num">STEP 02 · ASK</div>
            <h4>Describe the experiment</h4>
            <p>
              In plain English, tell Claude what you want to try. It writes the feature-flag
              wrapper, picks metrics, and ramps safely.
            </p>
            <div className="lp-step-viz">
              <div className="lp-prompt">you</div>
              <div className="lp-cmd">&quot;try a new paywall copy to see</div>
              <div className="lp-cmd">&nbsp;if it lifts trial starts&quot;</div>
            </div>
          </div>

          <div className="lp-step">
            <div className="lp-step-num">STEP 03 · SHIP</div>
            <h4>Watch it run</h4>
            <p>
              Live metrics stream to the dashboard. Claude pings you when there&rsquo;s a clear
              winner — or when something breaks.
            </p>
            <div className="lp-step-viz">
              <div className="lp-out">▲ +6.1% trial_start · sig 98%</div>
              <div className="mt-1" style={{ color: "var(--se-fg-3)" }}>
                ↳ auto-ramping to 50%...
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ──────────────────────────────────────────── CLI + code */
export function LandingCli() {
  return (
    <section className="lp-section">
      <div className={wrap}>
        <div className="lp-sec-head">
          <div className="lp-reveal lp-in">
            <div className="lp-sec-eyebrow">
              <span className="lp-num">03</span> / code
            </div>
            <h2 className="lp-sec-title">
              Four lines in your app. <em>That&rsquo;s it.</em>
            </h2>
          </div>
          <p className="lp-sec-sub lp-reveal lp-d1 lp-in">
            Drop the SDK, wrap a feature, and you&rsquo;re instrumented. Works with any framework.
            Typed, tree-shakable, 4kb gzipped.
          </p>
        </div>

        <div className="lp-cli-grid lp-reveal lp-d2 lp-in grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="lp-cli">
            <div className="lp-cli-head">
              <div className="lp-cli-dot" />
              <div className="lp-cli-dot" />
              <div className="lp-cli-dot" />
              <div className="lp-cli-title">zsh · install</div>
            </div>
            <div className="lp-cli-body">
              <div>
                <span className="lp-p">$</span>
                <span className="lp-c"> npm i @shipeasy/sdk</span>
              </div>
              <div>
                <span className="lp-p">$</span>
                <span className="lp-c"> claude mcp add shipeasy</span>
              </div>
              <div className="lp-ok"> ✓ MCP server connected</div>
              <div className="lp-ok"> ✓ tools: create_experiment, set_killswitch,</div>
              <div className="lp-ok"> update_config, query_metrics</div>
              <div className="h-3" />
              <div>
                <span className="lp-p">$</span>
                <span className="lp-c">
                  {" "}
                  claude &quot;add a killswitch for the new dashboard&quot;
                </span>
              </div>
              <div className="lp-o">
                {" "}
                → wrapping DashboardV2 with useFlag(&apos;dashboard_v2&apos;)
              </div>
              <div className="lp-ok"> ✓ killswitch armed</div>
            </div>
          </div>

          <div className="lp-cli">
            <div className="lp-cli-head">
              <div className="lp-cli-dot" />
              <div className="lp-cli-dot" />
              <div className="lp-cli-dot" />
              <div className="lp-cli-title">app.tsx · typescript</div>
            </div>
            <div className="lp-cli-body" style={{ fontSize: 12.5 }}>
              <div>
                <span className="lp-kw">import</span> {"{ useFlag, useConfig }"}{" "}
                <span className="lp-kw">from</span>{" "}
                <span className="lp-w">&apos;@shipeasy/sdk&apos;</span>
              </div>
              <div className="h-2.5" />
              <div>
                <span className="lp-kw">export function</span>{" "}
                <span className="lp-c">Dashboard</span>() {"{"}
              </div>
              <div>
                {"  "}
                <span className="lp-kw">const</span> variant ={" "}
                <span style={{ color: "var(--se-accent)" }}>useFlag</span>(
                <span className="lp-w">&apos;dashboard_v2&apos;</span>)
              </div>
              <div>
                {"  "}
                <span className="lp-kw">const</span> {"{ maxItems }"} ={" "}
                <span style={{ color: "var(--se-accent)" }}>useConfig</span>(
                <span className="lp-w">&apos;home&apos;</span>)
              </div>
              <div className="h-1.5" />
              <div>
                {"  "}
                <span className="lp-kw">return</span> variant ==={" "}
                <span className="lp-w">&apos;B&apos;</span>
              </div>
              <div>
                {"    "}? &lt;<span className="lp-c">DashboardV2</span> limit={"{"}maxItems{"}"}{" "}
                /&gt;
              </div>
              <div>
                {"    "}: &lt;<span className="lp-c">Dashboard</span> limit={"{"}maxItems{"}"} /&gt;
              </div>
              <div>{"}"}</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ──────────────────────────────────────────── Dashboard preview */
function BigChart() {
  const a = "0,65 8,60 16,56 24,52 32,48 40,42 48,38 56,34 64,28 72,24 80,20 88,16 96,12 100,10";
  const b = "0,68 8,66 16,64 24,62 32,62 40,60 48,58 56,58 64,56 72,54 80,52 88,50 96,50 100,48";
  return (
    <svg
      viewBox="0 0 100 80"
      preserveAspectRatio="none"
      style={{ width: "100%", height: 180, display: "block" }}
      aria-hidden
    >
      <defs>
        <linearGradient id="lp-fA" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="var(--se-accent)" stopOpacity="0.22" />
          <stop offset="100%" stopColor="var(--se-accent)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 20, 40, 60, 80].map((y) => (
        <line key={y} x1="0" x2="100" y1={y} y2={y} stroke="var(--se-line)" strokeWidth="0.2" />
      ))}
      <polyline points={`0,80 ${a} 100,80`} fill="url(#lp-fA)" />
      <polyline points={a} fill="none" stroke="var(--se-accent)" strokeWidth="0.8" />
      <polyline
        points={b}
        fill="none"
        stroke="var(--se-fg-3)"
        strokeWidth="0.6"
        strokeDasharray="1.5 1.5"
      />
    </svg>
  );
}

export function LandingDashboard() {
  return (
    <section className="lp-section" id="dashboard">
      <div className={wrap}>
        <div className="lp-sec-head">
          <div className="lp-reveal lp-in">
            <div className="lp-sec-eyebrow">
              <span className="lp-num">04</span> / dashboard
            </div>
            <h2 className="lp-sec-title">
              Metrics that <em>collect</em> themselves.
            </h2>
          </div>
          <p className="lp-sec-sub lp-reveal lp-d1 lp-in">
            Activation, retention, revenue and error-rate — instrumented automatically the moment
            you install.
          </p>
        </div>

        <div className="lp-dash lp-reveal lp-d2 lp-in">
          <div className="lp-dash-head">
            <div className="lp-crumb">
              <span>acme-app</span>
              <span className="lp-sep">/</span>
              <span>experiments</span>
              <span className="lp-sep">/</span>
              <span className="lp-cur">checkout_v3</span>
            </div>
            <div className="lp-dash-right">
              <span className="lp-pill">
                <span className="lp-dot" /> live · day 6
              </span>
              <a
                className="lp-btn lp-btn-ghost lp-btn-mono"
                href="#"
                style={{ padding: "6px 10px" }}
              >
                <Copy className="size-3" /> share
              </a>
            </div>
          </div>
          <div className="lp-dash-body">
            <div className="lp-stat">
              <div className="lp-s-k">Conversion</div>
              <div className="lp-s-v">4.82%</div>
              <div className="lp-s-d">▲ +8.4% · sig 99.2%</div>
            </div>
            <div className="lp-stat">
              <div className="lp-s-k">$ / user</div>
              <div className="lp-s-v">$47.20</div>
              <div className="lp-s-d">▲ +$2.18</div>
            </div>
            <div className="lp-stat">
              <div className="lp-s-k">Sample size</div>
              <div className="lp-s-v">14,203</div>
              <div className="lp-s-d lp-mute">of 14,000 target</div>
            </div>
            <div className="lp-stat">
              <div className="lp-s-k">Error rate</div>
              <div className="lp-s-v">0.04%</div>
              <div className="lp-s-d lp-neg">▼ −0.1%</div>
            </div>
          </div>
          <div className="lp-dash-chart">
            <div className="lp-chart-legend">
              <span>
                <span className="lp-sw" />
                variant B · one-click
              </span>
              <span>
                <span className="lp-sw lp-b" />
                variant A · control
              </span>
              <span style={{ marginLeft: "auto", color: "var(--se-fg-4)" }}>last 7 days</span>
            </div>
            <BigChart />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ──────────────────────────────────────────── Use cases */
const CASES = [
  {
    tag: "A/B test",
    title: "Try something new",
    desc: "Ship a variant to 10% of users, let sequential stats decide when to call it, and roll out when confident.",
    card: (
      <>
        <div style={{ color: "var(--se-fg)" }}>claude: try a new onboarding flow</div>
        <div style={{ color: "var(--se-fg-3)", marginTop: 6 }}>
          ↳ scope: 10% · primary: activation_7d
        </div>
        <div style={{ color: "var(--se-accent)", marginTop: 6 }}>✓ experiment live</div>
      </>
    ),
  },
  {
    tag: "Gradual rollout",
    title: "Ramp it safely",
    desc: "Go from 1% → 100% over days, gated on error rate and latency. Pause or revert with a single message.",
    card: (
      <>
        <div style={{ color: "var(--se-fg)" }}>1% → 5% → 25% → 100%</div>
        <div style={{ color: "var(--se-fg-3)", marginTop: 6 }}>guardrail: errors &lt; 0.5%</div>
        <div style={{ color: "var(--se-accent)", marginTop: 6 }}>▲ at 25% · ramping in 24h</div>
      </>
    ),
  },
  {
    tag: "Killswitch",
    title: "Kill it in one breath",
    desc: "A bug slipped through? “turn off the new checkout” — globally, under 200ms, logged, reversible.",
    card: (
      <>
        <div style={{ color: "var(--se-fg)" }}>you: turn off new_checkout</div>
        <div style={{ color: "var(--se-fg-3)", marginTop: 6 }}>↳ disabled globally · 187ms</div>
        <div style={{ color: "var(--se-danger)", marginTop: 6 }}>◼ killswitch engaged</div>
      </>
    ),
  },
];

export function LandingUseCases() {
  return (
    <section className="lp-section">
      <div className={wrap}>
        <div className="lp-sec-head">
          <div className="lp-reveal lp-in">
            <div className="lp-sec-eyebrow">
              <span className="lp-num">05</span> / use cases
            </div>
            <h2 className="lp-sec-title">
              From <em>hunch</em> to shipped, in a sentence.
            </h2>
          </div>
        </div>
        <div className="lp-uses lp-reveal lp-d1 lp-in">
          {CASES.map((c) => (
            <div className="lp-use" key={c.tag}>
              <div className="lp-use-tag">{c.tag}</div>
              <h4>{c.title}</h4>
              <p>{c.desc}</p>
              <div className="lp-use-card">{c.card}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ──────────────────────────────────────────── Pricing */
export function LandingPricing() {
  const check = <Check className="size-3.5" />;
  return (
    <section className="lp-section" id="pricing">
      <div className={wrap}>
        <div className="lp-sec-head">
          <div className="lp-reveal lp-in">
            <div className="lp-sec-eyebrow">
              <span className="lp-num">06</span> / pricing
            </div>
            <h2 className="lp-sec-title">
              Free to start. <em>Fair</em> as you grow.
            </h2>
          </div>
        </div>
        <div className="lp-pricing lp-reveal lp-d1 lp-in">
          <div className="lp-plan">
            <div className="lp-plan-name">Hobby</div>
            <div className="lp-plan-price">
              $0<span className="lp-per">/ forever</span>
            </div>
            <div className="lp-plan-desc">Everything you need for side projects and solo work.</div>
            <ul className="lp-plan-features">
              <li>{check} 3 experiments</li>
              <li>{check} Unlimited killswitches</li>
              <li>{check} 100k events / month</li>
              <li>{check} MCP + Claude integration</li>
              <li>{check} Community support</li>
            </ul>
            <Link className="lp-btn lp-btn-ghost lp-plan-cta" href="/auth/signin">
              Start free <ArrowRight className="size-3.5" />
            </Link>
          </div>

          <div className="lp-plan lp-featured">
            <div className="flex items-center gap-2">
              <div className="lp-plan-name">Team</div>
              <span className="lp-pill" style={{ fontSize: 10 }}>
                popular
              </span>
            </div>
            <div className="lp-plan-price">
              $49<span className="lp-per">/ seat / mo</span>
            </div>
            <div className="lp-plan-desc">For small teams shipping experiments weekly.</div>
            <ul className="lp-plan-features">
              <li>{check} Unlimited experiments</li>
              <li>{check} 10M events / month</li>
              <li>{check} Sequential &amp; Bayesian stats</li>
              <li>{check} Auto-ramping + guardrails</li>
              <li>{check} Slack + email digests</li>
              <li>{check} SSO</li>
            </ul>
            <Link className="lp-btn lp-btn-primary lp-plan-cta" href="/auth/signin">
              Start 14-day trial <ArrowRight className="size-3.5" />
            </Link>
          </div>

          <div className="lp-plan">
            <div className="lp-plan-name">Enterprise</div>
            <div className="lp-plan-price">Custom</div>
            <div className="lp-plan-desc">Self-hosted, audit logs, custom SLAs.</div>
            <ul className="lp-plan-features">
              <li>{check} Everything in Team</li>
              <li>{check} Self-hosted option</li>
              <li>{check} SOC 2 Type II</li>
              <li>{check} Custom data retention</li>
              <li>{check} Dedicated support</li>
            </ul>
            <a className="lp-btn lp-btn-ghost lp-plan-cta" href="mailto:hi@shipeasy.ai">
              Talk to us <ArrowRight className="size-3.5" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ──────────────────────────────────────────── FAQ */
const QS: [string, string][] = [
  [
    "How does the MCP install actually work?",
    "One command — claude mcp add shipeasy — registers four tools with Claude. We use your project context to wire experiments into the right files. No YAML, no dashboard configuration.",
  ],
  [
    "Is Shipeasy a hosted service, or can I self-host?",
    "Both. Hosted is the default. Self-hosted is a one-binary deployment on our Enterprise plan, with full parity and an air-gapped mode.",
  ],
  [
    "Which stats engine do you use?",
    "Sequential testing by default — you can peek at results whenever, without inflating false-positive rates. Bayesian and frequentist are both available per-experiment.",
  ],
  [
    "What happens if Claude makes a mistake?",
    "Every action goes through a PR or is reversible. Killswitches and experiment changes are logged. Nothing touches production without your review on Team and above.",
  ],
  [
    "Do you work with our existing framework?",
    "If it runs JS/TS, Python, Go, Ruby, Rust, or Swift — yes. The SDK is a thin client; the heavy lifting happens server-side.",
  ],
];

export function LandingFaq() {
  return (
    <section className="lp-section" id="faq">
      <div className={wrap}>
        <div className="lp-sec-head">
          <div className="lp-reveal lp-in">
            <div className="lp-sec-eyebrow">
              <span className="lp-num">07</span> / questions
            </div>
            <h2 className="lp-sec-title">You probably want to know.</h2>
          </div>
        </div>
        <div className="lp-faq lp-reveal lp-d1 lp-in">
          {QS.map(([q, a]) => (
            <div className="lp-qa" key={q}>
              <h5>{q}</h5>
              <p>{a}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ──────────────────────────────────────────── CTA + Footer */
export function LandingCtaFooter() {
  const year = new Date().getFullYear();
  return (
    <>
      <section className="lp-section" style={{ paddingBottom: 32 }}>
        <div className={`${wrap} text-center`}>
          <h2 className="lp-sec-title lp-reveal lp-in mx-auto" style={{ maxWidth: "22ch" }}>
            Stop guessing. <em>Start</em> shipping.
          </h2>
          <p
            className="lp-sec-sub lp-reveal lp-d1 lp-in mx-auto"
            style={{ margin: "18px auto 28px" }}
          >
            Install in 12 seconds. Your first experiment before your coffee is cold.
          </p>
          <div className="lp-reveal lp-d2 lp-in flex justify-center gap-2.5">
            <Link className="lp-btn lp-btn-primary" href="/auth/signin">
              Install with Claude <ArrowRight className="size-3.5" />
            </Link>
            <a
              className="lp-btn lp-btn-ghost"
              href="https://docs.shipeasy.ai"
              target="_blank"
              rel="noreferrer"
            >
              <BookOpen className="size-3.5" /> Read the docs
            </a>
          </div>
        </div>
      </section>

      <footer className="lp-footer">
        <div className={wrap}>
          <div className="lp-foot">
            <div className="lp-foot-brand">
              <div className="flex items-center gap-2.5 text-[15px] font-semibold">
                <span className="lp-brand-mark" aria-hidden />
                <span>Shipeasy</span>
              </div>
              <p>
                AI-native experimentation. Killswitches, configs, experiments, and metrics — all
                from one sentence in Claude.
              </p>
            </div>
            <div>
              <h6>Product</h6>
              <ul>
                <li>
                  <a href="#features">Killswitches</a>
                </li>
                <li>
                  <a href="#features">Configs</a>
                </li>
                <li>
                  <a href="#features">Experiments</a>
                </li>
                <li>
                  <a href="#features">Metrics</a>
                </li>
                <li>
                  <a href="https://docs.shipeasy.ai/mcp">MCP server</a>
                </li>
              </ul>
            </div>
            <div>
              <h6>Developers</h6>
              <ul>
                <li>
                  <a href="https://docs.shipeasy.ai">Documentation</a>
                </li>
                <li>
                  <a href="https://docs.shipeasy.ai/sdk">SDK reference</a>
                </li>
                <li>
                  <a href="https://docs.shipeasy.ai/examples">Examples</a>
                </li>
                <li>
                  <a href="https://docs.shipeasy.ai/changelog">Changelog</a>
                </li>
                <li>
                  <a href="https://status.shipeasy.ai">Status</a>
                </li>
              </ul>
            </div>
            <div>
              <h6>Company</h6>
              <ul>
                <li>
                  <a href="https://shipeasy.ai/about">About</a>
                </li>
                <li>
                  <a href="https://shipeasy.ai/blog">Blog</a>
                </li>
                <li>
                  <a href="https://docs.shipeasy.ai/security">Security</a>
                </li>
                <li>
                  <a href="https://docs.shipeasy.ai/privacy">Privacy</a>
                </li>
                <li>
                  <a href="https://docs.shipeasy.ai/terms">Terms</a>
                </li>
              </ul>
            </div>
          </div>
          <div className="lp-foot-bottom">
            <span>© {year} Shipeasy, Inc. · Built with Claude.</span>
            <span className="flex items-center gap-4">
              <a href="https://github.com/shipeasy" aria-label="GitHub">
                GitHub
              </a>
              <a href="https://status.shipeasy.ai">all systems normal</a>
            </span>
          </div>
        </div>
      </footer>
    </>
  );
}
