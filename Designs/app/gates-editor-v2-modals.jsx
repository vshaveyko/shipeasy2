// Gate-editor MODALS + the full-page Gate config editor

const { useState: gmState, useEffect: gmEffect, useMemo: gmMemo, Fragment: GmFrag } = React;

// ── Modal shell (reused across modals) ────────────────────────────
function GModal({
  open,
  onClose,
  size = "md",
  icon,
  iconAccent = true,
  title,
  subtitle,
  children,
  footer,
}) {
  gmEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose && onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div
      className="modal-bd"
      onClick={(e) => {
        if (e.target.classList.contains("modal-bd")) onClose && onClose();
      }}
    >
      <div className={`modal ${size}`}>
        <div className="modal-hd">
          {icon && <div className={`icn ${iconAccent ? "accent" : ""}`}>{icon}</div>}
          <div className="body">
            <div className="ttl">{title}</div>
            {subtitle && <div className="sub">{subtitle}</div>}
          </div>
          <button className="ic-btn" onClick={onClose} title="Close (Esc)">
            <IconX size={14} />
          </button>
        </div>
        <div className="modal-bd-content">{children}</div>
        {footer && <div className="modal-ft">{footer}</div>}
      </div>
    </div>
  );
}

// ── Template picker ───────────────────────────────────────────────
function tplIcon(k, size = 15) {
  const map = {
    user: <IconUserPin size={size} />,
    at: <IconAt size={size} />,
    globe: <IconGlobe size={size} />,
    browser: <IconBrowser size={size} />,
    phone: <IconSmartphone size={size} />,
    branch: <IconBranch size={size} />,
    clock: <IconClock size={size} />,
    list: <IconList2 size={size} />,
    sliders: <IconSliders size={size} />,
    sparkles: <IconSparkles size={size} />,
  };
  return map[k] || <IconShieldGate size={size} />;
}

function TemplatePickerModal({ open, onClose, onPick }) {
  const [tab, setTab] = gmState("all");
  const [q, setQ] = gmState("");

  const all = [...TEMPLATES_BUILTIN, ...TEMPLATES_SAVED];
  const list = all.filter((t) => {
    if (tab === "cond" && t.category !== "condition") return false;
    if (tab === "roll" && t.category !== "rollout") return false;
    if (tab === "saved" && !t.saved) return false;
    if (tab === "auto" && !t.auto) return false;
    if (q && !(t.name + " " + t.desc).toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  return (
    <GModal
      open={open}
      onClose={onClose}
      size="xl"
      icon={<IconShieldGate size={16} />}
      title="Add a gate"
      subtitle="pick a template to start from"
      footer={
        <>
          <div className="left">
            <IconBookOpen size={12} />{" "}
            <span>Templates package the boilerplate — every field is editable after you pick.</span>
          </div>
          <div className="right">
            <button className="btn btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button
              className="btn btn-secondary"
              onClick={() =>
                onPick({
                  type: "condition",
                  name: "New condition",
                  pass: "all",
                  rules: [{ id: gid(), attr: "user.id", op: "equals", value: "" }],
                })
              }
            >
              <IconPlus size={11} /> Blank condition
            </button>
            <button
              className="btn btn-secondary"
              onClick={() =>
                onPick({
                  type: "rollout",
                  name: "New rollout",
                  percentage: 10,
                  bucketBy: "user.id",
                  salt: "rollout",
                })
              }
            >
              <IconSliders size={11} /> Blank rollout
            </button>
          </div>
        </>
      }
    >
      <div className="tpl-tabs">
        {[
          ["all", "All", all.length],
          ["cond", "Conditions", all.filter((t) => t.category === "condition").length],
          ["roll", "Rollouts", all.filter((t) => t.category === "rollout").length],
          ["auto", "Auto-resolved", all.filter((t) => t.auto).length],
          ["saved", "Saved by team", all.filter((t) => t.saved).length],
        ].map(([k, l, n]) => (
          <button key={k} className={tab === k ? "active" : ""} onClick={() => setTab(k)}>
            {l} <span className="count">{n}</span>
          </button>
        ))}
      </div>
      <div className="ed-input">
        <IconSearch size={12} style={{ color: "var(--fg-3)" }} />
        <input
          placeholder="Filter templates by name or what they check…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          autoFocus
        />
      </div>
      <div className="tpl-grid">
        {list.map((t) => (
          <div
            key={t.id}
            className="tpl-card"
            onClick={() =>
              onPick({
                ...t.seed,
                fromTemplate: t.name,
                rules: t.seed.rules ? t.seed.rules.map((r) => ({ ...r, id: gid() })) : undefined,
              })
            }
          >
            <div className="ico">{tplIcon(t.icon)}</div>
            <div className="body">
              <div className="ttl">
                {t.name}
                {t.auto && <span className="pill auto">auto-resolved</span>}
                {t.saved && <span className="pill tmpl">saved</span>}
                {t.used && (
                  <span className="pill" style={{ fontFamily: "var(--mono)" }}>
                    used in {t.used}
                  </span>
                )}
              </div>
              <div className="desc" dangerouslySetInnerHTML={{ __html: t.desc }} />
              <div className="preview">{t.preview}</div>
            </div>
          </div>
        ))}
        {list.length === 0 && (
          <div
            style={{
              gridColumn: "1 / -1",
              padding: "40px 20px",
              textAlign: "center",
              color: "var(--fg-3)",
              fontSize: 13,
            }}
          >
            No templates match "<b style={{ color: "var(--fg-2)" }}>{q}</b>". Try a different filter
            or start from a blank gate.
          </div>
        )}
      </div>
    </GModal>
  );
}

// ── Save-as-template modal ────────────────────────────────────────
function SaveAsTemplateModal({ open, onClose, gate, onSaved }) {
  const [name, setName] = gmState(gate?.name || "");
  const [desc, setDesc] = gmState(gate?.description || "");
  const [vis, setVis] = gmState("team");
  gmEffect(() => {
    if (open && gate) {
      setName(gate.name);
      setDesc(gate.description || "");
    }
  }, [open, gate?.id]);
  if (!gate) return null;

  return (
    <GModal
      open={open}
      onClose={onClose}
      size="md"
      icon={<IconBookmark size={15} />}
      title="Save gate as template"
      subtitle={gate.name}
      footer={
        <>
          <div className="left">Templates appear in the picker for everyone in the project.</div>
          <div className="right">
            <button className="btn btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={() => {
                onSaved && onSaved({ name, desc, vis });
                onClose();
              }}
            >
              <IconBookmark size={11} /> Save template
            </button>
          </div>
        </>
      }
    >
      <div className="m-field">
        <span className="fl">Name</span>
        <div className="ed-input">
          <input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </div>
      </div>
      <div className="m-field">
        <span className="fl">
          Description <span className="hint">— shown under the template card</span>
        </span>
        <textarea
          className="ed-textarea"
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          placeholder="When should someone use this? Two sentences is plenty."
        />
      </div>
      <div className="m-field">
        <span className="fl">Visibility</span>
        <div style={{ display: "flex", gap: 8 }}>
          {[
            ["private", "Just me"],
            ["team", "Project team"],
            ["org", "Whole org"],
          ].map(([k, l]) => (
            <button
              key={k}
              className={`row-edit-btn ${vis === k ? "active" : ""}`}
              onClick={() => setVis(k)}
              style={
                vis === k
                  ? {
                      background: "color-mix(in oklab, var(--accent) 14%, var(--bg-2))",
                      color: "var(--accent)",
                      borderColor: "color-mix(in oklab, var(--accent) 40%, var(--line-2))",
                    }
                  : {}
              }
            >
              {vis === k && <IconCheckSm size={11} />} {l}
            </button>
          ))}
        </div>
      </div>
      <div className="hint-bar">
        <IconBookOpen size={13} style={{ color: "var(--accent)", flexShrink: 0 }} />
        <div>
          The configured rules and current values are baked in. The template is editable after
          picking — saving doesn't lock the values.
        </div>
      </div>
    </GModal>
  );
}

// ── Edit-details modal (Step 1 quick edit) ────────────────────────
function EditDetailsModal({ open, onClose, details, onSave }) {
  const [d, setD] = gmState(details);
  gmEffect(() => {
    if (open) setD(details);
  }, [open, details]);
  if (!d) return null;

  return (
    <GModal
      open={open}
      onClose={onClose}
      size="md"
      icon={<IconEdit size={15} />}
      title="Gatekeeper details"
      subtitle={`acme/${details?.key || ""}`}
      footer={
        <>
          <div className="left">Key cannot be changed after v1 publishes.</div>
          <div className="right">
            <button className="btn btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={() => {
                onSave(d);
                onClose();
              }}
            >
              <IconCheckSm size={11} /> Save details
            </button>
          </div>
        </>
      }
    >
      <div className="m-field">
        <span className="fl">
          Title <span className="hint">— human-readable name shown in lists</span>
        </span>
        <div className="ed-input">
          <input value={d.title} onChange={(e) => setD({ ...d, title: e.target.value })} />
        </div>
      </div>
      <div className="m-field">
        <span className="fl">
          Key <span className="hint">— SDK consumers fetch with this</span>
        </span>
        <div className={`ed-input mono ${d.keyLocked ? "disabled" : ""}`}>
          <span className="pre">acme/</span>
          <input
            value={d.key}
            readOnly={d.keyLocked}
            onChange={(e) => setD({ ...d, key: e.target.value })}
          />
          <span className="lock">{d.keyLocked ? <IconLock size={12} /> : null}</span>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div className="m-field">
          <span className="fl">
            Folder <span className="hint">— pick or type to create</span>
          </span>
          <div className="cmb">
            <span className="chip">{d.folder}</span>
            <input placeholder="type to create…" />
            <span className="new">+ new</span>
          </div>
        </div>
        <div className="m-field">
          <span className="fl">
            Group <span className="hint">— pick or type to create</span>
          </span>
          <div className="cmb">
            <span className="chip">{d.group}</span>
            <input placeholder="type to create…" />
            <span className="new">+ new</span>
          </div>
        </div>
      </div>
      <div className="m-field">
        <span className="fl">Description</span>
        <textarea
          className="ed-textarea"
          value={d.description}
          onChange={(e) => setD({ ...d, description: e.target.value })}
          placeholder="What this gatekeeper protects, and when consumers should re-fetch it."
        />
      </div>
      <div className="m-field">
        <span className="fl">
          Owner <span className="hint">— audit alerts route to this member</span>
        </span>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {MEMBERS.map((m) => {
            const sel = d.owner === m.name;
            return (
              <button
                key={m.id}
                onClick={() => setD({ ...d, owner: m.name })}
                style={{
                  all: "unset",
                  cursor: "default",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "4px 12px 4px 4px",
                  borderRadius: 99,
                  background: sel
                    ? "color-mix(in oklab, var(--accent) 14%, var(--bg-2))"
                    : "var(--bg-2)",
                  border: `1px solid ${sel ? "color-mix(in oklab, var(--accent) 45%, var(--line-2))" : "var(--line-2)"}`,
                  color: sel ? "var(--accent)" : "var(--fg)",
                }}
              >
                <span
                  className="av av-sm"
                  style={{ background: avBg(m.hue), width: 22, height: 22, fontSize: 9.5 }}
                >
                  {m.init}
                </span>
                <span style={{ fontSize: 12.5 }}>{m.name}</span>
                {sel && <IconCheckSm size={11} style={{ marginRight: 6 }} />}
              </button>
            );
          })}
        </div>
      </div>
    </GModal>
  );
}

// ── SDK snippet modal (preview & post-publish) ────────────────────
function GateSdkModal({ open, onClose, configKey }) {
  const [lang, setLang] = gmState("ts");
  const code = sdkSnippets(configKey)[lang] || "";

  function tok(line) {
    const parts = [];
    let i = 0;
    const re =
      /("([^"\\]|\\.)*"|'([^'\\]|\\.)*'|`([^`\\]|\\.)*`|\/\/[^\n]*|#[^\n]*|\b(import|from|require|use|var|const|let|if|fn|func|class|public|return|await|async)\b|\b\d+(\.\d+)?\b)/g;
    let m;
    while ((m = re.exec(line)) !== null) {
      if (m.index > i) parts.push({ t: "p", v: line.slice(i, m.index) });
      const v = m[0];
      if (v.startsWith("//") || v.startsWith("#")) parts.push({ t: "com", v });
      else if (v.startsWith('"') || v.startsWith("'") || v.startsWith("`"))
        parts.push({ t: "str", v });
      else if (/^\d/.test(v)) parts.push({ t: "num", v });
      else parts.push({ t: "kw", v });
      i = re.lastIndex;
    }
    if (i < line.length) parts.push({ t: "p", v: line.slice(i) });
    return parts;
  }
  const lines = code.split("\n");

  return (
    <GModal
      open={open}
      onClose={onClose}
      size="lg"
      icon={<IconCode size={15} />}
      title="Integrate this gatekeeper"
      subtitle={configKey}
      footer={
        <>
          <div className="left">
            <IconBookOpen size={12} /> SDK reference covers fallback values, caching, and webhooks.
          </div>
          <div className="right">
            <button className="btn btn-ghost" onClick={onClose}>
              Close
            </button>
            <button className="btn btn-secondary">
              <IconLink size={11} /> Open docs
            </button>
          </div>
        </>
      }
    >
      <div className="m-field" style={{ gap: 0 }}>
        <div className="cc-card" style={{ borderRadius: "var(--r-md)" }}>
          <div className="sdk-tabs">
            {SDK_LANGS.map((l) => (
              <button
                key={l.k}
                className={lang === l.k ? "active" : ""}
                onClick={() => setLang(l.k)}
              >
                {l.label}
              </button>
            ))}
          </div>
          <div className="sdk-body">
            <button className="copy-fab">
              <IconCopy2 size={11} /> Copy
            </button>
            <pre>
              {lines.map((ln, idx) => (
                <span key={idx} style={{ display: "block" }}>
                  <span className="ln-num">{idx + 1}</span>
                  {tok(ln).map((p, i) =>
                    p.t === "p" ? (
                      <span key={i}>{p.v}</span>
                    ) : (
                      <span key={i} className={p.t}>
                        {p.v}
                      </span>
                    ),
                  )}
                </span>
              ))}
            </pre>
          </div>
        </div>
        <div className="hint-bar" style={{ marginTop: 14 }}>
          <IconLock size={13} style={{ color: "var(--accent)", flexShrink: 0 }} />
          <div>
            <b>Returns boolean</b> — gates evaluate top to bottom; the first one that passes returns
            <span style={{ fontFamily: "var(--mono)", color: "var(--accent)" }}> true</span>. The
            hardcoded
            <span style={{ fontFamily: "var(--mono)", color: "var(--fg-2)" }}> public </span>rollout
            is the floor.
          </div>
        </div>
      </div>
    </GModal>
  );
}

// ─────────────────────────────────────────────────────────────────
// Gate Config full-page editor (overlay)
// ─────────────────────────────────────────────────────────────────

// All operators, organized by attribute type. Many shapes — not just equals.
const ALL_OPS = {
  string: [
    ["equals", "equals"],
    ["not_equals", "does not equal"],
    ["contains", "contains"],
    ["not_contains", "does not contain"],
    ["starts_with", "starts with"],
    ["ends_with", "ends with"],
    ["matches", "matches regex"],
    ["matches_glob", "matches glob (e.g. *@acme.co)"],
    ["in", "any of (csv list)"],
    ["not_in", "none of (csv list)"],
    ["is_set", "is set"],
    ["is_empty", "is empty"],
  ],
  number: [
    ["equals", "="],
    ["not_equals", "≠"],
    ["gt", ">"],
    ["gte", "≥"],
    ["lt", "<"],
    ["lte", "≤"],
    ["between", "between (a, b)"],
    ["in", "in list"],
    ["mod", "mod N == k"],
  ],
  boolean: [
    ["is", "is"],
    ["is_not", "is not"],
  ],
  date: [
    ["before", "before"],
    ["after", "after"],
    ["between", "between"],
    ["within_last", "within last (e.g. 7d)"],
    ["older_than", "older than (e.g. 30d)"],
  ],
  semver: [
    ["gte", "≥ (semver)"],
    ["lt", "< (semver)"],
    ["equals", "= (exact)"],
    ["range", "range (^4.x, ~4.2)"],
  ],
};

// Pretty-print a gate's evaluation summary into tokens
function gateSummary(g) {
  if (g.type === "rollout") {
    return (
      <>
        <span className="op-tok">{g.percentage}%</span>
        <span style={{ color: "var(--fg-3)" }}> bucket on </span>
        <span className="key-tok">{g.bucketBy}</span>
      </>
    );
  }
  if (!g.rules || g.rules.length === 0)
    return <span style={{ color: "var(--fg-4)" }}>no rules yet</span>;
  const r = g.rules[0];
  return (
    <>
      <span className="key-tok">{r.attr}</span> <span className="op-tok">{r.op}</span>{" "}
      <span className="val-tok">"{r.value}"</span>
      {g.rules.length > 1 && (
        <span style={{ color: "var(--fg-4)", marginLeft: 8 }}>
          +{g.rules.length - 1} more · {g.pass === "any" ? "any" : "all"}
        </span>
      )}
    </>
  );
}

// Pick options for an attribute key
function opsFor(attrKey) {
  const t = inferAttrType(attrKey);
  const isVer = attrKey.endsWith("app_ver") || attrKey.endsWith("version");
  if (isVer) return [...ALL_OPS.semver, ...ALL_OPS.string];
  return ALL_OPS[t] || ALL_OPS.string;
}

// Generate a human-readable title from gate config.
function autoTitle(g) {
  if (g.locked) return "Public";
  if (g.type === "rollout") {
    const p = g.percentage || 0;
    if (p === 0) return "Rollout — off";
    if (p === 100) return "Rollout — everyone";
    return `${p}% on ${g.bucketBy || "user.id"}`;
  }
  const r = g.rules && g.rules[0];
  if (!r) return "New condition";
  const opMap = (opsFor(r.attr).find(([k]) => k === r.op) || [])[1] || r.op;
  const v = (r.value || "").trim();
  if (!v) return r.attr;
  // Truncate long values & csv lists
  let shown = v;
  if ((r.op === "in" || r.op === "not_in") && v.includes(",")) {
    const parts = v
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    shown = parts.length > 2 ? `${parts[0]}, ${parts[1]} +${parts.length - 2}` : parts.join(", ");
  } else if (v.length > 28) {
    shown = v.slice(0, 26) + "…";
  }
  // Quote string-ish values, leave numbers/booleans bare
  const t = inferAttrType(r.attr);
  const quoted = t === "boolean" || /^-?\d+(\.\d+)?$/.test(v) ? shown : `"${shown}"`;
  return `${r.attr} ${opMap} ${quoted}`;
}

// ─────────────────────────────────────────────────────────────────
// v2 — Multi-rule gate editor with per-attribute-type variants
// ─────────────────────────────────────────────────────────────────

// Per-rule editor — switches input shape based on attribute type
function RuleEditor({ rule, onChange }) {
  const meta = ATTR_META[rule.attr] || { type: inferAttrType(rule.attr) };
  const t = meta.type;
  const ops = opsFor(rule.attr);
  const upd = (patch) => onChange({ ...rule, ...patch });

  // Value input by type ----------------------------------------------------
  const valueInput = (() => {
    if (rule.op === "is_set" || rule.op === "is_empty") {
      return (
        <div className="ed-input mono disabled" style={{ height: 34 }}>
          <input value="—" disabled style={{ color: "var(--fg-4)" }} />
        </div>
      );
    }

    if (t === "boolean") {
      const v = rule.value === "false" ? "false" : "true";
      return (
        <div className="bool-pick">
          <button
            className={`t ${v === "true" ? "on" : ""}`}
            onClick={() => upd({ value: "true" })}
          >
            <IconCheckSm size={11} /> true
          </button>
          <button
            className={`f ${v === "false" ? "on" : ""}`}
            onClick={() => upd({ value: "false" })}
          >
            <IconX size={11} /> false
          </button>
        </div>
      );
    }

    if (t === "number" || rule.op === "mod") {
      return (
        <div className="num-stepper">
          <button
            onClick={() => upd({ value: String(Math.max(0, (Number(rule.value) || 0) - 1)) })}
          >
            <IconMinus size={11} />
          </button>
          <input
            type="text"
            value={rule.value || "0"}
            onChange={(e) => upd({ value: e.target.value.replace(/[^0-9.\-,]/g, "") })}
          />
          <button onClick={() => upd({ value: String((Number(rule.value) || 0) + 1) })}>
            <IconPlus size={11} />
          </button>
        </div>
      );
    }

    if (t === "date" || rule.op === "before" || rule.op === "after" || rule.op === "between") {
      if (rule.op === "between") {
        const parts = (rule.value || "").split(",").map((s) => s.trim());
        const a = parts[0] || "";
        const b = parts[1] || "";
        return (
          <div className="date-row">
            <div className="date-input">
              <IconCalendar size={12} className="cal" />
              <input
                value={a || "2026-05-12"}
                onChange={(e) => upd({ value: `${e.target.value}, ${b}` })}
                style={{ all: "unset", flex: 1, color: "inherit", fontFamily: "inherit" }}
              />
            </div>
            <span className="arrow">→</span>
            <div className="date-input">
              <IconCalendar size={12} className="cal" />
              <input
                value={b || "2026-05-19"}
                onChange={(e) => upd({ value: `${a}, ${e.target.value}` })}
                style={{ all: "unset", flex: 1, color: "inherit", fontFamily: "inherit" }}
              />
            </div>
          </div>
        );
      }
      return (
        <div className="date-input" style={{ maxWidth: 200 }}>
          <IconCalendar size={12} className="cal" />
          <input
            value={rule.value || "2026-05-15"}
            onChange={(e) => upd({ value: e.target.value })}
            style={{ all: "unset", flex: 1, color: "inherit", fontFamily: "inherit" }}
          />
        </div>
      );
    }

    // Enum picker — chips with checked state
    if (
      t === "enum" &&
      (rule.op === "in" || rule.op === "not_in" || rule.op === "equals" || rule.op === "not_equals")
    ) {
      const selected = (rule.value || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const toggle = (v) => {
        const s = new Set(selected);
        if (rule.op === "equals" || rule.op === "not_equals") {
          upd({ value: v });
        } else {
          if (s.has(v)) s.delete(v);
          else s.add(v);
          upd({ value: Array.from(s).join(", ") });
        }
      };
      const isSel = (v) =>
        rule.op === "equals" || rule.op === "not_equals" ? rule.value === v : selected.includes(v);
      return (
        <div className="enum-chips">
          {(meta.values || []).map((v) => (
            <button
              key={v}
              className={`chip ${isSel(v) ? "on" : ""}`}
              style={{ all: "unset", cursor: "default" }}
              onClick={() => toggle(v)}
            >
              {isSel(v) && <IconCheckSm size={9} />} {v}
            </button>
          ))}
        </div>
      );
    }

    // Regex — textarea with live preview against sample inputs
    if (rule.op === "matches") {
      const samples = [
        "maya@acme.co",
        "jin@acme.co",
        "sasha@gmail.com",
        "qa+rig@acme.io",
        "admin@example.com",
      ];
      let re = null;
      try {
        re = new RegExp(rule.value || "");
      } catch (e) {
        re = null;
      }
      return (
        <div>
          <textarea
            className="ed-textarea"
            rows={2}
            style={{ fontFamily: "var(--mono)", fontSize: 12.5, minHeight: 60 }}
            value={rule.value}
            onChange={(e) => upd({ value: e.target.value })}
            placeholder="^[a-z]+@acme\.(co|io)$"
          />
          <div className="regex-preview">
            <div className="pv-hd">
              <IconZap size={10} /> Live preview · {rule.attr}
              <span style={{ marginLeft: "auto", color: re ? "var(--accent)" : "var(--danger)" }}>
                {re ? "valid regex" : "parse error"}
              </span>
            </div>
            {samples.map((s, i) => {
              const m = re && re.test(s);
              return (
                <div key={i} className="pv-row">
                  <span>{s}</span>
                  <span className={`verdict ${m ? "match" : "miss"}`}>{m ? "matches" : "no"}</span>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    // Default: text input
    return (
      <div className="ed-input mono" style={{ height: 34 }}>
        <input
          value={rule.value}
          onChange={(e) => upd({ value: e.target.value })}
          placeholder={
            rule.op === "in" || rule.op === "not_in"
              ? "comma, separated, list"
              : rule.op === "matches_glob"
                ? "*@acme.co"
                : rule.op === "within_last" || rule.op === "older_than"
                  ? "7d"
                  : rule.op === "range"
                    ? "^4.x"
                    : "value"
          }
        />
      </div>
    );
  })();

  return (
    <div
      className="ge-cond"
      style={{ gridTemplateColumns: "minmax(0,1.4fr) 150px minmax(0,1.6fr)" }}
    >
      <div className="ed-input mono" style={{ height: 34 }}>
        <select
          value={rule.attr}
          onChange={(e) => upd({ attr: e.target.value, op: opsFor(e.target.value)[0][0] })}
          style={{
            all: "unset",
            flex: 1,
            minWidth: 0,
            fontFamily: "inherit",
            fontSize: 13,
            color: "var(--fg)",
            cursor: "default",
          }}
        >
          {ATTR_GROUPS.map((grp) => (
            <optgroup key={grp.g} label={grp.label}>
              {grp.attrs.map((a) => (
                <option key={a.k} value={a.k}>
                  {a.k}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>
      <div className="ed-input ed-select" style={{ height: 34 }}>
        <select
          value={rule.op}
          onChange={(e) => upd({ op: e.target.value })}
          style={{ all: "unset", flex: 1, fontSize: 13, color: "var(--fg)", cursor: "default" }}
        >
          {ops.map(([k, l]) => (
            <option key={k} value={k}>
              {l}
            </option>
          ))}
        </select>
      </div>
      <div>{valueInput}</div>
    </div>
  );
}

function GateInlineEditor({ gate, onChange, onSaveAsTemplate, onClose }) {
  const [g, setG] = gmState(gate);
  gmEffect(() => {
    setG(gate);
  }, [gate?.id]);
  const upd = (patch) => {
    const next = { ...g, ...patch };
    setG(next);
    onChange(next);
  };

  const isRollout = g.type === "rollout";
  const isLocked = !!g.locked;

  // ── multi-rule helpers ────────────────────────────────────────
  const rules = g.rules || [];
  const updRule = (id, patch) =>
    upd({ rules: rules.map((r) => (r.id === id ? { ...r, ...patch } : r)) });
  const addRule = () =>
    upd({ rules: [...rules, { id: gid(), attr: "user.id", op: "equals", value: "" }] });
  const rmRule = (id) => upd({ rules: rules.filter((r) => r.id !== id) });
  const passMode = g.pass === "any" ? "any" : "all";
  const conn = passMode === "any" ? "OR" : "AND";

  return (
    <div
      style={{
        padding: "14px 16px 18px",
        borderTop: "1px solid var(--line-2)",
        background: "color-mix(in oklab, var(--accent) 3%, var(--bg-2))",
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      {/* CONDITION editor */}
      {!isRollout && (
        <>
          {/* Match ALL / Match ANY (only meaningful with >1 rule) */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              paddingBottom: 6,
              borderBottom: "1px dashed var(--line)",
            }}
          >
            <span
              style={{
                fontFamily: "var(--mono)",
                fontSize: 10.5,
                letterSpacing: ".06em",
                textTransform: "uppercase",
                color: "var(--fg-3)",
              }}
            >
              Match
            </span>
            <div className="seg">
              <button
                className={passMode === "all" ? "active" : ""}
                onClick={() => upd({ pass: "all" })}
              >
                ALL <span className="tok">AND</span>
              </button>
              <button
                className={passMode === "any" ? "active" : ""}
                onClick={() => upd({ pass: "any" })}
              >
                ANY <span className="tok">OR</span>
              </button>
            </div>
            <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--fg-3)" }}>
              of the {rules.length} rule{rules.length === 1 ? "" : "s"} below
            </span>
            <div style={{ flex: 1 }} />
            <button className="row-edit-btn" onClick={addRule}>
              <IconPlus size={11} /> Add rule
            </button>
          </div>

          {/* Rule rows */}
          <div className={`ge-rules ${passMode === "any" ? "any" : ""}`}>
            {rules.length === 0 && (
              <div
                style={{
                  padding: "14px 16px",
                  color: "var(--fg-3)",
                  fontSize: 12.5,
                  textAlign: "center",
                  background: "var(--bg-2)",
                  border: "1px dashed var(--line-2)",
                  borderRadius: "var(--r-md)",
                }}
              >
                No rules — gate currently passes for everyone. Add a rule to scope it.
              </div>
            )}
            {rules.map((r, i) => (
              <div key={r.id} className="rule-row" data-conn={conn}>
                <div className="rule-hd">
                  <span className="n">{String(i + 1).padStart(2, "0")}</span>
                  <span className="ttype">{ATTR_META[r.attr]?.type || inferAttrType(r.attr)}</span>
                  <button
                    className="ic-btn danger rm"
                    title="Remove rule"
                    onClick={() => rmRule(r.id)}
                    style={rules.length <= 1 ? { opacity: 0.35, pointerEvents: "none" } : {}}
                  >
                    <IconTrash size={11} />
                  </button>
                </div>
                <RuleEditor rule={r} onChange={(patch) => updRule(r.id, patch)} />
              </div>
            ))}
          </div>
          <button className="add-rule-cta" onClick={addRule}>
            <IconPlus size={11} /> Add another rule
            {rules.length > 0
              ? ` (${conn} ${ATTR_META[rules[rules.length - 1].attr]?.type || "string"})`
              : ""}
          </button>
        </>
      )}

      {/* ROLLOUT editor */}
      {isRollout && (
        <div className="gk-rollout-card" style={{ padding: "18px 20px" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
            <span className={`num-big ${(g.percentage || 0) === 0 ? "zero" : ""}`}>
              {g.percentage || 0}
              <span style={{ fontSize: 24 }}>%</span>
            </span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12.5, color: "var(--fg-2)" }}>
                {(g.percentage || 0) === 0 ? (
                  <>Off — this gate never passes.</>
                ) : (g.percentage || 0) === 100 ? (
                  <>Everyone falls into this bucket.</>
                ) : (
                  <>
                    Roughly <b style={{ color: "var(--fg)" }}>{g.percentage}%</b> of evaluated users
                    see{" "}
                    <span style={{ fontFamily: "var(--mono)", color: "var(--accent)" }}>true</span>.
                  </>
                )}
              </div>
              <div className="lbl">% of audience</div>
            </div>
          </div>
          <div className="gk-rollout-track">
            <div className="bg" />
            <div className="fill" style={{ width: (g.percentage || 0) + "%" }} />
            <div className="knob" style={{ left: (g.percentage || 0) + "%" }} />
            <input
              type="range"
              min="0"
              max="100"
              value={g.percentage || 0}
              onChange={(e) => upd({ percentage: Number(e.target.value) })}
            />
          </div>
          <div className="gk-rollout-ticks">
            {[0, 10, 25, 50, 75, 100].map((t) => (
              <span key={t}>{t}%</span>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 14 }}>
            <div className="m-field">
              <span className="fl">
                Bucket by <span className="hint">— what gets hashed</span>
              </span>
              <div className="ed-input ed-select">
                <select
                  value={g.bucketBy || "user.id"}
                  onChange={(e) => upd({ bucketBy: e.target.value })}
                  disabled={isLocked}
                >
                  {FLAT_ATTRS.map((a) => (
                    <option key={a.k} value={a.k}>
                      {a.k}
                    </option>
                  ))}
                  <option value="session.id">session.id</option>
                </select>
              </div>
            </div>
            <div className="m-field">
              <span className="fl">
                Salt <span className="hint">— change to re-shuffle</span>
              </span>
              <div className="ed-input mono">
                <input
                  value={g.salt || ""}
                  onChange={(e) => upd({ salt: e.target.value })}
                  placeholder="rollout"
                  disabled={isLocked}
                />
              </div>
            </div>
          </div>

          {/* Scheduled ramp */}
          {!isLocked && <ScheduledRamp gate={g} onChange={upd} />}

          {isLocked && (
            <div className="hint-bar" style={{ marginTop: 14 }}>
              <IconLock size={13} style={{ color: "var(--accent)", flexShrink: 0 }} />
              <div>
                <b>Public floor.</b> Hardcoded last gate — only the percentage is tunable.
              </div>
            </div>
          )}
        </div>
      )}

      {/* Action row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          paddingTop: 4,
          borderTop: "1px dashed var(--line)",
          marginTop: 4,
        }}
      >
        <span
          style={{
            fontFamily: "var(--mono)",
            fontSize: 10.5,
            color: "var(--fg-4)",
            padding: "8px 0",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <IconSparkles size={10} /> Title auto-generated from {isRollout ? "%" : "first rule"}
        </span>
        <div style={{ flex: 1 }} />
        {!isLocked && (
          <button className="row-edit-btn" onClick={() => onSaveAsTemplate && onSaveAsTemplate(g)}>
            <IconBookmark size={11} /> Save as template
          </button>
        )}
        <button className="row-edit-btn" onClick={onClose}>
          Collapse
        </button>
      </div>
    </div>
  );
}

// ── Scheduled ramp inside a rollout ───────────────────────────────
function ScheduledRamp({ gate, onChange }) {
  const enabled = !!(gate.ramp && gate.ramp.enabled);
  const defaultSteps = [
    { pct: 1, when: "2026-05-16", status: "pending" },
    { pct: 5, when: "2026-05-17", status: "pending" },
    { pct: 25, when: "2026-05-19", status: "pending" },
    { pct: 100, when: "2026-05-22", status: "pending" },
  ];
  const steps = (gate.ramp && gate.ramp.steps) || defaultSteps;

  const toggle = () => {
    if (enabled) onChange({ ramp: { ...gate.ramp, enabled: false } });
    else onChange({ ramp: { enabled: true, steps } });
  };

  const updStep = (i, patch) => {
    const next = steps.map((s, j) => (j === i ? { ...s, ...patch } : s));
    onChange({ ramp: { ...gate.ramp, enabled: true, steps: next } });
  };

  // axis positions for the timeline (proportional to %)
  const maxPct = 100;
  const xOf = (pct) => 14 + ((pct / maxPct) * 100 - (14 * 200) / 100) + "%"; // not used — see below
  // simpler: percentage based, leave 14px padding
  const livePct =
    steps.find((s) => s.status === "live")?.pct ??
    steps.find((s) => s.status === "pending")?.pct ??
    0;

  return (
    <div style={{ marginTop: 16 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "8px 12px",
          background: "var(--bg-3)",
          border: "1px solid var(--line-2)",
          borderRadius: "var(--r-md)",
        }}
      >
        <IconCalendar size={13} style={{ color: "var(--accent)" }} />
        <span style={{ fontSize: 12.5, color: "var(--fg)", fontWeight: 500 }}>Schedule ramp</span>
        <span style={{ fontFamily: "var(--mono)", fontSize: 10.5, color: "var(--fg-3)" }}>
          step the rollout up over time
        </span>
        <div style={{ flex: 1 }} />
        <button
          className={`req-toggle ${enabled ? "on" : ""}`}
          style={{
            all: "unset",
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            cursor: "default",
          }}
          onClick={toggle}
        >
          <span className="sw" />
          <span
            style={{
              fontFamily: "var(--mono)",
              fontSize: 10.5,
              color: enabled ? "var(--accent)" : "var(--fg-3)",
            }}
          >
            {enabled ? "ON" : "OFF"}
          </span>
        </button>
      </div>

      {enabled && (
        <div className="ramp">
          <div className="ramp-hd">
            <span className="ttl">Timeline</span>
            <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--fg-3)" }}>
              currently <b style={{ color: "var(--accent)" }}>{livePct}%</b> of target
            </span>
          </div>
          <div className="timeline">
            <div className="axis" />
            <div
              className="axis-fill"
              style={{ width: `calc(${(livePct / maxPct) * 100}% - 14px)` }}
            />
            {steps.map((s, i) => {
              const left = `calc(14px + ${(s.pct / maxPct) * 100}% - ${(s.pct / maxPct) * 28}px)`;
              return (
                <div key={i} className={`step ${s.status}`} style={{ left }}>
                  <span className={`dot ${s.status}`} />
                  <span className="pct">{s.pct}%</span>
                  <span className="dt">{s.when.slice(5)}</span>
                </div>
              );
            })}
          </div>

          <div className="ramp-rows">
            {steps.map((s, i) => (
              <div key={i} className={`rr ${s.status}`}>
                <span className="n">{i + 1}</span>
                <span className="pct">{s.pct}%</span>
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <IconCalendar size={11} style={{ color: "var(--fg-4)" }} />
                  <input
                    className="when"
                    value={s.when}
                    onChange={(e) => updStep(i, { when: e.target.value })}
                    style={{
                      all: "unset",
                      cursor: "text",
                      padding: "2px 4px",
                      borderRadius: 3,
                      background: "var(--bg-1)",
                    }}
                  />
                </span>
                <span className="status">{s.status}</span>
                <button
                  className="ic-btn danger"
                  title="Remove step"
                  onClick={() => {
                    const next = steps.filter((_, j) => j !== i);
                    onChange({ ramp: { ...gate.ramp, enabled: true, steps: next } });
                  }}
                >
                  <IconTrash size={10} />
                </button>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <button
              className="add-rule-cta"
              style={{ margin: 0, flex: 1 }}
              onClick={() => {
                const next = [
                  ...steps,
                  {
                    pct: Math.min(100, (steps[steps.length - 1]?.pct || 0) + 25),
                    when: "2026-05-29",
                    status: "pending",
                  },
                ];
                onChange({ ramp: { ...gate.ramp, enabled: true, steps: next } });
              }}
            >
              <IconPlus size={11} /> Add step
            </button>
            <button className="row-edit-btn">
              <IconPlay size={10} /> Advance now
            </button>
            <button className="row-edit-btn">
              <IconRefresh size={10} /> Reset
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

Object.assign(window, {
  GModal,
  TemplatePickerModal,
  SaveAsTemplateModal,
  EditDetailsModal,
  GateSdkModal,
  GateInlineEditor,
  RuleEditor,
  ScheduledRamp,
  tplIcon,
  gateSummary,
  ALL_OPS,
  opsFor,
});

// ─────────────────────────────────────────────────────────────────
// v2 — NEW MODALS + DRAWER
// ─────────────────────────────────────────────────────────────────

// Killswitch confirm — type the key to confirm
function KillswitchConfirmModal({ open, onClose, onConfirm, gateKey, action }) {
  // action: 'enable' (turn killswitch ON, blocks everyone) or 'disable' (turn it back off)
  const [typed, setTyped] = gmState("");
  gmEffect(() => {
    if (open) setTyped("");
  }, [open]);
  const ok = typed === gateKey;
  const isOn = action === "enable";

  return (
    <GModal
      open={open}
      onClose={onClose}
      size="md"
      icon={<IconAlert size={16} />}
      iconAccent={false}
      title={isOn ? "Engage killswitch" : "Disengage killswitch"}
      subtitle={`acme/${gateKey}`}
      footer={
        <>
          <div className="left">
            <IconClock size={12} /> Takes effect immediately · ~30s KV propagation
          </div>
          <div className="right">
            <button className="btn btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button
              className={`btn ${isOn ? "btn-danger" : "btn-primary"}`}
              onClick={() => {
                if (ok) {
                  onConfirm();
                  onClose();
                }
              }}
              disabled={!ok}
              style={!ok ? { opacity: 0.5, pointerEvents: "none" } : {}}
            >
              <IconAlert size={11} /> {isOn ? "Disable for all users" : "Resume normal evaluation"}
            </button>
          </div>
        </>
      }
    >
      <div
        style={{
          display: "flex",
          gap: 14,
          padding: "14px 16px",
          background: isOn ? "color-mix(in oklab, var(--danger) 10%, var(--bg-2))" : "var(--bg-2)",
          border: `1px solid ${isOn ? "color-mix(in oklab, var(--danger) 35%, var(--line-2))" : "var(--line-2)"}`,
          borderRadius: "var(--r-md)",
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 8,
            flexShrink: 0,
            background: isOn
              ? "color-mix(in oklab, var(--danger) 22%, var(--bg-3))"
              : "var(--bg-3)",
            border: `1px solid ${isOn ? "color-mix(in oklab, var(--danger) 45%, var(--line-2))" : "var(--line-2)"}`,
            color: isOn ? "var(--danger)" : "var(--fg-2)",
            display: "grid",
            placeItems: "center",
          }}
        >
          <IconAlert size={16} />
        </div>
        <div style={{ flex: 1, fontSize: 13, color: "var(--fg-2)", lineHeight: 1.55 }}>
          {isOn ? (
            <>
              This will force{" "}
              <code
                style={{
                  fontFamily: "var(--mono)",
                  color: "var(--danger)",
                  background: "color-mix(in oklab, var(--danger) 12%, transparent)",
                  padding: "1px 5px",
                  borderRadius: 3,
                }}
              >
                shipeasy.gate("{gateKey}")
              </code>{" "}
              to return <b style={{ color: "var(--danger)" }}>false</b> for every caller, regardless
              of the stack below. Use this when a feature is misbehaving in production.
            </>
          ) : (
            <>
              Re-enables normal top-to-bottom gate evaluation. Existing overrides and rollouts
              resume from where they left off.
            </>
          )}
        </div>
      </div>

      <div className="m-field">
        <span className="fl">
          Type the gate key to confirm <span className="hint">— prevents accidental clicks</span>
        </span>
        <div
          className="ed-input mono"
          style={
            ok
              ? {
                  borderColor: "var(--accent)",
                  boxShadow: "0 0 0 3px color-mix(in oklab, var(--accent) 16%, transparent)",
                }
              : {}
          }
        >
          <span className="pre">acme/</span>
          <input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder={gateKey}
            autoFocus
          />
          {ok && <IconCheckSm size={14} style={{ color: "var(--accent)" }} />}
        </div>
      </div>

      {!ok && typed && (
        <div
          style={{
            fontSize: 11.5,
            color: "var(--danger)",
            fontFamily: "var(--mono)",
            padding: "0 4px",
          }}
        >
          Doesn't match. Expected <b>{gateKey}</b>.
        </div>
      )}
    </GModal>
  );
}

// Add override modal
function AddOverrideModal({ open, onClose, onAdd }) {
  const [u, setU] = gmState("");
  const [force, setForce] = gmState("TRUE");
  const [reason, setReason] = gmState("");
  const [expiry, setExpiry] = gmState("never");
  gmEffect(() => {
    if (open) {
      setU("");
      setForce("TRUE");
      setReason("");
      setExpiry("never");
    }
  }, [open]);

  return (
    <GModal
      open={open}
      onClose={onClose}
      size="md"
      icon={<IconUserPin size={15} />}
      title="Force an override"
      subtitle="bypasses the stack for one user"
      footer={
        <>
          <div className="left">
            <IconBookOpen size={12} /> Overrides short-circuit before any gate runs.
          </div>
          <div className="right">
            <button className="btn btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={() => {
                onAdd &&
                  onAdd({
                    id: gid(),
                    user_id: u,
                    force,
                    reason,
                    by: "You",
                    when: "just now",
                    expiry,
                  });
                onClose();
              }}
              disabled={!u}
              style={!u ? { opacity: 0.5, pointerEvents: "none" } : {}}
            >
              <IconPlus size={11} /> Add override
            </button>
          </div>
        </>
      }
    >
      <div className="m-field">
        <span className="fl">User ID or email</span>
        <div className="ed-input mono">
          <input
            value={u}
            onChange={(e) => setU(e.target.value)}
            placeholder="usr_3b20a9f2  or  maya@acme.co"
            autoFocus
          />
        </div>
      </div>
      <div className="m-field">
        <span className="fl">Force result</span>
        <div className="seg" style={{ alignSelf: "flex-start" }}>
          <button className={force === "TRUE" ? "active" : ""} onClick={() => setForce("TRUE")}>
            <IconCheckSm
              size={11}
              style={{ color: force === "TRUE" ? "var(--accent)" : undefined }}
            />{" "}
            TRUE
          </button>
          <button className={force === "FALSE" ? "active" : ""} onClick={() => setForce("FALSE")}>
            <IconX size={11} style={{ color: force === "FALSE" ? "var(--danger)" : undefined }} />{" "}
            FALSE
          </button>
        </div>
      </div>
      <div className="m-field">
        <span className="fl">
          Reason <span className="hint">— shows in audit log</span>
        </span>
        <div className="ed-input">
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Customer escalation #4882"
          />
        </div>
      </div>
      <div className="m-field">
        <span className="fl">Expires</span>
        <div style={{ display: "flex", gap: 8 }}>
          {[
            ["never", "never"],
            ["1d", "in 1 day"],
            ["7d", "in 7 days"],
            ["30d", "in 30 days"],
          ].map(([k, l]) => (
            <button
              key={k}
              className="row-edit-btn"
              onClick={() => setExpiry(k)}
              style={
                expiry === k
                  ? {
                      background: "color-mix(in oklab, var(--accent) 14%, var(--bg-2))",
                      color: "var(--accent)",
                      borderColor: "color-mix(in oklab, var(--accent) 40%, var(--line-2))",
                    }
                  : {}
              }
            >
              {expiry === k && <IconCheckSm size={11} />} {l}
            </button>
          ))}
        </div>
      </div>
    </GModal>
  );
}

// Register a new custom attribute
function RegisterAttributeModal({ open, onClose, onSave }) {
  const [path, setPath] = gmState("user.");
  const [type, setType] = gmState("string");
  const [req, setReq] = gmState(false);
  const [desc, setDesc] = gmState("");
  const [vals, setVals] = gmState("");
  gmEffect(() => {
    if (open) {
      setPath("user.");
      setType("string");
      setReq(false);
      setDesc("");
      setVals("");
    }
  }, [open]);

  return (
    <GModal
      open={open}
      onClose={onClose}
      size="md"
      icon={<IconHash size={15} />}
      title="Register a custom attribute"
      subtitle="dot-path · type"
      footer={
        <>
          <div className="left">Custom attributes must be set by the calling SDK each request.</div>
          <div className="right">
            <button className="btn btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={() => {
                onSave && onSave({ path, type, req, desc, vals });
                onClose();
              }}
              disabled={path.length < 5}
              style={path.length < 5 ? { opacity: 0.5, pointerEvents: "none" } : {}}
            >
              <IconPlus size={11} /> Register
            </button>
          </div>
        </>
      }
    >
      <div className="m-field">
        <span className="fl">
          Dot-path <span className="hint">— how SDKs reference it</span>
        </span>
        <div className="ed-input mono">
          <input
            value={path}
            onChange={(e) => setPath(e.target.value)}
            placeholder="user.signup_referrer"
            autoFocus
          />
        </div>
      </div>
      <div className="m-field">
        <span className="fl">Type</span>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {["string", "number", "boolean", "date", "enum", "semver"].map((t) => (
            <button
              key={t}
              className="row-edit-btn"
              onClick={() => setType(t)}
              style={
                type === t
                  ? {
                      background: "color-mix(in oklab, var(--accent) 14%, var(--bg-2))",
                      color: "var(--accent)",
                      borderColor: "color-mix(in oklab, var(--accent) 40%, var(--line-2))",
                      fontFamily: "var(--mono)",
                    }
                  : { fontFamily: "var(--mono)" }
              }
            >
              {type === t && <IconCheckSm size={11} />} {t}
            </button>
          ))}
        </div>
      </div>
      {type === "enum" && (
        <div className="m-field">
          <span className="fl">
            Allowed values <span className="hint">— comma-separated</span>
          </span>
          <div className="ed-input mono">
            <input
              value={vals}
              onChange={(e) => setVals(e.target.value)}
              placeholder="organic, paid, referral, partner"
            />
          </div>
        </div>
      )}
      <div className="m-field">
        <span className="fl">Description</span>
        <textarea
          className="ed-textarea"
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          placeholder="What this attribute represents. Shown in tooltips and the SDK docs."
        />
      </div>
      <div
        className="req-toggle"
        onClick={() => setReq(!req)}
        style={req ? { cursor: "default" } : { cursor: "default" }}
      >
        <span
          className={`sw ${req ? "on" : ""}`}
          style={
            req
              ? {
                  background: "color-mix(in oklab, var(--accent) 32%, var(--bg-3))",
                  borderColor: "color-mix(in oklab, var(--accent) 50%, var(--line-2))",
                }
              : {}
          }
        />
        <span className="lab">
          <b>Required</b> — SDK warns if this attribute isn't set
        </span>
      </div>
    </GModal>
  );
}

// Diff modal — old stack vs new stack
function DiffModal({ open, onClose, oldStack, newStack }) {
  if (!open) return null;
  // Reconcile by name: build aligned rows.
  const byName = {};
  oldStack.forEach((g, i) => {
    byName[g.name] = { old: g, oldIdx: i };
  });
  newStack.forEach((g, i) => {
    if (!byName[g.name]) byName[g.name] = {};
    byName[g.name].new = g;
    byName[g.name].newIdx = i;
  });
  const allNames = Array.from(
    new Set([...oldStack.map((g) => g.name), ...newStack.map((g) => g.name)]),
  );

  const rows = allNames.map((name) => {
    const r = byName[name];
    let kind = "unchanged";
    if (r.old && !r.new) kind = "removed";
    else if (!r.old && r.new) kind = "added";
    else if (r.old && r.new) {
      const oldSummary = r.old.summary || gateSummaryString(r.old);
      const newSummary = gateSummaryString(r.new);
      if (oldSummary !== newSummary) kind = "changed";
    }
    return { name, ...r, kind };
  });

  const counts = {
    added: rows.filter((r) => r.kind === "added").length,
    removed: rows.filter((r) => r.kind === "removed").length,
    changed: rows.filter((r) => r.kind === "changed").length,
  };

  return (
    <GModal
      open={open}
      onClose={onClose}
      size="xl"
      icon={<IconDiff size={15} />}
      title="Diff v3 → v4"
      subtitle={`${counts.added} added · ${counts.changed} changed · ${counts.removed} removed`}
      footer={
        <>
          <div className="left">
            <IconClock size={12} /> Publishing applies this diff in one atomic commit.
          </div>
          <div className="right">
            <button className="btn btn-ghost" onClick={onClose}>
              Close
            </button>
            <button className="btn btn-primary">
              <IconRocket size={11} /> Publish v4
            </button>
          </div>
        </>
      }
    >
      <div className="diff-grid">
        <div className="col">
          <div className="col-hd">
            <IconHistory size={11} /> v3 · live
          </div>
          {rows.map((r, i) => (
            <div
              key={i}
              className={`diff-row ${r.old ? (r.kind === "changed" ? "changed" : r.kind === "removed" ? "removed" : "") : "empty"}`}
            >
              <span className="marker">
                {r.old ? (r.kind === "removed" ? "−" : r.kind === "changed" ? "~" : " ") : " "}
              </span>
              {r.old ? (
                <>
                  <span className="body">
                    {r.old.name} · {r.old.summary || gateSummaryString(r.old)}
                  </span>
                  <span className="pct">
                    {r.old.type === "rollout"
                      ? `${r.old.percentage ?? "—"}%`
                      : `${r.old.rules?.length ?? "?"} rule`}
                  </span>
                </>
              ) : (
                <span className="body">—</span>
              )}
            </div>
          ))}
        </div>
        <div className="col">
          <div className="col-hd">
            <IconLayers size={11} /> v4 · draft
          </div>
          {rows.map((r, i) => (
            <div
              key={i}
              className={`diff-row ${r.new ? (r.kind === "changed" ? "changed" : r.kind === "added" ? "added" : "") : "empty"}`}
            >
              <span className="marker">
                {r.new ? (r.kind === "added" ? "+" : r.kind === "changed" ? "~" : " ") : " "}
              </span>
              {r.new ? (
                <>
                  <span className="body">
                    {r.new.name} · {gateSummaryString(r.new)}
                  </span>
                  <span className="pct">
                    {r.new.type === "rollout"
                      ? `${r.new.percentage ?? 0}%`
                      : `${r.new.rules?.length ?? 0} rule`}
                  </span>
                </>
              ) : (
                <span className="body">—</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </GModal>
  );
}

function gateSummaryString(g) {
  if (g.type === "rollout") return `${g.percentage || 0}% bucket on ${g.bucketBy || "user.id"}`;
  if (!g.rules || g.rules.length === 0) return "no rules";
  const r = g.rules[0];
  const more =
    g.rules.length > 1 ? ` +${g.rules.length - 1} ${g.pass === "any" ? "OR" : "AND"}` : "";
  return `${r.attr} ${r.op} ${r.value || "∅"}${more}`;
}

// History drawer (slide-in right)
function HistoryDrawer({ open, mode = "versions", onClose }) {
  gmEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose && onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;

  const isAudit = mode === "audit";

  return (
    <>
      <div className="drawer-bd" onClick={onClose} />
      <div className="drawer">
        <div className="dw-hd">
          <div className="icn">{isAudit ? <IconList2 size={15} /> : <IconHistory size={15} />}</div>
          <div style={{ flex: 1 }}>
            <div className="ttl">{isAudit ? "Audit log" : "Version history"}</div>
            <div className="sub">
              {isAudit ? "every mutation" : `${VERSIONS.length} versions · acme/premium_features`}
            </div>
          </div>
          <button className="ic-btn" onClick={onClose} title="Close (Esc)">
            <IconX size={14} />
          </button>
        </div>
        <div className="dw-body">
          {!isAudit &&
            VERSIONS.map((v, i) => {
              const m = memberByName(v.who);
              return (
                <div key={v.v} className={`ver-item ${v.state === "draft" ? "current" : ""}`}>
                  <span className="v-id">{v.v}</span>
                  <div className="v-body">
                    <div
                      className="v-who"
                      style={{ display: "flex", alignItems: "center", gap: 8 }}
                    >
                      <span className="av av-sm" style={{ background: avBg(m.hue) }}>
                        {m.init}
                      </span>
                      {v.who}
                    </div>
                    <div className="v-when">{v.when}</div>
                    <div className="v-note">{v.note}</div>
                  </div>
                  <div className="v-acts">
                    <span className={`v-state ${v.state}`}>{v.state}</span>
                    <button className="row-edit-btn">
                      <IconDiff size={10} /> Diff
                    </button>
                    {v.state !== "draft" && v.state !== "live" && (
                      <button className="row-edit-btn">
                        <IconRefresh size={10} /> Restore
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

          {isAudit &&
            AUDIT_LOG.map((a, i) => {
              const m = memberByName(a.who);
              return (
                <div
                  key={i}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "auto 1fr",
                    gap: 12,
                    padding: "14px 20px",
                    borderBottom: "1px solid var(--line)",
                  }}
                >
                  <span className="av av-sm" style={{ background: avBg(m.hue), marginTop: 4 }}>
                    {m.init}
                  </span>
                  <div>
                    <div style={{ fontSize: 13, color: "var(--fg)" }}>
                      <b style={{ fontWeight: 500 }}>{a.who}</b>{" "}
                      <span style={{ color: "var(--fg-3)" }}>{a.what}</span>
                    </div>
                    <div
                      style={{
                        fontFamily: "var(--mono)",
                        fontSize: 11.5,
                        color: "var(--fg-3)",
                        marginTop: 3,
                        lineHeight: 1.5,
                      }}
                    >
                      {a.detail}
                    </div>
                    <div
                      style={{
                        fontFamily: "var(--mono)",
                        fontSize: 10.5,
                        color: "var(--fg-4)",
                        marginTop: 4,
                      }}
                    >
                      {a.t}
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </>
  );
}

Object.assign(window, {
  KillswitchConfirmModal,
  AddOverrideModal,
  RegisterAttributeModal,
  DiffModal,
  HistoryDrawer,
  gateSummaryString,
});
