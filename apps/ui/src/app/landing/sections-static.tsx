import Link from "next/link";
import { ArrowRight, BookOpen, LineChart, Sparkles, Terminal } from "lucide-react";
import { CheckIcon } from "./icons";

const wrap = "mx-auto max-w-[1200px] px-7";

/* ──────────────────────────────────────────── Workflow */
export function LandingWorkflow() {
  return (
    <section className="lp-section" id="how">
      <div className={wrap}>
        <div className="lp-sec-head lp-reveal lp-in">
          <div className="lp-sec-eyebrow">Workflow</div>
          <h2 className="lp-sec-title">
            From hunch to shipped, <em>in four steps.</em>
          </h2>
        </div>

        <div className="lp-steps lp-reveal lp-in lp-d1">
          <Step
            n="01 · 12s"
            title="Install the MCP server"
            desc="One command. Claude picks up the server, discovers your codebase, and registers four tools."
          >
            <Terminal className="size-5" />
          </Step>
          <Step
            n="02 · ask"
            title="Describe the experiment"
            desc="In plain English, tell Claude what you want to try. It writes the wrapper, picks the metric, and ramps safely."
          >
            <Sparkles className="size-5" />
          </Step>
          <Step
            n="03 · ship"
            title="Watch it run"
            desc="Live metrics stream to the dashboard. Claude pings you when there's a clear winner — or when something breaks."
          >
            <LineChart className="size-5" />
          </Step>
          <Step
            n="04 · learn"
            title="Auto-ramp the winner"
            desc="Sequential stats call it; Shipeasy ramps the winning variant from 25% to 100% over 48h on the guardrail of your choice."
          >
            <CheckIcon size={20} />
          </Step>
        </div>
      </div>
    </section>
  );
}

function Step({
  n,
  title,
  desc,
  children,
}: {
  n: string;
  title: string;
  desc: string;
  children: React.ReactNode;
}) {
  return (
    <div className="lp-step">
      <div className="lp-step-icon">{children}</div>
      <div className="lp-step-body">
        <div className="lp-step-num">Step {n}</div>
        <h4>{title}</h4>
        <p>{desc}</p>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────── Testimonials marquee */
const QUOTES: [string, string, string][] = [
  [
    "First dev tool where Claude actually does the boring half — wiring up flags, picking metrics, ramping safely.",
    "Iris L.",
    "Eng lead · Northwind",
  ],
  [
    "We killed three experiments in our first week — none of which we would have shipped before.",
    "Marco R.",
    "PM · Anvil",
  ],
  [
    "Replaced a homegrown LaunchDarkly + Amplitude bundle. Same week, less SQL.",
    "Pia O.",
    "CTO · Parallel",
  ],
  [
    "The killswitch round-trip from chat to prod is genuinely under 200ms. We measured.",
    "Sven K.",
    "SRE · Orbital",
  ],
  [
    "Sequential stats means our Slack channel finally stopped fighting about p-values.",
    "Halle B.",
    "Data · Helix",
  ],
  [
    "Onboarded the team in an afternoon. The MCP install really is one command.",
    "Jules T.",
    "Founder · Coldstart",
  ],
];

function QuoteCard({ q, who, role }: { q: string; who: string; role: string }) {
  return (
    <div className="lp-quote">
      <p>“{q}”</p>
      <div className="lp-who">
        <div className="lp-face">{who.slice(0, 1)}</div>
        <div className="lp-meta">
          <b>{who}</b>
          <span>{role}</span>
        </div>
      </div>
    </div>
  );
}

export function LandingTestimonials() {
  const a = [...QUOTES, ...QUOTES];
  const b = [...QUOTES.slice().reverse(), ...QUOTES.slice().reverse()];
  return (
    <section className="lp-section">
      <div className={wrap}>
        <div className="lp-sec-head lp-reveal lp-in">
          <div className="lp-sec-eyebrow">Loved by shipping teams</div>
          <h2 className="lp-sec-title">
            From hunch to shipped, <em>in a sentence.</em>
          </h2>
        </div>
      </div>
      <div className="lp-quotes" aria-hidden>
        <div className="lp-quote-row">
          {a.map((q, i) => (
            <QuoteCard key={`a-${i}`} q={q[0]} who={q[1]} role={q[2]} />
          ))}
        </div>
        <div className="lp-quote-row lp-reverse">
          {b.map((q, i) => (
            <QuoteCard key={`b-${i}`} q={q[0]} who={q[1]} role={q[2]} />
          ))}
        </div>
      </div>
    </section>
  );
}

/* ──────────────────────────────────────────── FAQ */
const QS: [string, React.ReactNode][] = [
  [
    "How does the MCP install actually work?",
    <>
      One command — <code>claude mcp add shipeasy</code> — registers four tools with Claude. We use
      your project context to wire experiments into the right files. No YAML.
    </>,
  ],
  [
    "Hosted, or self-host?",
    "Both. Hosted is the default. Self-hosted is a one-binary deployment on Enterprise with full parity and an air-gapped mode.",
  ],
  [
    "Which stats engine?",
    "Sequential testing by default — peek whenever, without inflating false positives. Bayesian and frequentist are available per-experiment.",
  ],
  [
    "What if Claude makes a mistake?",
    "Every action is reversible and logged. Killswitches and experiment changes go through a PR or a tool call you can undo.",
  ],
  [
    "Which frameworks?",
    "JS/TS, Python, Go, Ruby, Rust, Swift. The SDK is a thin client; the heavy lifting happens server-side.",
  ],
];

export function LandingFaq() {
  return (
    <section className="lp-section" id="faq">
      <div className={wrap}>
        <div className="lp-sec-head lp-reveal lp-in">
          <div className="lp-sec-eyebrow">FAQ</div>
          <h2 className="lp-sec-title">
            You probably want to <em>know.</em>
          </h2>
        </div>
        <div className="lp-faq lp-reveal lp-in lp-d1">
          {QS.map(([q, a]) => (
            <details key={q}>
              <summary>{q}</summary>
              <p>{a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ──────────────────────────────────────────── Final CTA + footer */
export function LandingCtaFooter() {
  const year = new Date().getFullYear();
  return (
    <>
      <section className={wrap}>
        <div className="lp-final-cta lp-reveal lp-in">
          <h2>
            Stop guessing. <em>Start</em> shipping.
          </h2>
          <p>Install in 12 seconds. Your first experiment before your coffee is cold.</p>
          <div className="lp-hero-cta">
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
              <div className="flex items-center gap-2.5 text-[15px] font-semibold tracking-[-0.01em]">
                <span className="lp-brand-mark" aria-hidden />
                <span>Shipeasy</span>
              </div>
              <p>
                AI-native experimentation. Killswitches, configs, experiments, and metrics — all
                from one sentence.
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
                  <a href="https://status.shipeasy.ai">Status</a>
                </li>
                <li>
                  <a href="https://docs.shipeasy.ai/changelog">Changelog</a>
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
            <span>v0.9 · all systems normal</span>
          </div>
        </div>
      </footer>
    </>
  );
}
