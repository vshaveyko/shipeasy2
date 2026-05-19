// Shipeasy — Standardized Create Wizard shell + 5 item-kind flows.
// One modal. Same chrome. Steps vary per kind (3–5 steps).
// Depends on icons.jsx + icons-ext.jsx + configs-data.jsx (extra icons) + configs-shared.jsx (CSelect etc.).

const { useState: wzState, useMemo: wzMemo, useEffect: wzEffect } = React;

/* Missing icons used by the wizard — kept here so this file is self-contained */
const IconGlobe = (p) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="10" />
    <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </Icon>
);
const IconSmartphone = (p) => (
  <Icon {...p}>
    <rect width="14" height="20" x="5" y="2" rx="2" />
    <path d="M12 18h.01" />
  </Icon>
);
const IconMapPin = (p) => (
  <Icon {...p}>
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
    <circle cx="12" cy="10" r="3" />
  </Icon>
);
const IconCreditCard = (p) => (
  <Icon {...p}>
    <rect width="20" height="14" x="2" y="5" rx="2" />
    <line x1="2" x2="22" y1="10" y2="10" />
  </Icon>
);
const IconAlignCenter = (p) => (
  <Icon {...p}>
    <line x1="21" x2="3" y1="6" y2="6" />
    <line x1="17" x2="7" y1="12" y2="12" />
    <line x1="19" x2="5" y1="18" y2="18" />
  </Icon>
);

/* ────────────────────────────────────────────────────────────
   KIND REGISTRY — one entry per item type.
   Each kind declares: icon, color slug, title, steps (array of
   { k, label, render(state, setState) }), validators, footer meta.
   ──────────────────────────────────────────────────────────── */

const KIND_META = {
  configs: {
    label: "config",
    titleVerb: "configure",
    Icon: IconSliders,
    iconClass: "configs",
    publishCta: "Create & publish v1",
    blurb:
      "A versioned, typed key/value record your SDK reads at runtime. The schema becomes TypeScript types over there.",
  },
  gates: {
    label: "gate",
    titleVerb: "target",
    Icon: IconShield,
    iconClass: "gates",
    publishCta: "Create gate",
    blurb:
      "A per-user boolean evaluated server-side. Define one or more rules; users matching ALL rules pass the gate.",
  },
  killswitches: {
    label: "killswitch",
    titleVerb: "kill",
    Icon: IconPower,
    iconClass: "ks",
    publishCta: "Arm killswitch",
    blurb:
      "An emergency shutoff for a feature, region, or surface. Default OFF (armed) so flipping it disables the wired code path.",
  },
  metrics: {
    label: "custom metric",
    titleVerb: "measure",
    Icon: IconChart,
    iconClass: "metrics",
    publishCta: "Register metric",
    blurb:
      "A custom event you want to chart and pull into experiments. Most metrics auto-collect — this is for the ones you fire yourself.",
  },
  experiments: {
    label: "experiment",
    titleVerb: "run",
    Icon: IconFlask,
    iconClass: "experiments",
    publishCta: "Start experiment",
    blurb:
      "A randomized split of a universe into control + one or more test variants, measured against a goal metric and guardrails.",
  },
};

/* ────────────────────────────────────────────────────────────
   Code snippets — language-switching code block.
   Used by every wizard's last "Integrate" step.
   ──────────────────────────────────────────────────────────── */
const LANG_LABEL = {
  ts: "TypeScript",
  js: "JavaScript",
  py: "Python",
  go: "Go",
  rb: "Ruby",
  curl: "cURL",
};

function hiCode(code, lang) {
  const kw =
    {
      ts: "import|from|const|let|var|if|else|return|await|async|export|interface|type|function",
      js: "const|let|var|if|else|return|await|async|require|function",
      py: "from|import|def|if|else|return|None|True|False|with|as",
      go: "if|else|return|func|var|const|nil|true|false|package",
      rb: "require|if|else|end|def|return|nil|true|false",
      curl: "curl|-H|-X|-d",
    }[lang] || "";
  const commentRe = lang === "py" || lang === "rb" ? "#[^\\n]*" : "//[^\\n]*";
  const re = new RegExp(
    `(${commentRe})|("[^"\\n]*"|'[^'\\n]*')|(\\b\\d+(?:\\.\\d+)?\\b)|(\\b(?:${kw})\\b)`,
    "g",
  );
  const out = [];
  let last = 0,
    m,
    i = 0;
  while ((m = re.exec(code)) !== null) {
    if (m.index > last) out.push(code.slice(last, m.index));
    if (m[1])
      out.push(
        <span className="c" key={i++}>
          {m[1]}
        </span>,
      );
    else if (m[2])
      out.push(
        <span className="s" key={i++}>
          {m[2]}
        </span>,
      );
    else if (m[3])
      out.push(
        <span className="n" key={i++}>
          {m[3]}
        </span>,
      );
    else if (m[4])
      out.push(
        <span className="k" key={i++}>
          {m[4]}
        </span>,
      );
    last = m.index + m[0].length;
  }
  if (last < code.length) out.push(code.slice(last));
  return out;
}

function CodeSnippets({ snippets, defaultLang = "ts", extraNote }) {
  const langs = Object.keys(snippets);
  const [lang, setLang] = wzState(defaultLang in snippets ? defaultLang : langs[0]);
  const [copied, setCopied] = wzState(false);
  const code = snippets[lang] || "";
  const onCopy = () => {
    navigator.clipboard?.writeText(code).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div className="cs-block">
      <div className="cs-tabs">
        {langs.map((k) => (
          <button
            key={k}
            className={"cs-tab " + (lang === k ? "active" : "")}
            onClick={() => setLang(k)}
          >
            {LANG_LABEL[k] || k}
          </button>
        ))}
        <div className="cs-tab-spacer" />
        <button className="cs-copy" onClick={onCopy}>
          {copied ? (
            <>
              <IconCheck size={11} /> copied
            </>
          ) : (
            <>
              <IconCopy size={11} /> copy
            </>
          )}
        </button>
      </div>
      <pre className="cs-pre">
        <code>{hiCode(code, lang)}</code>
      </pre>
      {extraNote && <div className="cs-note">{extraNote}</div>}
    </div>
  );
}

/* Compact one-row summary for the Integrate step — leaves the
   code snippets the dominant element on the page. */
function IntegrateSummary({ items }) {
  return (
    <div className="cs-summary">
      {items.map((it, i) => (
        <div className="cs-sum-item" key={i}>
          <div className="lbl">{it.k}</div>
          <div className={"val " + (it.mono ? "mono " : "") + (it.dim ? "dim" : "")}>{it.v}</div>
        </div>
      ))}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
   Field-level small components used by many flows
   ──────────────────────────────────────────────────────────── */

function CfRow({ label, req, hint, children }) {
  return (
    <div className="cf-row">
      <div className="lbl">
        {label}
        {req && <span className="req">·</span>}
      </div>
      <div>
        {children}
        {hint && <div className="help">{hint}</div>}
      </div>
    </div>
  );
}

function NameInput({ value, onChange, prefix, placeholder, valid }) {
  return (
    <div className={"ed-input mono " + (value && !valid ? "is-error" : "")}>
      {prefix && <span className="pre">{prefix}</span>}
      <input
        value={value}
        onChange={(e) => onChange(e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ""))}
        placeholder={placeholder}
        autoFocus
      />
    </div>
  );
}

function OwnerSelect({ value, onChange }) {
  return (
    <CSelect
      value={value}
      placeholder="— pick a teammate —"
      options={[
        {
          v: "",
          label: "(unassigned)",
          icon: <IconUsers size={11} style={{ color: "var(--fg-4)" }} />,
        },
        {
          v: "maya@acme.co",
          label: "Maya Patel",
          meta: "maya@acme.co",
          icon: (
            <span className="avatar-inline" style={{ background: "#22a06b" }}>
              M
            </span>
          ),
        },
        {
          v: "jin@acme.co",
          label: "Jin Park",
          meta: "jin@acme.co",
          icon: (
            <span className="avatar-inline" style={{ background: "#3b82f6" }}>
              J
            </span>
          ),
        },
        {
          v: "aren@acme.co",
          label: "Aren Okonkwo",
          meta: "aren@acme.co",
          icon: (
            <span className="avatar-inline" style={{ background: "#a78bfa" }}>
              A
            </span>
          ),
        },
        {
          v: "rin@acme.co",
          label: "Rin Watanabe",
          meta: "rin@acme.co",
          icon: (
            <span className="avatar-inline" style={{ background: "#f5a623" }}>
              R
            </span>
          ),
        },
      ]}
      onChange={onChange}
      size="md"
    />
  );
}

function Banner({ kind = "ok", icon, title, children }) {
  return (
    <div className={"wm-banner " + (kind === "warn" ? "warn" : kind === "info" ? "info" : "")}>
      <span className="ic">{icon || <IconInfo size={14} />}</span>
      <div style={{ minWidth: 0 }}>
        {title && (
          <div style={{ marginBottom: 2 }}>
            <b>{title}</b>
          </div>
        )}
        <div>{children}</div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
   Aside (right column) — shared "live preview" sidebar
   ──────────────────────────────────────────────────────────── */
function AsideRows({ title, rows, children }) {
  return (
    <div className="wm-aside">
      <div className="ahd">
        <span className="dot" />
        {title}
      </div>
      {rows &&
        rows.map((r, i) => (
          <div className="arow" key={i}>
            <div className="lk">{r.k}</div>
            <div className={"vl " + (r.mono ? "mono " : "") + (r.dim ? "dim" : "")}>
              {r.v || <span style={{ color: "var(--fg-4)" }}>—</span>}
            </div>
          </div>
        ))}
      {children}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
   FLOW · CONFIGS — 4 steps
   ──────────────────────────────────────────────────────────── */
function buildConfigsFlow() {
  return {
    initialState: {
      name: "platform.checkout",
      description:
        "Pricing tiers + checkout form copy used by the marketing site and the in-app upgrade flow.",
      owner: "maya@acme.co",
      group: "platform",
      schemaTemplate: "tiers",
      schemaPreview: [
        { k: "starter", t: "object", r: true },
        { k: "pro", t: "object", r: true },
        { k: "team", t: "object", r: false },
      ],
      version: "v1",
    },
    steps: [
      {
        k: "details",
        label: "Details",
        title: "Identify the config",
        validate: (s) => /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)*$/.test(s.name),
      },
      {
        k: "schema",
        label: "Schema",
        title: "Define the shape",
        validate: (s) => (s.schemaPreview || []).length > 0,
      },
      { k: "value", label: "Defaults", title: "Seed the initial value", validate: (s) => true },
      { k: "integrate", label: "Integrate", title: "Wire it up", validate: (s) => true },
    ],
    render(stepKey, s, set) {
      if (stepKey === "details") return <ConfigDetails s={s} set={set} />;
      if (stepKey === "schema") return <ConfigSchema s={s} set={set} />;
      if (stepKey === "value") return <ConfigDefaults s={s} set={set} />;
      return <ConfigIntegrate s={s} />;
    },
    aside(stepKey, s) {
      return (
        <AsideRows
          title="this config"
          rows={[
            { k: "name", v: s.name || "—", mono: true },
            { k: "namespace", v: (s.name || "").split(".")[0] || "—", mono: true, dim: true },
            { k: "owner", v: s.owner || "—", dim: !s.owner },
            { k: "group", v: s.group || "—", dim: !s.group },
            {
              k: "fields",
              v: `${(s.schemaPreview || []).length} · ${(s.schemaPreview || []).filter((f) => f.r).length} required`,
              mono: true,
            },
            { k: "first ver.", v: "v1 · just now", mono: true, dim: true },
          ]}
        >
          <div className="acard">
            <b style={{ color: "var(--fg)" }}>Reads as</b>
            <br />
            <span style={{ fontFamily: "var(--mono)", color: "var(--fg-2)" }}>
              getConfig(<span style={{ color: "var(--accent)" }}>'{s.name || "…"}'</span>, ctx)
            </span>
          </div>
        </AsideRows>
      );
    },
  };
}

function ConfigDetails({ s, set }) {
  const nameOk = /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)*$/.test(s.name);
  return (
    <div className="cc-card">
      <CfRow
        label="name"
        req
        hint={
          <span>
            Dotted-namespace · text before the first <code>.</code> becomes the group folder.
          </span>
        }
      >
        <NameInput
          value={s.name}
          onChange={(v) => set({ name: v })}
          prefix="configs/"
          placeholder="platform.checkout"
          valid={nameOk}
        />
      </CfRow>
      <CfRow label="description" hint={<span>Shown in the rail and in code-completion.</span>}>
        <textarea
          className="ed-textarea"
          value={s.description}
          onChange={(e) => set({ description: e.target.value })}
          placeholder="What does this config control?"
        />
      </CfRow>
      <CfRow label="owner" hint={<span>On the hook for keeping this honest. Optional.</span>}>
        <div style={{ maxWidth: 360 }}>
          <OwnerSelect value={s.owner} onChange={(v) => set({ owner: v })} />
        </div>
      </CfRow>
      <CfRow
        label="group"
        hint={<span>Free-text label for grouping beyond the dotted namespace.</span>}
      >
        <div style={{ maxWidth: 360 }}>
          <CSelect
            value={s.group}
            placeholder="— pick or leave empty —"
            options={[
              {
                v: "",
                label: "(no group)",
                icon: <IconLayers size={11} style={{ color: "var(--fg-4)" }} />,
              },
              {
                v: "platform",
                label: "platform",
                icon: <IconLayers size={11} style={{ color: "var(--info)" }} />,
                meta: "3 configs",
              },
              {
                v: "commerce",
                label: "commerce",
                icon: <IconLayers size={11} style={{ color: "var(--accent)" }} />,
                meta: "4 configs",
              },
              {
                v: "ml",
                label: "ml",
                icon: <IconLayers size={11} style={{ color: "var(--purple)" }} />,
                meta: "2 configs",
              },
              {
                v: "ui",
                label: "ui",
                icon: <IconLayers size={11} style={{ color: "var(--warn)" }} />,
                meta: "2 configs",
              },
            ]}
            onChange={(v) => set({ group: v })}
            size="md"
          />
        </div>
      </CfRow>
    </div>
  );
}

const SCHEMA_TPL = [
  {
    k: "tiers",
    name: "Tiered pricing",
    icon: IconLayers,
    sub: "Public-facing pricing tiers.",
    fields: [
      { k: "starter", t: "object", r: true },
      { k: "pro", t: "object", r: true },
      { k: "team", t: "object", r: false },
    ],
  },
  {
    k: "ratelimit",
    name: "Rate-limit policy",
    icon: IconShield,
    sub: "Default rule + per-tier overrides.",
    fields: [
      { k: "default", t: "object", r: true },
      { k: "tiers", t: "array", r: false },
    ],
  },
  {
    k: "copy",
    name: "UI copy block",
    icon: IconBookOpen,
    sub: "A/B-testable strings.",
    fields: [
      { k: "hero_title", t: "string", r: true },
      { k: "hero_subtitle", t: "string", r: false },
      { k: "primary_cta", t: "string", r: false },
    ],
  },
];

function ConfigSchema({ s, set }) {
  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div className="ss-method">
          <div className="icn">
            <IconPlus size={15} />
          </div>
          <div className="body">
            <div className="ttl">Build field-by-field</div>
            <div className="sub">Start with one empty field. Best when shape isn't fixed.</div>
          </div>
          <div className="arrow">
            <IconArrowRight size={12} />
          </div>
        </div>
        <div className="ss-method">
          <div className="icn">
            <IconUpload size={15} />
          </div>
          <div className="body">
            <div className="ttl">Paste JSON</div>
            <div className="sub">Drop in an example payload or full JSON Schema.</div>
          </div>
          <div className="arrow">
            <IconArrowRight size={12} />
          </div>
        </div>
      </div>
      <div className="ss-or" style={{ margin: "14px 0" }}>
        <span className="ln" />
        <span className="lbl">or start from a template</span>
        <span className="ln" />
      </div>
      <div className="ss-gallery">
        {SCHEMA_TPL.map((t) => {
          const I = t.icon;
          const active = s.schemaTemplate === t.k;
          return (
            <div
              key={t.k}
              className={"ss-tpl" + (active ? " active" : "")}
              onClick={() => set({ schemaTemplate: t.k, schemaPreview: t.fields })}
            >
              <div className="hd">
                <div className="icn">
                  <I size={13} />
                </div>
                <div className="ttl">{t.name}</div>
                <span className="count">{t.fields.length} fields</span>
              </div>
              <div className="desc">{t.sub}</div>
              <div className="fields">
                {t.fields.map((f) => (
                  <div key={f.k} className="frow">
                    <span className="k">{f.k}</span>
                    {f.r && <span className="req">·required</span>}
                    <span className={"tp " + f.t}>{f.t}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

function ConfigDefaults({ s }) {
  return (
    <div className="cc-card">
      <div className="cc-hd">
        <div className="ttl">v1 value</div>
        <span className="sub">live-validated</span>
      </div>
      <div style={{ padding: 14 }}>
        <div className="vf">
          {(s.schemaPreview || []).map((f) => (
            <div className="vf-field" key={f.k}>
              <div className="vf-lbl">
                <span style={{ fontFamily: "var(--mono)", color: "var(--fg)" }}>{f.k}</span>
                {f.r && <span className="req">·</span>}
                <span className={"tp " + f.t} style={{ marginLeft: "auto" }}>
                  {f.t}
                </span>
              </div>
              <div className="ed-input mono">
                <input
                  defaultValue={
                    f.t === "object"
                      ? "{ … }"
                      : f.t === "array"
                        ? "[ … ]"
                        : f.t === "string"
                          ? '"Default"'
                          : "0"
                  }
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ConfigIntegrate({ s }) {
  const tsName = (s.name || "config")
    .replace(/[^A-Za-z0-9]/g, "_")
    .replace(/^(\w)/, (_, c) => c.toUpperCase());
  const defaultJson = JSON.stringify(
    (s.schemaPreview || []).reduce((a, f) => {
      a[f.k] =
        f.t === "string"
          ? ""
          : f.t === "number" || f.t === "integer"
            ? 0
            : f.t === "boolean"
              ? false
              : f.t === "array"
                ? []
                : {};
      return a;
    }, {}),
    null,
    2,
  );
  const ts = `import { initialize, getConfig } from '@shipeasy/sdk';

await initialize({ apiKey: process.env.SHIPEASY_KEY });

// Schema-typed default — falls back if the CDN hasn't hydrated yet
const ${tsName}Default = ${defaultJson};

export async function load${tsName}() {
  return getConfig('${s.name}', ${tsName}Default);
}`;
  const py = `from shipeasy import client

client.initialize(api_key=os.environ["SHIPEASY_KEY"])

# get_config returns a dict typed against your schema
${(s.name || "cfg").split(".").pop()} = client.get_config(
    name="${s.name}",
    default=${defaultJson.replace(/^/gm, "    ").trimStart()},
)`;
  const curl = `curl -H "Authorization: Bearer $SHIPEASY_KEY" \\
  https://api.shipeasy.dev/v1/configs/${encodeURIComponent(s.name || "")}/value`;

  return (
    <>
      <IntegrateSummary
        items={[
          { k: "name", v: s.name, mono: true },
          {
            k: "fields",
            v: `${s.schemaPreview.length} · ${s.schemaPreview.filter((f) => f.r).length} required`,
            mono: true,
          },
          { k: "version", v: "v1 · just now", mono: true, dim: true },
          { k: "owner", v: s.owner, mono: true, dim: true },
        ]}
      />
      <CodeSnippets
        snippets={{ ts, py, curl }}
        defaultLang="ts"
        extraNote={
          <>
            Type definitions are auto-published to <code>@shipeasy/types</code> on every schema
            bump.
          </>
        }
      />
      <Banner kind="ok" icon={<IconRocket size={13} />} title="Publish triggers a CDN rebuild">
        Typically 1–2 seconds. You'll land on the edit page once the version is live.
      </Banner>
    </>
  );
}

/* ────────────────────────────────────────────────────────────
   FLOW · GATES — 4 steps, mirrors the gates-editor-v2 visuals.
   Targeting step is a real gate stack (conditions + rollout floor).
   ──────────────────────────────────────────────────────────── */
const GATE_ATTRS = [
  "country",
  "device.type",
  "plan",
  "user.created_at",
  "locale",
  "app.version",
  "is_employee",
  "feature_flags",
];
const GATE_OPS = ["=", "!=", "in", "not in", "contains", ">=", "<=", ">", "<"];

let _gateGid = 0;
const gateGid = () => `g${++_gateGid}`;

function autoGateTitle(g) {
  if (g.locked) return "Public";
  if (g.type === "rollout") return g.name || `${g.percentage || 0}% rollout`;
  if (!g.rules || !g.rules.length) return g.name || "Empty condition";
  const r0 = g.rules[0];
  return (
    g.name ||
    `${r0.attr} ${r0.op} ${String(r0.val)
      .replace(/^["[]|["\]]$/g, "")
      .slice(0, 18)}`
  );
}
function summarizeGate(g) {
  if (g.locked) return "falls through to the public floor";
  if (g.type === "rollout")
    return `${g.bucketBy || "user_id"} · sticky-hash · salt:${g.salt || g.id}`;
  return (g.rules || []).map((r) => `${r.attr} ${r.op} ${r.val}`).join("  AND  ");
}

function buildGatesFlow() {
  return {
    initialState: {
      name: "premium_features",
      description:
        "Surfaces premium upsells. Layered: employees first, then beta cohort, then a public 25% rollout.",
      folder: "experiments",
      owner: "maya@acme.co",
      gates: [
        {
          id: "g-employees",
          type: "condition",
          name: "Employees",
          pass: "any",
          rules: [{ id: "r1", attr: "is_employee", op: "=", val: "true" }],
        },
        {
          id: "g-beta",
          type: "condition",
          name: "Beta cohort",
          pass: "all",
          rules: [
            { id: "r2", attr: "feature_flags", op: "contains", val: '"premium_beta"' },
            { id: "r3", attr: "plan", op: "in", val: '["pro","team"]' },
          ],
        },
        {
          id: "g-roll",
          type: "rollout",
          name: "Public rollout",
          percentage: 25,
          bucketBy: "user_id",
          salt: "premium_features",
        },
        {
          id: "g-public",
          type: "rollout",
          name: "Public floor",
          percentage: 0,
          bucketBy: "user_id",
          salt: "public",
          locked: true,
        },
      ],
      fixture: {
        "user.id": "u_1872",
        is_employee: "false",
        plan: "pro",
        country: "US",
        "device.type": "mobile",
        feature_flags: '["premium_beta","new_search"]',
      },
    },
    steps: [
      {
        k: "details",
        label: "Details",
        title: "Identify the gate",
        validate: (s) => /^[a-z][a-z0-9_]+$/.test(s.name),
      },
      {
        k: "targeting",
        label: "Targeting",
        title: "Compose the gate stack",
        validate: (s) => s.gates && s.gates.length > 0,
      },
      { k: "preview", label: "Preview", title: "Test against a fixture", validate: () => true },
      { k: "integrate", label: "Integrate", title: "Wire it up", validate: () => true },
    ],
    render(k, s, set) {
      if (k === "details") return <GateDetails s={s} set={set} />;
      if (k === "targeting") return <GateTargeting s={s} set={set} />;
      if (k === "preview") return <GatePreview s={s} set={set} />;
      return <GateIntegrate s={s} />;
    },
    aside(k, s) {
      const conditions = s.gates.filter((g) => g.type === "condition" && !g.locked).length;
      const rollouts = s.gates.filter((g) => g.type === "rollout" && !g.locked).length;
      const publicG = s.gates.find((g) => g.locked);
      return (
        <AsideRows
          title="this gate"
          rows={[
            { k: "key", v: s.name, mono: true },
            { k: "folder", v: s.folder, dim: true },
            {
              k: "stack",
              v: `${conditions} condition${conditions === 1 ? "" : "s"} · ${rollouts} rollout${rollouts === 1 ? "" : "s"}`,
              mono: true,
            },
            {
              k: "public floor",
              v: publicG ? `${publicG.percentage}%` : "0%",
              mono: true,
              dim: true,
            },
            { k: "eval order", v: "top → bottom · first match wins", dim: true },
          ]}
        >
          <div className="acard">
            <b style={{ color: "var(--fg)" }}>SDK call</b>
            <br />
            <span style={{ fontFamily: "var(--mono)", color: "var(--fg-2)" }}>
              shipeasy.<span style={{ color: "var(--accent)" }}>gate</span>(
              <span style={{ color: "var(--accent)" }}>'{s.name || "…"}'</span>, ctx)
            </span>
          </div>
        </AsideRows>
      );
    },
  };
}

function GateDetails({ s, set }) {
  const nameOk = /^[a-z][a-z0-9_]+$/.test(s.name);
  return (
    <div className="cc-card">
      <CfRow
        label="key"
        req
        hint={
          <span>
            The gate key SDKs check: <code>shipeasy.gate('{s.name || "…"}')</code> — frozen after
            publish.
          </span>
        }
      >
        <NameInput
          value={s.name}
          onChange={(v) => set({ name: v })}
          prefix="gates/"
          placeholder="mobile_us_eu_new_users"
          valid={nameOk}
        />
      </CfRow>
      <CfRow label="description" hint={<span>One sentence — who passes this gate and why.</span>}>
        <textarea
          className="ed-textarea"
          value={s.description}
          onChange={(e) => set({ description: e.target.value })}
        />
      </CfRow>
      <CfRow label="folder" hint={<span>Optional grouping in the rail.</span>}>
        <div style={{ maxWidth: 360 }}>
          <CSelect
            value={s.folder}
            placeholder="(no folder)"
            options={[
              {
                v: "experiments",
                label: "experiments",
                icon: <IconFlask size={11} style={{ color: "var(--accent)" }} />,
                meta: "8 gates",
              },
              {
                v: "onboarding",
                label: "onboarding",
                icon: <IconRocket size={11} style={{ color: "var(--info)" }} />,
                meta: "4 gates",
              },
              {
                v: "billing",
                label: "billing",
                icon: <IconCreditCard size={11} style={{ color: "var(--warn)" }} />,
                meta: "2 gates",
              },
              {
                v: "platform",
                label: "platform",
                icon: <IconLayers size={11} style={{ color: "var(--purple)" }} />,
                meta: "5 gates",
              },
              { v: "", label: "(no folder)" },
            ]}
            onChange={(v) => set({ folder: v })}
            size="md"
          />
        </div>
      </CfRow>
      <CfRow label="owner" hint={<span>Optional. Notified on changes.</span>}>
        <div style={{ maxWidth: 360 }}>
          <OwnerSelect value={s.owner} onChange={(v) => set({ owner: v })} />
        </div>
      </CfRow>
    </div>
  );
}

function GateTargeting({ s, set }) {
  const updateGate = (id, patch) =>
    set({ gates: s.gates.map((g) => (g.id === id ? { ...g, ...patch } : g)) });
  const removeGate = (id) => set({ gates: s.gates.filter((g) => g.id !== id || g.locked) });
  const addGate = (type) => {
    const insertAt = s.gates.findIndex((g) => g.locked);
    const idx = insertAt === -1 ? s.gates.length : insertAt;
    const newG =
      type === "rollout"
        ? {
            id: gateGid(),
            type: "rollout",
            name: "Untitled rollout",
            percentage: 10,
            bucketBy: "user_id",
            salt: "rollout",
          }
        : {
            id: gateGid(),
            type: "condition",
            name: "Untitled condition",
            pass: "all",
            rules: [{ id: gateGid(), attr: "country", op: "=", val: '"US"' }],
          };
    const next = [...s.gates.slice(0, idx), newG, ...s.gates.slice(idx)];
    set({ gates: next });
  };

  return (
    <>
      <div className="gk-stack">
        <div className="gk-eval-flow">
          <IconChevronDown size={11} />
          <span>
            evaluated <b>top → bottom</b> · first gate that returns true wins · everything below is
            skipped
          </span>
        </div>
        {s.gates.map((g, i) => (
          <div key={g.id} className={"gk-gate t-" + g.type + (g.locked ? " locked" : "")}>
            <div className="order">
              <span className="grip">
                <span />
                <span />
                <span />
              </span>
              <span className="n">{String(i + 1).padStart(2, "0")}</span>
            </div>
            <div className="badge-ico">
              {g.locked ? (
                <IconLock size={14} />
              ) : g.type === "rollout" ? (
                <IconSliders size={14} />
              ) : (
                <IconGitBranch size={14} />
              )}
            </div>
            <div className="body">
              <div className="name">
                {autoGateTitle(g)}
                {g.type === "rollout" ? (
                  <span className="pill roll">rollout</span>
                ) : (
                  <span className="pill cond">condition</span>
                )}
              </div>
              <div className="summary">
                <code>{summarizeGate(g)}</code>
              </div>
            </div>
            <div>
              {g.type === "rollout" ? (
                <div className={"mini-roll " + (g.locked ? "locked" : "")}>
                  <span className={"num " + ((g.percentage || 0) === 0 ? "zero" : "")}>
                    {g.percentage || 0}%
                  </span>
                  <div className="track">
                    <div className="bar">
                      <div className="fill" style={{ width: (g.percentage || 0) + "%" }} />
                    </div>
                    {!g.locked && (
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={g.percentage || 0}
                        onChange={(e) => updateGate(g.id, { percentage: +e.target.value })}
                      />
                    )}
                  </div>
                </div>
              ) : (
                <div className="gk-pass cond">
                  <span className="top">
                    {g.pass === "any" ? "ANY of" : "ALL of"} <b>{(g.rules || []).length}</b>
                  </span>
                  <div className="bar">
                    <div
                      className="fill"
                      style={{ width: Math.min(100, (g.rules || []).length * 25) + "%" }}
                    />
                  </div>
                </div>
              )}
            </div>
            <div style={{ fontFamily: "var(--mono)", fontSize: 10.5, color: "var(--fg-3)" }}>
              {g.locked ? (
                "fallback"
              ) : (
                <span className="pill-stat valid" style={{ fontSize: 9, padding: "2px 6px" }}>
                  ENABLED
                </span>
              )}
            </div>
            <div className="gk-actions">
              {!g.locked && (
                <>
                  <button className="ic-btn" title="Edit">
                    <IconEdit size={11} />
                  </button>
                  <button className="ic-btn" title="Duplicate">
                    <IconCopy size={11} />
                  </button>
                  <button className="ic-btn danger" title="Remove" onClick={() => removeGate(g.id)}>
                    <IconTrash size={11} />
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
        <div className="gk-locked-note">
          <IconLock size={11} />
          <span>
            The last row is the <b style={{ color: "var(--fg-2)" }}>public floor</b> — always
            present, can be 0–100%, can't be removed.
          </span>
        </div>
        <div className="gk-add-cta">
          <button className="btn btn-secondary btn-sm" onClick={() => addGate("condition")}>
            <IconGitBranch size={11} /> Add condition
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => addGate("rollout")}>
            <IconSliders size={11} /> Add rollout
          </button>
          <span
            style={{
              marginLeft: "auto",
              fontFamily: "var(--mono)",
              fontSize: 10.5,
              color: "var(--fg-4)",
            }}
          >
            {s.gates.filter((g) => !g.locked).length} authored
          </span>
        </div>
      </div>

      <Banner kind="info" icon={<IconActivity size={13} />} title="Order matters.">
        Put broad allows (employees, beta cohort) at the top so they don't get bucketed into a
        partial rollout below.
      </Banner>
    </>
  );
}

/* Tiny evaluator used by the Preview step */
function ruleMatchesFixture(r, fixture) {
  const v = fixture[r.attr];
  if (v == null || v === "(unset)") return false;
  const raw = r.val.trim();
  const num = parseFloat(v);
  if (r.op === "=") return String(v) === raw.replace(/^"|"$/g, "");
  if (r.op === "!=") return String(v) !== raw.replace(/^"|"$/g, "");
  if (r.op === "contains") return String(v).includes(raw.replace(/^"|"$/g, ""));
  if (r.op === "in") {
    try {
      return JSON.parse(raw).map(String).includes(String(v));
    } catch {
      return false;
    }
  }
  if (r.op === "not in") {
    try {
      return !JSON.parse(raw).map(String).includes(String(v));
    } catch {
      return false;
    }
  }
  if (r.op === ">=") return num >= parseFloat(raw);
  if (r.op === "<=") return num <= parseFloat(raw);
  if (r.op === ">") return num > parseFloat(raw);
  if (r.op === "<") return num < parseFloat(raw);
  return false;
}

function evaluateStack(gates, fixture) {
  const results = [];
  let winner = null;
  for (const g of gates) {
    if (winner) {
      results.push({ g, verdict: "skip", reason: "short-circuit" });
      continue;
    }
    if (g.type === "rollout") {
      const seed =
        (fixture["user.id"] || "").split("").reduce((a, c) => a + c.charCodeAt(0), 0) +
        (g.salt || "").split("").reduce((a, c) => a + c.charCodeAt(0), 0);
      const slot = seed % 100;
      const pass = slot < (g.percentage || 0);
      results.push({
        g,
        verdict: pass ? "pass" : "fail",
        reason: `slot ${slot}/100, threshold ${g.percentage || 0}`,
      });
      if (pass) winner = g;
    } else {
      const rs = (g.rules || []).map((r) => [r, ruleMatchesFixture(r, fixture)]);
      const pass = g.pass === "any" ? rs.some(([, m]) => m) : rs.every(([, m]) => m);
      const detail = rs.map(([r, m]) => `${m ? "✓" : "✗"} ${r.attr}`).join(" · ");
      results.push({ g, verdict: pass ? "pass" : "fail", reason: detail });
      if (pass) winner = g;
    }
  }
  return { results, winner };
}

function GatePreview({ s, set }) {
  const { results, winner } = wzMemo(() => evaluateStack(s.gates, s.fixture), [s.gates, s.fixture]);
  const fixtureKeys = ["user.id", "is_employee", "plan", "country", "device.type", "feature_flags"];
  const setFixture = (k, v) => set({ fixture: { ...s.fixture, [k]: v } });
  return (
    <>
      <div className="gk-preview">
        <div className="gk-prev-col">
          <h4>Fixture · attributes you'd pass at the call-site</h4>
          {fixtureKeys.map((k) => (
            <div className="gk-fixture" key={k}>
              <span className="k">{k}</span>
              <span className="v in">
                <input value={s.fixture[k] || ""} onChange={(e) => setFixture(k, e.target.value)} />
              </span>
            </div>
          ))}
          <div
            style={{
              marginTop: 6,
              paddingTop: 8,
              borderTop: "1px dashed var(--line)",
              fontFamily: "var(--mono)",
              fontSize: 10.5,
              color: "var(--fg-4)",
            }}
          >
            Switch fixture to test edge cases — employee · paid · anonymous · in-rollout ·
            out-of-rollout
          </div>
        </div>
        <div className="gk-prev-col">
          <h4>Evaluation · top → bottom</h4>
          {results.map((r, i) => (
            <div className={"gk-eval-row"} key={r.g.id}>
              <span className="n">{String(i + 1).padStart(2, "0")}</span>
              <span className={"pill " + r.verdict}>{r.verdict}</span>
              <span className="lbl">{autoGateTitle(r.g)}</span>
              <span className="meta">{r.reason}</span>
            </div>
          ))}
          <div className={"gk-verdict " + (winner ? "" : "fail")}>
            <div className="big">{winner ? "PASS" : "FAIL"}</div>
            <div className="reason">
              {winner ? (
                <>
                  matched <b style={{ color: "var(--fg-2)" }}>{autoGateTitle(winner)}</b>
                </>
              ) : (
                <>
                  no gate matched — falls through to <b style={{ color: "var(--fg-2)" }}>0%</b>{" "}
                  public floor
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      <Banner
        kind="info"
        icon={<IconCpu size={13} />}
        title="The fixture is local — nothing is sent to the server"
      >
        Hash version, salt and percentage thresholds are deterministic per (user.id, salt), so the
        preview mirrors what the SDK will return for that exact user.
      </Banner>
    </>
  );
}

function GateIntegrate({ s }) {
  const ts = `import { shipeasy } from '@shipeasy/sdk';

// Server-side check — returns boolean, evaluated against your live rules
const passes = await shipeasy.gate('${s.name}', {
  user_id: ctx.user.id,
  attributes: {
    country:        ctx.user.country,
    'device.type':  ctx.device.type,
    'user.created_at': ctx.user.createdAt,
  },
});

if (passes) {
  return renderGatedFeature();
}
return renderDefault();`;
  const py = `from shipeasy import client

passes = client.gate(
    "${s.name}",
    user_id=ctx.user.id,
    attributes={
        "country": ctx.user.country,
        "device.type": ctx.device.type,
        "user.created_at": ctx.user.created_at,
    },
)

if passes:
    return render_gated_feature()
return render_default()`;
  const go = `passes, _ := shipeasy.Gate(ctx, "${s.name}", &shipeasy.Subject{
    UserID: ctx.User.ID,
    Attributes: map[string]any{
        "country":          ctx.User.Country,
        "device.type":      ctx.Device.Type,
        "user.created_at":  ctx.User.CreatedAt,
    },
})

if passes {
    return renderGatedFeature()
}
return renderDefault()`;
  const curl = `curl -H "Authorization: Bearer $SHIPEASY_KEY" \\
  -H "Content-Type: application/json" \\
  -X POST https://api.shipeasy.dev/v1/gates/${encodeURIComponent(s.name || "")}/evaluate \\
  -d '{ "user_id": "u_123", "attributes": { "country": "US" } }'`;

  return (
    <>
      <IntegrateSummary
        items={[
          { k: "key", v: s.name, mono: true },
          {
            k: "gates",
            v: `${s.gates.filter((g) => g.type === "condition" && !g.locked).length} cond · ${s.gates.filter((g) => g.type === "rollout" && !g.locked).length} rollout`,
            mono: true,
          },
          {
            k: "floor",
            v: `${(s.gates.find((g) => g.locked) || {}).percentage || 0}%`,
            mono: true,
          },
          { k: "folder", v: s.folder, mono: true, dim: true },
        ]}
      />
      <CodeSnippets
        snippets={{ ts, py, go, curl }}
        defaultLang="ts"
        extraNote={
          <>The first call hydrates a local cache. Subsequent calls are sub-millisecond.</>
        }
      />
    </>
  );
}

/* ────────────────────────────────────────────────────────────
   FLOW · KILLSWITCHES — 3 steps
   ──────────────────────────────────────────────────────────── */
function buildKsFlow() {
  return {
    initialState: {
      name: "checkout_v3_emergency_off",
      description: "Cuts the new checkout flow back to v2 if error rate spikes.",
      scope: "feature",
      target: "checkout.v3",
      fallback: "return_v2",
      armed: true,
      escalateTo: "maya@acme.co",
    },
    steps: [
      {
        k: "details",
        label: "Details",
        title: "Identify the killswitch",
        validate: (s) => /^[a-z][a-z0-9_]+$/.test(s.name),
      },
      {
        k: "scope",
        label: "Scope & fallback",
        title: "Scope & fallback",
        validate: (s) => !!s.scope && !!s.target,
      },
      { k: "integrate", label: "Integrate", title: "Wire it up", validate: () => true },
    ],
    render(k, s, set) {
      if (k === "details") return <KsDetails s={s} set={set} />;
      if (k === "scope") return <KsScope s={s} set={set} />;
      return <KsIntegrate s={s} />;
    },
    aside(k, s) {
      return (
        <AsideRows
          title="this killswitch"
          rows={[
            { k: "key", v: s.name, mono: true },
            { k: "scope", v: s.scope, mono: true },
            { k: "target", v: s.target, mono: true },
            { k: "fallback", v: s.fallback, mono: true, dim: true },
            {
              k: "status",
              v: s.armed ? "ARMED · code path live" : "TRIGGERED · cut over",
              mono: true,
            },
          ]}
        >
          <div className="acard">
            <b style={{ color: "var(--warn)" }}>SDK pattern</b>
            <br />
            <span style={{ fontFamily: "var(--mono)", color: "var(--fg-2)" }}>
              if (ks.<span style={{ color: "var(--warn)" }}>tripped</span>(
              <span style={{ color: "var(--accent)" }}>'{s.name}'</span>)) {`{`}
              <br />
              &nbsp;&nbsp;return <span style={{ color: "var(--accent)" }}>fallback()</span>
              <br />
              {`}`}
            </span>
          </div>
        </AsideRows>
      );
    },
  };
}

function KsDetails({ s, set }) {
  const nameOk = /^[a-z][a-z0-9_]+$/.test(s.name);
  return (
    <div className="cc-card">
      <CfRow
        label="key"
        req
        hint={
          <span>
            Frozen after publish. <code>ks.tripped('{s.name || "…"}')</code>
          </span>
        }
      >
        <NameInput
          value={s.name}
          onChange={(v) => set({ name: v })}
          prefix="ks/"
          placeholder="checkout_v3_emergency_off"
          valid={nameOk}
        />
      </CfRow>
      <CfRow
        label="description"
        hint={<span>What this disables and the symptom that should trip it.</span>}
      >
        <textarea
          className="ed-textarea"
          value={s.description}
          onChange={(e) => set({ description: e.target.value })}
        />
      </CfRow>
      <CfRow label="escalate to" hint={<span>The teammate paged when this fires.</span>}>
        <div style={{ maxWidth: 360 }}>
          <OwnerSelect value={s.escalateTo} onChange={(v) => set({ escalateTo: v })} />
        </div>
      </CfRow>
    </div>
  );
}

const KS_SCOPES = [
  { k: "feature", Icon: IconZap, name: "Feature", ds: "A specific feature key. Most common." },
  { k: "route", Icon: IconGlobe, name: "Route", ds: "An API route pattern, e.g. /v2/orders/*" },
  {
    k: "region",
    Icon: IconMapPin,
    name: "Region",
    ds: "Geographic region or POP, e.g. eu-west-1.",
  },
  { k: "segment", Icon: IconUsers, name: "Segment", ds: "A user segment (premium, internal, …)." },
];
const KS_FALLBACKS = [
  {
    k: "return_v2",
    name: "Return previous version",
    ds: "Cut over to the previously-shipped code path.",
  },
  {
    k: "static_value",
    name: "Static fallback value",
    ds: "Serve a hard-coded value (config flag).",
  },
  {
    k: "empty_response",
    name: "Empty response · 503",
    ds: "Return 503; client retries on its own schedule.",
  },
  { k: "silent_no_op", name: "Silent no-op", ds: "Skip the wired call; client unaffected." },
];

function KsScope({ s, set }) {
  return (
    <>
      <div className="cc-card">
        <div className="cc-hd">
          <div className="ttl">Scope</div>
          <span className="sub">where this killswitch lives</span>
        </div>
        <div style={{ padding: 14 }}>
          <div className="scope-grid">
            {KS_SCOPES.map((sc) => {
              const I = sc.Icon;
              const active = s.scope === sc.k;
              return (
                <div
                  key={sc.k}
                  className={"scope-card" + (active ? " active" : "")}
                  onClick={() => set({ scope: sc.k })}
                >
                  <div className="icn">
                    <I size={15} />
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div className="nm">{sc.name}</div>
                    <div className="ds">{sc.ds}</div>
                  </div>
                  <div className="ck">{active && <IconCheck size={10} />}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="cc-card">
        <CfRow
          label="target"
          req
          hint={<span>The exact identifier this killswitch trips. Pattern depends on scope.</span>}
        >
          <div className="ed-input mono">
            <input
              value={s.target}
              onChange={(e) => set({ target: e.target.value })}
              placeholder={
                s.scope === "feature"
                  ? "checkout.v3"
                  : s.scope === "route"
                    ? "/v2/orders/*"
                    : s.scope === "region"
                      ? "eu-west-1"
                      : "premium_users"
              }
            />
          </div>
        </CfRow>
        <CfRow
          label="fallback"
          req
          hint={<span>What the SDK does when this killswitch is tripped.</span>}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {KS_FALLBACKS.map((f) => {
              const active = s.fallback === f.k;
              return (
                <div
                  key={f.k}
                  onClick={() => set({ fallback: f.k })}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "9px 12px",
                    background: active
                      ? "color-mix(in oklab,var(--accent) 8%,var(--bg-2))"
                      : "var(--bg-2)",
                    border:
                      "1px solid " +
                      (active
                        ? "color-mix(in oklab,var(--accent) 40%,var(--line-2))"
                        : "var(--line-2)"),
                    borderRadius: "var(--r-md)",
                    cursor: "default",
                  }}
                >
                  <div
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: 50,
                      border: "1.5px solid " + (active ? "var(--accent)" : "var(--line-3)"),
                      background: active ? "var(--accent)" : "var(--bg-1)",
                      display: "grid",
                      placeItems: "center",
                      flexShrink: 0,
                    }}
                  >
                    {active && <IconCheck size={9} style={{ color: "var(--accent-fg)" }} />}
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 12.5, color: "var(--fg)", fontWeight: 500 }}>
                      {f.name}
                    </div>
                    <div style={{ fontSize: 11.5, color: "var(--fg-3)", marginTop: 1 }}>{f.ds}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </CfRow>
      </div>
      <Banner kind="warn" icon={<IconShield size={13} />} title="Killswitches default to ARMED">
        Once created, this killswitch is live in the SDK. Tripping it is one click from the
        killswitch detail; reverting takes a 5-minute cooldown.
      </Banner>
    </>
  );
}

function KsIntegrate({ s }) {
  const ts = `import { shipeasy } from '@shipeasy/sdk';

// Wrap the code path you want to be able to kill in <50ms.
if (await shipeasy.killswitch('${s.name}').tripped()) {
  // fallback: ${s.fallback}
  return ${
    s.fallback === "return_v2"
      ? "renderPreviousVersion()"
      : s.fallback === "static_value"
        ? "STATIC_FALLBACK"
        : s.fallback === "empty_response"
          ? "response.status(503).end()"
          : "/* no-op */"
  };
}

// Normal code path
return shipNewBehavior();`;
  const py = `from shipeasy import client

if client.killswitch("${s.name}").tripped():
    # fallback: ${s.fallback}
    return ${
      s.fallback === "return_v2"
        ? "render_previous_version()"
        : s.fallback === "static_value"
          ? "STATIC_FALLBACK"
          : s.fallback === "empty_response"
            ? "abort(503)"
            : "None"
    }

return ship_new_behavior()`;
  const go = `tripped, _ := shipeasy.Killswitch(ctx, "${s.name}")

if tripped {
    // fallback: ${s.fallback}
    return ${
      s.fallback === "return_v2"
        ? "renderPreviousVersion()"
        : s.fallback === "static_value"
          ? "staticFallback"
          : s.fallback === "empty_response"
            ? "http.StatusServiceUnavailable"
            : "nil"
    }
}

return shipNewBehavior()`;
  const curl = `curl -H "Authorization: Bearer $SHIPEASY_KEY" \\
  https://api.shipeasy.dev/v1/killswitches/${encodeURIComponent(s.name || "")}/state`;

  return (
    <>
      <IntegrateSummary
        items={[
          { k: "key", v: s.name, mono: true },
          { k: "scope", v: `${s.scope} → ${s.target}`, mono: true },
          { k: "fallback", v: s.fallback, mono: true, dim: true },
          { k: "state", v: "ARMED · live in SDK", mono: true },
        ]}
      />
      <CodeSnippets
        snippets={{ ts, py, go, curl }}
        defaultLang="ts"
        extraNote={
          <>
            Cached locally with 5s TTL. The trip propagates to all SDK instances within one TTL
            window.
          </>
        }
      />
      <Banner
        kind="warn"
        icon={<IconShield size={13} />}
        title="Killswitch becomes live on publish"
      >
        Tripping it from the killswitch detail is a single click — 5-minute revert cooldown.
      </Banner>
    </>
  );
}

/* ────────────────────────────────────────────────────────────
   FLOW · METRICS — 4 steps
   ──────────────────────────────────────────────────────────── */
const EVENT_CATALOG = [
  { name: "checkout.completed", kind: "conversion", vol: "42k/day" },
  { name: "order.placed", kind: "conversion", vol: "24k/day" },
  { name: "order.value", kind: "value", vol: "24k/day · sum on .amount" },
  { name: "page.load_ms", kind: "value", vol: "2.1M/day · ms" },
  { name: "api.p95_latency_ms", kind: "value", vol: "8.4M/day · ms" },
  { name: "signup.completed", kind: "conversion", vol: "1.2k/day" },
  { name: "session.length_s", kind: "value", vol: "live · s" },
  { name: "feed.scroll_jank_p95", kind: "value", vol: "live · ms" },
];
const METRIC_AGG = [
  ["count_users", "count_users — 1 per user · conversion"],
  ["count_events", "count_events — how many times event fired"],
  ["sum", "sum — sum of value path · revenue, points"],
  ["avg", "avg — mean · load time, durations"],
  ["retention_7d", "retention_7d — active on D+7"],
  ["retention_30d", "retention_30d — active on D+30"],
];

function buildMetricsFlow() {
  return {
    initialState: {
      name: "checkout.aov",
      description:
        "Average order value at the moment of checkout.completed. Used as a secondary in pricing experiments.",
      event: "order.value",
      agg: "avg",
      valuePath: "amount",
      direction: "higher",
      winsor: 99,
      winsorOn: true,
      unit: "USD",
    },
    steps: [
      {
        k: "details",
        label: "Details",
        title: "Identify the metric",
        validate: (s) => /^[a-z][a-z0-9_.]+$/.test(s.name),
      },
      { k: "source", label: "Source", title: "Pick a source event", validate: (s) => !!s.event },
      { k: "shape", label: "Aggregation", title: "Aggregation & shape", validate: (s) => !!s.agg },
      { k: "integrate", label: "Integrate", title: "Wire it up", validate: () => true },
    ],
    render(k, s, set) {
      if (k === "details") return <MetricDetails s={s} set={set} />;
      if (k === "source") return <MetricSource s={s} set={set} />;
      if (k === "shape") return <MetricShape s={s} set={set} />;
      return <MetricIntegrate s={s} />;
    },
    aside(k, s) {
      return (
        <AsideRows
          title="this metric"
          rows={[
            { k: "name", v: s.name, mono: true },
            { k: "source", v: s.event, mono: true },
            { k: "agg", v: s.agg, mono: true },
            {
              k: "direction",
              v: s.direction === "higher" ? "higher is better" : "lower is better",
              dim: true,
            },
            { k: "unit", v: s.unit, mono: true },
          ]}
        >
          <div className="acard">
            <b style={{ color: "var(--fg)" }}>Reads as</b>
            <br />
            <span style={{ fontFamily: "var(--mono)", color: "var(--fg-2)" }}>
              metric:<span style={{ color: "var(--accent)" }}>{s.name}</span>{" "}
              <span style={{ color: "var(--purple)" }}>={">"}</span>{" "}
              <span style={{ color: "var(--warn)" }}>{s.agg}</span>({s.event}
              {["sum", "avg"].includes(s.agg) ? "." + s.valuePath : ""})
            </span>
          </div>
        </AsideRows>
      );
    },
  };
}

function MetricDetails({ s, set }) {
  const nameOk = /^[a-z][a-z0-9_.]+$/.test(s.name);
  return (
    <div className="cc-card">
      <CfRow
        label="name"
        req
        hint={<span>Dotted, lowercase. Shown in chart titles + experiment metric pickers.</span>}
      >
        <NameInput
          value={s.name}
          onChange={(v) => set({ name: v })}
          prefix="metrics/"
          placeholder="checkout.aov"
          valid={nameOk}
        />
      </CfRow>
      <CfRow
        label="description"
        hint={<span>Plain English. What this measures and when to use it.</span>}
      >
        <textarea
          className="ed-textarea"
          value={s.description}
          onChange={(e) => set({ description: e.target.value })}
        />
      </CfRow>
      <CfRow label="unit" hint={<span>Display unit. Used to format the chart axis.</span>}>
        <div style={{ maxWidth: 200 }}>
          <CSelect
            value={s.unit}
            options={["USD", "count", "ms", "seconds", "percent", "points"].map((u) => ({
              v: u,
              label: u,
            }))}
            onChange={(v) => set({ unit: v })}
            size="md"
          />
        </div>
      </CfRow>
    </div>
  );
}

function MetricSource({ s, set }) {
  const [filter, setFilter] = wzState("");
  const list = EVENT_CATALOG.filter((e) => !filter || e.name.includes(filter));
  return (
    <>
      <div className="cc-card">
        <div className="cc-hd">
          <div className="ttl">Pick a source event</div>
          <span className="sub">from the project's event catalog</span>
        </div>
        <div style={{ padding: 14 }}>
          <div className="ev-pick">
            <div className="ev-search">
              <IconSearch size={11} style={{ color: "var(--fg-3)" }} />
              <input
                placeholder="Search events…"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              />
            </div>
            <div className="ev-list">
              {list.map((e) => (
                <div
                  key={e.name}
                  className={"ev-row " + e.kind + (s.event === e.name ? " active" : "")}
                  onClick={() => set({ event: e.name })}
                >
                  <span className="dot" />
                  <span className="nm">{e.name}</span>
                  <span className="vl">{e.vol}</span>
                  <span className="ck">{s.event === e.name && <IconCheck size={11} />}</span>
                </div>
              ))}
              {filter && !list.find((e) => e.name === filter) && (
                <div
                  className="ev-row"
                  onClick={() => set({ event: filter })}
                  style={{ background: "color-mix(in oklab,var(--warn) 10%,transparent)" }}
                >
                  <IconPlus size={11} style={{ color: "var(--warn)" }} />
                  <span className="nm" style={{ color: "var(--warn)" }}>
                    {filter}
                  </span>
                  <span className="vl" style={{ color: "var(--warn)" }}>
                    pending — register later
                  </span>
                  <span className="ck" />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <Banner kind="info" icon={<IconDatabase size={13} />}>
        Don't see your event? Pick "pending" — the metric registers as soon as the event first
        fires.
      </Banner>
    </>
  );
}

function MetricShape({ s, set }) {
  const needsPath = ["sum", "avg"].includes(s.agg);
  return (
    <>
      <div className="cc-card">
        <CfRow
          label="aggregation"
          req
          hint={
            <span>
              How rows of <code>{s.event}</code> roll up into the metric value.
            </span>
          }
        >
          <div style={{ maxWidth: 420 }}>
            <CSelect
              value={s.agg}
              options={METRIC_AGG.map(([v, l]) => ({ v, label: l }))}
              onChange={(v) => set({ agg: v })}
              size="md"
              mono
            />
          </div>
        </CfRow>
        {needsPath && (
          <CfRow
            label="value path"
            req
            hint={
              <span>
                Path on the event payload. e.g. <code>amount</code>, <code>ms</code>.
              </span>
            }
          >
            <div className="ed-input mono" style={{ maxWidth: 420 }}>
              <span className="pre">event.props.</span>
              <input value={s.valuePath} onChange={(e) => set({ valuePath: e.target.value })} />
            </div>
          </CfRow>
        )}
        <CfRow
          label="direction"
          hint={<span>Determines whether positive lift counts as a win.</span>}
        >
          <div style={{ display: "flex", gap: 8 }}>
            <button
              className={
                "btn " + (s.direction === "higher" ? "btn-secondary" : "btn-ghost") + " btn-sm"
              }
              onClick={() => set({ direction: "higher" })}
            >
              <IconTrendUp size={11} /> Higher is better
            </button>
            <button
              className={
                "btn " + (s.direction === "lower" ? "btn-secondary" : "btn-ghost") + " btn-sm"
              }
              onClick={() => set({ direction: "lower" })}
            >
              <IconTrendDown size={11} /> Lower is better
            </button>
          </div>
        </CfRow>
        <CfRow
          label="winsorize"
          hint={
            <span>
              Cap outliers at a percentile to keep noisy tails from drowning out the signal.
            </span>
          }
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span
              className={"toggle " + (s.winsorOn ? "on" : "")}
              style={{ width: 32, height: 18 }}
              onClick={() => set({ winsorOn: !s.winsorOn })}
            />
            {s.winsorOn && (
              <>
                <input
                  type="range"
                  min="80"
                  max="99"
                  value={s.winsor}
                  onChange={(e) => set({ winsor: +e.target.value })}
                  style={{ flex: 1, maxWidth: 240, accentColor: "var(--accent)" }}
                />
                <div className="ed-input sm mono" style={{ width: 80 }}>
                  <input
                    value={s.winsor}
                    onChange={(e) =>
                      set({ winsor: Math.max(50, Math.min(99, +e.target.value || 99)) })
                    }
                  />
                  <span className="pre">pct</span>
                </div>
              </>
            )}
          </div>
        </CfRow>
      </div>
    </>
  );
}

function MetricIntegrate({ s }) {
  const needsPath = ["sum", "avg"].includes(s.agg);
  const exampleProps = needsPath ? `{ ${s.valuePath}: 24.99 }` : "{}";
  const ts = `import { shipeasy } from '@shipeasy/sdk';

// Fire whenever the underlying event happens.
// Shipeasy rolls it up as ${s.agg}${needsPath ? "(" + s.valuePath + ")" : ""} on the metric '${s.name}'.
shipeasy.track('${s.event}', {
  user_id: ctx.user.id,
  props: ${exampleProps},
});`;
  const py = `from shipeasy import client

client.track(
    event="${s.event}",
    user_id=ctx.user.id,
    props=${needsPath ? `{"${s.valuePath}": 24.99}` : "{}"},
)`;
  const go = `shipeasy.Track(ctx, "${s.event}", &shipeasy.TrackOpts{
    UserID: ctx.User.ID,
    Props:  map[string]any${needsPath ? `{"${s.valuePath}": 24.99}` : "{}"},
})`;
  const curl = `curl -H "Authorization: Bearer $SHIPEASY_KEY" \\
  -H "Content-Type: application/json" \\
  -X POST https://api.shipeasy.dev/v1/events \\
  -d '{ "event": "${s.event}", "user_id": "u_123", "props": ${exampleProps.replace(/'/g, '"')} }'`;

  return (
    <>
      <IntegrateSummary
        items={[
          { k: "name", v: s.name, mono: true },
          { k: "source", v: s.event, mono: true },
          { k: "agg", v: s.agg + (needsPath ? "·" + s.valuePath : ""), mono: true },
          {
            k: "dir",
            v: (s.direction === "higher" ? "↑ higher" : "↓ lower") + " · " + s.unit,
            mono: true,
            dim: true,
          },
        ]}
      />
      <CodeSnippets
        snippets={{ ts, py, go, curl }}
        defaultLang="ts"
        extraNote={
          <>
            Once registered, this metric appears in the experiment metric picker for goal ·
            guardrail · secondary slots.
          </>
        }
      />
    </>
  );
}

/* ────────────────────────────────────────────────────────────
   FLOW · EXPERIMENTS — 5 steps (longest)
   ──────────────────────────────────────────────────────────── */
const VARIANT_COLORS = ["#7c5cff", "#22a06b", "#74c7ec", "#ff8445", "#f59e0b"];

const EXP_PROFILES = [
  {
    k: "conversion",
    Icon: IconTarget,
    name: "Conversion",
    desc: "count_users + a goal event",
    seed: { goal: "checkout.completed" },
  },
  {
    k: "revenue",
    Icon: IconChart,
    name: "Revenue",
    desc: "sum on .amount · winsorized",
    seed: { goal: "order.value" },
  },
  {
    k: "retention",
    Icon: IconActivity,
    name: "Retention",
    desc: "retention_7d / 30d",
    seed: { goal: "signup.completed" },
  },
  {
    k: "performance",
    Icon: IconCpu,
    name: "Performance",
    desc: "avg latency · p95 guard",
    seed: { goal: "api.p95_latency_ms" },
  },
  {
    k: "onboarding",
    Icon: IconRocket,
    name: "Onboarding",
    desc: "count_users · activation",
    seed: { goal: "signup.completed" },
  },
];

function buildExperimentsFlow() {
  return {
    initialState: {
      name: "three-step-checkout",
      profile: "conversion",
      question: "Does a three-step checkout improve completion over the single-page form?",
      universe: "web-users",
      alloc: 50,
      variants: [
        { name: "control", weight: 50 },
        { name: "three_step", weight: 50 },
      ],
      goal: "checkout.completed",
      guardrails: ["api.p95_latency_ms", "order.refund_rate"],
      secondaries: ["checkout.aov", "session.length_s"],
      mde: 2.5,
      alpha: 0.05,
      baseline: 50,
    },
    steps: [
      {
        k: "basics",
        label: "Basics",
        title: "Hypothesis & basics",
        validate: (s) => /^[a-z][a-z0-9-]+$/.test(s.name) && s.question.length > 10,
      },
      {
        k: "audience",
        label: "Audience",
        title: "Universe & allocation",
        validate: (s) => !!s.universe,
      },
      {
        k: "variants",
        label: "Variants",
        title: "Variants & weights",
        validate: (s) => Math.abs(s.variants.reduce((a, v) => a + v.weight, 0) - 100) < 0.01,
      },
      { k: "metrics", label: "Metrics", title: "Goal & guardrails", validate: (s) => !!s.goal },
      { k: "integrate", label: "Integrate", title: "Wire it up", validate: () => true },
    ],
    render(k, s, set) {
      if (k === "basics") return <ExpBasics s={s} set={set} />;
      if (k === "audience") return <ExpAudience s={s} set={set} />;
      if (k === "variants") return <ExpVariants s={s} set={set} />;
      if (k === "metrics") return <ExpMetrics s={s} set={set} />;
      return <ExpIntegrate s={s} />;
    },
    aside(k, s) {
      const total = s.variants.reduce((a, v) => a + v.weight, 0);
      return (
        <AsideRows
          title="this experiment"
          rows={[
            { k: "slug", v: s.name, mono: true },
            { k: "universe", v: s.universe, mono: true },
            { k: "alloc", v: `${s.alloc}% of universe`, mono: true },
            {
              k: "variants",
              v: `${s.variants.length} · weights sum ${total}`,
              mono: true,
              dim: Math.abs(total - 100) > 0.01,
            },
            { k: "goal", v: s.goal, mono: true },
            { k: "mde", v: `${s.mde}% (α=${s.alpha})`, mono: true, dim: true },
          ]}
        >
          <div className="acard">
            <b style={{ color: "var(--fg)" }}>Variant split</b>
            <div className="alloc-bar" style={{ marginTop: 6, height: 10 }}>
              {s.variants.map((v, i) => (
                <div
                  key={v.name}
                  className="seg"
                  style={{
                    width: `${(v.weight / total) * 100}%`,
                    background: VARIANT_COLORS[i % VARIANT_COLORS.length],
                  }}
                />
              ))}
            </div>
            <div
              style={{
                marginTop: 6,
                display: "flex",
                flexWrap: "wrap",
                gap: 7,
                fontFamily: "var(--mono)",
                fontSize: 10.5,
                color: "var(--fg-3)",
              }}
            >
              {s.variants.map((v, i) => (
                <span key={v.name} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <i
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: 2,
                      background: VARIANT_COLORS[i % VARIANT_COLORS.length],
                    }}
                  />
                  {v.name}·{v.weight}%
                </span>
              ))}
            </div>
          </div>
        </AsideRows>
      );
    },
  };
}

function ExpBasics({ s, set }) {
  const slugOk = /^[a-z][a-z0-9-]+$/.test(s.name);
  return (
    <>
      <div className="cc-card">
        <div className="cc-hd">
          <div className="ttl">Quick-setup profile</div>
          <span className="sub">pre-fills aggregation + goal</span>
        </div>
        <div style={{ padding: 14 }}>
          <div className="profile-tiles">
            {EXP_PROFILES.map((p) => {
              const I = p.Icon;
              return (
                <div
                  key={p.k}
                  className={"profile-tile" + (s.profile === p.k ? " active" : "")}
                  onClick={() => set({ profile: p.k, ...p.seed })}
                >
                  <I size={14} className="ico" />
                  <div className="name">{p.name}</div>
                  <div className="desc">{p.desc}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="cc-card">
        <CfRow label="slug" req hint={<span>Kebab-case. Frozen after publish.</span>}>
          <NameInput
            value={s.name}
            onChange={(v) => set({ name: v.replace(/_/g, "-") })}
            prefix="experiments/"
            placeholder="three-step-checkout"
            valid={slugOk}
          />
        </CfRow>
        <CfRow
          label="question"
          req
          hint={<span>One sentence ending in a question mark. The hypothesis is implicit.</span>}
        >
          <textarea
            className="ed-textarea"
            value={s.question}
            onChange={(e) => set({ question: e.target.value })}
          />
        </CfRow>
      </div>
    </>
  );
}

const UNIVERSES = [
  {
    v: "web-users",
    label: "web-users",
    meta: "unit · user_id · holdout 5%",
    holdout: 5,
    icon: <IconGlobe size={11} style={{ color: "var(--info)" }} />,
  },
  {
    v: "mobile-users",
    label: "mobile-users",
    meta: "unit · user_id · holdout 10%",
    holdout: 10,
    icon: <IconSmartphone size={11} style={{ color: "var(--accent)" }} />,
  },
  {
    v: "paid-customers",
    label: "paid-customers",
    meta: "unit · customer_id · holdout 2%",
    holdout: 2,
    icon: <IconCreditCard size={11} style={{ color: "var(--warn)" }} />,
  },
  {
    v: "devices",
    label: "devices",
    meta: "unit · device_id · holdout 10%",
    holdout: 10,
    icon: <IconCpu size={11} style={{ color: "var(--purple)" }} />,
  },
];

function ExpAudience({ s, set }) {
  const u = UNIVERSES.find((x) => x.v === s.universe) || UNIVERSES[0];
  const allocSlice = s.alloc;
  // Visual segments: holdout | allocated test | rest of universe
  return (
    <>
      <div className="cc-card">
        <CfRow
          label="universe"
          req
          hint={
            <span>
              Defines the unit (user_id / device_id), reserved holdout, and hash version. Frozen
              after publish.
            </span>
          }
        >
          <div style={{ maxWidth: 420 }}>
            <CSelect
              value={s.universe}
              options={UNIVERSES}
              onChange={(v) => set({ universe: v })}
              size="md"
              mono
            />
          </div>
        </CfRow>
        <CfRow
          label="allocation"
          hint={<span>What share of the universe is eligible for this experiment.</span>}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14, maxWidth: 520 }}>
            <input
              type="range"
              min="5"
              max="100"
              step="5"
              value={s.alloc}
              onChange={(e) => set({ alloc: +e.target.value })}
              style={{ flex: 1, accentColor: "var(--accent)" }}
            />
            <div className="ed-input sm mono" style={{ width: 90 }}>
              <input
                value={s.alloc}
                onChange={(e) => set({ alloc: Math.max(1, Math.min(100, +e.target.value || 0)) })}
              />
              <span className="pre">%</span>
            </div>
          </div>

          <div className="holdout-preview">
            <div className="holdout-bar">
              {/* Holdout sits at the start of the universe (sticky slots 0–holdout%) */}
              <div className="band" style={{ left: "0%", width: `${u.holdout}%` }} />
              {/* Allocated experiment slice — sits after the holdout */}
              <div
                className="alloc-band"
                style={{
                  left: `${u.holdout}%`,
                  width: `${Math.max(0, allocSlice - u.holdout)}%`,
                }}
              />
            </div>
            <div className="holdout-readout">
              <span>
                <i style={{ background: "color-mix(in oklab,var(--warn) 50%,transparent)" }} />
                <b style={{ color: "var(--warn)" }}>{u.holdout}%</b> universe holdout
              </span>
              <span>
                <i style={{ background: "color-mix(in oklab,var(--accent) 50%,transparent)" }} />
                <b>{Math.max(0, allocSlice - u.holdout)}%</b> in this experiment
              </span>
              <span>
                <i style={{ background: "var(--bg-3)" }} />
                <b>{Math.max(0, 100 - allocSlice)}%</b> not allocated
              </span>
            </div>
          </div>
        </CfRow>
        <CfRow
          label="targeting"
          hint={<span>Optional: a gate that further narrows eligibility.</span>}
        >
          <div style={{ maxWidth: 420 }}>
            <CSelect
              value=""
              placeholder="(no gate — full universe)"
              options={[
                { v: "", label: "(no gate — full universe)" },
                {
                  v: "mobile_only",
                  label: "mobile_only",
                  meta: "device.type = mobile",
                  icon: <IconShield size={11} style={{ color: "var(--info)" }} />,
                },
                {
                  v: "us_eu_new_users",
                  label: "us_eu_new_users",
                  meta: "country IN [US,CA,UK,DE,FR]",
                  icon: <IconShield size={11} style={{ color: "var(--accent)" }} />,
                },
              ]}
              onChange={() => {}}
              size="md"
            />
          </div>
        </CfRow>
      </div>
    </>
  );
}

function ExpVariants({ s, set }) {
  const total = s.variants.reduce((a, v) => a + v.weight, 0);
  const set1 = (i, k, v) =>
    set({ variants: s.variants.map((x, j) => (j === i ? { ...x, [k]: v } : x)) });
  const add = () =>
    set({ variants: [...s.variants, { name: `test_${s.variants.length}`, weight: 0 }] });
  const rm = (i) => set({ variants: s.variants.filter((_, j) => j !== i) });
  const even = () => {
    const w = Math.floor(100 / s.variants.length);
    const rem = 100 - w * s.variants.length;
    set({ variants: s.variants.map((v, i) => ({ ...v, weight: w + (i === 0 ? rem : 0) })) });
  };
  return (
    <>
      <div className="cc-card">
        <div className="cc-hd">
          <div className="ttl">Variants</div>
          <span className="sub">first row is control · weights sum to 100</span>
          <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
            <button className="btn btn-ghost btn-sm" onClick={even}>
              <IconAlignCenter size={11} /> Even split
            </button>
            <button className="btn btn-ghost btn-sm" onClick={add}>
              <IconPlus size={11} /> Add variant
            </button>
          </div>
        </div>
        <div style={{ padding: 14 }}>
          {s.variants.map((v, i) => (
            <div className="var-row" key={i}>
              <span
                className="swatch"
                style={{ background: VARIANT_COLORS[i % VARIANT_COLORS.length] }}
              />
              <div className="ed-input sm mono">
                <input
                  value={v.name}
                  onChange={(e) =>
                    set1(i, "name", e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))
                  }
                />
              </div>
              <div className="alloc">
                <input
                  type="number"
                  value={v.weight}
                  min="0"
                  max="100"
                  onChange={(e) =>
                    set1(i, "weight", Math.max(0, Math.min(100, +e.target.value || 0)))
                  }
                  style={{
                    all: "unset",
                    width: "52px",
                    background: "var(--bg-2)",
                    border: "1px solid var(--line-2)",
                    padding: "5px 8px",
                    borderRadius: 6,
                    fontFamily: "var(--mono)",
                    fontSize: 12,
                    color: "var(--fg)",
                    textAlign: "right",
                  }}
                />
                <span>%</span>
              </div>
              {s.variants.length > 1 ? (
                <span className="rm" onClick={() => rm(i)}>
                  <IconX size={12} />
                </span>
              ) : (
                <span />
              )}
            </div>
          ))}
          <div className="alloc-bar" style={{ marginTop: 12, height: 18 }}>
            {s.variants.map((v, i) => (
              <div
                key={v.name}
                className="seg"
                style={{
                  width: `${(v.weight / (total || 1)) * 100}%`,
                  background: VARIANT_COLORS[i % VARIANT_COLORS.length],
                }}
              />
            ))}
          </div>
          {Math.abs(total - 100) > 0.01 && (
            <Banner kind="warn" icon={<IconAlertTriangle size={13} />}>
              Weights sum to <b>{total}</b>%. Must sum to 100 before you can publish.
            </Banner>
          )}
        </div>
      </div>
    </>
  );
}

function ExpMetrics({ s, set }) {
  const toggleGuard = (m) =>
    set({
      guardrails: s.guardrails.includes(m)
        ? s.guardrails.filter((x) => x !== m)
        : [...s.guardrails, m],
    });
  const toggleSec = (m) =>
    set({
      secondaries: (s.secondaries || []).includes(m)
        ? (s.secondaries || []).filter((x) => x !== m)
        : [...(s.secondaries || []), m],
    });
  const aggOf = (name) =>
    EVENT_CATALOG.find((e) => e.name === name)?.kind === "value" ? "sum" : "count_users";
  const usersNeeded = Math.ceil(7800 / (s.mde * s.mde));
  const daysNeeded = Math.ceil((usersNeeded * s.variants.length) / ((240 * s.alloc) / 100));

  return (
    <>
      {/* Goal */}
      <div className="role-card goal">
        <div className="head">
          <IconTarget size={13} style={{ color: "var(--accent)" }} />
          <b>Goal</b>
          <span className="badge">primary</span>
          <span style={{ flex: 1, fontSize: 11.5, color: "var(--fg-3)" }}>
            must improve significantly for the experiment to ship
          </span>
          <div style={{ maxWidth: 220 }}>
            <CSelect
              value={s.goal}
              options={EVENT_CATALOG.map((e) => ({
                v: e.name,
                label: e.name,
                meta: e.vol,
                icon: (
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 50,
                      background: e.kind === "conversion" ? "var(--accent)" : "var(--info)",
                    }}
                  />
                ),
              }))}
              onChange={(v) => set({ goal: v })}
              size="sm"
              mono
            />
          </div>
        </div>
        <div className="chip-row">
          <div className="metric-chip goal">
            <IconTarget size={11} style={{ color: "var(--accent)" }} />
            {s.goal}
            <span className="agg">{aggOf(s.goal)}</span>
          </div>
        </div>
      </div>

      {/* Guardrails */}
      <div className="role-card guard">
        <div className="head">
          <IconShield size={13} style={{ color: "var(--warn)" }} />
          <b>Guardrails</b>
          <span className="badge">block-ship</span>
          <span style={{ flex: 1, fontSize: 11.5, color: "var(--fg-3)" }}>
            any significant regression blocks ship
          </span>
        </div>
        <div className="chip-row">
          {s.guardrails.length === 0 && (
            <div className="metric-chip empty">add a guardrail to protect against regressions</div>
          )}
          {s.guardrails.map((g) => (
            <div key={g} className="metric-chip guard">
              <IconShield size={11} style={{ color: "var(--warn)" }} />
              {g}
              <span className="agg">{aggOf(g)}</span>
              <span className="x" onClick={() => toggleGuard(g)}>
                <IconX size={10} />
              </span>
            </div>
          ))}
          {EVENT_CATALOG.filter((e) => !s.guardrails.includes(e.name) && e.name !== s.goal)
            .slice(0, 3)
            .map((e) => (
              <div
                key={e.name}
                className="metric-chip"
                onClick={() => toggleGuard(e.name)}
                style={{ borderStyle: "dashed", color: "var(--fg-4)" }}
              >
                <IconPlus size={10} /> {e.name}
              </div>
            ))}
        </div>
      </div>

      {/* Secondaries */}
      <div className="role-card sec">
        <div className="head">
          <IconChart size={13} style={{ color: "var(--info)" }} />
          <b>Secondaries</b>
          <span className="badge">informational</span>
          <span style={{ flex: 1, fontSize: 11.5, color: "var(--fg-3)" }}>
            does not affect the verdict
          </span>
        </div>
        <div className="chip-row">
          {(s.secondaries || []).map((m) => (
            <div key={m} className="metric-chip sec">
              <IconChart size={11} style={{ color: "var(--info)" }} />
              {m}
              <span className="agg">{aggOf(m)}</span>
              <span className="x" onClick={() => toggleSec(m)}>
                <IconX size={10} />
              </span>
            </div>
          ))}
          {EVENT_CATALOG.filter(
            (e) =>
              !(s.secondaries || []).includes(e.name) &&
              e.name !== s.goal &&
              !s.guardrails.includes(e.name),
          )
            .slice(0, 3)
            .map((e) => (
              <div
                key={e.name}
                className="metric-chip"
                onClick={() => toggleSec(e.name)}
                style={{ borderStyle: "dashed", color: "var(--fg-4)" }}
              >
                <IconPlus size={10} /> {e.name}
              </div>
            ))}
        </div>
      </div>

      {/* Power calc */}
      <div className="cc-card">
        <div className="cc-hd">
          <div className="ttl">Power estimate</div>
          <span className="sub">α {s.alpha} · power 0.80</span>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontFamily: "var(--mono)", fontSize: 10.5, color: "var(--fg-3)" }}>
              MDE
            </span>
            <input
              type="range"
              min="0.5"
              max="20"
              step="0.5"
              value={s.mde}
              onChange={(e) => set({ mde: +e.target.value })}
              style={{ width: 140, accentColor: "var(--accent)" }}
            />
            <div className="ed-input sm mono" style={{ width: 74 }}>
              <input
                value={s.mde}
                onChange={(e) => set({ mde: Math.max(0.1, Math.min(50, +e.target.value || 1)) })}
              />
              <span className="pre">%</span>
            </div>
          </div>
        </div>
        <div style={{ padding: 12 }}>
          <div className="power-grid">
            <div className="power-stat">
              <div className="k">baseline</div>
              <div className="v">{s.baseline}%</div>
              <div className="d">historical · last 30d</div>
            </div>
            <div className="power-stat">
              <div className="k">users / variant</div>
              <div className="v">{usersNeeded.toLocaleString()}</div>
              <div className="d">for {s.mde}% lift</div>
            </div>
            <div className="power-stat">
              <div className="k">runtime</div>
              <div className={"v " + (daysNeeded > 21 ? "warn" : daysNeeded <= 14 ? "ok" : "")}>
                {daysNeeded}d
              </div>
              <div className="d">at current traffic</div>
            </div>
            <div className="power-stat">
              <div className="k">in-test users</div>
              <div className="v">{(((240 * s.alloc) / 100) * daysNeeded).toLocaleString()}</div>
              <div className="d">{s.alloc}% of universe / day</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function ExpIntegrate({ s }) {
  const testVariant = s.variants.find((v) => v.name !== "control")?.name || "test";
  const ts = `import { shipeasy } from '@shipeasy/sdk';

// Read the experiment for this user once at request time.
const exp = await shipeasy.experiments.get('${s.name}', {
  user_id:    ctx.user.id,
  attributes: ctx.user.attributes,
});

if (exp.variant === '${testVariant}') {
  renderVariant(exp.params);
} else {
  renderControl(exp.params);
}

// Fire the goal metric event when it happens — same as you normally would.
shipeasy.track('${s.goal}', { user_id: ctx.user.id });`;
  const py = `from shipeasy import client

exp = client.experiments.get(
    "${s.name}",
    user_id=ctx.user.id,
    attributes=ctx.user.attributes,
)

if exp.variant == "${testVariant}":
    render_variant(exp.params)
else:
    render_control(exp.params)

client.track("${s.goal}", user_id=ctx.user.id)`;
  const go = `exp, _ := shipeasy.Experiments.Get(ctx, "${s.name}", &shipeasy.GetOpts{
    UserID:     ctx.User.ID,
    Attributes: ctx.User.Attributes,
})

if exp.Variant == "${testVariant}" {
    renderVariant(exp.Params)
} else {
    renderControl(exp.Params)
}

shipeasy.Track(ctx, "${s.goal}", ctx.User.ID)`;
  const curl = `curl -H "Authorization: Bearer $SHIPEASY_KEY" \\
  -H "Content-Type: application/json" \\
  -X POST https://api.shipeasy.dev/v1/experiments/${encodeURIComponent(s.name || "")}/assign \\
  -d '{ "user_id": "u_123", "attributes": { "country": "US" } }'`;

  return (
    <>
      <IntegrateSummary
        items={[
          { k: "slug", v: s.name, mono: true },
          { k: "universe", v: s.universe, mono: true },
          { k: "goal", v: s.goal, mono: true },
          {
            k: "variants",
            v: s.variants.map((v) => `${v.name}·${v.weight}%`).join(" · "),
            mono: true,
            dim: true,
          },
        ]}
      />
      <CodeSnippets
        snippets={{ ts, py, go, curl }}
        defaultLang="ts"
        extraNote={
          <>
            Calling <code>experiments.get()</code> on a held-out user returns{" "}
            <code>variant:'holdout'</code> — design your branch to fall through to control in that
            case.
          </>
        }
      />
    </>
  );
}

/* ────────────────────────────────────────────────────────────
   The standardized Wizard Modal shell.
   props: kind ('configs'|'gates'|…), onClose, defaultStep, single (no aside)
   ──────────────────────────────────────────────────────────── */
const FLOW_BUILDERS = {
  configs: buildConfigsFlow,
  gates: buildGatesFlow,
  killswitches: buildKsFlow,
  metrics: buildMetricsFlow,
  experiments: buildExperimentsFlow,
};

function WizardModal({ kind = "configs", defaultStep = 0, onClose, hideAside }) {
  const flow = wzMemo(() => FLOW_BUILDERS[kind](), [kind]);
  const meta = KIND_META[kind];
  const [state, setState] = wzState(flow.initialState);
  const [stepIdx, setStepIdx] = wzState(defaultStep);

  wzEffect(() => {
    setState(flow.initialState);
    setStepIdx(defaultStep);
  }, [kind]);

  const merge = (patch) => setState((prev) => ({ ...prev, ...patch }));
  const total = flow.steps.length;
  const step = flow.steps[stepIdx];
  const stepValid = step.validate(state);
  const isLast = stepIdx === total - 1;
  const KindIcon = meta.Icon;

  return (
    <div
      className="wm-backdrop"
      onMouseDown={(e) => {
        if (e.target.classList.contains("wm-backdrop")) onClose?.();
      }}
    >
      <div className="wm-stage">
        <div className="wm-eyebrow">
          <span>Acme Co.</span>
          <span className="dot" />
          <span>{kind}</span>
          <span className="dot" />
          <span style={{ color: "var(--fg-2)" }}>new</span>
          <span className="esc">
            <kbd>Esc</kbd> to cancel
          </span>
        </div>

        <div className="wm-modal">
          {/* Header — compact, matches the configs-new wiz-head ─ */}
          <div className="wm-head">
            <div className={"ico " + meta.iconClass}>
              <KindIcon size={16} />
            </div>
            <div className="titles">
              <div className="stem">
                Step {stepIdx + 1} of {total} · {meta.label}
              </div>
              <h2>
                {step.title || step.label}
                <span className={"pill-stat " + (stepValid ? "valid" : "draft")}>
                  {stepValid ? (
                    <>
                      <IconCheck size={9} /> valid
                    </>
                  ) : (
                    "incomplete"
                  )}
                </span>
              </h2>
            </div>
            <div className="wiz-stepper compact">
              {flow.steps.map((sp, i) => {
                const cls = i === stepIdx ? "current" : i < stepIdx ? "done" : "";
                return (
                  <React.Fragment key={sp.k}>
                    {i > 0 && <div className={"wiz-conn" + (i <= stepIdx ? " done" : "")} />}
                    <div
                      className={"wiz-step " + cls}
                      onClick={() => setStepIdx(i)}
                      title={sp.title || sp.label}
                    >
                      <span className="num">{i < stepIdx ? <IconCheck size={10} /> : i + 1}</span>
                      <div className="body">
                        <span className="lbl">{sp.label}</span>
                      </div>
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
            <button
              className="btn btn-ghost btn-icon btn-sm x"
              onClick={onClose}
              title="Close (Esc)"
            >
              <IconX size={11} />
            </button>
          </div>

          {/* Body ───────────────────────────────────── */}
          <div className="wm-body">
            <div className={"wm-cols " + (hideAside ? "single" : "")}>
              <div style={{ display: "flex", flexDirection: "column", gap: 12, minWidth: 0 }}>
                {flow.render(step.k, state, merge)}
              </div>
              {!hideAside && <div className="side">{flow.aside(step.k, state)}</div>}
            </div>
          </div>

          {/* Footer ─────────────────────────────────── */}
          <div className="wm-foot">
            <div className="meta">
              <span>
                step <b>{stepIdx + 1}</b>/<b>{total}</b>
              </span>
              <span className="sep">·</span>
              <span>not yet persisted</span>
              <span className="sep">·</span>
              <span>
                <span className="kbd">↵</span> next
              </span>
            </div>
            <div className="acts">
              <button className="btn btn-ghost" onClick={onClose}>
                Cancel
              </button>
              {stepIdx > 0 && (
                <button className="btn btn-secondary" onClick={() => setStepIdx(stepIdx - 1)}>
                  <IconArrowLeft size={11} /> Back
                </button>
              )}
              {!isLast ? (
                <button
                  className="btn btn-primary"
                  disabled={!stepValid}
                  onClick={() => setStepIdx(stepIdx + 1)}
                >
                  Next · {flow.steps[stepIdx + 1].label} <IconArrowRight size={11} />
                </button>
              ) : (
                <button className="btn btn-primary">
                  <IconRocket size={11} /> {meta.publishCta}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, {
  WizardModal,
  KIND_META,
  FLOW_BUILDERS,
  buildConfigsFlow,
  buildGatesFlow,
  buildKsFlow,
  buildMetricsFlow,
  buildExperimentsFlow,
});
