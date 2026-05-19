// Shipeasy — Design System v2 page renderer.
// Builds on app.css + forms.css tokens.

const { useState } = React;

// ── Inline icons not in icons.jsx ─────────────────────
const SvgIcon = ({ children, size = 14, sw = 1.6 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={sw}
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ flexShrink: 0 }}
  >
    {children}
  </svg>
);
const Search = (p) => (
  <SvgIcon {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </SvgIcon>
);
const Eye = (p) => (
  <SvgIcon {...p}>
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
    <circle cx="12" cy="12" r="3" />
  </SvgIcon>
);
const EyeOff = (p) => (
  <SvgIcon {...p}>
    <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
    <path d="M10.7 5.1A11 11 0 0 1 12 5c6.5 0 10 7 10 7a18 18 0 0 1-2.4 3.4M6.6 6.6A18 18 0 0 0 2 12s3.5 7 10 7c1.4 0 2.7-.3 3.9-.7" />
    <path d="m2 2 20 20" />
  </SvgIcon>
);
const Mail = (p) => (
  <SvgIcon {...p}>
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="m22 7-10 6L2 7" />
  </SvgIcon>
);
const Calendar = (p) => (
  <SvgIcon {...p}>
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <path d="M16 2v4M8 2v4M3 10h18" />
  </SvgIcon>
);
const UploadCloud = (p) => (
  <SvgIcon {...p}>
    <path d="M4 14.9A7 7 0 1 1 15.7 8h1.3a4.5 4.5 0 0 1 .5 9" />
    <path d="m9 15 3-3 3 3" />
    <path d="M12 12v9" />
  </SvgIcon>
);
const FileText = (p) => (
  <SvgIcon {...p}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <path d="M14 2v6h6" />
    <path d="M9 13h6M9 17h6" />
  </SvgIcon>
);
const Globe = (p) => (
  <SvgIcon {...p}>
    <circle cx="12" cy="12" r="10" />
    <path d="M2 12h20" />
    <path d="M12 2a15 15 0 0 1 0 20 15 15 0 0 1 0-20Z" />
  </SvgIcon>
);
const Hash = (p) => (
  <SvgIcon {...p}>
    <path d="M4 9h16M4 15h16M10 3 8 21M16 3l-2 18" />
  </SvgIcon>
);

// ── Section wrapper ──────────────────────────────────
const Section = ({ id, num, title, sub, meta, children }) => (
  <section id={id} className="ds-section">
    <div className="ds-section-head">
      <div>
        <div className="num">{num}</div>
        <h2>{title}</h2>
        {sub && <p className="sub">{sub}</p>}
      </div>
      {meta && <div className="meta">{meta}</div>}
    </div>
    {children}
  </section>
);

const SubH = ({ children }) => <h3 className="ds-h3">{children}</h3>;

// ─────────────────────────────────────────────────────
// FOUNDATIONS
// ─────────────────────────────────────────────────────
function Hero() {
  return (
    <div className="ds-hero">
      <div className="eyebrow">Design System · v2.0 · last updated may 2026</div>
      <h1>
        <em>Calm surfaces.</em>
        <br />
        Loud signal.
      </h1>
      <p className="lead">
        A dark, monospace-flavored dashboard language for operators who read numbers more than
        marketing copy. Every component below is wired to the same token set in{" "}
        <span className="t-mono dim">app.css</span> and
        <span className="t-mono dim"> forms.css</span> — drop them into any screen and stay
        consistent.
      </p>
      <div className="stats">
        <div className="stat">
          <div className="k">Tokens</div>
          <div className="v">62</div>
        </div>
        <div className="stat">
          <div className="k">Components</div>
          <div className="v">28</div>
        </div>
        <div className="stat">
          <div className="k">Form elements</div>
          <div className="v">17</div>
        </div>
        <div className="stat">
          <div className="k">Density</div>
          <div className="v">14 / 32 / 8</div>
        </div>
      </div>
    </div>
  );
}

function ColorSection() {
  const surfaces = [
    ["bg", "#0a0a0b", "surface/0"],
    ["bg-1", "#0f0f10", "surface/1"],
    ["bg-2", "#141416", "surface/2"],
    ["bg-3", "#1a1a1d", "surface/3"],
    ["bg-4", "#222227", "surface/4"],
    ["line-2", "rgba(255,255,255,.14)", "border"],
  ];
  const fg = [
    ["fg", "100%", 1],
    ["fg-2", "72%", 0.72],
    ["fg-3", "48%", 0.48],
    ["fg-4", "28%", 0.28],
  ];
  const semantic = [
    ["accent", "oklch(0.78 0.17 155)", "live · primary"],
    ["danger", "oklch(0.72 0.18 25)", "killed · regressed"],
    ["warn", "oklch(0.82 0.15 85)", "paused · ramping"],
    ["info", "oklch(0.74 0.14 245)", "completed · neutral"],
    ["purple", "oklch(0.72 0.18 295)", "feature flags"],
  ];
  return (
    <Section
      id="color"
      num="01 · Foundations"
      title="Color"
      sub="A warm-neutral dark palette. Five surfaces stack from black up to chrome, four foreground opacities fade type back, five semantic hues carry status."
      meta="oklch · 16 tokens"
    >
      <SubH>Surfaces & borders</SubH>
      <div className="ds-grid g6" style={{ marginBottom: 32 }}>
        {surfaces.map(([k, v, r]) => (
          <div className="swatch" key={k}>
            <div
              className="chip"
              style={{
                background: v.startsWith("rgba") ? "var(--bg-1)" : v,
                border: v.startsWith("rgba") ? `1px solid ${v}` : "1px solid var(--line)",
              }}
            />
            <div className="lbl">
              <b>--{k}</b>
              <span>{v}</span>
            </div>
            <div className="lbl">
              <span className="role">{r}</span>
            </div>
          </div>
        ))}
      </div>
      <SubH>Foreground · opacity ladder</SubH>
      <div className="ds-grid g4" style={{ marginBottom: 32 }}>
        {fg.map(([k, o, a]) => (
          <div className="swatch" key={k}>
            <div
              className="chip"
              style={{
                background: "var(--bg-1)",
                display: "grid",
                placeItems: "center",
                color: `rgba(245,245,244,${a})`,
                fontSize: 28,
                fontWeight: 500,
                letterSpacing: "-0.02em",
              }}
            >
              Aa
            </div>
            <div className="lbl">
              <b>--{k}</b>
              <span>{o}</span>
            </div>
          </div>
        ))}
      </div>
      <SubH>Semantic</SubH>
      <div className="ds-grid g5">
        {semantic.map(([k, v, r]) => (
          <div className="swatch" key={k}>
            <div className="chip" style={{ background: `var(--${k})` }} />
            <div className="lbl">
              <b>--{k}</b>
            </div>
            <div className="lbl">
              <span className="role">{r}</span>
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

function TypeSection() {
  const rows = [
    ["display", "t-display", "The experiment ramp completed.", "44/1.05 · 500 · -3%"],
    ["h1", "t-h1", "Running experiments", "28/1.15 · 500 · -2%"],
    ["h2", "t-h2", "checkout_v3 variant B wins", "20/1.25 · 500 · -1.5%"],
    ["h3", "t-h3", "Section header", "16/1.3 · 500 · -1%"],
    [
      "body",
      "t-body",
      "Default body for descriptions, paragraphs, and most UI content.",
      "14/1.5 · 400",
    ],
    ["sm", "t-sm", "Secondary body, denser UI, table cells.", "13/1.5 · 400"],
    ["caps", "t-caps", "EVENT · METRIC · DASHBOARD", "10.5 · 500 · mono · 8% track"],
    ["mono", "t-mono", "user_id · event_ts · variant_key", "14 · mono · tabular"],
    ["serif", "t-serif", "Italic display moments.", "44 · Instrument Serif italic"],
  ];
  return (
    <Section
      id="type"
      num="02 · Foundations"
      title="Typography"
      sub="Geist for UI, Geist Mono for data and labels, Instrument Serif italic for the occasional editorial heading."
      meta="3 families · 9 sizes"
    >
      <div>
        {rows.map(([k, cls, text, specs]) => (
          <div className="type-row" key={k}>
            <span className="tag">{k}</span>
            <span className={`sample ${cls}`}>{text}</span>
            <span className="specs">{specs}</span>
          </div>
        ))}
      </div>
    </Section>
  );
}

function GeometrySection() {
  return (
    <Section
      id="geometry"
      num="03 · Foundations"
      title="Spacing, radii & shadows"
      sub="A tight 4-px scale that matches mono's 8-px rhythm. Five radius steps. Three shadows — most surfaces stay flat."
      meta="geometry"
    >
      <div className="ds-grid g2">
        <div className="ds-card">
          <div className="title">
            <b>Spacing scale</b>
            <span>4 px base</span>
          </div>
          <div>
            {[
              ["s-1", "4"],
              ["s-2", "8"],
              ["s-3", "12"],
              ["s-4", "16"],
              ["s-5", "20"],
              ["s-6", "24"],
              ["s-7", "32"],
              ["s-8", "40"],
            ].map(([n, v]) => (
              <div className="tok-row" key={n}>
                <span className="name">--{n}</span>
                <span className="val">{v}px</span>
                <span className="demo" style={{ width: `${v}px` }} />
              </div>
            ))}
          </div>
        </div>
        <div className="ds-card">
          <div className="title">
            <b>Radii</b>
            <span>5 steps</span>
          </div>
          <div className="ds-grid g5">
            {[
              ["xs", "4"],
              ["sm", "6"],
              ["md", "8"],
              ["lg", "10"],
              ["xl", "14"],
            ].map(([k, v]) => (
              <div key={k} className="swatch">
                <div className="radius-box" style={{ borderRadius: `${v}px` }}>
                  {v}
                </div>
                <div className="lbl">
                  <b>--r-{k}</b>
                </div>
              </div>
            ))}
          </div>
          <div className="title" style={{ marginTop: 14 }}>
            <b>Shadows</b>
            <span>flat-first</span>
          </div>
          <div className="ds-grid g3">
            {[
              ["1", "0 1px 2px rgba(0,0,0,.25)"],
              ["2", "0 8px 24px -8px rgba(0,0,0,.4)"],
              ["pop", "0 20px 48px -16px rgba(0,0,0,.5)"],
            ].map(([k, s]) => (
              <div key={k} className="swatch">
                <div className="shadow-box" style={{ boxShadow: s }}>
                  {k}
                </div>
                <div className="lbl">
                  <b>--shadow-{k}</b>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Section>
  );
}

// ─────────────────────────────────────────────────────
// FORM SECTIONS
// ─────────────────────────────────────────────────────
function FieldsSection() {
  return (
    <Section
      id="fields"
      num="04 · Forms"
      title="Fields, labels & help"
      sub="Every form control sits inside a field — a stacked label, control, and one of: hint, error, or success. Required and optional are marked but quiet."
      meta=".field · .field-label · .field-hint"
    >
      <div className="ds-grid g2">
        <div className="ds-card">
          <div className="title">
            <b>Anatomy</b>
          </div>
          <div className="field">
            <label className="field-label">
              Experiment name <span className="req">*</span>
            </label>
            <div className="input">
              <input defaultValue="checkout_v3" />
            </div>
            <div className="field-hint">
              <IconInfo size={12} />
              Lowercase, underscores, ≤ 40 chars.
            </div>
          </div>
        </div>
        <div className="ds-card">
          <div className="title">
            <b>States</b>
          </div>
          <div className="field">
            <label className="field-label">
              Slug <span className="opt">Optional</span>
            </label>
            <div className="input is-error">
              <input defaultValue="Checkout V3!" />
            </div>
            <div className="field-error">! Use lowercase letters and underscores.</div>
          </div>
          <div className="field">
            <label className="field-label">Slug</label>
            <div className="input is-success">
              <input defaultValue="checkout_v3" />
            </div>
            <div className="field-success">
              <IconCheck size={12} />
              Available.
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}

function InputsSection() {
  const [pw, setPw] = useState("correct horse battery");
  const [show, setShow] = useState(false);
  const [num, setNum] = useState(50);
  return (
    <Section
      id="inputs"
      num="05 · Forms"
      title="Text inputs"
      sub="Three sizes, full state matrix, and a library of decorations — leading icon, prefix, suffix, clear, password reveal, number stepper."
      meta=".input · sm / md / lg"
    >
      <SubH>Sizes</SubH>
      <div className="ds-card" style={{ marginBottom: 18 }}>
        <div className="demo" style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
          <div className="input input-sm" style={{ minWidth: 180 }}>
            <input placeholder="Small · 26 px" />
          </div>
          <div className="input" style={{ minWidth: 220 }}>
            <input placeholder="Default · 32 px" />
          </div>
          <div className="input input-lg" style={{ minWidth: 260 }}>
            <input placeholder="Large · 40 px" />
          </div>
        </div>
      </div>

      <SubH>States</SubH>
      <div className="ds-grid g3" style={{ marginBottom: 18 }}>
        {[
          [
            "Default",
            <div className="input">
              <input placeholder="placeholder" />
            </div>,
          ],
          [
            "Filled",
            <div className="input">
              <input defaultValue="checkout_v3" />
            </div>,
          ],
          [
            "Focus",
            <div
              className="input"
              style={{
                borderColor: "var(--fg-3)",
                background: "var(--bg-1)",
                boxShadow: "0 0 0 3px rgba(245,245,244,.06)",
              }}
            >
              <input defaultValue="checkout_v3" />
            </div>,
          ],
          [
            "Hover",
            <div className="input" style={{ borderColor: "var(--line-3)" }}>
              <input defaultValue="checkout_v3" />
            </div>,
          ],
          [
            "Disabled",
            <div className="input is-disabled">
              <input defaultValue="readonly_value" disabled />
            </div>,
          ],
          [
            "Read-only",
            <div className="input is-readonly">
              <input defaultValue="exp_8f2a31" readOnly />
            </div>,
          ],
          [
            "Error",
            <div className="input is-error">
              <input defaultValue="Bad Value!" />
            </div>,
          ],
          [
            "Success",
            <div className="input is-success">
              <input defaultValue="checkout_v3" />
            </div>,
          ],
          [
            "Placeholder",
            <div className="input">
              <input placeholder="e.g. checkout_v3" />
            </div>,
          ],
        ].map(([k, el]) => (
          <div key={k} className="ds-card" style={{ padding: 14, gap: 10 }}>
            <div className="title">{k}</div>
            {el}
          </div>
        ))}
      </div>

      <SubH>Decorations</SubH>
      <div className="ds-grid g2" style={{ marginBottom: 18 }}>
        <div className="ds-card">
          <div className="title">
            <b>Leading icon</b>
          </div>
          <div className="input">
            <Search />
            <input placeholder="Search experiments, gates, metrics…" />
            <span className="kbd">⌘ K</span>
          </div>
          <div className="input">
            <Mail />
            <input placeholder="you@company.com" />
          </div>
          <div className="input">
            <Hash />
            <input defaultValue="exp-8f2a31-checkout" />
          </div>
        </div>
        <div className="ds-card">
          <div className="title">
            <b>Trailing actions</b>
          </div>
          <div className="input">
            <input defaultValue="checkout_v3" />
            <button className="input-clear" aria-label="clear">
              ×
            </button>
          </div>
          <div className="input">
            <input
              type={show ? "text" : "password"}
              value={pw}
              onChange={(e) => setPw(e.target.value)}
            />
            <button
              className="input-clear"
              onClick={() => setShow((s) => !s)}
              style={{ background: "transparent", width: "auto" }}
              aria-label="toggle password"
            >
              {show ? <EyeOff /> : <Eye />}
            </button>
          </div>
          <div className="input">
            <input defaultValue="1,420" className="num" />
            <span className="suffix">USD</span>
          </div>
        </div>
        <div className="ds-card">
          <div className="title">
            <b>Prefix · suffix</b>
          </div>
          <div className="input mono">
            <span className="prefix">/exp</span>
            <input defaultValue="new_onboarding" />
          </div>
          <div className="input mono">
            <span className="prefix">https://</span>
            <input defaultValue="shipeasy.app/checkout" />
            <span className="suffix">.com</span>
          </div>
          <div className="input">
            <input defaultValue="0.0042" className="num" />
            <span className="suffix">%</span>
          </div>
        </div>
        <div className="ds-card">
          <div className="title">
            <b>Number stepper</b>
          </div>
          <div className="input" style={{ maxWidth: 160 }}>
            <input value={num} onChange={(e) => setNum(+e.target.value || 0)} className="num" />
            <span className="input-step">
              <button onClick={() => setNum((n) => n + 1)}>▲</button>
              <button onClick={() => setNum((n) => Math.max(0, n - 1))}>▼</button>
            </span>
          </div>
          <div className="input" style={{ maxWidth: 200 }}>
            <input defaultValue="14,203" className="num" />
            <span className="suffix">samples</span>
          </div>
        </div>
      </div>

      <SubH>Grouped inputs</SubH>
      <div className="ds-card">
        <div className="title">
          <b>Domain · region · key/secret</b>
        </div>
        <div className="input-group" style={{ maxWidth: 480 }}>
          <div className="input mono" style={{ flex: 1 }}>
            <input defaultValue="checkout-svc" />
          </div>
          <div className="select" style={{ width: 140 }}>
            <select defaultValue=".prod">
              <option>.dev</option>
              <option>.staging</option>
              <option>.prod</option>
            </select>
          </div>
          <button className="btn btn-secondary">Lookup</button>
        </div>
        <div className="input-group" style={{ maxWidth: 480, marginTop: 10 }}>
          <div className="select" style={{ width: 140 }}>
            <select defaultValue="us-east-1">
              <option>us-east-1</option>
              <option>eu-west-1</option>
              <option>ap-south-1</option>
            </select>
          </div>
          <div className="input mono" style={{ flex: 1 }}>
            <span className="prefix">sk_live_</span>
            <input defaultValue="9bd2…81f4" />
            <IconCopy size={12} style={{ color: "var(--fg-3)" }} />
          </div>
        </div>
      </div>
    </Section>
  );
}

function TextareaSection() {
  const [val, setVal] = useState(
    "Testing whether a 5-minute welcome email delay increases week-1 activation compared to the current 24-hour delay.",
  );
  return (
    <Section
      id="textarea"
      num="06 · Forms"
      title="Textarea"
      sub="Same resting state as inputs. Counter sits absolute bottom-right; resize hint is up to the consumer."
      meta=".textarea"
    >
      <div className="ds-grid g2">
        <div className="ds-card">
          <div className="title">
            <b>Default</b>
          </div>
          <div className="field">
            <label className="field-label">
              Hypothesis
              <span className="field-counter">{val.length} / 280</span>
            </label>
            <div className="textarea-wrap">
              <textarea
                className="textarea"
                value={val}
                onChange={(e) => setVal(e.target.value)}
                style={{ minHeight: 120 }}
              />
            </div>
            <div className="field-hint">
              <IconInfo size={12} />
              State the comparison and the outcome you expect.
            </div>
          </div>
        </div>
        <div className="ds-card">
          <div className="title">
            <b>Mono / code</b>
          </div>
          <div className="field">
            <label className="field-label">Targeting expression</label>
            <textarea
              className="textarea mono"
              defaultValue={`user.plan == "pro"\n&& user.created_at > "2026-01-01"\n&& user.region in ["us-east-1", "eu-west-1"]`}
              style={{ minHeight: 120 }}
            />
            <div className="field-hint">
              <IconCode size={12} />
              JavaScript-like expression evaluated server-side.
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}

// ── Single-select gallery ────────────────────────────
function SelectSection() {
  const [framework, setFramework] = useState("sequential");
  const [owner, setOwner] = useState("maya");
  const [status, setStatus] = useState("live");
  const [region, setRegion] = useState("us-east-1");
  const [search, setSearch] = useState("check");
  const [tool, setTool] = useState("chart");

  const owners = [
    ["maya", "Maya Chen", "maya@shipeasy.app", "#7c5cff", "Owner"],
    ["jordan", "Jordan Park", "jordan@shipeasy.app", "#00d08a", "Editor"],
    ["kira", "Kira Suzuki", "kira@shipeasy.app", "#ff8445", "Viewer"],
    ["rohan", "Rohan Mehta", "rohan@shipeasy.app", "#3b82f6", "Editor"],
  ];
  const statuses = [
    ["live", "LIVE", "accent"],
    ["paused", "PAUSED", "warn"],
    ["draft", "DRAFT", null],
    ["killed", "KILLED", "danger"],
    ["completed", "COMPLETED", "info"],
  ];
  const regions = [
    ["us-east-1", "N. Virginia", "42ms", "PRIMARY"],
    ["us-west-2", "Oregon", "118ms", ""],
    ["eu-west-1", "Ireland", "94ms", ""],
    ["ap-south-1", "Mumbai", "206ms", ""],
    ["ap-northeast-1", "Tokyo", "148ms", ""],
  ];
  const metrics = [
    ["checkout_conversion", "Checkout conversion", "%", "Suggested"],
    ["checkout_revenue", "Checkout revenue", "$", "Suggested"],
    ["signup_conversion", "Signup conversion", "%", "All"],
    ["session_length", "Session length", "sec", "All"],
  ].filter((m) => m[0].includes(search.toLowerCase()));

  const ownerSel = owners.find((o) => o[0] === owner);
  const statusSel = statuses.find((s) => s[0] === status);
  const regionSel = regions.find((r) => r[0] === region);

  return (
    <Section
      id="selects"
      num="07 · Forms"
      title="Single select"
      sub="Five patterns: native, people / identity, status, region with metadata, and a searchable selector with grouped results."
      meta=".select · .select-trigger · .menu"
    >
      <div className="ds-grid g2" style={{ marginBottom: 18 }}>
        {/* — Native baseline + custom trigger closed/open — */}
        <div className="ds-card">
          <div className="title">
            <b>01 · Native + custom trigger</b>
            <span>baseline</span>
          </div>
          <div className="select" style={{ maxWidth: 280 }}>
            <select defaultValue="sequential">
              <option value="sequential">Sequential (recommended)</option>
              <option>Bayesian</option>
              <option>Frequentist</option>
            </select>
          </div>
          <div className="select-trigger is-open" style={{ maxWidth: 280 }}>
            <div className="value">
              <IconFlask size={13} style={{ color: "var(--accent)" }} />
              <span>
                {framework === "sequential"
                  ? "Sequential"
                  : framework === "bayesian"
                    ? "Bayesian"
                    : "Frequentist"}
              </span>
            </div>
            <IconChevronDown size={13} className="chev" />
          </div>
          <div className="menu" style={{ maxWidth: 280, marginTop: -4 }}>
            <div className="menu-section">Test framework</div>
            {[
              ["sequential", "Sequential", "default · stops early", <IconFlask size={12} />],
              ["bayesian", "Bayesian", "posterior probabilities", <IconSigma size={12} />],
              ["frequentist", "Frequentist", "classic p-values", <IconPercent size={12} />],
            ].map(([k, t, d, icn]) => (
              <div
                key={k}
                className={`menu-item${framework === k ? " is-selected" : ""}`}
                onClick={() => setFramework(k)}
              >
                {icn}
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1, minWidth: 0 }}
                >
                  <span>{t}</span>
                  <span style={{ fontSize: 11, color: "var(--fg-4)", fontFamily: "var(--mono)" }}>
                    {d}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* — People / Identity selector — */}
        <div className="ds-card">
          <div className="title">
            <b>02 · Identity</b>
            <span>avatar in trigger</span>
          </div>
          <div className="select-trigger" style={{ maxWidth: 300 }}>
            <div className="value">
              <span className="avatar-inline" style={{ background: ownerSel[3] }}>
                {ownerSel[1]
                  .split(" ")
                  .map((p) => p[0])
                  .join("")}
              </span>
              <span>{ownerSel[1]}</span>
              <span
                style={{
                  fontFamily: "var(--mono)",
                  fontSize: 10,
                  color: "var(--fg-4)",
                  marginLeft: "auto",
                  paddingLeft: 8,
                  textTransform: "uppercase",
                  letterSpacing: ".06em",
                }}
              >
                {ownerSel[4]}
              </span>
            </div>
            <IconChevronDown size={13} className="chev" />
          </div>
          <div className="menu is-open" style={{ maxWidth: 300 }}>
            <div className="menu-search">
              <div className="input input-sm">
                <Search size={12} />
                <input placeholder="Search teammates…" />
              </div>
            </div>
            {owners.map(([k, name, em, bg, role]) => (
              <div
                key={k}
                className={`menu-item${owner === k ? " is-selected" : ""}`}
                onClick={() => setOwner(k)}
              >
                <span
                  className="avatar-inline"
                  style={{ background: bg, width: 20, height: 20, fontSize: 9.5 }}
                >
                  {name
                    .split(" ")
                    .map((p) => p[0])
                    .join("")}
                </span>
                <div className="people-row">
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 1,
                      minWidth: 0,
                      flex: 1,
                    }}
                  >
                    <span className="nm">{name}</span>
                    <span className="em">{em}</span>
                  </div>
                </div>
                <span className="menu-meta">{role}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="ds-grid g2" style={{ marginBottom: 18 }}>
        {/* — Status selector — */}
        <div className="ds-card">
          <div className="title">
            <b>03 · Status</b>
            <span>color-coded</span>
          </div>
          <div className="select-trigger" style={{ maxWidth: 240 }}>
            <div className="value">
              {statusSel[2] ? (
                <span
                  className="status-dot sm"
                  style={{ color: `var(--${statusSel[2]})`, background: `var(--${statusSel[2]})` }}
                />
              ) : (
                <span
                  className="status-dot sm"
                  style={{ color: "var(--fg-4)", background: "var(--fg-4)" }}
                />
              )}
              <span className="t-mono" style={{ fontSize: 12, letterSpacing: ".04em" }}>
                {statusSel[1]}
              </span>
            </div>
            <IconChevronDown size={13} className="chev" />
          </div>
          <div className="menu" style={{ maxWidth: 240 }}>
            {statuses.map(([k, lbl, sem]) => (
              <div
                key={k}
                className={`menu-item${status === k ? " is-selected" : ""}`}
                onClick={() => setStatus(k)}
              >
                {sem ? (
                  <span
                    className="status-dot"
                    style={{ color: `var(--${sem})`, background: `var(--${sem})` }}
                  />
                ) : (
                  <span
                    className="status-dot"
                    style={{ color: "var(--fg-4)", background: "var(--fg-4)" }}
                  />
                )}
                <span className="t-mono" style={{ fontSize: 11.5, letterSpacing: ".04em" }}>
                  {lbl}
                </span>
              </div>
            ))}
            <div className="menu-sep" />
            <div className="menu-item" style={{ color: "var(--fg-3)" }}>
              <IconFilter size={11} />
              Filter by status…
            </div>
          </div>
        </div>

        {/* — Region selector — */}
        <div className="ds-card">
          <div className="title">
            <b>04 · Region</b>
            <span>with latency</span>
          </div>
          <div className="select-trigger" style={{ maxWidth: 340 }}>
            <div className="value">
              <Globe size={13} style={{ color: "var(--fg-3)" }} />
              <span className="t-mono" style={{ fontSize: 12 }}>
                {regionSel[0]}
              </span>
              <span style={{ color: "var(--fg-3)", fontSize: 12.5 }}>· {regionSel[1]}</span>
              <span className="menu-meta" style={{ marginLeft: "auto" }}>
                <b>{regionSel[2]}</b>
              </span>
            </div>
            <IconChevronDown size={13} className="chev" />
          </div>
          <div className="menu" style={{ maxWidth: 340 }}>
            <div className="menu-section">Regions · sorted by latency</div>
            {regions.map(([k, name, lat, tag]) => (
              <div
                key={k}
                className={`menu-item${region === k ? " is-selected" : ""}`}
                onClick={() => setRegion(k)}
              >
                <span
                  className="t-mono"
                  style={{ fontSize: 11, color: "var(--fg)", width: 90, flexShrink: 0 }}
                >
                  {k}
                </span>
                <span style={{ color: "var(--fg-2)", flex: 1 }}>{name}</span>
                {tag && (
                  <span className="badge badge-live" style={{ fontSize: 9 }}>
                    <span className="dot" />
                    {tag}
                  </span>
                )}
                <span className="menu-meta">
                  <b>{lat}</b>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="ds-grid g2" style={{ marginBottom: 0 }}>
        {/* — Searchable with filter pills — */}
        <div className="ds-card">
          <div className="title">
            <b>05 · Searchable</b>
            <span>filter pills + groups</span>
          </div>
          <div className="select-trigger" style={{ maxWidth: 340 }}>
            <div className="value">
              <IconChart size={13} style={{ color: "var(--accent)" }} />
              <span>{search ? "checkout_conversion" : "Pick a metric…"}</span>
              <span className="menu-meta" style={{ marginLeft: "auto" }}>
                %
              </span>
            </div>
            <IconChevronDown size={13} className="chev" />
          </div>
          <div className="menu" style={{ maxWidth: 340 }}>
            <div className="menu-search">
              <div className="input input-sm">
                <Search size={12} />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search metrics…"
                />
                {search && (
                  <button className="input-clear" onClick={() => setSearch("")}>
                    ×
                  </button>
                )}
              </div>
            </div>
            <div className="menu-filters">
              <button className="is-active">All</button>
              <button>Suggested</button>
              <button>Mine</button>
              <button>Archived</button>
            </div>
            {["Suggested", "All"].map((group) => {
              const rows = metrics.filter((m) => m[3] === group);
              if (!rows.length) return null;
              const totalInGroup =
                ["Suggested", "All"].filter((g) => g === group).length && rows.length;
              return (
                <React.Fragment key={group}>
                  <div className="menu-group">
                    {group}
                    <span className="gcount">{totalInGroup}</span>
                  </div>
                  {rows.map(([k, name, unit]) => (
                    <div
                      key={k}
                      className={`menu-item${k === "checkout_conversion" ? " is-selected" : ""}`}
                    >
                      <IconChart size={12} />
                      <span>
                        {search ? (
                          <>
                            {name.slice(0, name.toLowerCase().indexOf(search.toLowerCase()))}
                            <b style={{ color: "var(--accent)", fontWeight: 500 }}>
                              {name.substr(
                                name.toLowerCase().indexOf(search.toLowerCase()),
                                search.length,
                              )}
                            </b>
                            {name.slice(
                              name.toLowerCase().indexOf(search.toLowerCase()) + search.length,
                            )}
                          </>
                        ) : (
                          name
                        )}
                      </span>
                      <span className="menu-meta">{unit}</span>
                    </div>
                  ))}
                </React.Fragment>
              );
            })}
            {metrics.length === 0 && <div className="menu-empty">No metrics match "{search}"</div>}
            <div className="menu-foot">
              <span className="info">↑↓ to navigate · ↵ to select</span>
              <button className="btn btn-ghost btn-sm">
                <IconPlus size={11} />
                New metric
              </button>
            </div>
          </div>
        </div>

        {/* — Icon-only / compact selectors — */}
        <div className="ds-card">
          <div className="title">
            <b>06 · Compact</b>
            <span>icon-only · toolbar</span>
          </div>

          <div className="row-wrap" style={{ gap: 6 }}>
            {[
              ["chart", <IconChart size={13} />],
              ["table", <IconLayers size={13} />],
              ["code", <IconCode size={13} />],
              ["data", <IconDatabase size={13} />],
            ].map(([k, icn]) => (
              <button
                key={k}
                className={`btn btn-icon ${tool === k ? "btn-secondary" : "btn-ghost"}`}
                onClick={() => setTool(k)}
                style={tool === k ? { borderColor: "var(--accent)", color: "var(--accent)" } : {}}
              >
                {icn}
              </button>
            ))}
            <div className="vr" />
            <div className="select-trigger" style={{ width: "auto", padding: "0 8px" }}>
              <Globe size={13} className="ldn" />
              <span className="t-mono" style={{ fontSize: 11.5 }}>
                us-east-1
              </span>
              <IconChevronDown size={11} className="chev" />
            </div>
            <div className="select-trigger" style={{ width: "auto", padding: "0 8px" }}>
              <Calendar size={13} className="ldn" />
              <span style={{ fontSize: 12 }}>Last 7d</span>
              <IconChevronDown size={11} className="chev" />
            </div>
          </div>

          <div className="field-hint">
            <IconInfo size={12} />
            Use a 26-px trigger only when the parent row is &lt; 32 px tall.
          </div>

          <div className="row-wrap" style={{ gap: 6, marginTop: 8 }}>
            <div
              className="select-trigger"
              style={{ height: 26, padding: "0 8px", fontSize: 11.5 }}
            >
              <span style={{ fontFamily: "var(--mono)", color: "var(--fg-3)" }}>sort by</span>
              <span>most recent</span>
              <IconChevronDown size={10} className="chev" />
            </div>
            <div
              className="select-trigger"
              style={{ height: 26, padding: "0 8px", fontSize: 11.5 }}
            >
              <span
                className="status-dot sm"
                style={{ color: "var(--accent)", background: "var(--accent)" }}
              />
              <span className="t-mono" style={{ fontSize: 11 }}>
                LIVE
              </span>
              <IconChevronDown size={10} className="chev" />
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}

// ── Multi-select gallery ─────────────────────────────
function MultiSelectSection() {
  const [tokens, setTokens] = useState(["new-users", "mobile", "us-east-1"]);
  const [checked, setChecked] = useState(new Set(["signup", "activation", "retention_d7"]));
  const [people, setPeople] = useState(new Set(["maya", "jordan"]));
  const [groups, setGroups] = useState(
    new Set(["core.conversion", "core.retention_d7", "revenue.arpu"]),
  );

  const removeTok = (t) => setTokens(tokens.filter((x) => x !== t));
  const toggle = (set, setter, k) => {
    const n = new Set(set);
    if (n.has(k)) n.delete(k);
    else n.add(k);
    setter(n);
  };

  const allMetrics = ["signup", "activation", "retention_d7", "arpu", "churn", "session_len"];
  const owners = [
    ["maya", "Maya Chen", "#7c5cff"],
    ["jordan", "Jordan Park", "#00d08a"],
    ["kira", "Kira Suzuki", "#ff8445"],
    ["rohan", "Rohan Mehta", "#3b82f6"],
    ["ana", "Ana Garcia", "#f59e0b"],
  ];
  const grouped = [
    ["Core", ["core.conversion", "core.activation", "core.retention_d7", "core.retention_d30"]],
    ["Revenue", ["revenue.arpu", "revenue.ltv", "revenue.refunds"]],
    ["Engagement", ["eng.sessions", "eng.dau", "eng.events"]],
  ];

  return (
    <Section
      id="multi"
      num="08 · Forms"
      title="Multi select"
      sub="Four patterns: token trigger, counted dropdown with checkboxes & select-all, avatar stack, and a grouped multi-select with section counts."
      meta=".select-trigger.is-multi · .menu-item.is-checked"
    >
      <div className="ds-grid g2" style={{ marginBottom: 18 }}>
        {/* — Token multi-select — */}
        <div className="ds-card">
          <div className="title">
            <b>01 · Token trigger</b>
            <span>chips inline</span>
          </div>
          <div className="select-trigger is-multi" style={{ maxWidth: 420 }}>
            <div className="select-tokens">
              {tokens.length === 0 && <span className="placeholder">Select segments…</span>}
              {tokens.slice(0, 3).map((t) => (
                <span key={t} className="tok">
                  {t}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeTok(t);
                    }}
                  >
                    ×
                  </button>
                </span>
              ))}
              {tokens.length > 3 && <span className="more">+{tokens.length - 3}</span>}
            </div>
            <IconChevronDown size={13} className="chev" />
          </div>
          <div className="row-wrap" style={{ marginTop: 6 }}>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setTokens([...tokens, "enterprise"])}
            >
              + enterprise
            </button>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setTokens([...tokens, "beta-list"])}
            >
              + beta-list
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => setTokens([])}>
              Clear all
            </button>
          </div>
          <div className="field-hint">
            <IconInfo size={12} />
            Trigger shows up to 3 chips, overflow as <span className="t-mono dim">+N</span>.
          </div>
        </div>

        {/* — Counted + checkbox dropdown — */}
        <div className="ds-card">
          <div className="title">
            <b>02 · Counted</b>
            <span>with select-all</span>
          </div>
          <div className="select-trigger" style={{ maxWidth: 280 }}>
            <div className="value">
              <IconChart size={13} style={{ color: "var(--accent)" }} />
              <span>Metrics</span>
              <span className="count">{checked.size}</span>
            </div>
            <IconChevronDown size={13} className="chev" />
          </div>
          <div className="menu" style={{ maxWidth: 280 }}>
            <div className="menu-search">
              <div className="input input-sm">
                <Search size={12} />
                <input placeholder="Filter metrics…" />
              </div>
            </div>
            <div
              className="menu-item"
              onClick={() =>
                setChecked(checked.size === allMetrics.length ? new Set() : new Set(allMetrics))
              }
            >
              <span
                className={`mini-check${checked.size === allMetrics.length ? " is-checked" : ""}`.replace(
                  "mini-check is-checked",
                  "mini-check is-checked",
                )}
                style={
                  checked.size > 0 && checked.size < allMetrics.length
                    ? { background: "var(--accent)", borderColor: "var(--accent)" }
                    : {}
                }
              >
                {checked.size > 0 && checked.size < allMetrics.length && (
                  <span style={{ width: 7, height: 1.6, background: "var(--accent-fg)" }} />
                )}
              </span>
              <span style={{ fontWeight: 500 }}>Select all</span>
              <span className="menu-meta">
                {checked.size} / {allMetrics.length}
              </span>
            </div>
            <div className="menu-sep" />
            {allMetrics.map((m) => (
              <div
                key={m}
                className={`menu-item${checked.has(m) ? " is-checked" : ""}`}
                onClick={() => toggle(checked, setChecked, m)}
              >
                <span className="mini-check" />
                <IconChart size={12} />
                <span className="t-mono" style={{ fontSize: 11.5 }}>
                  {m}
                </span>
              </div>
            ))}
            <div className="menu-foot">
              <span className="info">{checked.size} selected</span>
              <button className="btn btn-ghost btn-sm" onClick={() => setChecked(new Set())}>
                Clear
              </button>
              <button className="btn btn-primary btn-sm">Apply</button>
            </div>
          </div>
        </div>
      </div>

      <div className="ds-grid g2">
        {/* — Avatar stack multi-select — */}
        <div className="ds-card">
          <div className="title">
            <b>03 · Avatar stack</b>
            <span>people picker</span>
          </div>
          <div className="select-trigger" style={{ maxWidth: 320 }}>
            <div className="value" style={{ gap: 0 }}>
              {people.size === 0 && (
                <span className="placeholder" style={{ paddingRight: 8 }}>
                  Assign teammates…
                </span>
              )}
              {people.size > 0 && (
                <div className="avatar-stack" style={{ marginRight: 8 }}>
                  {[...people].slice(0, 4).map((k) => {
                    const o = owners.find((x) => x[0] === k);
                    return (
                      <div
                        key={k}
                        className="avatar-sm"
                        style={{ background: o[2], width: 20, height: 20, fontSize: 9.5 }}
                      >
                        {o[1]
                          .split(" ")
                          .map((p) => p[0])
                          .join("")}
                      </div>
                    );
                  })}
                </div>
              )}
              <span style={{ fontSize: 12.5, color: "var(--fg-2)" }}>
                {people.size === 0
                  ? "No one yet"
                  : people.size === 1
                    ? owners.find((o) => o[0] === [...people][0])[1]
                    : `${people.size} teammates`}
              </span>
            </div>
            <IconChevronDown size={13} className="chev" />
          </div>
          <div className="menu" style={{ maxWidth: 320 }}>
            <div className="menu-search">
              <div className="input input-sm">
                <Search size={12} />
                <input placeholder="Search teammates…" />
              </div>
            </div>
            {owners.map(([k, name, bg]) => (
              <div
                key={k}
                className={`menu-item${people.has(k) ? " is-checked" : ""}`}
                onClick={() => toggle(people, setPeople, k)}
              >
                <span className="mini-check" />
                <span
                  className="avatar-inline"
                  style={{ background: bg, width: 20, height: 20, fontSize: 9.5 }}
                >
                  {name
                    .split(" ")
                    .map((p) => p[0])
                    .join("")}
                </span>
                <span>{name}</span>
                {people.has(k) && (
                  <span className="menu-meta" style={{ color: "var(--accent)" }}>
                    added
                  </span>
                )}
              </div>
            ))}
            <div className="menu-foot">
              <span className="info">{people.size} selected</span>
              <button className="btn btn-ghost btn-sm">
                <IconUserPlus size={11} />
                Invite
              </button>
            </div>
          </div>
        </div>

        {/* — Grouped multi-select — */}
        <div className="ds-card">
          <div className="title">
            <b>04 · Grouped</b>
            <span>section counts</span>
          </div>
          <div className="select-trigger" style={{ maxWidth: 380 }}>
            <div className="value">
              <IconLayers size={13} style={{ color: "var(--fg-3)" }} />
              <span>Tracked metrics</span>
              {(() => {
                const total = grouped.reduce(
                  (s, [, items]) => s + items.filter((i) => groups.has(i)).length,
                  0,
                );
                return total > 0 ? (
                  <span className="count">{total}</span>
                ) : (
                  <span className="count muted">0</span>
                );
              })()}
            </div>
            <IconChevronDown size={13} className="chev" />
          </div>
          <div className="menu" style={{ maxWidth: 380 }}>
            {grouped.map(([title, items]) => {
              const sel = items.filter((i) => groups.has(i)).length;
              return (
                <React.Fragment key={title}>
                  <div className="menu-group">
                    {title}
                    <span className="gcount">
                      {sel} / {items.length}
                    </span>
                  </div>
                  {items.map((i) => (
                    <div
                      key={i}
                      className={`menu-item${groups.has(i) ? " is-checked" : ""}`}
                      onClick={() => toggle(groups, setGroups, i)}
                    >
                      <span className="mini-check" />
                      <span className="t-mono" style={{ fontSize: 11.5, color: "var(--fg-3)" }}>
                        {i.split(".")[0]}.
                      </span>
                      <span className="t-mono" style={{ fontSize: 11.5, color: "var(--fg)" }}>
                        {i.split(".")[1]}
                      </span>
                    </div>
                  ))}
                </React.Fragment>
              );
            })}
            <div className="menu-foot">
              <button className="btn btn-ghost btn-sm" onClick={() => setGroups(new Set())}>
                Clear
              </button>
              <span className="info" style={{ marginRight: 0, marginLeft: "auto" }}>
                {[...groups].length} of {grouped.reduce((s, [, i]) => s + i.length, 0)} selected
              </span>
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}

function ComboboxSection() {
  const [tags, setTags] = useState(["new-users", "us-east-1", "pro-plan"]);
  const removeTag = (t) => setTags(tags.filter((x) => x !== t));
  return (
    <Section
      id="combobox"
      num="09 · Forms"
      title="Combobox & tag input"
      sub="Search-as-you-type with a result menu; tag input collects multiple chips inside a single field. Both use the input chrome."
      meta=".combobox · .tag-input"
    >
      <div className="ds-grid g2">
        <div className="ds-card">
          <div className="title">
            <b>Combobox</b>
          </div>
          <div className="combobox" style={{ maxWidth: 320 }}>
            <div className="input">
              <Search />
              <input placeholder="Search metrics…" defaultValue="conv" />
            </div>
            <div className="menu">
              <div className="menu-section">Suggested</div>
              <div className="menu-item is-focus">
                <IconChart size={12} />
                <span>
                  <b style={{ color: "var(--fg)" }}>conv</b>ersion_rate
                </span>
                <span
                  style={{
                    marginLeft: "auto",
                    fontFamily: "var(--mono)",
                    fontSize: 10,
                    color: "var(--fg-4)",
                  }}
                >
                  %
                </span>
              </div>
              <div className="menu-item">
                <IconChart size={12} />
                <span>
                  <b style={{ color: "var(--fg)" }}>conv</b>erted_users
                </span>
                <span
                  style={{
                    marginLeft: "auto",
                    fontFamily: "var(--mono)",
                    fontSize: 10,
                    color: "var(--fg-4)",
                  }}
                >
                  count
                </span>
              </div>
              <div className="menu-item">
                <IconChart size={12} />
                <span>
                  checkout_<b style={{ color: "var(--fg)" }}>conv</b>
                </span>
                <span
                  style={{
                    marginLeft: "auto",
                    fontFamily: "var(--mono)",
                    fontSize: 10,
                    color: "var(--fg-4)",
                  }}
                >
                  %
                </span>
              </div>
              <div className="menu-sep" />
              <div className="menu-item" style={{ color: "var(--fg-3)" }}>
                <IconPlus size={12} />
                Create metric "conv"
              </div>
            </div>
          </div>
        </div>
        <div className="ds-card">
          <div className="title">
            <b>Tag input</b>
          </div>
          <div className="field">
            <label className="field-label">Audience segments</label>
            <div className="tag-input">
              {tags.map((t) => (
                <span key={t} className="tag-chip">
                  {t}
                  <button onClick={() => removeTag(t)} aria-label="remove">
                    ×
                  </button>
                </span>
              ))}
              <input placeholder={tags.length ? "Add segment…" : "e.g. new-users"} />
            </div>
            <div className="field-hint">
              <IconInfo size={12} />
              Press Enter to add.
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}

function ChoiceSection() {
  const [picks, setPicks] = useState({ a: true, b: false, c: true });
  const [radio, setRadio] = useState("manual");
  const [card, setCard] = useState("balanced");
  return (
    <Section
      id="choice"
      num="10 · Forms"
      title="Checkbox, radio & option cards"
      sub="Three flavours of single-value choice. Checkbox supports indeterminate; radio comes as a quiet row or as a richer option card."
      meta=".check · .radio · .opt-card"
    >
      <div className="ds-grid g3" style={{ marginBottom: 18 }}>
        <div className="ds-card">
          <div className="title">
            <b>Checkbox</b>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <label className="check">
              <input
                type="checkbox"
                checked={picks.a}
                onChange={(e) => setPicks({ ...picks, a: e.target.checked })}
              />
              <span className="box" />
              <span>Send email when ramp completes</span>
            </label>
            <label className="check">
              <input
                type="checkbox"
                checked={picks.b}
                onChange={(e) => setPicks({ ...picks, b: e.target.checked })}
              />
              <span className="box" />
              <span className="check-text">
                <span>Page on regression</span>
                <span className="check-desc">SMS the on-call when CR drops &gt; 5%.</span>
              </span>
            </label>
            <label className="check is-indeterminate">
              <input type="checkbox" />
              <span className="box" />
              <span>All teammates (mixed)</span>
            </label>
            <label className="check is-disabled">
              <input type="checkbox" disabled />
              <span className="box" />
              <span>Slack integration (not connected)</span>
            </label>
          </div>
        </div>
        <div className="ds-card">
          <div className="title">
            <b>Radio group</b>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              ["manual", "Manual ramp", "Promote variants yourself."],
              ["auto", "Automatic ramp", "Increase traffic when significant."],
              ["hold", "Hold at current", "Freeze allocation for analysis."],
            ].map(([k, t, d]) => (
              <label key={k} className="radio">
                <input
                  type="radio"
                  name="ramp"
                  checked={radio === k}
                  onChange={() => setRadio(k)}
                />
                <span className="dot" />
                <span className="radio-text">
                  <span>{t}</span>
                  <span className="radio-desc">{d}</span>
                </span>
              </label>
            ))}
          </div>
        </div>
        <div className="ds-card">
          <div className="title">
            <b>Stats summary</b>
          </div>
          <div className="field-hint" style={{ color: "var(--fg-2)" }}>
            Use checkbox for independent toggles and radio for one-of-N picks. Reach for option
            cards when each choice has its own description, badge or icon that needs room.
          </div>
          <div style={{ display: "flex", gap: 14, marginTop: 6 }}>
            <div className="stat-block">
              <div className="stat-k">Checkbox sizes</div>
              <div className="stat-v">15 px</div>
            </div>
            <div className="stat-block">
              <div className="stat-k">Radio sizes</div>
              <div className="stat-v">15 px</div>
            </div>
          </div>
        </div>
      </div>

      <SubH>Option cards · stacked</SubH>
      <div className="opt-group" style={{ maxWidth: 680, marginBottom: 18 }}>
        {[
          ["safe", "Safe rollout", "5% → 25% → 50% → 100% with 24-hour checks.", "recommended"],
          ["balanced", "Balanced rollout", "10% → 50% → 100% with 6-hour checks.", ""],
          ["fast", "Fast rollout", "25% → 100% as soon as significance is reached.", "aggressive"],
        ].map(([k, t, d, tag]) => (
          <label key={k} className={`opt-card${card === k ? " is-selected" : ""}`}>
            <input
              type="radio"
              name="card"
              checked={card === k}
              onChange={() => setCard(k)}
              style={{ display: "none" }}
            />
            <span
              className="dot"
              style={{
                borderColor: card === k ? "var(--accent)" : "var(--line-3)",
                background: card === k ? "var(--bg-2)" : "var(--bg-2)",
                width: 15,
                height: 15,
                borderRadius: "50%",
                border: "1px solid",
                display: "grid",
                placeItems: "center",
              }}
            >
              {card === k && (
                <span
                  style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent)" }}
                />
              )}
            </span>
            <div className="opt-body">
              <div className="opt-title">
                {t}
                {tag && <span className="badge">{tag}</span>}
              </div>
              <div className="opt-desc">{d}</div>
            </div>
          </label>
        ))}
      </div>

      <SubH>Option cards · row (icon-led)</SubH>
      <div className="opt-group is-row" style={{ maxWidth: 780 }}>
        {[
          ["users", "New users", "Signed up &lt; 7d ago", <IconUserPlus size={16} />],
          ["power", "Power users", "&gt; 30 sessions / mo", <IconZap size={16} />],
          ["enterprise", "Enterprise", "Paid plan, &gt; 25 seats", <IconShield size={16} />],
        ].map(([k, t, d, icn]) => (
          <div key={k} className={`opt-card${k === "power" ? " is-selected" : ""}`}>
            <span
              style={{
                width: 28,
                height: 28,
                borderRadius: "var(--r-sm)",
                background: "var(--bg-3)",
                border: "1px solid var(--line-2)",
                display: "grid",
                placeItems: "center",
                color: "var(--fg-2)",
                flexShrink: 0,
              }}
            >
              {icn}
            </span>
            <div className="opt-body">
              <div className="opt-title">{t}</div>
              <div className="opt-desc" dangerouslySetInnerHTML={{ __html: d }} />
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

function SwitchSection() {
  const [sw, setSw] = useState({ a: true, b: false, c: true });
  const [seg, setSeg] = useState("7d");
  const [seg2, setSeg2] = useState("chart");
  return (
    <Section
      id="switch"
      num="11 · Forms"
      title="Switch & segmented control"
      sub="Switches commit immediately. Segmented controls swap views; max four options before they become tabs or a menu."
      meta=".switch · .segmented"
    >
      <div className="ds-grid g2" style={{ marginBottom: 18 }}>
        <div className="ds-card">
          <div className="title">
            <b>Switch · sizes</b>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <label className="switch sw-sm">
              <input
                type="checkbox"
                checked={sw.a}
                onChange={(e) => setSw({ ...sw, a: e.target.checked })}
              />
              <span className="track" />
              <span>Small · for dense tables</span>
            </label>
            <label className="switch">
              <input
                type="checkbox"
                checked={sw.b}
                onChange={(e) => setSw({ ...sw, b: e.target.checked })}
              />
              <span className="track" />
              <span className="switch-text">
                <span>Notify on regression</span>
                <span className="switch-desc">SMS + Slack DM the experiment owner.</span>
              </span>
            </label>
            <label className="switch sw-lg">
              <input
                type="checkbox"
                checked={sw.c}
                onChange={(e) => setSw({ ...sw, c: e.target.checked })}
              />
              <span className="track" />
              <span>Large · settings pages</span>
            </label>
          </div>
        </div>
        <div className="ds-card">
          <div className="title">
            <b>Segmented control</b>
          </div>
          <div className="segmented seg-sm">
            {["1h", "24h", "7d", "30d", "All"].map((k) => (
              <button key={k} className={seg === k ? "is-active" : ""} onClick={() => setSeg(k)}>
                {k}
              </button>
            ))}
          </div>
          <div className="segmented">
            {[
              ["chart", "Chart"],
              ["table", "Table"],
              ["raw", "Raw"],
            ].map(([k, t]) => (
              <button key={k} className={seg2 === k ? "is-active" : ""} onClick={() => setSeg2(k)}>
                {k === "chart" && <IconChart size={12} />}
                {k === "table" && <IconLayers size={12} />}
                {k === "raw" && <IconCode size={12} />}
                {t}
              </button>
            ))}
          </div>
          <div className="segmented seg-lg">
            <button className="is-active">Variant A</button>
            <button>Variant B</button>
            <button>Variant C</button>
          </div>
        </div>
      </div>
    </Section>
  );
}

function RangeSection() {
  const [traffic, setTraffic] = useState(50);
  return (
    <Section
      id="range"
      num="12 · Forms"
      title="Slider"
      sub="Tabular value on the right, value bubble on hover/active. Ticks are optional but help when stepping is meaningful (5/25/50/100)."
      meta=".slider · .range-row"
    >
      <div className="ds-grid g2">
        <div className="ds-card">
          <div className="title">
            <b>Continuous</b>
          </div>
          <div className="range-row">
            <div
              className="slider"
              style={{ "--fill": `${traffic}%` }}
              onMouseDown={(e) => {
                const track = e.currentTarget.querySelector(".slider-track");
                const move = (ev) => {
                  const r = track.getBoundingClientRect();
                  const x = Math.min(Math.max(0, ev.clientX - r.left), r.width);
                  setTraffic(Math.round((x / r.width) * 100));
                };
                move(e);
                const up = () => {
                  window.removeEventListener("mousemove", move);
                  window.removeEventListener("mouseup", up);
                };
                window.addEventListener("mousemove", move);
                window.addEventListener("mouseup", up);
              }}
            >
              <div className="slider-track">
                <div className="fill" />
              </div>
              <div className="slider-thumb" data-val={`${traffic}%`} />
            </div>
            <span className="range-val">{traffic}%</span>
          </div>
          <div className="field-hint">Traffic allocation to the new variant.</div>
        </div>
        <div className="ds-card">
          <div className="title">
            <b>Stepped · with ticks</b>
          </div>
          {[
            [1, 5],
            [2, 25],
            [3, 50],
            [4, 100],
          ].map(([i, v]) => (
            <div key={i} className="range-row">
              <div className="slider" style={{ "--fill": `${v}%` }}>
                <div className="slider-track">
                  <div className="fill" />
                </div>
                <div className="slider-ticks">
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                </div>
                <div className="slider-thumb" data-val={`Step ${i}`} />
              </div>
              <span className="range-val">{v}%</span>
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}

function OtpSection() {
  const [otp, setOtp] = useState(["8", "3", "7", "", "", ""]);
  const active = otp.findIndex((c) => !c);
  return (
    <Section
      id="otp"
      num="13 · Forms"
      title="OTP & invite code"
      sub="Six segments wide. Active cell pulses; filled cells keep a stronger border so the eye anchors at the cursor."
      meta=".otp"
    >
      <div className="ds-grid g2">
        <div className="ds-card">
          <div className="title">
            <b>6-digit code</b>
          </div>
          <div className="otp">
            {otp.map((c, i) => (
              <div
                key={i}
                className={`otp-cell${c ? " is-filled" : ""}${i === active ? " is-active" : ""}`}
              >
                {c}
              </div>
            ))}
          </div>
          <div className="field-hint">
            Sent to <span className="t-mono dim">+1 (415) ··· 5512</span>. Expires in 9:47.
          </div>
          <div className="row-wrap">
            <button className="btn btn-secondary btn-sm">Resend</button>
            <button className="btn btn-ghost btn-sm">Use email instead</button>
          </div>
        </div>
        <div className="ds-card">
          <div className="title">
            <b>Invite code</b>
          </div>
          <div className="otp" style={{ flexWrap: "wrap" }}>
            {["S", "H", "I", "P", "-", "4", "2", "0", "-", "J", "E", "7"].map((c, i) => (
              <div key={i} className={`otp-cell${c ? " is-filled" : ""}`} style={{ width: 28 }}>
                {c}
              </div>
            ))}
          </div>
          <div className="field-hint">
            Format · <span className="t-mono dim">XXXX-NNN-XXX</span>
          </div>
        </div>
      </div>
    </Section>
  );
}

function UploadSection() {
  return (
    <Section
      id="upload"
      num="14 · Forms"
      title="File upload"
      sub="Dashed dropzone is the resting state; on drag we switch to solid accent. Uploaded files render as chips with size and a quiet remove."
      meta=".dropzone · .file-chip"
    >
      <div className="ds-grid g2">
        <div className="ds-card">
          <div className="title">
            <b>Dropzone</b>
          </div>
          <div className="dropzone">
            <div className="dz-icon">
              <UploadCloud size={18} />
            </div>
            <div className="dz-title">Drop a CSV here or browse</div>
            <div className="dz-sub">audience.csv · ≤ 25 MB · UTF-8</div>
            <button className="btn btn-secondary btn-sm" style={{ marginTop: 6 }}>
              Choose file
            </button>
          </div>
        </div>
        <div className="ds-card">
          <div className="title">
            <b>Uploaded · drag state</b>
          </div>
          <div className="dropzone is-drag">
            <div
              className="dz-icon"
              style={{
                color: "var(--accent)",
                background: "color-mix(in oklab, var(--accent) 12%, transparent)",
                borderColor: "transparent",
              }}
            >
              <UploadCloud size={18} />
            </div>
            <div className="dz-title" style={{ color: "var(--accent)" }}>
              Release to upload
            </div>
            <div className="dz-sub">enterprise_users_q2.csv</div>
          </div>
          <div className="file-chip">
            <FileText size={14} />
            <div className="meta">
              <div className="name">enterprise_users_q2.csv</div>
              <div className="size">14.2 MB · 184,203 rows</div>
            </div>
            <button className="x" aria-label="remove">
              ×
            </button>
          </div>
          <div className="file-chip">
            <FileText size={14} />
            <div className="meta">
              <div className="name">control_cohort.csv</div>
              <div className="size">3.1 MB · uploading…</div>
              <div className="prog thin" style={{ marginTop: 4 }}>
                <span style={{ width: "64%" }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}

function DateColorSection() {
  // ── Calendar helpers ─────────────────────────────────
  const MONTH_NAMES = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const DOW = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
  const TODAY = new Date(2026, 4, 15); // May 15, 2026
  const fmt = (d) =>
    d
      ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
      : "";
  const fmtNice = (d) =>
    d ? `${MONTH_NAMES[d.getMonth()].slice(0, 3)} ${d.getDate()}, ${d.getFullYear()}` : "";
  const sameDay = (a, b) =>
    a &&
    b &&
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  function buildCells(year, month) {
    const first = new Date(year, month, 1);
    const dim = new Date(year, month + 1, 0).getDate();
    const startDow = (first.getDay() + 6) % 7; // Mon=0
    const prevDim = new Date(year, month, 0).getDate();
    const cells = [];
    for (let i = startDow - 1; i >= 0; i--)
      cells.push({ d: new Date(year, month - 1, prevDim - i), outside: true });
    for (let d = 1; d <= dim; d++) cells.push({ d: new Date(year, month, d) });
    while (cells.length < 42) {
      const lastIdx = cells[cells.length - 1].d;
      cells.push({
        d: new Date(lastIdx.getFullYear(), lastIdx.getMonth(), lastIdx.getDate() + 1),
        outside: true,
      });
    }
    return cells;
  }

  // ── Single date picker state ─────────────────────────
  const [single, setSingle] = useState(new Date(2026, 4, 20));
  const [sMonth, setSMonth] = useState({ y: 2026, m: 4 });

  // ── Range picker state ───────────────────────────────
  const [range, setRange] = useState({ start: new Date(2026, 4, 1), end: new Date(2026, 4, 15) });
  const [hover, setHover] = useState(null);
  const [rMonth, setRMonth] = useState({ y: 2026, m: 4 });
  const [preset, setPreset] = useState("this-month");

  // ── Color picker (kept here for completeness) ───────
  const [color, setColor] = useState("#7c5cff");
  const palette = [
    "#f5f5f4",
    "#a78bfa",
    "#7c5cff",
    "#3b82f6",
    "#00d08a",
    "#ffbd2e",
    "#ff8445",
    "#ff5f56",
  ];

  const applyPreset = (k) => {
    setPreset(k);
    const T = new Date(TODAY);
    let s, e;
    if (k === "today") {
      s = T;
      e = T;
    } else if (k === "yesterday") {
      s = new Date(2026, 4, 14);
      e = new Date(2026, 4, 14);
    } else if (k === "7d") {
      s = new Date(2026, 4, 9);
      e = T;
    } else if (k === "14d") {
      s = new Date(2026, 4, 2);
      e = T;
    } else if (k === "30d") {
      s = new Date(2026, 3, 16);
      e = T;
    } else if (k === "90d") {
      s = new Date(2026, 1, 15);
      e = T;
    } else if (k === "this-month") {
      s = new Date(2026, 4, 1);
      e = T;
    } else if (k === "last-month") {
      s = new Date(2026, 3, 1);
      e = new Date(2026, 3, 30);
    } else if (k === "ytd") {
      s = new Date(2026, 0, 1);
      e = T;
    }
    setRange({ start: s, end: e });
    if (s) setRMonth({ y: s.getFullYear(), m: s.getMonth() });
  };

  const handleRangeClick = (d) => {
    if (!range.start || (range.start && range.end)) {
      setRange({ start: d, end: null });
      setPreset("custom");
    } else if (d < range.start) {
      setRange({ start: d, end: range.start });
    } else {
      setRange({ start: range.start, end: d });
    }
  };

  // ── Calendar render ──────────────────────────────────
  function MonthGrid({
    year,
    month,
    onPrev,
    onNext,
    dayClass,
    onDay,
    onHover,
    footerLeft,
    footerRight,
    simple,
  }) {
    const cells = buildCells(year, month);
    return (
      <div className="calendar">
        <div className="cal-head">
          <div className="cal-month">
            {MONTH_NAMES[month]}
            <span className="yr">{year}</span>
          </div>
          <div className="cal-nav">
            {onPrev && (
              <button onClick={onPrev}>
                <IconChevronLeft size={12} />
              </button>
            )}
            {onNext && (
              <button onClick={onNext}>
                <IconChevronRight size={12} />
              </button>
            )}
          </div>
        </div>
        <div className="cal-grid">
          {DOW.map((d) => (
            <div key={d} className="cal-dow">
              {d}
            </div>
          ))}
          {cells.map((c, i) => (
            <div
              key={i}
              className={[
                "cal-day",
                c.outside ? "is-outside" : "",
                sameDay(c.d, TODAY) ? "is-today" : "",
                dayClass ? dayClass(c.d, c.outside) : "",
              ]
                .join(" ")
                .trim()}
              onClick={() => !c.outside && onDay && onDay(c.d)}
              onMouseEnter={() => onHover && onHover(c.d)}
            >
              {c.d.getDate()}
            </div>
          ))}
        </div>
        {!simple && (footerLeft || footerRight) && (
          <div className="cal-foot">
            {footerLeft && <span className="selection">{footerLeft}</span>}
            {footerRight}
          </div>
        )}
      </div>
    );
  }

  const inRange = (d) => {
    if (!range.start) return "";
    const end = range.end || hover;
    const lo = range.start;
    const hi = end && end > lo ? end : end && end < lo ? lo : lo;
    const actualLo = end && end < lo ? end : lo;
    const actualHi = end && end > lo ? end : end && end < lo ? lo : lo;
    const cls = [];
    if (sameDay(d, range.start)) cls.push("is-range-start");
    if (range.end && sameDay(d, range.end)) cls.push("is-range-end");
    if (!range.end && hover && sameDay(d, hover) && d > range.start) cls.push("is-range-end");
    if (!range.end && hover && sameDay(d, hover) && d < range.start) cls.push("is-range-start");
    if (d > actualLo && d < actualHi) cls.push("is-range");
    return cls.join(" ");
  };

  // For the range, render the current month and the next month
  const nextMonth = rMonth.m === 11 ? { y: rMonth.y + 1, m: 0 } : { y: rMonth.y, m: rMonth.m + 1 };

  return (
    <Section
      id="date"
      num="15 · Forms"
      title="Date, range & color"
      sub="Single picker for a moment in time, range picker for analysis windows. Both follow the same calendar grid, dot-marks today, and use the accent for selection."
      meta=".calendar · .range-picker · .color-swatch"
    >
      {/* ── Single date picker ─────────────────────── */}
      <SubH>Single date picker</SubH>
      <div className="ds-grid g2" style={{ marginBottom: 18, alignItems: "start" }}>
        <div className="ds-card">
          <div className="title">
            <b>01 · Trigger + popup</b>
            <span>default</span>
          </div>
          <div className="input" style={{ maxWidth: 240, cursor: "default" }}>
            <Calendar size={13} />
            <input value={fmtNice(single)} readOnly style={{ cursor: "default" }} />
            <IconChevronDown size={11} style={{ color: "var(--fg-3)" }} />
          </div>
          <div style={{ marginTop: 4 }}>
            <MonthGrid
              year={sMonth.y}
              month={sMonth.m}
              onPrev={() =>
                setSMonth(
                  sMonth.m === 0 ? { y: sMonth.y - 1, m: 11 } : { y: sMonth.y, m: sMonth.m - 1 },
                )
              }
              onNext={() =>
                setSMonth(
                  sMonth.m === 11 ? { y: sMonth.y + 1, m: 0 } : { y: sMonth.y, m: sMonth.m + 1 },
                )
              }
              dayClass={(d) => (sameDay(d, single) ? "is-selected" : "")}
              onDay={(d) => setSingle(d)}
              footerLeft={fmt(single)}
              footerRight={
                <>
                  <button className="btn btn-ghost btn-sm" onClick={() => setSingle(TODAY)}>
                    Today
                  </button>
                  <button className="btn btn-primary btn-sm">Apply</button>
                </>
              }
            />
          </div>
        </div>

        <div className="ds-card">
          <div className="title">
            <b>02 · With time strip</b>
            <span>datetime</span>
          </div>
          <div className="input" style={{ maxWidth: 280, cursor: "default" }}>
            <Calendar size={13} />
            <input value={`${fmtNice(single)} · 09:00`} readOnly style={{ cursor: "default" }} />
          </div>
          <div style={{ marginTop: 4 }}>
            <div className="calendar">
              <div className="cal-head">
                <div className="cal-month">
                  May<span className="yr">2026</span>
                </div>
                <div className="cal-nav">
                  <button>
                    <IconChevronLeft size={12} />
                  </button>
                  <button>
                    <IconChevronRight size={12} />
                  </button>
                </div>
              </div>
              <div className="cal-grid">
                {DOW.map((d) => (
                  <div key={d} className="cal-dow">
                    {d}
                  </div>
                ))}
                {buildCells(2026, 4).map((c, i) => {
                  const sel = sameDay(c.d, new Date(2026, 4, 20));
                  const tdy = sameDay(c.d, TODAY);
                  return (
                    <div
                      key={i}
                      className={[
                        "cal-day",
                        c.outside ? "is-outside" : "",
                        tdy ? "is-today" : "",
                        sel ? "is-selected" : "",
                      ]
                        .join(" ")
                        .trim()}
                    >
                      {c.d.getDate()}
                    </div>
                  );
                })}
              </div>
              <div className="time-strip">
                <span className="lbl">at</span>
                <div className="input input-sm" style={{ maxWidth: 90 }}>
                  <input type="time" defaultValue="09:00" className="num" />
                </div>
                <span className="lbl" style={{ marginLeft: 4 }}>
                  tz
                </span>
                <div className="select" style={{ flex: 1 }}>
                  <select defaultValue="PT">
                    <option>PT</option>
                    <option>ET</option>
                    <option>UTC</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Date range picker ──────────────────────── */}
      <SubH>Date range picker</SubH>
      <div className="ds-card" style={{ padding: 18, marginBottom: 18 }}>
        <div className="title" style={{ marginBottom: 14 }}>
          <b>03 · Presets + dual-month range</b>
          <span>analysis windows</span>
        </div>

        <div className="row-wrap" style={{ marginBottom: 14 }}>
          <div className="select-trigger" style={{ maxWidth: 340 }}>
            <div className="value">
              <Calendar size={13} style={{ color: "var(--fg-3)" }} />
              <span className="t-mono" style={{ fontSize: 12 }}>
                {fmt(range.start)}
              </span>
              <span style={{ color: "var(--fg-4)" }}>→</span>
              <span className="t-mono" style={{ fontSize: 12 }}>
                {range.end ? (
                  fmt(range.end)
                ) : (
                  <span style={{ color: "var(--fg-4)" }}>pick end…</span>
                )}
              </span>
            </div>
            <IconChevronDown size={13} className="chev" />
          </div>
          <span className="badge">
            {range.end && range.start
              ? `${Math.round((range.end - range.start) / 86400000) + 1} days`
              : "—"}
          </span>
        </div>

        <div className="range-picker">
          <div className="range-presets">
            <div className="ph">Quick ranges</div>
            {[
              ["today", "Today", "T"],
              ["yesterday", "Yesterday", ""],
              ["7d", "Last 7 days", "7D"],
              ["14d", "Last 14 days", ""],
              ["30d", "Last 30 days", "30D"],
              ["90d", "Last 90 days", ""],
              ["this-month", "This month", "M"],
              ["last-month", "Last month", ""],
              ["ytd", "Year to date", "Y"],
            ].map(([k, t, sc]) => (
              <button
                key={k}
                className={preset === k ? "is-active" : ""}
                onClick={() => applyPreset(k)}
              >
                <span>{t}</span>
                {sc && <span className="shortcut">{sc}</span>}
              </button>
            ))}
            <div style={{ flex: 1 }} />
            <button
              onClick={() => {
                setPreset("custom");
                setRange({ start: null, end: null });
              }}
            >
              <span style={{ color: "var(--fg-3)" }}>Custom…</span>
            </button>
          </div>
          <div>
            <div className="range-cals">
              <div className="range-cals-row">
                <MonthGrid
                  year={rMonth.y}
                  month={rMonth.m}
                  onPrev={() => {
                    const n =
                      rMonth.m === 0
                        ? { y: rMonth.y - 1, m: 11 }
                        : { y: rMonth.y, m: rMonth.m - 1 };
                    setRMonth(n);
                  }}
                  dayClass={(d, outside) => (outside ? "" : inRange(d))}
                  onDay={(d) => {
                    handleRangeClick(d);
                    setPreset("custom");
                  }}
                  onHover={(d) => !range.end && setHover(d)}
                  simple
                />
                <MonthGrid
                  year={nextMonth.y}
                  month={nextMonth.m}
                  onNext={() => {
                    const n =
                      rMonth.m === 11
                        ? { y: rMonth.y + 1, m: 0 }
                        : { y: rMonth.y, m: rMonth.m + 1 };
                    setRMonth(n);
                  }}
                  dayClass={(d, outside) => (outside ? "" : inRange(d))}
                  onDay={(d) => {
                    handleRangeClick(d);
                    setPreset("custom");
                  }}
                  onHover={(d) => !range.end && setHover(d)}
                  simple
                />
              </div>
              <div className="cal-foot">
                <span className="selection">
                  {range.start ? fmt(range.start) : "—"} →{" "}
                  {range.end ? fmt(range.end) : <span style={{ color: "var(--fg-4)" }}>—</span>}
                </span>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => setRange({ start: null, end: null })}
                >
                  Clear
                </button>
                <button className="btn btn-secondary btn-sm">Cancel</button>
                <button className="btn btn-primary btn-sm">Apply</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Compact date variants ──────────────────── */}
      <SubH>Compact triggers</SubH>
      <div className="ds-card" style={{ marginBottom: 18 }}>
        <div className="row-wrap" style={{ gap: 8 }}>
          <div className="select-trigger" style={{ width: "auto", padding: "0 10px" }}>
            <Calendar size={12} className="ldn" />
            <span style={{ fontSize: 12.5 }}>Last 7 days</span>
            <IconChevronDown size={11} className="chev" />
          </div>
          <div className="select-trigger" style={{ width: "auto", padding: "0 10px" }}>
            <Calendar size={12} className="ldn" />
            <span className="t-mono" style={{ fontSize: 11.5 }}>
              May 1 → May 15
            </span>
            <IconChevronDown size={11} className="chev" />
          </div>
          <div
            className="select-trigger"
            style={{ width: "auto", padding: "0 10px", height: 26, fontSize: 11.5 }}
          >
            <span style={{ fontFamily: "var(--mono)", color: "var(--fg-3)", fontSize: 11 }}>
              vs
            </span>
            <span>previous period</span>
            <IconChevronDown size={10} className="chev" />
          </div>
          <span className="kbd">D</span>
          <span
            style={{
              fontSize: 11,
              color: "var(--fg-4)",
              fontFamily: "var(--mono)",
              letterSpacing: ".04em",
            }}
          >
            QUICK-OPEN
          </span>
        </div>
      </div>

      {/* ── Color picker ───────────────────────────── */}
      <SubH>Color · curated swatches</SubH>
      <div className="ds-grid g2">
        <div className="ds-card">
          <div className="title">
            <b>04 · Swatch row</b>
            <span>variant assignment</span>
          </div>
          <div className="color-row">
            {palette.map((c) => (
              <div
                key={c}
                className={`color-swatch${color === c ? " is-selected" : ""}`}
                style={{ background: c }}
                onClick={() => setColor(c)}
              />
            ))}
          </div>
          <div className="input mono" style={{ maxWidth: 160 }}>
            <span
              style={{
                width: 14,
                height: 14,
                borderRadius: 3,
                background: color,
                border: "1px solid var(--line-2)",
                flexShrink: 0,
              }}
            />
            <input value={color} onChange={(e) => setColor(e.target.value)} />
          </div>
        </div>
        <div className="ds-card">
          <div className="title">
            <b>05 · Bring your own</b>
            <span>hex / hsl</span>
          </div>
          <div className="field-hint" style={{ color: "var(--fg-2)" }}>
            For free-form colors, allow paste-in but always anchor to the curated row. This keeps
            team-built variants identifiable in lists and tables.
          </div>
          <div className="row-wrap">
            <div className="input mono" style={{ maxWidth: 200 }}>
              <span className="prefix">#</span>
              <input defaultValue="7c5cff" maxLength={6} />
            </div>
            <button className="btn btn-secondary btn-sm">Add to palette</button>
          </div>
        </div>
      </div>
    </Section>
  );
}

function FormLayoutSection() {
  return (
    <Section
      id="form-layout"
      num="16 · Forms"
      title="Putting it together"
      sub="Two-column layout: label/description on the left, controls on the right. Works for settings pages, multi-step wizards, and modal bodies."
      meta=".form-section"
    >
      <div className="play">
        <div style={{ marginBottom: 24 }}>
          <div className="t-caps dim-2" style={{ marginBottom: 8 }}>
            New experiment
          </div>
          <h2 style={{ margin: 0, fontSize: 28, letterSpacing: "-0.025em", fontWeight: 500 }}>
            Step 1 — Define the test
          </h2>
        </div>
        <div className="form">
          <div className="form-section">
            <div className="form-section-head">
              <h3>Identity</h3>
              <p>How this experiment shows up in lists, alerts, and the URL.</p>
            </div>
            <div className="form-section-body">
              <div className="form-grid-2">
                <div className="field">
                  <label className="field-label">
                    Display name <span className="req">*</span>
                  </label>
                  <div className="input">
                    <input defaultValue="Checkout v3" />
                  </div>
                </div>
                <div className="field">
                  <label className="field-label">Slug</label>
                  <div className="input mono">
                    <span className="prefix">/exp</span>
                    <input defaultValue="checkout_v3" />
                  </div>
                </div>
              </div>
              <div className="field">
                <label className="field-label">Hypothesis</label>
                <textarea
                  className="textarea"
                  defaultValue="Shortening the checkout to a single step lifts conversion for mobile users without harming desktop revenue per session."
                  style={{ minHeight: 80 }}
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <div className="form-section-head">
              <h3>Audience</h3>
              <p>Who gets bucketed into this test. Leave empty for everyone.</p>
            </div>
            <div className="form-section-body">
              <div className="field">
                <label className="field-label">Segments</label>
                <div className="tag-input">
                  <span className="tag-chip">
                    new-users <button>×</button>
                  </span>
                  <span className="tag-chip">
                    mobile <button>×</button>
                  </span>
                  <span className="tag-chip">
                    us-east-1 <button>×</button>
                  </span>
                  <input placeholder="Add segment…" />
                </div>
              </div>
              <div className="form-grid-2">
                <div className="field">
                  <label className="field-label">Region</label>
                  <div className="select">
                    <select defaultValue="all">
                      <option value="all">All regions</option>
                      <option>us-east-1</option>
                      <option>eu-west-1</option>
                    </select>
                  </div>
                </div>
                <div className="field">
                  <label className="field-label">Sticky bucketing</label>
                  <label className="switch">
                    <input type="checkbox" defaultChecked />
                    <span className="track" />
                    <span className="t-sm">Persist by user_id</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div className="form-section">
            <div className="form-section-head">
              <h3>Allocation</h3>
              <p>Initial traffic split. You can ramp later from the experiment page.</p>
            </div>
            <div className="form-section-body">
              <div className="opt-group is-row">
                <div className="opt-card is-selected">
                  <span
                    style={{
                      width: 15,
                      height: 15,
                      borderRadius: "50%",
                      border: "1px solid var(--accent)",
                      background: "var(--bg-2)",
                      display: "grid",
                      placeItems: "center",
                      marginTop: 2,
                      flexShrink: 0,
                    }}
                  >
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: "var(--accent)",
                      }}
                    />
                  </span>
                  <div className="opt-body">
                    <div className="opt-title">50 / 50</div>
                    <div className="opt-desc">Even split, fastest path to significance.</div>
                  </div>
                </div>
                <div className="opt-card">
                  <span
                    style={{
                      width: 15,
                      height: 15,
                      borderRadius: "50%",
                      border: "1px solid var(--line-3)",
                      background: "var(--bg-2)",
                      display: "grid",
                      placeItems: "center",
                      marginTop: 2,
                      flexShrink: 0,
                    }}
                  />
                  <div className="opt-body">
                    <div className="opt-title">
                      90 / 10 <span className="badge">safe</span>
                    </div>
                    <div className="opt-desc">Limit exposure of the new variant.</div>
                  </div>
                </div>
                <div className="opt-card">
                  <span
                    style={{
                      width: 15,
                      height: 15,
                      borderRadius: "50%",
                      border: "1px solid var(--line-3)",
                      background: "var(--bg-2)",
                      display: "grid",
                      placeItems: "center",
                      marginTop: 2,
                      flexShrink: 0,
                    }}
                  />
                  <div className="opt-body">
                    <div className="opt-title">Custom…</div>
                    <div className="opt-desc">Set per-variant percentages manually.</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button className="btn btn-ghost">Cancel</button>
            <button className="btn btn-secondary">Save as draft</button>
            <span className="ml-auto" />
            <button className="btn btn-primary">
              <IconSparkles size={12} />
              Create experiment
            </button>
          </div>
        </div>
      </div>
    </Section>
  );
}

// ─────────────────────────────────────────────────────
// COMPONENTS RECAP
// ─────────────────────────────────────────────────────
function ButtonsSection() {
  return (
    <Section
      id="buttons"
      num="17 · Components"
      title="Buttons"
      sub="Primary, secondary, ghost, danger. Three sizes (sm/md/lg) and an icon-only square."
      meta=".btn · 4 variants · 3 sizes"
    >
      <div className="ds-grid g2">
        <div className="ds-card">
          <div className="title">
            <b>Variants</b>
          </div>
          <div className="row-wrap">
            <button className="btn btn-primary">
              <IconSparkles size={12} />
              Ship it
            </button>
            <button className="btn btn-secondary">Save draft</button>
            <button className="btn btn-ghost">Cancel</button>
            <button className="btn btn-danger">
              <IconTrash size={12} />
              Kill feature
            </button>
          </div>
          <div className="field-hint">One primary per surface — that's the contract.</div>
        </div>
        <div className="ds-card">
          <div className="title">
            <b>Sizes & icon-only</b>
          </div>
          <div className="row-wrap">
            <button className="btn btn-primary btn-lg">Create experiment</button>
            <button className="btn btn-primary">Create</button>
            <button className="btn btn-primary btn-sm">New</button>
            <button className="btn btn-secondary btn-icon">
              <IconSparkles size={13} />
            </button>
            <button className="btn btn-secondary btn-icon btn-sm">
              <IconPlus size={11} />
            </button>
          </div>
        </div>
      </div>
    </Section>
  );
}

function BadgesSection() {
  return (
    <Section
      id="badges"
      num="18 · Components"
      title="Badges, tags & keys"
      sub="Status badges carry a leading dot; the dot color does the talking. Tags are neutral, keys are mono."
      meta=".badge · .tag · .kbd"
    >
      <div className="ds-card">
        <div className="row-wrap">
          <span className="badge badge-live">
            <span className="dot" />
            LIVE
          </span>
          <span className="badge badge-draft">
            <span className="dot" />
            DRAFT
          </span>
          <span className="badge badge-paused">
            <span className="dot" />
            PAUSED
          </span>
          <span className="badge badge-killed">
            <span className="dot" />
            KILLED
          </span>
          <span className="badge badge-completed">
            <span className="dot" />
            COMPLETED
          </span>
          <span className="badge">v0.9.3</span>
          <span className="kbd">⌘ K</span>
          <span className="kbd">↵</span>
          <span className="kbd">esc</span>
          <span className="tag">us-east-1</span>
          <span className="tag">new users</span>
          <span className="tag">pro plan</span>
        </div>
      </div>
    </Section>
  );
}

function TableSection() {
  return (
    <Section
      id="table"
      num="19 · Components"
      title="Table"
      sub="Mono headers, tabular numerals in numeric columns, status badge per row. Hover lifts the row; selected gets a faint accent wash."
      meta=".tbl"
    >
      <div className="card">
        <table className="tbl">
          <thead>
            <tr>
              <th style={{ width: 28 }}></th>
              <th>Name</th>
              <th>Status</th>
              <th>Traffic</th>
              <th>Lift</th>
              <th>Significance</th>
              <th>Owner</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="col-icon">
                <IconFlask size={13} style={{ color: "var(--accent)" }} />
              </td>
              <td>
                <b>checkout_v3</b>
                <div className="t-mono-xs dim-2">exp_8f2a</div>
              </td>
              <td>
                <span className="badge badge-live">
                  <span className="dot" />
                  LIVE
                </span>
              </td>
              <td className="num">50%</td>
              <td className="num" style={{ color: "var(--accent)" }}>
                +8.4%
              </td>
              <td className="num">99.2%</td>
              <td>
                <div className="avatar-sm" style={{ background: "#7c5cff" }}>
                  M
                </div>
              </td>
            </tr>
            <tr className="selected">
              <td className="col-icon">
                <IconFlask size={13} style={{ color: "var(--warn)" }} />
              </td>
              <td>
                <b>welcome_email_5min</b>
                <div className="t-mono-xs dim-2">exp_9c11</div>
              </td>
              <td>
                <span className="badge badge-paused">
                  <span className="dot" />
                  PAUSED
                </span>
              </td>
              <td className="num">20%</td>
              <td className="num" style={{ color: "var(--accent)" }}>
                +6.8%
              </td>
              <td className="num">86%</td>
              <td>
                <div className="avatar-sm" style={{ background: "#00d08a", color: "#07120d" }}>
                  J
                </div>
              </td>
            </tr>
            <tr>
              <td className="col-icon">
                <IconFlask size={13} style={{ color: "var(--fg-3)" }} />
              </td>
              <td>
                <b>dashboard_v2</b>
                <div className="t-mono-xs dim-2">exp_a702</div>
              </td>
              <td>
                <span className="badge badge-draft">
                  <span className="dot" />
                  DRAFT
                </span>
              </td>
              <td className="num">—</td>
              <td className="num dim-2">—</td>
              <td className="num dim-2">—</td>
              <td>
                <div className="avatar-sm" style={{ background: "#ff8445" }}>
                  K
                </div>
              </td>
            </tr>
            <tr>
              <td className="col-icon">
                <IconFlask size={13} style={{ color: "var(--danger)" }} />
              </td>
              <td>
                <b>legacy_uploader</b>
                <div className="t-mono-xs dim-2">exp_3b20</div>
              </td>
              <td>
                <span className="badge badge-killed">
                  <span className="dot" />
                  KILLED
                </span>
              </td>
              <td className="num">0%</td>
              <td className="num" style={{ color: "var(--danger)" }}>
                −3.1%
              </td>
              <td className="num">—</td>
              <td>
                <div className="avatar-sm" style={{ background: "#3b82f6" }}>
                  R
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </Section>
  );
}

function StatsSection() {
  return (
    <Section
      id="stats"
      num="20 · Components"
      title="Stats & progress"
      sub="The four-up stat strip is the dashboard's anchor. Progress bars come in two thicknesses; a neutral version is muted gray."
      meta=".stat-block · .prog"
    >
      <div className="ds-grid g4" style={{ marginBottom: 16 }}>
        {[
          ["Conversion", "4.82%", "▲ +8.4%", false],
          ["$ / user", "$47.20", "▲ +$2.18", false],
          ["Sample", "14,203", "target 14k", false],
          ["Error rate", "0.04%", "▼ −0.1%", true],
        ].map(([k, v, d, neg]) => (
          <div key={k} className="card" style={{ padding: 18 }}>
            <div className="stat-block">
              <div className="stat-k">{k}</div>
              <div className="stat-v">{v}</div>
              <div className={`stat-d${neg ? " neg" : ""}`}>{d}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="ds-grid g3">
        <div className="ds-card">
          <div className="title">
            <b>Progress · accent</b>
          </div>
          <div className="prog">
            <span style={{ width: "62%" }} />
          </div>
          <div className="prog thin">
            <span style={{ width: "30%" }} />
          </div>
        </div>
        <div className="ds-card">
          <div className="title">
            <b>Progress · neutral</b>
          </div>
          <div className="prog neutral">
            <span style={{ width: "85%" }} />
          </div>
          <div className="prog neutral thin">
            <span style={{ width: "42%" }} />
          </div>
        </div>
        <div className="ds-card">
          <div className="title">
            <b>Avatars</b>
          </div>
          <div className="avatar-stack">
            <div className="avatar-sm" style={{ background: "#7c5cff" }}>
              M
            </div>
            <div className="avatar-sm" style={{ background: "#00d08a", color: "#07120d" }}>
              J
            </div>
            <div className="avatar-sm" style={{ background: "#ff8445" }}>
              K
            </div>
            <div className="avatar-sm" style={{ background: "#3b82f6" }}>
              R
            </div>
            <div className="avatar-sm" style={{ background: "var(--bg-4)" }}>
              +4
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}

// ─────────────────────────────────────────────────────
// ROOT
// ─────────────────────────────────────────────────────
function App() {
  return (
    <>
      <Hero />
      <ColorSection />
      <TypeSection />
      <GeometrySection />
      <FieldsSection />
      <InputsSection />
      <TextareaSection />
      <SelectSection />
      <MultiSelectSection />
      <ComboboxSection />
      <ChoiceSection />
      <SwitchSection />
      <RangeSection />
      <OtpSection />
      <UploadSection />
      <DateColorSection />
      <FormLayoutSection />
      <ButtonsSection />
      <BadgesSection />
      <TableSection />
      <StatsSection />
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
