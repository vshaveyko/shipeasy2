/* Shipeasy DevTool — full interactive plugin */

const TABS = [
  { k: "user", label: "User", icon: IconUsers, count: null, desc: "Identity / context" },
  { k: "gates", label: "Gates", icon: IconShield, count: 12, desc: "Boolean flags" },
  { k: "exps", label: "Experiments", icon: IconFlask, count: 3, desc: "A/B variants" },
  { k: "configs", label: "Configs", icon: IconSliders, count: 8, desc: "Remote values" },
  { k: "kills", label: "Killswitches", icon: IconPower, count: 2, desc: "Emergency shutoffs" },
  { k: "labels", label: "Labels", icon: IconBook, count: 182, desc: "i18n strings" },
  { k: "events", label: "Events", icon: IconActivity, count: null, desc: "Live event stream" },
];

const PROFILES = [
  {
    k: "prod",
    label: "Production",
    icon: "●",
    color: "var(--accent)",
    desc: "live customers · ro",
    overrides: 0,
    locked: true,
  },
  {
    k: "staging",
    label: "Staging",
    icon: "△",
    color: "var(--info)",
    desc: "pre-release · rw",
    overrides: 3,
  },
  { k: "dev", label: "Dev", icon: "◆", color: "var(--warn)", desc: "local · rw", overrides: 1 },
  {
    k: "preview",
    label: "PR · #4180",
    icon: "○",
    color: "#c891ff",
    desc: "feat/checkout-v3",
    overrides: 7,
    ephemeral: true,
  },
];

const LOCALES = [
  { code: "en-US", flag: "EN", name: "English (US)", pct: 100, base: true },
  { code: "fr-FR", flag: "FR", name: "Français", pct: 100 },
  { code: "de-DE", flag: "DE", name: "Deutsch", pct: 96 },
  { code: "ja-JP", flag: "JA", name: "日本語", pct: 88 },
  { code: "es-ES", flag: "ES", name: "Español", pct: 100 },
  { code: "pt-BR", flag: "BR", name: "Português", pct: 74 },
];

const DEFAULT_LABELS = [
  {
    k: "home.hero.title",
    page: "/",
    src: "Objects made of time.",
    val: {
      "en-US": "Objects made of time.",
      "fr-FR": "Objets faits de temps.",
      "de-DE": "Dinge aus Zeit gemacht.",
      "ja-JP": "時間でできた物。",
      "es-ES": "Objetos hechos de tiempo.",
      "pt-BR": null,
    },
    activeOnPage: true,
    status: "translated",
  },
  {
    k: "home.hero.sub",
    page: "/",
    src: "A small collection of well-considered things…",
    val: {
      "en-US": "A small collection…",
      "fr-FR": "Une petite collection…",
      "de-DE": "Eine kleine Sammlung…",
      "ja-JP": null,
      "es-ES": "Una pequeña colección…",
      "pt-BR": null,
    },
    activeOnPage: true,
    status: "partial",
    missing: ["ja-JP", "pt-BR"],
  },
  {
    k: "home.hero.cta.primary",
    page: "/",
    src: "Shop new arrivals",
    val: {
      "en-US": "Shop new arrivals",
      "fr-FR": "Découvrir les nouveautés",
      "de-DE": "Neuheiten ansehen",
      "ja-JP": "新着を見る",
      "es-ES": "Ver novedades",
      "pt-BR": "Ver lançamentos",
    },
    activeOnPage: true,
    status: "translated",
  },
  {
    k: "home.hero.cta.secondary",
    page: "/",
    src: "Browse journal",
    val: {
      "en-US": "Browse journal",
      "fr-FR": "Parcourir le journal",
      "de-DE": "Tagebuch durchsuchen",
      "ja-JP": "ジャーナルを見る",
      "es-ES": "Ver diario",
      "pt-BR": "Ver diário",
    },
    activeOnPage: true,
    status: "translated",
  },
  {
    k: "home.kicker",
    page: "/",
    src: "SS26 · Edition 04",
    val: {
      "en-US": "SS26 · Edition 04",
      "fr-FR": "SS26 · Édition 04",
      "de-DE": "SS26 · Ausgabe 04",
      "ja-JP": "SS26 · 第04号",
      "es-ES": "SS26 · Edición 04",
      "pt-BR": "SS26 · Edição 04",
    },
    activeOnPage: true,
    status: "translated",
  },
  {
    k: "product.price.from",
    page: "/",
    src: "from {{price}}",
    val: {
      "en-US": "from {{price}}",
      "fr-FR": "à partir de {{price}}",
      "de-DE": "ab {{price}}",
      "ja-JP": "{{price}}〜",
      "es-ES": "desde {{price}}",
      "pt-BR": "a partir de {{price}}",
    },
    activeOnPage: true,
    status: "translated",
    vars: ["price"],
  },
  {
    k: "product.badge.beta",
    page: "/",
    src: "Beta drop",
    val: {
      "en-US": "Beta drop",
      "fr-FR": "Drop beta",
      "de-DE": "Beta-Drop",
      "ja-JP": "ベータ",
      "es-ES": "Drop beta",
      "pt-BR": "Drop beta",
    },
    activeOnPage: true,
    status: "translated",
  },
  {
    k: "nav.catalog",
    page: "/",
    src: "Catalog",
    val: {
      "en-US": "Catalog",
      "fr-FR": "Catalogue",
      "de-DE": "Katalog",
      "ja-JP": "カタログ",
      "es-ES": "Catálogo",
      "pt-BR": "Catálogo",
    },
    activeOnPage: true,
    status: "translated",
  },
  {
    k: "nav.sale",
    page: "/",
    src: "Sale",
    val: {
      "en-US": "Sale",
      "fr-FR": "Soldes",
      "de-DE": "Sale",
      "ja-JP": "セール",
      "es-ES": "Rebajas",
      "pt-BR": "Promoções",
    },
    activeOnPage: true,
    status: "translated",
  },
  {
    k: "nav.journal",
    page: "/",
    src: "Journal",
    val: {
      "en-US": "Journal",
      "fr-FR": "Journal",
      "de-DE": "Tagebuch",
      "ja-JP": "ジャーナル",
      "es-ES": "Diario",
      "pt-BR": "Diário",
    },
    activeOnPage: true,
    status: "translated",
  },
  {
    k: "cart.empty.title",
    page: "/cart",
    src: "Your cart is empty.",
    val: {
      "en-US": "Your cart is empty.",
      "fr-FR": "Votre panier est vide.",
      "de-DE": "Ihr Warenkorb ist leer.",
      "ja-JP": "カートは空です。",
      "es-ES": "Tu carrito está vacío.",
      "pt-BR": "Seu carrinho está vazio.",
    },
    status: "translated",
  },
  {
    k: "cart.empty.cta",
    page: "/cart",
    src: "Browse the catalog",
    val: {
      "en-US": "Browse the catalog",
      "fr-FR": "Parcourir le catalogue",
      "de-DE": "Katalog durchsuchen",
      "ja-JP": null,
      "es-ES": "Ver catálogo",
      "pt-BR": null,
    },
    status: "partial",
  },
  {
    k: "checkout.btn.pay",
    page: "/checkout",
    src: "Pay {{amount}}",
    val: {
      "en-US": "Pay {{amount}}",
      "fr-FR": "Payer {{amount}}",
      "de-DE": "Zahlen {{amount}}",
      "ja-JP": "{{amount}}を支払う",
      "es-ES": "Pagar {{amount}}",
      "pt-BR": "Pagar {{amount}}",
    },
    status: "review",
    flagged: true,
    vars: ["amount"],
    note: "de-DE: review verb conjugation",
  },
  {
    k: "checkout.btn.cancel",
    page: "/checkout",
    src: "Cancel",
    val: {
      "en-US": "Cancel",
      "fr-FR": "Annuler",
      "de-DE": "Abbrechen",
      "ja-JP": "キャンセル",
      "es-ES": "Cancelar",
      "pt-BR": "Cancelar",
    },
    status: "translated",
  },
  {
    k: "errors.network",
    page: "*",
    src: "Connection lost. Retrying…",
    val: {
      "en-US": "Connection lost. Retrying…",
      "fr-FR": "Connexion perdue. Nouvelle tentative…",
      "de-DE": "Verbindung verloren. Neuer Versuch…",
      "ja-JP": null,
      "es-ES": "Conexión perdida. Reintentando…",
      "pt-BR": null,
    },
    status: "partial",
  },
];

// build a tree from dotted keys
function buildTree(rows) {
  const root = { name: "", children: {}, leaves: [], path: "" };
  for (const r of rows) {
    const parts = r.k.split(".");
    let node = root;
    for (let i = 0; i < parts.length - 1; i++) {
      const seg = parts[i];
      if (!node.children[seg]) {
        node.children[seg] = {
          name: seg,
          children: {},
          leaves: [],
          path: node.path ? node.path + "." + seg : seg,
        };
      }
      node = node.children[seg];
    }
    node.leaves.push(r);
  }
  return root;
}

// pluralization sample for the detail view
const PLURAL_RULES = {
  one: "1 item in cart",
  other: "{{n}} items in cart",
};

const DEFAULT_USER = {
  email: "maya@acme.co",
  id: "usr_3b20a9f2",
  plan: "team",
  status: "active",
  country: "US",
  ltv_usd: "2418",
  age_days: "94",
};

const DEFAULT_GATES = [
  {
    k: "gate.premium_features",
    kind: "gate",
    desc: "rule 1 · team plan members · matched",
    val: true,
    real: true,
    source: "custom",
    icon: "shield",
  },
  {
    k: "gate.beta_drop",
    kind: "gate",
    desc: "rule 2 · ltv > $2,000 · matched",
    val: true,
    real: true,
    source: "custom",
    icon: "shield",
    activeOnPage: true,
  },
  {
    k: "gate.eu_user",
    kind: "gate",
    desc: "built-in · ip:US · no match",
    val: false,
    real: false,
    source: "built-in",
    icon: "shield",
  },
  {
    k: "gate.is_employee",
    kind: "gate",
    desc: "built-in · email:acme.co · matched",
    val: true,
    real: true,
    source: "built-in",
    icon: "shield",
  },
  {
    k: "gate.mobile_only",
    kind: "gate",
    desc: "built-in · UA:desktop · no match",
    val: false,
    real: false,
    source: "built-in",
    icon: "shield",
  },
];

const DEFAULT_EXPS = [
  {
    k: "exp.checkout_v3",
    kind: "exp",
    desc: "bucketed via user_id · 50/50",
    variant: "three_step",
    real: "three_step",
    icon: "flask",
    variants: ["control", "three_step"],
    traffic: [50, 50],
  },
  {
    k: "exp.welcome_5min",
    kind: "exp",
    desc: "paused · winner shipped",
    variant: "control",
    real: "control",
    icon: "flask",
    paused: true,
    variants: ["control", "immediate", "5min"],
    traffic: [33, 33, 34],
  },
];

const DEFAULT_CONFIGS = [
  {
    k: "config.checkout.timeout_ms",
    kind: "config",
    desc: "number · loaded",
    val: "30000",
    real: "30000",
    icon: "sliders",
  },
  {
    k: "config.ranker.weights",
    kind: "config",
    desc: "object · 5 keys · loaded",
    val: "{recency:0.4, …}",
    real: "{recency:0.4, …}",
    icon: "sliders",
  },
  {
    k: "config.embeddings.model",
    kind: "config",
    desc: "string · loaded",
    val: "text-3-large",
    real: "text-3-large",
    icon: "sliders",
  },
];

const DEFAULT_KILLS = [
  {
    k: "kill.new_checkout",
    kind: "kill",
    desc: "green · 0 incidents · 90d",
    val: false,
    real: false,
    icon: "power",
  },
  {
    k: "kill.legacy_uploader",
    kind: "kill",
    desc: "killed · p95 spike · 4h ago",
    val: true,
    real: true,
    icon: "power",
    killed: true,
  },
];

const EVENTS = [
  {
    t: "+12ms",
    l: "log",
    m: [["k", "gate.premium_features"], [" → "], ["s", "true"]],
    ms: "2.8ms",
  },
  {
    t: "+12ms",
    l: "log",
    m: [["k", "exp.checkout_v3"], [" → "], ["s", "three_step"]],
    ms: "3.1ms",
  },
  { t: "+14ms", l: "log", m: [["k", "gate.beta_drop"], [" → "], ["s", "true"]], ms: "1.9ms" },
  {
    t: "+220ms",
    l: "evt",
    m: [
      ["", "log("],
      ["s", '"page_view"'],
      [""],
      [""],
      ["", ", { route: "],
      ["s", '"/"'],
      ["", " })"],
    ],
    ms: "—",
  },
  {
    t: "+340ms",
    l: "evt",
    m: [
      ["", "log("],
      ["s", '"product_view"'],
      ["", ")"],
    ],
    ms: "—",
  },
  {
    t: "+1.2s",
    l: "warn",
    m: [
      ["", "config.ratelimit.api "],
      ["", "fallback used"],
    ],
    ms: "—",
  },
  { t: "+2.0s", l: "log", m: [["k", "gate.eu_user"], [" → "], ["s", "false"]], ms: "0.4ms" },
];

const ICON = {
  shield: IconShield,
  flask: IconFlask,
  sliders: IconSliders,
  power: IconPower,
  gate: IconShield,
};

function FakeSite() {
  return (
    <div className="dtf-cust">
      <div className="nav">
        <div className="logo">◣ Linear Shop</div>
        <span className="l active">Catalog</span>
        <span className="l">Sale</span>
        <span className="l">Journal</span>
        <div className="right">
          <span>Cart (2)</span>
          <div className="av">M</div>
        </div>
      </div>
      <div className="body">
        <div className="kicker">SS26 · EDITION 04</div>
        <h1>
          Objects <em>made of time.</em>
        </h1>
        <p className="sub">
          A small collection of well-considered things, photographed in morning light and made to
          outlast the season they launch in.
        </p>
        <div className="ctas">
          <a className="cta">Shop new arrivals →</a>
          <a className="cta g">Browse journal</a>
        </div>
        <div className="grid">
          <div className="card">
            <div className="ph" />
            <h3>Cotton field shirt</h3>
            <div className="pr">$128 · Ecru</div>
          </div>
          <div className="card c2">
            <div className="ph" />
            <h3>Utility tote</h3>
            <div className="pr">$240 · Oat</div>
          </div>
          <div className="card c3 flagged">
            <div className="ph" />
            <h3>Ceramic mug — Kiln 04</h3>
            <div className="pr">$68 · Beta drop</div>
          </div>
        </div>
        <div className="footer">
          <span>© Linear Shop</span>
          <span>Returns</span>
          <span>Press</span>
        </div>
      </div>
    </div>
  );
}

function FlagRow({ row, expanded, onToggle, onExpand, onVariant }) {
  const Ic = ICON[row.icon] || IconShield;
  const overridden = row.kind === "exp" ? row.variant !== row.real : row.val !== row.real;
  let valEl;
  if (row.kind === "exp") {
    valEl = (
      <select
        className={"sel" + (overridden ? " over" : "")}
        value={row.variant}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => onVariant(row.k, e.target.value)}
      >
        {row.variants.map((v) => (
          <option key={v} value={v}>
            {v}
          </option>
        ))}
      </select>
    );
  } else if (row.kind === "config") {
    valEl = <span className={"val" + (overridden ? " over" : "")}>{row.val}</span>;
  } else if (row.kind === "kill") {
    valEl = (
      <span className={"val " + (row.val ? "killed" : "on")}>{row.val ? "KILLED" : "live"}</span>
    );
  } else {
    valEl = (
      <span className={"val " + (overridden ? "over" : row.val ? "on" : "off")}>
        {row.val ? "true" : "false"}
      </span>
    );
  }

  const togEl =
    row.kind === "gate" || row.kind === "kill" ? (
      <div
        className={"dtf-toggle" + (row.val ? (overridden ? " over" : " on") : "")}
        onClick={(e) => {
          e.stopPropagation();
          onToggle(row.k);
        }}
      />
    ) : (
      <span style={{ width: 28 }} />
    );

  return (
    <>
      <div
        className={"dtf-row" + (expanded ? " expanded" : "") + (row.val ? "" : " muted")}
        onClick={() => onExpand(row.k)}
      >
        <div className="ic">
          <Ic size={11} style={{ color: row.val ? "var(--accent)" : "var(--fg-3)" }} />
        </div>
        <div className="meta">
          <div className="k">
            {row.k}
            {overridden ? <span className="override-tag">forced</span> : null}
            {row.activeOnPage ? <span className="live-dot" title="firing on this page" /> : null}
          </div>
          <div className="v">{row.desc}</div>
        </div>
        {valEl}
        {togEl}
      </div>
      <div className={"dtf-detail" + (expanded ? " open" : "")}>
        <div className="inner">
          <div className="pad">
            {row.kind === "gate" && (
              <>
                <div className="crumbs">
                  <div>
                    <span className={overridden ? "skip" : row.val ? "pass" : "deny"}>
                      {overridden ? "↦" : row.val ? "✓" : "✗"}
                    </span>{" "}
                    {row.k} <span style={{ color: "var(--fg-4)" }}>→</span>{" "}
                    <span className={overridden ? "skip" : row.val ? "pass" : "deny"}>
                      {overridden
                        ? `forced ${row.val ? "true" : "false"} (real: ${row.real ? "true" : "false"})`
                        : row.val
                          ? "true"
                          : "false"}
                    </span>
                  </div>
                  {row.val && !overridden ? (
                    <>
                      <div className="indent">
                        matched <span className="meta">rule 1</span>
                      </div>
                      <div className="indent">
                        user.plan <span style={{ color: "var(--fg-4)" }}>==</span> "team"
                      </div>
                      <div className="indent">
                        user.status <span style={{ color: "var(--fg-4)" }}>==</span> "active"
                      </div>
                    </>
                  ) : null}
                </div>
                <div className="mini">
                  <span className="lbl">eval</span>
                  <span className="v">{(Math.random() * 4 + 1).toFixed(1)}ms · cached 60s</span>
                  <span className="lbl">source</span>
                  <span className="v">{row.source}</span>
                </div>
                <div className="actions">
                  <button
                    className="primary"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggle(row.k);
                    }}
                  >
                    ⤢ Force {row.val ? "false" : "true"}
                  </button>
                  <button>↗ Open in dashboard</button>
                  <button>⌘C copy key</button>
                </div>
              </>
            )}
            {row.kind === "exp" && (
              <>
                <div className="crumbs">
                  <div>
                    <span className="pass">●</span> assigned{" "}
                    <span className="meta">via user_id hash</span>
                  </div>
                </div>
                {row.variants.map((v, i) => (
                  <div key={v} className={"var-row" + (v === row.variant ? " assigned" : "")}>
                    <span
                      className="sw"
                      style={{
                        background:
                          ["var(--info)", "var(--accent)", "var(--warn)"][i] || "var(--fg-3)",
                      }}
                    />
                    <span>{v}</span>
                    <span className="pct">{row.traffic[i]}%</span>
                    <span style={{ fontSize: 9.5, color: "var(--fg-4)" }}>
                      {v === row.real ? "real" : v === row.variant ? "forced" : ""}
                    </span>
                  </div>
                ))}
                <div className="mini">
                  <span className="lbl">primary metric</span>
                  <span className="v">revenue_per_visitor</span>
                  <span className="lbl">runtime</span>
                  <span className="v">11d · 24,810 users</span>
                </div>
              </>
            )}
            {row.kind === "config" && (
              <>
                <div className="crumbs">
                  <div>
                    <span className="pass">●</span> read at{" "}
                    <span className="meta">/products/[slug] · L42</span>
                  </div>
                  <div className="indent">
                    {row.k} <span style={{ color: "var(--fg-4)" }}>=</span> {row.val}
                  </div>
                </div>
                <div className="mini">
                  <span className="lbl">version</span>
                  <span className="v">v42 · 11h ago</span>
                  <span className="lbl">env</span>
                  <span className="v">prod</span>
                </div>
                <div className="actions">
                  <button className="primary">⤢ Override value</button>
                  <button>↗ Open schema</button>
                </div>
              </>
            )}
            {row.kind === "kill" && (
              <>
                <div className="crumbs">
                  <div>
                    <span className={row.val ? "deny" : "pass"}>{row.val ? "✗" : "✓"}</span>{" "}
                    killswitch <span style={{ color: "var(--fg-4)" }}>→</span>{" "}
                    <span className={row.val ? "deny" : "pass"}>{row.val ? "KILLED" : "live"}</span>
                  </div>
                  <div className="indent meta">propagation: &lt;1s to 60+ regions</div>
                </div>
                <div className="actions">
                  <button
                    className={row.val ? "primary" : ""}
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggle(row.k);
                    }}
                  >
                    {row.val ? "✓ Restore" : "⚠ Pull the switch"}
                  </button>
                  <button>↗ Audit history</button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function GatesTab({ rows, view, expanded, setExpanded, onToggle, onVariant }) {
  const active = rows.filter((r) => r.activeOnPage || r.val);
  const inactive = rows.filter((r) => !(r.activeOnPage || r.val));
  return (
    <>
      {view === "page" ? (
        <>
          <div className="dtf-group">
            Active on this page
            <span className="pulse">
              <span className="d" />
              {active.length} firing
            </span>
          </div>
          {active.map((r) => (
            <FlagRow
              key={r.k}
              row={r}
              expanded={expanded === r.k}
              onToggle={onToggle}
              onExpand={setExpanded}
              onVariant={onVariant}
            />
          ))}
          {inactive.length > 0 && (
            <>
              <div className="dtf-group">
                Inactive<span className="c">{inactive.length} more</span>
              </div>
              {inactive.map((r) => (
                <FlagRow
                  key={r.k}
                  row={r}
                  expanded={expanded === r.k}
                  onToggle={onToggle}
                  onExpand={setExpanded}
                  onVariant={onVariant}
                />
              ))}
            </>
          )}
        </>
      ) : (
        <>
          <div className="dtf-group">
            All flags<span className="c">{rows.length}</span>
          </div>
          {rows.map((r) => (
            <FlagRow
              key={r.k}
              row={r}
              expanded={expanded === r.k}
              onToggle={onToggle}
              onExpand={setExpanded}
              onVariant={onVariant}
            />
          ))}
        </>
      )}
    </>
  );
}

function UserTab({ user, setUser, dirty, onReeval }) {
  const Field = ({ k, val, suffix }) => (
    <div className="dtf-prop">
      <span className="k">{k}</span>
      <span className="v">
        <input value={val} onChange={(e) => setUser(k.split(".")[1], e.target.value)} />
        {suffix ? <span style={{ color: "var(--fg-4)", marginLeft: 6 }}>{suffix}</span> : null}
      </span>
      {dirty[k.split(".")[1]] ? <span className="changed" /> : <span style={{ width: 5 }} />}
    </div>
  );
  return (
    <div className="dtf-user">
      <div className="who">
        <div className="av">M</div>
        <div className="info">
          <div className="e">{user.email}</div>
          <div className="id">
            {user.id} · {user.plan} plan · {user.age_days}d old
          </div>
        </div>
        <button className="swap">
          <IconUsers size={10} />
          Switch
        </button>
      </div>
      <div className="dtf-group">
        User properties<span className="c">edit to simulate</span>
      </div>
      <div style={{ flex: 1, overflowY: "auto" }}>
        <Field k="user.id" val={user.id} />
        <Field k="user.email" val={user.email} />
        <Field k="user.plan" val={user.plan} />
        <Field k="user.status" val={user.status} />
        <Field k="user.country" val={user.country} />
        <Field k="user.ltv_usd" val={user.ltv_usd} suffix="USD" />
        <Field k="user.age_days" val={user.age_days} suffix="days" />
        <div className="dtf-group">
          Request context<span className="c">read-only</span>
        </div>
        <div className="dtf-prop">
          <span className="k">ctx.route</span>
          <span className="v" style={{ color: "var(--accent)" }}>
            "/"
          </span>
          <span style={{ width: 5 }} />
        </div>
        <div className="dtf-prop">
          <span className="k">ctx.ip_country</span>
          <span className="v">"US · NY"</span>
          <span style={{ width: 5 }} />
        </div>
        <div className="dtf-prop">
          <span className="k">ctx.user_agent</span>
          <span className="v muted" style={{ fontSize: 10.5 }}>
            "Mozilla/5.0 (Macintosh…)"
          </span>
          <span style={{ width: 5 }} />
        </div>
        <div className="dtf-prop">
          <span className="k">ctx.session_id</span>
          <span className="v">"ses_8f2a"</span>
          <span style={{ width: 5 }} />
        </div>
      </div>
      <div className="dtf-evalbar">
        <button className="b" onClick={onReeval}>
          <IconPlay size={11} /> Re-evaluate{" "}
          {Object.values(dirty).filter(Boolean).length > 0 ? "with changes" : "12 flags"}
        </button>
        <button className="b g">Reset</button>
      </div>
    </div>
  );
}

function EventsTab() {
  return (
    <>
      <div className="dtf-group">
        Live event stream
        <span className="pulse">
          <span className="d" />
          14/s
        </span>
      </div>
      {EVENTS.map((e, i) => (
        <div key={i} className="dtf-event">
          <span className="ts">{e.t}</span>
          <span className={"lvl" + (e.l === "warn" ? " warn" : e.l === "err" ? " err" : "")}>
            {e.l === "warn" ? "!" : e.l === "err" ? "×" : "›"}
          </span>
          <span className="msg">
            {e.m.map(([cls, t], j) =>
              cls ? (
                <span key={j} className={cls}>
                  {t}
                </span>
              ) : (
                <span key={j}>{t}</span>
              ),
            )}
          </span>
          <span className="ms">{e.ms}</span>
        </div>
      ))}
    </>
  );
}

function TreeNode({
  node,
  depth,
  openNodes,
  toggleNode,
  locale,
  showKeys,
  expanded,
  setExpanded,
  onEdit,
  RowComp,
}) {
  const childKeys = Object.keys(node.children);
  return (
    <>
      {childKeys.map((seg) => {
        const child = node.children[seg];
        const isOpen = openNodes[child.path] !== false; // default open
        const totalLeaves = countLeaves(child);
        const missingHere = countMissing(child, locale);
        return (
          <React.Fragment key={child.path}>
            <div className={"dtf-tree-node depth-" + depth} onClick={() => toggleNode(child.path)}>
              <span className="caret">{isOpen ? "▾" : "▸"}</span>
              <span className="seg">{child.name}</span>
              <span className="dotpath">{child.path}</span>
              <span className="counts">
                {missingHere > 0 ? <span className="m">{missingHere} missing</span> : null}
                <span className="t">{totalLeaves}</span>
              </span>
            </div>
            {isOpen ? (
              <>
                <TreeNode
                  node={child}
                  depth={depth + 1}
                  openNodes={openNodes}
                  toggleNode={toggleNode}
                  locale={locale}
                  showKeys={showKeys}
                  expanded={expanded}
                  setExpanded={setExpanded}
                  onEdit={onEdit}
                  RowComp={RowComp}
                />
                {child.leaves.map((r) => (
                  <RowComp key={r.k} r={r} depth={depth + 1} />
                ))}
              </>
            ) : null}
          </React.Fragment>
        );
      })}
    </>
  );
}

function countLeaves(node) {
  let n = node.leaves.length;
  for (const c of Object.values(node.children)) n += countLeaves(c);
  return n;
}
function countMissing(node, locale) {
  let n = 0;
  for (const r of node.leaves) if (r.val[locale] == null) n++;
  for (const c of Object.values(node.children)) n += countMissing(c, locale);
  return n;
}

function LabelsTab({
  rows,
  locale,
  setLocale,
  showKeys,
  setShowKeys,
  expanded,
  setExpanded,
  onEdit,
  openNodes,
  toggleNode,
}) {
  const loc = LOCALES.find((l) => l.code === locale) || LOCALES[1];
  const active = rows.filter((r) => r.activeOnPage);
  const others = rows.filter((r) => !r.activeOnPage);
  const tree = buildTree(rows);

  const Row = ({ r, depth = 0 }) => {
    const v = r.val[locale];
    const missing = v == null;
    const isOpen = expanded === r.k;
    const Pill = ({ s }) => {
      if (missing) return <span className="lbl-pill missing">missing</span>;
      if (r.status === "review" || r.flagged)
        return <span className="lbl-pill review">review</span>;
      if (r.status === "partial") return <span className="lbl-pill partial">partial</span>;
      if (r.edited) return <span className="lbl-pill edited">edited</span>;
      return <span className="lbl-pill ok">●</span>;
    };
    return (
      <>
        <div
          className={"dtf-lbl-row" + (isOpen ? " expanded" : "") + (missing ? " missing" : "")}
          onClick={() => setExpanded(r.k)}
        >
          <Pill />
          <div className="meta">
            <div className="src">
              {showKeys ? (
                r.k
              ) : missing ? (
                <em style={{ color: "var(--warn)" }}>— not translated —</em>
              ) : (
                v
              )}
            </div>
            <div className="sub">
              <span className="k">{showKeys ? r.src : r.k}</span>
              <span className="dot">·</span>
              <span>{r.page}</span>
              {r.vars ? (
                <>
                  <span className="dot">·</span>
                  <span className="var">{r.vars.map((x) => `{{${x}}}`).join(" ")}</span>
                </>
              ) : null}
            </div>
          </div>
          {r.activeOnPage ? (
            <span className="live-dot" title="visible on this page" />
          ) : (
            <span style={{ width: 5 }} />
          )}
        </div>
        <div className={"dtf-detail" + (isOpen ? " open" : "")}>
          <div className="inner">
            <div className="pad lbl-pad">
              <div className="lbl-locales">
                {LOCALES.map((l) => {
                  const tv = r.val[l.code];
                  return (
                    <div
                      key={l.code}
                      className={
                        "lbl-locale" +
                        (l.code === locale ? " sel" : "") +
                        (tv == null ? " miss" : "")
                      }
                      onClick={(e) => {
                        e.stopPropagation();
                        setLocale(l.code);
                      }}
                    >
                      <span className="fl">{l.flag}</span>
                      <span className="nm">
                        {l.name}
                        {l.base ? <span className="base"> · base</span> : null}
                      </span>
                      <span className="tv">{tv == null ? "—" : tv}</span>
                    </div>
                  );
                })}
              </div>
              <div className="lbl-edit">
                <div className="hd">
                  <span>
                    {loc.flag} {loc.name}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                    }}
                  >
                    ↻ Auto-translate
                  </button>
                </div>
                <textarea
                  value={r.val[locale] || ""}
                  placeholder={`Translate "${r.src}" to ${loc.name}…`}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => onEdit(r.k, e.target.value)}
                />
                {r.vars ? (
                  <div className="lbl-vars">
                    vars:
                    {r.vars.map((v) => (
                      <span key={v} className="var">{`{{${v}}}`}</span>
                    ))}
                  </div>
                ) : null}
                {r.note ? <div className="lbl-note">⚠ {r.note}</div> : null}
              </div>
              <div className="actions">
                <button className="primary" onClick={(e) => e.stopPropagation()}>
                  ⤢ Save translation
                </button>
                <button>↗ Open in Polylang</button>
                <button>⌘C copy key</button>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  };

  const translated = rows.filter((r) => r.val[locale] != null).length;
  const total = rows.length;

  return (
    <>
      <div className="dtf-lbl-bar">
        <div className="locales">
          {LOCALES.map((l) => (
            <button
              key={l.code}
              className={l.code === locale ? "active" : ""}
              onClick={() => setLocale(l.code)}
              title={`${l.name} · ${l.pct}%`}
            >
              {l.flag}
              {l.pct < 100 ? <span className="warn-dot" /> : null}
            </button>
          ))}
        </div>
        <div className="cov">
          <div className="bar">
            <div className="fill" style={{ width: `${(translated / total) * 100}%` }} />
          </div>
          <span className="num">
            {translated}/{total}
          </span>
        </div>
        <button className={"tg" + (showKeys ? " on" : "")} onClick={() => setShowKeys((s) => !s)}>
          {"{ }"} keys
        </button>
      </div>
      <div className="dtf-group">
        Visible on this page
        <span className="pulse">
          <span className="d" />
          {active.length} rendered
        </span>
      </div>
      {active.map((r) => (
        <Row key={r.k} r={r} />
      ))}
      {others.length > 0 && (
        <>
          <div className="dtf-group">
            All keys in project<span className="c">{others.length} more</span>
          </div>
          {others.map((r) => (
            <Row key={r.k} r={r} />
          ))}
        </>
      )}
    </>
  );
}

function EmptyQuiet({ onPin }) {
  return (
    <div className="dtf-empty">
      <div className="vis">
        <div className="ring r2" />
        <div className="ring" />
        <div className="core">0</div>
      </div>
      <h3>
        Nothing fired
        <br />
        on <em>this route.</em>
      </h3>
      <p>
        No flags evaluated on this page yet. Pin a flag to watch — or navigate to a flagged route.
      </p>
      <div className="actions">
        <button className="a" onClick={onPin}>
          <span className="ic">+</span>
          <span className="k">Pin a flag to watch</span>
          <span className="kbd">P</span>
        </button>
        <button className="a">
          <span className="ic">↻</span>
          <span className="k">Re-evaluate this page</span>
          <span className="kbd">R</span>
        </button>
      </div>
    </div>
  );
}

function EmptySearch({ q, onPick }) {
  return (
    <div className="dtf-empty search">
      <div className="glyph">
        <span>{"["}</span>
        <span className="core" />
        <span>{"]"}</span>
      </div>
      <h3>
        No flag matches
        <br />
        <em
          style={{
            fontFamily: "var(--mono)",
            fontStyle: "normal",
            fontSize: 14,
            color: "var(--fg-3)",
          }}
        >
          "{q}"
        </em>
      </h3>
      <p>Nothing in your project shares that key. Did you mean —</p>
      <div className="suggest">
        <div className="head">DID YOU MEAN</div>
        <div className="row" onClick={() => onPick("checkout_v3")}>
          <span className="ic acc">F</span>
          <span className="k">exp.checkout_v3</span>
          <span className="meta">running</span>
        </div>
        <div className="row" onClick={() => onPick("beta_drop")}>
          <span className="ic warn">F</span>
          <span className="k">gate.beta_drop</span>
          <span className="meta">forced</span>
        </div>
        <div className="row">
          <span className="ic">+</span>
          <span style={{ color: "var(--fg-3)", fontFamily: "var(--mono)", fontSize: 11 }}>
            Create flag "{q}"
          </span>
          <span className="meta">⌘⏎</span>
        </div>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="dtf-load">
      <div className="topstrip" />
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className={"skel-row" + (i <= 3 ? " live" : "")}>
          <div className="ic" />
          <div className="body">
            <div className="skel" style={{ height: 9, width: `${50 + ((i * 7) % 30)}%` }} />
            <div className="skel" style={{ height: 7, width: `${36 + ((i * 11) % 24)}%` }} />
          </div>
          <div className="skel" style={{ height: 10, width: 38 }} />
          <div className="togsk" />
        </div>
      ))}
    </div>
  );
}

function App() {
  const [tab, setTab] = React.useState("gates");
  const [view, setView] = React.useState("page");
  const [state, setState] = React.useState("live");
  const [collapsed, setCollapsed] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [expanded, setExpanded] = React.useState("gate.beta_drop");
  const [gates, setGates] = React.useState(DEFAULT_GATES);
  const [exps, setExps] = React.useState(DEFAULT_EXPS);
  const [configs, _setConfigs] = React.useState(DEFAULT_CONFIGS);
  const [kills, setKills] = React.useState(DEFAULT_KILLS);
  const [labels, setLabels] = React.useState(DEFAULT_LABELS);
  const [labelLocale, setLabelLocale] = React.useState("fr-FR");
  const [showKeys, setShowKeys] = React.useState(false);
  const [user, setUserState] = React.useState(DEFAULT_USER);
  const [dirty, setDirty] = React.useState({});

  const setUser = (k, v) => {
    setUserState((u) => ({ ...u, [k]: v }));
    setDirty((d) => ({ ...d, [k]: v !== DEFAULT_USER[k] }));
  };
  const onReeval = () => {
    setState("loading");
    setTimeout(() => {
      setState("live");
      setTab("gates");
    }, 1300);
  };

  const onToggleGate = (k) => {
    setGates((gs) => gs.map((g) => (g.k === k ? { ...g, val: !g.val } : g)));
  };
  const onToggleKill = (k) => {
    setKills((ks) => ks.map((g) => (g.k === k ? { ...g, val: !g.val } : g)));
  };
  const onVariant = (k, v) => {
    setExps((es) => es.map((e) => (e.k === k ? { ...e, variant: v } : e)));
  };

  // Compose currently visible rows for the active tab
  const tabRows =
    tab === "gates"
      ? gates
      : tab === "exps"
        ? exps
        : tab === "configs"
          ? configs
          : tab === "kills"
            ? kills
            : tab === "labels"
              ? labels
              : [];

  const filtered = search
    ? tabRows.filter((r) => r.k.toLowerCase().includes(search.toLowerCase()))
    : tabRows;

  const overrides =
    gates.filter((g) => g.val !== g.real).length +
    exps.filter((e) => e.variant !== e.real).length +
    kills.filter((k) => k.val !== k.real).length;

  const tabHasOverrides = (k) => {
    if (k === "gates") return gates.some((g) => g.val !== g.real);
    if (k === "exps") return exps.some((e) => e.variant !== e.real);
    if (k === "kills") return kills.some((g) => g.val !== g.real);
    return false;
  };

  const TIcon = TABS.find((t) => t.k === tab).icon;

  let bodyContent;
  if (state === "loading") {
    bodyContent = <LoadingState />;
  } else if (state === "empty-route" && tab !== "user" && tab !== "events" && tab !== "labels") {
    bodyContent = <EmptyQuiet onPin={() => setState("live")} />;
  } else if (search && filtered.length === 0 && tab !== "user" && tab !== "events") {
    bodyContent = <EmptySearch q={search} onPick={(s) => setSearch(s)} />;
  } else if (tab === "user") {
    bodyContent = <UserTab user={user} setUser={setUser} dirty={dirty} onReeval={onReeval} />;
  } else if (tab === "events") {
    bodyContent = <EventsTab />;
  } else if (tab === "labels") {
    bodyContent = (
      <LabelsTab
        rows={filtered}
        locale={labelLocale}
        setLocale={setLabelLocale}
        showKeys={showKeys}
        setShowKeys={setShowKeys}
        expanded={expanded}
        setExpanded={(k) => setExpanded(expanded === k ? null : k)}
        onEdit={(k, v) =>
          setLabels((ls) =>
            ls.map((l) =>
              l.k === k ? { ...l, val: { ...l.val, [labelLocale]: v }, edited: true } : l,
            ),
          )
        }
      />
    );
  } else {
    bodyContent = (
      <GatesTab
        rows={filtered}
        view={view}
        expanded={expanded}
        setExpanded={(k) => setExpanded(expanded === k ? null : k)}
        onToggle={tab === "kills" ? onToggleKill : onToggleGate}
        onVariant={onVariant}
      />
    );
  }

  return (
    <div className="dtf-doc">
      <div className="dtf-topbar">
        <div className="crumb">
          <span>Shipeasy</span>
          <span className="sep">/</span>
          <span>DevTool</span>
          <span className="sep">/</span>
          <b>Customer-side plugin</b>
        </div>
        <div style={{ flex: 1 }} />
        <h1>
          Shipeasy <em>in-page</em>
        </h1>
      </div>

      <div className="dtf-stagewrap">
        <div className="dtf-stage">
          <div className="corner">
            <span className="d" />
            linear-shop.com · LIVE
          </div>
          <FakeSite />

          {collapsed ? (
            <div className="dtf-panel collapsed" onClick={() => setCollapsed(false)}>
              <div className="dtf-panel-rail">
                <div
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: "50%",
                    background: "var(--accent)",
                    boxShadow: "0 0 6px var(--accent)",
                  }}
                />
                <div
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: 4,
                    background:
                      "conic-gradient(from 140deg, var(--accent), #0a0a0b 40%, var(--accent) 80%)",
                  }}
                />
                <div className="lbl">SHIPEASY</div>
                {overrides > 0 ? (
                  <div
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: "50%",
                      background: "var(--warn)",
                      boxShadow: "0 0 5px var(--warn)",
                    }}
                  />
                ) : null}
              </div>
            </div>
          ) : (
            <div className="dtf-panel">
              <div className="dtf-head">
                <div className="mk" />
                <div className="ti">
                  Shipeasy<span className="sub">linear-shop.com · prod · v0.9.3</span>
                </div>
                <div className="actions">
                  <button
                    className="ib"
                    onClick={() => setState(state === "loading" ? "live" : "loading")}
                    title="Toggle loading"
                  >
                    <IconRefresh size={11} />
                  </button>
                  <button className="ib" title="Settings">
                    <IconSettings size={11} />
                  </button>
                  <button className="ib" onClick={() => setCollapsed(true)} title="Collapse">
                    <IconX size={11} />
                  </button>
                </div>
              </div>

              <div className="dtf-tabs">
                {TABS.map((t) => {
                  const Ic = t.icon;
                  return (
                    <div
                      key={t.k}
                      className={"t" + (tab === t.k ? " active" : "")}
                      onClick={() => {
                        setTab(t.k);
                        setExpanded(null);
                      }}
                    >
                      <Ic size={10} />
                      {t.label}
                      {t.count != null ? <span className="c">{t.count}</span> : null}
                      {tabHasOverrides(t.k) ? <span className="dotw" /> : null}
                    </div>
                  );
                })}
              </div>

              {overrides > 0 && state !== "loading" && (
                <div className="dtf-overbar">
                  <IconAlertTriangle size={11} />
                  <span>
                    <b>
                      {overrides} session override{overrides > 1 ? "s" : ""}
                    </b>{" "}
                    · cleared on refresh
                  </span>
                  <button
                    onClick={() => {
                      setGates(DEFAULT_GATES);
                      setExps(DEFAULT_EXPS);
                      setKills(DEFAULT_KILLS);
                    }}
                  >
                    Clear all
                  </button>
                </div>
              )}

              {tab !== "user" && tab !== "events" && tab !== "labels" && state !== "loading" && (
                <div className="dtf-search">
                  <div className="input">
                    <IconSearch size={11} style={{ color: "var(--fg-3)" }} />
                    <input
                      placeholder={`Filter ${tab}…`}
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                    {search ? (
                      <span
                        style={{
                          fontFamily: "var(--mono)",
                          fontSize: 9.5,
                          color: "var(--fg-4)",
                          cursor: "pointer",
                        }}
                        onClick={() => setSearch("")}
                      >
                        esc
                      </span>
                    ) : (
                      <span
                        className="kbd"
                        style={{
                          padding: "1px 5px",
                          border: "1px solid var(--line)",
                          borderRadius: 3,
                          fontSize: 9.5,
                          fontFamily: "var(--mono)",
                          color: "var(--fg-4)",
                        }}
                      >
                        ⌘K
                      </span>
                    )}
                  </div>
                  {tab === "gates" && (
                    <div className="seg">
                      <button
                        className={view === "page" ? "active" : ""}
                        onClick={() => setView("page")}
                      >
                        page
                      </button>
                      <button
                        className={view === "all" ? "active" : ""}
                        onClick={() => setView("all")}
                      >
                        all
                      </button>
                    </div>
                  )}
                </div>
              )}

              <div className="dtf-body">{bodyContent}</div>

              <div className="dtf-foot">
                {state === "loading" ? (
                  <>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                      <span
                        className="dtps-arc"
                        style={{
                          width: 9,
                          height: 9,
                          borderWidth: 1.2,
                          display: "inline-block",
                          borderRadius: "50%",
                          border: "1.2px solid color-mix(in oklab, var(--accent) 22%, transparent)",
                          borderTopColor: "var(--accent)",
                          borderRightColor: "var(--accent)",
                          animation: "dtf-spin .9s linear infinite",
                        }}
                      />
                      <span style={{ color: "var(--fg-2)" }}>resolving 12 flags</span>
                    </span>
                    <span className="stat">p50 4ms</span>
                  </>
                ) : (
                  <>
                    <span className="ok" />
                    <span style={{ color: "var(--fg-2)" }}>
                      SDK <span className="stat">v0.9.3 · JS</span>
                    </span>
                    <span className="stat">·</span>
                    <span className="stat">12 flags · 14 evt/s</span>
                  </>
                )}
                <span className="sk">⌘⇧D toggle</span>
              </div>
            </div>
          )}
        </div>

        {/* Right control panel for testing */}
        <div className="dtf-controls">
          <div className="h">
            <span className="d" />
            <h3>Test panel</h3>
            <span className="sub">drive every state</span>
          </div>

          <div className="sec">
            <div className="lbl">Tab</div>
            <div className="opts">
              {TABS.map((t) => {
                const Ic = t.icon;
                return (
                  <button
                    key={t.k}
                    className={tab === t.k ? "active" : ""}
                    onClick={() => {
                      setTab(t.k);
                      setExpanded(null);
                      setState("live");
                    }}
                  >
                    <span className="ic">
                      <Ic size={11} style={{ color: "currentColor" }} />
                    </span>
                    <span style={{ flex: 1 }}>
                      {t.label}
                      <span className="desc">
                        {
                          {
                            user: "props · impersonate",
                            gates: "on/off flags",
                            exps: "A/B variants",
                            configs: "remote values",
                            kills: "shutoffs",
                            labels: "i18n strings",
                            events: "live stream",
                          }[t.k]
                        }
                      </span>
                    </span>
                    {t.count != null ? (
                      <span
                        style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--fg-4)" }}
                      >
                        {t.count}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="sec">
            <div className="lbl">State</div>
            <div className="opts">
              <button className={state === "live" ? "active" : ""} onClick={() => setState("live")}>
                <span className="ic">
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: "var(--accent)",
                      boxShadow: "0 0 6px var(--accent)",
                    }}
                  />
                </span>
                <span style={{ flex: 1 }}>
                  Live<span className="desc">data, overrides, expand</span>
                </span>
              </button>
              <button
                className={state === "loading" ? "active" : ""}
                onClick={() => setState("loading")}
              >
                <span className="ic">⟳</span>
                <span style={{ flex: 1 }}>
                  Loading<span className="desc">skeleton + topstrip</span>
                </span>
              </button>
              <button
                className={state === "empty-route" ? "active" : ""}
                onClick={() => setState("empty-route")}
              >
                <span className="ic">○</span>
                <span style={{ flex: 1 }}>
                  Empty route<span className="desc">nothing fired</span>
                </span>
              </button>
              <button
                onClick={() => {
                  setSearch("checkout_v9");
                  setState("live");
                }}
              >
                <span className="ic">⌕</span>
                <span style={{ flex: 1 }}>
                  No-match search<span className="desc">fills query "checkout_v9"</span>
                </span>
              </button>
            </div>
          </div>

          <div className="sec">
            <div className="lbl">Quick toggles</div>
            <div className="opts">
              <button onClick={() => setCollapsed((c) => !c)}>
                <span className="ic">↔</span>
                <span style={{ flex: 1 }}>
                  {collapsed ? "Expand panel" : "Collapse to rail"}
                  <span className="desc">click rail to reopen</span>
                </span>
              </button>
              <button onClick={() => onToggleGate("gate.beta_drop")}>
                <span className="ic">⤢</span>
                <span style={{ flex: 1 }}>
                  Force gate.beta_drop<span className="desc">creates an override badge</span>
                </span>
              </button>
              <button onClick={() => onVariant("exp.checkout_v3", "control")}>
                <span className="ic">A/B</span>
                <span style={{ flex: 1 }}>
                  Switch checkout_v3 → control<span className="desc">forces exp variant</span>
                </span>
              </button>
              <button
                onClick={() => {
                  setGates(DEFAULT_GATES);
                  setExps(DEFAULT_EXPS);
                  setKills(DEFAULT_KILLS);
                  setUserState(DEFAULT_USER);
                  setDirty({});
                  setSearch("");
                  setState("live");
                }}
              >
                <span className="ic">↺</span>
                <span style={{ flex: 1 }}>
                  Reset all<span className="desc">clear overrides + edits</span>
                </span>
              </button>
            </div>
          </div>

          <div className="sec">
            <div className="lbl">Shortcuts</div>
            <div className="kbd-list">
              <span>Toggle DevTool</span>
              <span className="key">⌘⇧D</span>
              <span>Search flags</span>
              <span className="key">⌘K</span>
              <span>Pin flag</span>
              <span className="key">P</span>
              <span>Re-evaluate</span>
              <span className="key">R</span>
              <span>Open in dashboard</span>
              <span className="key">↗</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("app")).render(<App />);
