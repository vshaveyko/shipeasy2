// Shipeasy — Configs seed data + icons + helpers.

/* Extra icons */
const IconType = (p) => (
  <Icon {...p}>
    <polyline points="4 7 4 4 20 4 20 7" />
    <line x1="9" x2="15" y1="20" y2="20" />
    <line x1="12" x2="12" y1="4" y2="20" />
  </Icon>
);
const IconBraces = (p) => (
  <Icon {...p}>
    <path d="M8 3H7a2 2 0 0 0-2 2v5a2 2 0 0 1-2 2 2 2 0 0 1 2 2v5c0 1.1.9 2 2 2h1" />
    <path d="M16 21h1a2 2 0 0 0 2-2v-5c0-1.1.9-2 2-2a2 2 0 0 1-2-2V5a2 2 0 0 0-2-2h-1" />
  </Icon>
);
const IconBrackets = (p) => (
  <Icon {...p}>
    <path d="M16 3h3v18h-3" />
    <path d="M8 21H5V3h3" />
  </Icon>
);
const IconHashSm = (p) => (
  <Icon {...p}>
    <line x1="4" x2="20" y1="9" y2="9" />
    <line x1="4" x2="20" y1="15" y2="15" />
    <line x1="10" x2="8" y1="3" y2="21" />
    <line x1="16" x2="14" y1="3" y2="21" />
  </Icon>
);
const IconToggleRight = (p) => (
  <Icon {...p}>
    <rect width="20" height="12" x="2" y="6" rx="6" ry="6" />
    <circle cx="16" cy="12" r="2" />
  </Icon>
);
const IconList2 = (p) => (
  <Icon {...p}>
    <line x1="8" x2="21" y1="6" y2="6" />
    <line x1="8" x2="21" y1="12" y2="12" />
    <line x1="8" x2="21" y1="18" y2="18" />
    <line x1="3" x2="3.01" y1="6" y2="6" />
    <line x1="3" x2="3.01" y1="12" y2="12" />
    <line x1="3" x2="3.01" y1="18" y2="18" />
  </Icon>
);
const IconChevR = (p) => (
  <Icon {...p}>
    <polyline points="9 6 15 12 9 18" />
  </Icon>
);
const IconGrip = (p) => (
  <Icon {...p}>
    <circle cx="9" cy="6" r="1" />
    <circle cx="15" cy="6" r="1" />
    <circle cx="9" cy="12" r="1" />
    <circle cx="15" cy="12" r="1" />
    <circle cx="9" cy="18" r="1" />
    <circle cx="15" cy="18" r="1" />
  </Icon>
);
const IconUpload = (p) => (
  <Icon {...p}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" x2="12" y1="3" y2="15" />
  </Icon>
);
const IconHistory = (p) => (
  <Icon {...p}>
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
    <path d="M12 7v5l4 2" />
  </Icon>
);
const IconBookOpen = (p) => (
  <Icon {...p}>
    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
  </Icon>
);
const IconArrowLeft = (p) => (
  <Icon {...p}>
    <path d="m12 19-7-7 7-7" />
    <path d="M19 12H5" />
  </Icon>
);
const IconRefreshCcw = (p) => (
  <Icon {...p}>
    <path d="M21 12a9 9 0 0 0-15-6.7L3 8" />
    <path d="M3 3v5h5" />
    <path d="M3 12a9 9 0 0 0 15 6.7l3-2.7" />
    <path d="M16 16h5v5" />
  </Icon>
);

Object.assign(window, {
  IconType,
  IconBraces,
  IconBrackets,
  IconHashSm,
  IconToggleRight,
  IconList2,
  IconChevR,
  IconGrip,
  IconUpload,
  IconHistory,
  IconBookOpen,
  IconArrowLeft,
  IconRefreshCcw,
});

/* ── Field-shape helpers ─────────────────────────────────────── */
let _fid = 0;
function fid() {
  _fid += 1;
  return `f_${_fid}`;
}

function mkField(key, type, opts = {}) {
  return {
    id: fid(),
    key,
    type,
    required: !!opts.required,
    description: opts.description || "",
    enum: opts.enum,
    min: opts.min,
    max: opts.max,
    pattern: opts.pattern,
    format: opts.format,
    properties: opts.properties || null, // for objects
    items: opts.items || null, // for arrays
    default: opts.default, // default value
  };
}

/* Type → icon */
const TYPE_ICON = {
  string: (p) => <IconType {...p} size={11} />,
  number: (p) => <IconHashSm {...p} size={11} />,
  integer: (p) => <IconHashSm {...p} size={11} />,
  boolean: (p) => <IconToggleRight {...p} size={11} />,
  object: (p) => <IconBraces {...p} size={11} />,
  array: (p) => <IconBrackets {...p} size={11} />,
  enum: (p) => <IconList2 {...p} size={11} />,
};

/* ── Seed configs ────────────────────────────────────────────── */
const SEED_CONFIGS = [
  {
    id: "cfg-1",
    name: "platform.checkout",
    description:
      "Checkout flow tuning — timeout, retry policy, and the set of payment processors to attempt in order.",
    owner: "maya@acme.co",
    version: 14,
    publishedAt: "2 days ago",
    publishedBy: "maya@acme.co",
    schema: [
      mkField("timeout_ms", "integer", {
        required: true,
        description: "Hard timeout for the checkout request, in milliseconds.",
        min: 1000,
        max: 60000,
        default: 15000,
      }),
      mkField("payment_methods", "array", {
        required: true,
        description: "Ordered list of processors to attempt.",
        items: { type: "string" },
        default: ["stripe", "adyen", "paypal"],
      }),
      mkField("retry_policy", "object", {
        description: "Backoff config when a processor returns a transient error.",
        properties: [
          mkField("max_attempts", "integer", { required: true, min: 1, max: 10, default: 3 }),
          mkField("backoff_ms", "integer", { required: true, default: 500 }),
          mkField("jitter", "boolean", {
            description: "Add ±20% jitter to each backoff window.",
            default: true,
          }),
        ],
      }),
      mkField("show_apple_pay", "boolean", {
        default: true,
        description: "Surface Apple Pay button on supported devices.",
      }),
    ],
    value: {
      timeout_ms: 15000,
      payment_methods: ["stripe", "adyen", "paypal"],
      retry_policy: { max_attempts: 3, backoff_ms: 500, jitter: true },
      show_apple_pay: true,
    },
    draft: {
      baseVersion: 14,
      authorEmail: "jin@acme.co",
      updatedAt: "17 min ago",
      value: {
        timeout_ms: 20000,
        payment_methods: ["stripe", "adyen", "paypal", "klarna"],
        retry_policy: { max_attempts: 4, backoff_ms: 750, jitter: true },
        show_apple_pay: true,
      },
    },
    activity: [
      {
        at: "17 min ago",
        actor: "jin@acme.co",
        kind: "draft",
        verb: "saved a draft",
        detail: "bumped timeout to 20000, added klarna",
      },
      {
        at: "2 days ago",
        actor: "maya@acme.co",
        kind: "publish",
        verb: "published v14",
        detail: "reduced max_attempts 5 → 3",
      },
      {
        at: "5 days ago",
        actor: "maya@acme.co",
        kind: "schema",
        verb: "updated the schema",
        detail: "added show_apple_pay (boolean)",
      },
      {
        at: "5 days ago",
        actor: "maya@acme.co",
        kind: "publish",
        verb: "published v13",
        detail: "set jitter:true",
      },
      {
        at: "12 days ago",
        actor: "system",
        kind: "create",
        verb: "created the config",
        detail: "with 3 fields",
      },
    ],
  },
  {
    id: "cfg-2",
    name: "platform.ratelimit",
    description: "Per-tier rate-limit rules applied at the API edge.",
    owner: "aren@acme.co",
    version: 7,
    publishedAt: "6 hours ago",
    publishedBy: "aren@acme.co",
    schema: [
      mkField("default", "object", {
        required: true,
        properties: [
          mkField("rpm", "integer", { required: true, default: 60 }),
          mkField("burst", "integer", { default: 120 }),
        ],
      }),
      mkField("tiers", "array", { items: { type: "object" } }),
    ],
    value: {
      default: { rpm: 60, burst: 120 },
      tiers: [
        { name: "free", rpm: 30, burst: 60 },
        { name: "pro", rpm: 300, burst: 600 },
        { name: "enterprise", rpm: 3000, burst: 6000 },
      ],
    },
    draft: null,
    activity: [
      {
        at: "6 hours ago",
        actor: "aren@acme.co",
        kind: "publish",
        verb: "published v7",
        detail: "raised enterprise burst → 6000",
      },
      {
        at: "3 days ago",
        actor: "aren@acme.co",
        kind: "publish",
        verb: "published v6",
        detail: "added enterprise tier",
      },
    ],
  },
  {
    id: "cfg-3",
    name: "platform.search.tuning",
    description: "Knobs for the search ranker — typo tolerance, recency boost, popularity weight.",
    version: 22,
    publishedAt: "yesterday",
    publishedBy: "rin@acme.co",
    schema: [
      mkField("typo_tolerance", "string", {
        enum: ["off", "low", "medium", "high"],
        default: "medium",
      }),
      mkField("recency_boost", "number", { min: 0, max: 1, default: 0.25 }),
      mkField("popularity_weight", "number", { min: 0, max: 1, default: 0.4 }),
      mkField("max_results", "integer", { default: 24 }),
    ],
    value: {
      typo_tolerance: "medium",
      recency_boost: 0.25,
      popularity_weight: 0.4,
      max_results: 24,
    },
    draft: null,
    activity: [
      {
        at: "yesterday",
        actor: "rin@acme.co",
        kind: "publish",
        verb: "published v22",
        detail: "recency_boost 0.18 → 0.25",
      },
    ],
  },
  {
    id: "cfg-4",
    name: "commerce.pricing.tiers",
    description: "Public-facing pricing tiers. Surfaced in marketing site + in-app upgrade flow.",
    version: 42,
    publishedAt: "2 hours ago",
    publishedBy: "maya@acme.co",
    schema: [
      mkField("starter", "object", {
        properties: [
          mkField("name", "string", { required: true }),
          mkField("price_usd", "number", { required: true, min: 0 }),
          mkField("seats", "integer", { default: 3 }),
          mkField("experiments_limit", "integer", { default: 5 }),
        ],
      }),
      mkField("pro", "object", {
        properties: [
          mkField("name", "string", { required: true }),
          mkField("price_usd", "number", { required: true, min: 0 }),
          mkField("seats", "integer"),
          mkField("experiments_limit", "integer"),
          mkField("mcp_enabled", "boolean"),
        ],
      }),
      mkField("team", "object", {
        properties: [
          mkField("name", "string", { required: true }),
          mkField("price_usd", "number", { required: true }),
          mkField("seats", "integer"),
          mkField("experiments_limit", "integer"),
          mkField("sso_enabled", "boolean"),
        ],
      }),
    ],
    value: {
      starter: { name: "Starter", price_usd: 0, seats: 3, experiments_limit: 5 },
      pro: { name: "Pro", price_usd: 29, seats: 10, experiments_limit: 50, mcp_enabled: true },
      team: { name: "Team", price_usd: 99, seats: 25, experiments_limit: 200, sso_enabled: true },
    },
    draft: {
      baseVersion: 42,
      authorEmail: "system (Claude via MCP)",
      updatedAt: "2m ago",
      value: {
        starter: { name: "Starter", price_usd: 0, seats: 3, experiments_limit: 5 },
        pro: { name: "Pro", price_usd: 19, seats: 10, experiments_limit: 100, mcp_enabled: true },
        team: { name: "Team", price_usd: 99, seats: 25, experiments_limit: 200, sso_enabled: true },
      },
    },
    activity: [
      {
        at: "2m ago",
        actor: "system",
        kind: "draft",
        verb: "saved a draft",
        detail: "pro.price_usd 29 → 19 · elasticity analysis via MCP",
      },
      {
        at: "2h ago",
        actor: "maya@acme.co",
        kind: "publish",
        verb: "published v42",
        detail: "added pro.mcp_enabled",
      },
      {
        at: "1d ago",
        actor: "jin@acme.co",
        kind: "publish",
        verb: "published v41",
        detail: "added team.sso_enabled",
      },
    ],
  },
  {
    id: "cfg-5",
    name: "commerce.tax.regions",
    description:
      "Tax rates by region code. Applied at order-time. Missing region falls back to default_rate.",
    version: 9,
    publishedAt: "11 days ago",
    publishedBy: "jin@acme.co",
    schema: [
      mkField("default_rate", "number", { required: true, min: 0, max: 1 }),
      mkField("regions", "array", { items: { type: "object" } }),
    ],
    value: {
      default_rate: 0.0,
      regions: [
        { code: "US-CA", rate: 0.0725 },
        { code: "US-NY", rate: 0.04 },
        { code: "GB", rate: 0.2 },
        { code: "DE", rate: 0.19 },
      ],
    },
    draft: null,
    activity: [
      {
        at: "11 days ago",
        actor: "jin@acme.co",
        kind: "publish",
        verb: "published v9",
        detail: "added GB and DE",
      },
    ],
  },
  {
    id: "cfg-6",
    name: "ml.ranker.weights",
    description: "Feature weights for the recommendation ranker. Sum should stay close to 1.0.",
    version: 31,
    publishedAt: "4 hours ago",
    publishedBy: "rin@acme.co",
    schema: [
      mkField("ctr", "number", { required: true, min: 0, max: 1 }),
      mkField("dwell", "number", { required: true, min: 0, max: 1 }),
      mkField("recency", "number", { required: true, min: 0, max: 1 }),
      mkField("diversity_penalty", "number", { min: 0, max: 1, default: 0.1 }),
    ],
    value: { ctr: 0.5, dwell: 0.3, recency: 0.15, diversity_penalty: 0.05 },
    draft: null,
    activity: [
      {
        at: "4h ago",
        actor: "rin@acme.co",
        kind: "publish",
        verb: "published v31",
        detail: "shifted weight ctr → dwell",
      },
    ],
  },
  {
    id: "cfg-7",
    name: "ml.embeddings",
    description: "Model used to embed product titles + which provider serves it.",
    version: 4,
    publishedAt: "a week ago",
    publishedBy: "rin@acme.co",
    schema: [
      mkField("provider", "string", {
        enum: ["voyage", "openai", "cohere", "self-hosted"],
        required: true,
      }),
      mkField("model", "string", { required: true }),
      mkField("dim", "integer", { required: true }),
      mkField("normalize", "boolean", { default: true }),
    ],
    value: { provider: "voyage", model: "voyage-3-large", dim: 1024, normalize: true },
    draft: null,
    activity: [{ at: "a week ago", actor: "rin@acme.co", kind: "publish", verb: "published v4" }],
  },
  {
    id: "cfg-8",
    name: "ui.copy.onboarding",
    description:
      "Headline and body copy shown on the first-run onboarding cards. Localized server-side.",
    version: 12,
    publishedAt: "3 days ago",
    publishedBy: "sam@acme.co",
    schema: [
      mkField("hero_title", "string", { required: true, max: 80 }),
      mkField("hero_subtitle", "string", { max: 160 }),
      mkField("primary_cta", "string", { default: "Get started" }),
      mkField("show_video", "boolean", { default: false }),
    ],
    value: {
      hero_title: "Ship experiments without the spreadsheet.",
      hero_subtitle:
        "Configs, gates, and metrics — all in one place. No release engineer required.",
      primary_cta: "Start free",
      show_video: false,
    },
    draft: null,
    activity: [
      {
        at: "3 days ago",
        actor: "sam@acme.co",
        kind: "publish",
        verb: "published v12",
        detail: "reworded hero_title",
      },
    ],
  },
  {
    id: "cfg-9",
    name: "ui.dashboard.layout",
    description: "Order and visibility of cards on the home dashboard.",
    version: 5,
    publishedAt: "last month",
    publishedBy: "sam@acme.co",
    schema: [mkField("cards", "array", { items: { type: "object" } })],
    value: {
      cards: [
        { id: "experiments", visible: true, span: 2 },
        { id: "metrics", visible: true, span: 1 },
        { id: "activity", visible: true, span: 1 },
        { id: "getting_started", visible: false, span: 2 },
      ],
    },
    draft: null,
    activity: [{ at: "last month", actor: "sam@acme.co", kind: "publish", verb: "published v5" }],
  },
  {
    id: "cfg-10",
    name: "email.templates.invite",
    description:
      "Workspace invite email — subject + body. Supports {{inviter_name}} and {{workspace}} placeholders.",
    version: 3,
    publishedAt: "a week ago",
    publishedBy: "maya@acme.co",
    schema: [
      mkField("subject", "string", { required: true, max: 120 }),
      mkField("body", "string", { required: true, format: "multiline" }),
      mkField("from_address", "string", { format: "email", default: "no-reply@acme.co" }),
    ],
    value: {
      subject: "{{inviter_name}} invited you to {{workspace}}",
      body: "Hi —\n\n{{inviter_name}} just added you to the {{workspace}} workspace on Shipeasy. Click the button below to accept.\n\nIf you weren't expecting this invite, you can safely ignore it.\n\n— The Shipeasy team",
      from_address: "no-reply@acme.co",
    },
    draft: null,
    activity: [{ at: "a week ago", actor: "maya@acme.co", kind: "publish", verb: "published v3" }],
  },
  {
    id: "cfg-11",
    name: "feature.billing_v2",
    description: "Master enable flag for the new billing surface.",
    version: 1,
    publishedAt: "today",
    publishedBy: "jin@acme.co",
    schema: [mkField("enabled", "boolean", { required: true, default: false })],
    value: { enabled: false },
    draft: null,
    activity: [{ at: "today", actor: "jin@acme.co", kind: "create", verb: "created the config" }],
  },
];

/* ── Helpers ─────────────────────────────────────────────────── */

function namespaceOf(name) {
  const i = name.indexOf(".");
  return i < 0 ? "misc" : name.slice(0, i);
}

function groupConfigs(list, query = "") {
  const q = query.trim().toLowerCase();
  const filtered = q ? list.filter((c) => c.name.toLowerCase().includes(q)) : list;
  const groups = {};
  filtered.forEach((c) => {
    const ns = namespaceOf(c.name);
    if (!groups[ns]) groups[ns] = [];
    groups[ns].push(c);
  });
  Object.values(groups).forEach((arr) => arr.sort((a, b) => a.name.localeCompare(b.name)));
  return Object.keys(groups)
    .sort()
    .map((ns) => ({ ns, items: groups[ns] }));
}

function countFields(schema) {
  if (!Array.isArray(schema)) return 0;
  let n = schema.length;
  schema.forEach((f) => {
    if (f.type === "object" && Array.isArray(f.properties)) n += countFields(f.properties);
  });
  return n;
}

/* TypeScript type inference from a flat schema (top-level only for readability) */
function tsTypeOf(field) {
  switch (field.type) {
    case "string":
      return field.enum ? field.enum.map((v) => `'${v}'`).join(" | ") : "string";
    case "number":
      return "number";
    case "integer":
      return "number";
    case "boolean":
      return "boolean";
    case "array":
      return `${tsItemType(field.items)}[]`;
    case "object":
      if (!Array.isArray(field.properties)) return "Record<string, unknown>";
      return `{\n${field.properties.map((p) => `    ${p.key}${p.required ? "" : "?"}: ${tsTypeOf(p)};`).join("\n")}\n  }`;
    case "enum":
      return (field.enum || []).map((v) => `'${v}'`).join(" | ") || "string";
    default:
      return "unknown";
  }
}
function tsItemType(items) {
  if (!items) return "unknown";
  if (items.type === "object") return "Record<string, unknown>";
  return items.type || "unknown";
}

function tsInterface(name, schema) {
  const safe = name.replace(/[^A-Za-z0-9]/g, "_").replace(/^(\w)/, (_, c) => c.toUpperCase());
  const body = (schema || [])
    .map((f) => `  ${f.key}${f.required ? "" : "?"}: ${tsTypeOf(f)};`)
    .join("\n");
  return `interface ${safe}Config {\n${body}\n}`;
}

/* JSON Schema synthesis from flat schema */
function toJsonSchema(schema) {
  const props = {},
    required = [];
  (schema || []).forEach((f) => {
    const t =
      f.type === "integer"
        ? { type: "integer" }
        : f.type === "enum"
          ? { type: "string", enum: f.enum || [] }
          : f.type === "object"
            ? { type: "object", ...(f.properties ? toJsonSchema(f.properties) : {}) }
            : f.type === "array"
              ? { type: "array", items: f.items || {} }
              : { type: f.type };
    if (f.description) t.description = f.description;
    if (f.min != null) t.minimum = f.min;
    if (f.max != null) t.maximum = f.max;
    if (f.pattern) t.pattern = f.pattern;
    props[f.key] = t;
    if (f.required) required.push(f.key);
  });
  return { type: "object", properties: props, ...(required.length ? { required } : {}) };
}

/* Pretty-printed JSON with syntax-highlighted spans */
function highlightJson(v, indent = 0) {
  const pad = (n) => "  ".repeat(n);
  const out = [];
  const r = (v, n) => {
    if (v === null) return <span className="b">null</span>;
    if (typeof v === "boolean") return <span className="b">{String(v)}</span>;
    if (typeof v === "number") return <span className="n">{String(v)}</span>;
    if (typeof v === "string") return <span className="s">{`"${v}"`}</span>;
    if (Array.isArray(v)) {
      if (v.length === 0)
        return (
          <>
            <span className="p">[]</span>
          </>
        );
      return (
        <>
          <span className="p">[</span>
          {"\n"}
          {v.map((it, i) => (
            <React.Fragment key={i}>
              {pad(n + 1)}
              {r(it, n + 1)}
              {i < v.length - 1 ? <span className="p">,</span> : null}
              {"\n"}
            </React.Fragment>
          ))}
          {pad(n)}
          <span className="p">]</span>
        </>
      );
    }
    if (typeof v === "object") {
      const keys = Object.keys(v);
      if (keys.length === 0)
        return (
          <>
            <span className="p">{"{}"}</span>
          </>
        );
      return (
        <>
          <span className="p">{"{"}</span>
          {"\n"}
          {keys.map((k, i) => (
            <React.Fragment key={k}>
              {pad(n + 1)}
              <span className="k">{`"${k}"`}</span>
              <span className="p">: </span>
              {r(v[k], n + 1)}
              {i < keys.length - 1 ? <span className="p">,</span> : null}
              {"\n"}
            </React.Fragment>
          ))}
          {pad(n)}
          <span className="p">{"}"}</span>
        </>
      );
    }
    return String(v);
  };
  return r(v, indent);
}

Object.assign(window, {
  fid,
  mkField,
  TYPE_ICON,
  SEED_CONFIGS,
  namespaceOf,
  groupConfigs,
  countFields,
  tsTypeOf,
  tsInterface,
  toJsonSchema,
  highlightJson,
});
