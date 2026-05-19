// Step components: Details, Gates (list), Review

const { useState: gsState, useEffect: gsEffect, useMemo: gsMemo, Fragment: GsFrag } = React;

// ─── Step 1 — Details (read-mostly summary card) ──────────────────
function StepDetails({ details, onEdit, killswitch, onKillswitchToggle }) {
  const owner = memberByName(details.owner);
  return (
    <>
      <div className="step-head">
        <div>
          <div className="stem">step 1 · metadata</div>
          <h2>Where does this gatekeeper live?</h2>
          <p>
            Title, description, and the SDK key consumers will fetch with. Most of these are
            answered when you draft the gatekeeper — the editor below is for tweaks and a fuller
            description.
          </p>
        </div>
        <span className="pill-stat valid">
          <IconCheck2 size={11} /> ready
        </span>
      </div>

      <div className="cc-card">
        <div className="cc-hd">
          <span className="ttl">Identity</span>
          <span className="sub">acme/{details.key}</span>
          <button className="row-edit-btn" style={{ marginLeft: "auto" }} onClick={onEdit}>
            <IconEdit size={11} /> Edit details
          </button>
        </div>

        <div className="cf-row">
          <span className="lbl">Title</span>
          <div>
            <div className="ed-input">
              <input value={details.title} readOnly />
            </div>
            <div className="help">The friendly name shown in lists and audit logs.</div>
          </div>
        </div>
        <div className="cf-row">
          <span className="lbl">Key</span>
          <div>
            <div className="ed-input mono disabled">
              <span className="pre">acme/</span>
              <input value={details.key} readOnly />
              <span className="lock">
                <span className="tip-wrap">
                  <IconLock size={11} />
                  <span className="tip">
                    Frozen after first publish — SDKs reference this string
                  </span>
                </span>
              </span>
            </div>
            <div className="help">
              SDK consumers fetch with <code>shipeasy.gate("{details.key}")</code>.
            </div>
          </div>
        </div>
        <div className="cf-row">
          <span className="lbl">Description</span>
          <div>
            <textarea className="ed-textarea" value={details.description} readOnly />
            <div className="help">
              Markdown allowed. Surfaces in the consumer SDK and the audit feed.
            </div>
          </div>
        </div>
        <div className="cf-row">
          <span className="lbl">Folder · Group</span>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="cmb">
              <span className="chip">{details.folder}</span>
              <input placeholder="type to create…" readOnly style={{ cursor: "default" }} />
            </div>
            <div className="cmb">
              <span className="chip">{details.group}</span>
              <input placeholder="type to create…" readOnly style={{ cursor: "default" }} />
            </div>
          </div>
        </div>
        <div className="cf-row">
          <span className="lbl">Owner</span>
          <div>
            <button className="owner-pill" onClick={onEdit}>
              <span className="av av-md" style={{ background: avBg(owner.hue) }}>
                {owner.init}
              </span>
              <span>{owner.name}</span>
              <span
                style={{
                  fontFamily: "var(--mono)",
                  fontSize: 11,
                  color: "var(--fg-3)",
                  marginLeft: 6,
                }}
              >
                {owner.email}
              </span>
              <span className="chev">
                <IconChevDown size={12} />
              </span>
            </button>
            <div className="help">Audit alerts route here. Webhooks attach this user as actor.</div>
          </div>
        </div>
        <div className="cf-row">
          <span className="lbl">Killswitch</span>
          <div>
            <div
              className={`ks-banner ${killswitch ? "on" : ""}`}
              style={{ padding: "10px 14px", borderRadius: "var(--r-md)" }}
            >
              <div className="icn">
                <IconAlert size={16} />
              </div>
              <div className="body">
                <div className="ttl">
                  Master killswitch
                  <b>{killswitch ? "ENGAGED" : "standby"}</b>
                </div>
                <div className="sub">
                  When engaged, <code>shipeasy.gate("{details.key}")</code> returns
                  <b
                    style={{
                      color: killswitch ? "var(--danger)" : "var(--fg)",
                      fontWeight: 500,
                      padding: "0 4px",
                    }}
                  >
                    false
                  </b>
                  for every caller — bypasses the entire stack. Use this when you need to disable a
                  feature instantly in production.
                </div>
              </div>
              <button
                className={`ks-switch ${killswitch ? "on" : ""}`}
                onClick={onKillswitchToggle}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Step 2 — Gates list ──────────────────────────────────────────
function StepGates({
  gates,
  onUpd,
  onAdd,
  onPickTemplate,
  onEditGate,
  onSaveAsTemplate,
  overrides = [],
  onAddOverride,
  onRegisterAttribute,
}) {
  const dragging = useRef(null);
  const [overIdx, setOverIdx] = gsState(null);
  const [expandedId, setExpandedId] = gsState(gates.find((g) => !g.locked)?.id || null);
  const [activeFixture, setActiveFixture] = gsState(FIXTURES[0].id);
  const [evalMode, setEvalMode] = gsState("local");
  const [overridesOpen, setOverridesOpen] = gsState(true);
  const updateGate = (updated) => onUpd(gates.map((x) => (x.id === updated.id ? updated : x)));
  const toggleExpand = (id) => setExpandedId((prev) => (prev === id ? null : id));

  const movableCount = gates.filter((g) => !g.locked).length;

  // ── Evaluate the current fixture against the stack (mocked) ─────
  const fixture = FIXTURES.find((f) => f.id === activeFixture) || FIXTURES[0];
  const fixtureAttrs = fixture.attrs;
  const hasOverride = overrides.find((o) => o.user_id === fixtureAttrs["user.id"]);

  function ruleMatches(r) {
    const v = fixtureAttrs[r.attr];
    if (v == null || v === "(unset)") return false;
    const expected = (r.value || "").trim();
    switch (r.op) {
      case "equals":
        return String(v) === expected;
      case "not_equals":
        return String(v) !== expected;
      case "is":
        return String(v) === expected;
      case "is_not":
        return String(v) !== expected;
      case "contains":
        return String(v).includes(expected);
      case "starts_with":
        return String(v).startsWith(expected);
      case "ends_with":
        return String(v).endsWith(expected);
      case "in":
        return expected
          .split(",")
          .map((s) => s.trim())
          .includes(String(v));
      case "not_in":
        return !expected
          .split(",")
          .map((s) => s.trim())
          .includes(String(v));
      case "matches":
        try {
          return new RegExp(expected).test(String(v));
        } catch (e) {
          return false;
        }
      default:
        return false;
    }
  }
  function gateMatches(g) {
    if (g.type === "rollout") {
      // Sticky hash mock — deterministic per fixture id
      const seed = (fixture.id + (g.salt || "")).split("").reduce((a, c) => a + c.charCodeAt(0), 0);
      return seed % 100 < (g.percentage || 0);
    }
    if (!g.rules || g.rules.length === 0) return true;
    if (g.pass === "any") return g.rules.some(ruleMatches);
    return g.rules.every(ruleMatches);
  }
  let firstPassIdx = -1;
  const rowVerdicts = gates.map((g, i) => {
    if (firstPassIdx >= 0) return "skip";
    const m = gateMatches(g);
    if (m) {
      firstPassIdx = i;
      return "pass";
    }
    return "fail";
  });
  const verdict = hasOverride
    ? hasOverride.force === "TRUE"
      ? "PASS"
      : "DENY"
    : firstPassIdx >= 0
      ? "PASS"
      : "DENY";
  const firstPassReason = hasOverride
    ? `Override → ${hasOverride.force}`
    : firstPassIdx >= 0
      ? `${autoTitle(gates[firstPassIdx])} matched first`
      : "No gate matched — fell to public floor";

  // ── Surface attribute warnings (referenced but unset)
  const warnings = [];
  gates.forEach((g) => {
    (g.rules || []).forEach((r) => {
      if (fixtureAttrs[r.attr] == null || fixtureAttrs[r.attr] === "(unset)") {
        if (!warnings.find((w) => w.attr === r.attr)) {
          warnings.push({
            attr: r.attr,
            msg: `referenced in "${autoTitle(g)}" but not set in fixture — treated as miss`,
          });
        }
      }
    });
  });

  function move(idx, dir) {
    const target = idx + dir;
    if (target < 0 || target >= gates.length) return;
    if (gates[target].locked) return;
    if (gates[idx].locked) return;
    const next = gates.slice();
    [next[idx], next[target]] = [next[target], next[idx]];
    onUpd(next);
  }

  function dup(idx) {
    const g = gates[idx];
    if (g.locked) return;
    const copy = {
      ...g,
      id: gid(),
      name: g.name + " (copy)",
      rules: g.rules ? g.rules.map((r) => ({ ...r, id: gid() })) : undefined,
    };
    const next = gates.slice();
    next.splice(idx + 1, 0, copy);
    onUpd(next);
  }

  function rm(idx) {
    if (gates[idx].locked) return;
    onUpd(gates.filter((_, i) => i !== idx));
  }

  return (
    <>
      <div className="step-head">
        <div>
          <div className="stem">step 2 · authoring</div>
          <h2>Stack the gates</h2>
          <p>
            Gates evaluate top to bottom. The first one that returns{" "}
            <span style={{ fontFamily: "var(--mono)", color: "var(--accent)" }}>true</span> wins —
            everything below it is skipped. The last gate is hardcoded <b>public</b> rollout; you
            can dial it 0–100 but can't remove it.
          </p>
        </div>
        <span className="pill-stat valid">
          <IconCheck2 size={11} /> {gates.length} gate{gates.length === 1 ? "" : "s"} ·{" "}
          {movableCount} editable
        </span>
      </div>

      <div className="cc-card">
        <div className="sv-toolbar">
          <button className="add-root" onClick={onPickTemplate}>
            <IconPlus size={12} /> Add gate
            <span style={{ fontFamily: "var(--mono)", fontSize: 10, opacity: 0.75, marginLeft: 4 }}>
              from template
            </span>
          </button>
          <button
            className="secondary-act"
            onClick={() =>
              onAdd({
                type: "condition",
                name: "Untitled condition",
                pass: "all",
                rules: [{ id: gid(), attr: "user.id", op: "equals", value: "" }],
              })
            }
          >
            <IconPlus size={11} /> Blank condition
          </button>
          <button
            className="secondary-act"
            onClick={() =>
              onAdd({
                type: "rollout",
                name: "Untitled rollout",
                percentage: 10,
                bucketBy: "user.id",
                salt: "rollout",
              })
            }
          >
            <IconSliders size={11} /> Blank rollout
          </button>
          <span
            style={{
              marginLeft: "auto",
              fontFamily: "var(--mono)",
              fontSize: 11,
              color: "var(--fg-3)",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <IconHash size={11} /> {gates.length} stacked · evaluation top → bottom
          </span>
        </div>

        <div className="gk-eval-flow">
          <IconArrowRight size={11} />
          <span>If any gate above passes, the gatekeeper returns </span>
          <b>true</b>
          <span className="arrow">·</span>
          <span>otherwise falls through to </span>
          <b>public {gates[gates.length - 1]?.percentage ?? 0}%</b>
        </div>

        <div className="gk-stack">
          {gates.map((g, idx) => (
            <div style={{ display: "contents" }} key={g.id}>
              <div
                className={`gk-gate t-${g.type} ${g.locked ? "locked" : ""} ${expandedId === g.id ? "expanded" : ""}`}
                onClick={() => toggleExpand(g.id)}
                style={
                  expandedId === g.id
                    ? { background: "color-mix(in oklab, var(--accent) 5%, var(--bg-1))" }
                    : {}
                }
              >
                <div className="order">
                  <span className="grip">
                    <span></span>
                    <span></span>
                    <span></span>
                    <span></span>
                  </span>
                  <span className="n">{String(idx + 1).padStart(2, "0")}</span>
                </div>
                <div className="badge-ico">
                  {g.locked ? (
                    <IconLock size={15} />
                  ) : g.type === "rollout" ? (
                    <IconSliders size={15} />
                  ) : (
                    <IconBranch size={15} />
                  )}
                </div>
                <div className="body">
                  <div className="name">
                    {autoTitle(g)}
                    {g.type === "rollout" ? (
                      <span className="pill roll">rollout</span>
                    ) : (
                      <span className="pill cond">condition</span>
                    )}
                    {g.fromTemplate && !g.locked && (
                      <span className="pill tmpl">tpl · {g.fromTemplate}</span>
                    )}
                    {g.locked && (
                      <span
                        className="pill"
                        style={{
                          color: "var(--fg-2)",
                          background: "color-mix(in oklab, var(--fg-3) 8%, transparent)",
                        }}
                      >
                        <IconLock size={9} style={{ marginRight: 2, verticalAlign: -1 }} />
                        locked floor
                      </span>
                    )}
                  </div>
                  <div className="summary">{gateSummary(g)}</div>
                </div>

                {/* Pass column — different for rollout vs condition */}
                <div onClick={(e) => e.stopPropagation()}>
                  {g.type === "rollout" ? (
                    <div className={`mini-roll ${g.locked ? "locked" : ""}`}>
                      <span className={`num ${(g.percentage || 0) === 0 ? "zero" : ""}`}>
                        {g.percentage || 0}%
                      </span>
                      <div className="track">
                        <div className="bar">
                          <div className="fill" style={{ width: (g.percentage || 0) + "%" }} />
                        </div>
                        <div className="knob" style={{ left: (g.percentage || 0) + "%" }} />
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={g.percentage || 0}
                          onChange={(e) => {
                            const v = Number(e.target.value);
                            onUpd(gates.map((x) => (x.id === g.id ? { ...x, percentage: v } : x)));
                          }}
                          title={`${autoTitle(g)} — ${g.percentage || 0}%`}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="gk-pass cond">
                      <span className="top">
                        {g.pass === "any" ? "ANY of" : "ALL of"}{" "}
                        <b style={{ color: "var(--fg-2)" }}>{g.rules?.length || 0}</b>
                      </span>
                      <div className="bar">
                        <div
                          className="fill"
                          style={{ width: Math.min(100, (g.rules?.length || 0) * 25) + "%" }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="gk-state" onClick={(e) => e.stopPropagation()}>
                  <span style={{ fontFamily: "var(--mono)", fontSize: 10.5, color: "var(--fg-3)" }}>
                    {g.evals !== "—" ? g.evals + " evals · " : ""}
                    {g.traffic ? g.traffic + "%" : ""}
                  </span>
                </div>

                <div className="gk-actions" onClick={(e) => e.stopPropagation()}>
                  <button
                    className="ic-btn"
                    title="Move up"
                    onClick={() => move(idx, -1)}
                    disabled={idx === 0 || g.locked}
                    style={idx === 0 || g.locked ? { opacity: 0.3, pointerEvents: "none" } : {}}
                  >
                    <_Icon size={12}>
                      <polyline points="18 15 12 9 6 15" />
                    </_Icon>
                  </button>
                  <button
                    className="ic-btn"
                    title="Move down"
                    onClick={() => move(idx, 1)}
                    disabled={idx >= gates.length - 2 || g.locked}
                    style={
                      idx >= gates.length - 2 || g.locked
                        ? { opacity: 0.3, pointerEvents: "none" }
                        : {}
                    }
                  >
                    <_Icon size={12}>
                      <polyline points="6 9 12 15 18 9" />
                    </_Icon>
                  </button>
                  <button
                    className="ic-btn"
                    title={expandedId === g.id ? "Collapse" : "Edit gate"}
                    onClick={() => toggleExpand(g.id)}
                  >
                    {expandedId === g.id ? (
                      <_Icon size={12}>
                        <polyline points="18 15 12 9 6 15" />
                      </_Icon>
                    ) : (
                      <IconEdit size={12} />
                    )}
                  </button>
                  <button
                    className="ic-btn"
                    title="Save as template"
                    onClick={() => onSaveAsTemplate(g)}
                    disabled={g.locked}
                    style={g.locked ? { opacity: 0.3, pointerEvents: "none" } : {}}
                  >
                    <IconBookmark size={12} />
                  </button>
                  <button
                    className="ic-btn"
                    title="Duplicate"
                    onClick={() => dup(idx)}
                    disabled={g.locked}
                    style={g.locked ? { opacity: 0.3, pointerEvents: "none" } : {}}
                  >
                    <IconCopy2 size={12} />
                  </button>
                  <button
                    className="ic-btn danger"
                    title="Remove"
                    onClick={() => rm(idx)}
                    disabled={g.locked}
                    style={g.locked ? { opacity: 0.3, pointerEvents: "none" } : {}}
                  >
                    <IconTrash size={12} />
                  </button>
                </div>
              </div>
              {expandedId === g.id && (
                <GateInlineEditor
                  gate={g}
                  onChange={updateGate}
                  onSaveAsTemplate={onSaveAsTemplate}
                  onClose={() => setExpandedId(null)}
                />
              )}
            </div>
          ))}
        </div>

        <div className="gk-add-cta">
          <button className="add-root" onClick={onPickTemplate}>
            <IconPlus size={12} /> Add gate above the public floor
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        {/* Test against a fixture or user */}
        <div className="cc-card">
          <div className="cc-hd">
            <span className="ttl">Test against a user</span>
            <span className="sub">live · 2.4ms</span>
            <button className="ic-btn" style={{ marginLeft: "auto" }} title="Re-run">
              <IconRefresh size={11} />
            </button>
          </div>
          <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
            {/* Saved fixtures chip row */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span
                style={{
                  fontFamily: "var(--mono)",
                  fontSize: 10.5,
                  letterSpacing: ".06em",
                  textTransform: "uppercase",
                  color: "var(--fg-4)",
                }}
              >
                Fixtures
              </span>
              <span style={{ fontFamily: "var(--mono)", fontSize: 10.5, color: "var(--fg-3)" }}>
                · {FIXTURES.length} saved
              </span>
            </div>
            <div className="fix-row">
              {FIXTURES.map((fx) => (
                <button
                  key={fx.id}
                  className={`fix-chip ${activeFixture === fx.id ? "active" : ""}`}
                  onClick={() => setActiveFixture(fx.id)}
                >
                  <span className="av" style={{ background: avBg(fx.hue) }}>
                    {fx.init}
                  </span>
                  {fx.label}
                </button>
              ))}
              <button className="fix-chip save">
                <IconBookmark size={10} /> Save current
              </button>
            </div>

            {/* Live evaluate mode toggle */}
            <div className="eval-mode">
              <div className="mode-pick">
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--fg)",
                    fontWeight: 500,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <IconZap
                    size={11}
                    style={{ color: evalMode === "live" ? "var(--warn)" : "var(--fg-3)" }}
                  />
                  Evaluate using
                </div>
                {evalMode === "live" && (
                  <div className="key-row">
                    via{" "}
                    <select defaultValue="pk_test_dev">
                      {SDK_KEYS.map((k) => (
                        <option key={k.id} value={k.id}>
                          {k.label} · {k.env}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                {evalMode === "local" && (
                  <div className="key-row">in-browser evaluation · no network</div>
                )}
              </div>
              <div className="seg">
                <button
                  className={evalMode === "local" ? "active" : ""}
                  onClick={() => setEvalMode("local")}
                >
                  Local <span className="tok">preview</span>
                </button>
                <button
                  className={evalMode === "live" ? "active" : ""}
                  onClick={() => setEvalMode("live")}
                >
                  Worker <span className="tok">real</span>
                </button>
              </div>
            </div>

            {/* Verdict */}
            <div
              className={`result-stripe ${verdict === "DENY" ? "deny" : ""}`}
              style={{ padding: "12px 14px" }}
            >
              <div className="label">verdict</div>
              <div className="v">{verdict}</div>
              <span
                style={{
                  marginLeft: "auto",
                  fontFamily: "var(--mono)",
                  fontSize: 10.5,
                  color: verdict === "DENY" ? "var(--danger)" : "var(--accent)",
                }}
              >
                {firstPassReason}
              </span>
            </div>

            {/* Attribute state shown to evaluator */}
            <div
              style={{
                background: "var(--bg-2)",
                borderRadius: "var(--r-sm)",
                padding: "10px 12px",
                fontFamily: "var(--mono)",
                fontSize: 11,
                color: "var(--fg-2)",
                lineHeight: 1.7,
                border: "1px solid var(--line)",
              }}
            >
              {Object.entries(fixtureAttrs).map(([k, v]) => (
                <div key={k}>
                  <span style={{ color: "var(--fg-4)" }}>{k}</span> ={" "}
                  {typeof v === "string" && v.startsWith("(") ? (
                    <span style={{ color: "var(--fg-4)" }}>{v}</span>
                  ) : (
                    `"${v}"`
                  )}
                </div>
              ))}
            </div>

            {/* Per-row verdicts */}
            <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 2 }}>
              {hasOverride && (
                <div className="test-row override">
                  <span
                    style={{
                      fontFamily: "var(--mono)",
                      fontSize: 10,
                      color: "var(--fg-4)",
                      width: 18,
                    }}
                  >
                    OV
                  </span>
                  <span className="pill">FORCE</span>
                  <span className="lbl">
                    Override · {hasOverride.user_id} → {hasOverride.force}
                  </span>
                  <span className="ov-flag">short-circuit</span>
                </div>
              )}
              {gates.map((g, i) => {
                if (hasOverride) {
                  return (
                    <div key={g.id} className="test-row skip" style={{ opacity: 0.35 }}>
                      <span
                        style={{
                          fontFamily: "var(--mono)",
                          fontSize: 10,
                          color: "var(--fg-4)",
                          width: 18,
                        }}
                      >
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="pill">BYPASS</span>
                      <span className="lbl">{autoTitle(g)}</span>
                      <span className="meta">
                        {g.type === "rollout"
                          ? `${g.percentage || 0}%`
                          : `${g.rules?.length || 0} rule`}
                      </span>
                    </div>
                  );
                }
                const verdict = rowVerdicts[i] || "skip";
                return (
                  <div key={g.id} className={`test-row ${verdict}`}>
                    <span
                      style={{
                        fontFamily: "var(--mono)",
                        fontSize: 10,
                        color: "var(--fg-4)",
                        width: 18,
                      }}
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="pill">{verdict.toUpperCase()}</span>
                    <span className="lbl">{autoTitle(g)}</span>
                    <span className="meta">
                      {g.type === "rollout"
                        ? `${g.percentage || 0}%`
                        : `${g.rules?.length || 0} rule`}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Attribute warnings */}
            {warnings.length > 0 && (
              <div className="warn-list">
                <div className="w-hd">
                  <IconAlert size={11} /> Attribute warnings · {warnings.length}
                </div>
                {warnings.map((w, i) => (
                  <div key={i} className="w-item">
                    <span
                      style={{
                        color: "var(--warn)",
                        fontFamily: "var(--mono)",
                        fontSize: 10,
                        flexShrink: 0,
                        marginTop: 2,
                      }}
                    >
                      !
                    </span>
                    <span>
                      <code>{w.attr}</code> {w.msg}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Available attributes — v2 sidebar */}
        <div className="cc-card">
          <div className="cc-hd">
            <span className="ttl">Available attributes</span>
            <span className="sub">click to use in selected gate</span>
            <span
              style={{
                marginLeft: "auto",
                fontFamily: "var(--mono)",
                fontSize: 10.5,
                color: "var(--fg-3)",
              }}
            >
              {Object.keys(ATTR_META).length} registered
            </span>
          </div>
          <div className="ge-attrs2" style={{ maxHeight: 540, overflowY: "auto" }}>
            {ATTR_GROUPS.map((grp) => (
              <div style={{ display: "contents" }} key={grp.g}>
                <div className="grp">
                  <span>{grp.label}</span>
                  {grp.auto && <span className="auto-pill">auto-resolved</span>}
                  <span style={{ marginLeft: "auto", color: "var(--fg-4)" }}>
                    {grp.attrs.length}
                  </span>
                </div>
                {grp.attrs.map((a) => {
                  const meta = ATTR_META[a.k] || {};
                  return (
                    <div
                      key={a.k}
                      className="attr-card"
                      onClick={() => {
                        const target = gates.find((x) => x.id === expandedId);
                        if (!target || target.locked || target.type === "rollout") return;
                        const nextRules = [
                          ...(target.rules || []),
                          { id: gid(), attr: a.k, op: opsFor(a.k)[0][0], value: "" },
                        ];
                        updateGate({ ...target, rules: nextRules });
                      }}
                    >
                      <div className="row1">
                        <span className="key">{a.k}</span>
                        <span className={`type ${meta.type || "string"}`}>
                          {meta.type || "string"}
                        </span>
                        {meta.required && <span className="req">required</span>}
                        <span className="add" title="Add as rule">
                          <IconPlus size={11} />
                        </span>
                      </div>
                      <div className="desc">{a.desc}</div>
                      {meta.type === "enum" && meta.values && (
                        <div className="vals">
                          {meta.values.slice(0, 6).map((v) => (
                            <span key={v} className="ev">
                              {v}
                            </span>
                          ))}
                          {meta.values.length > 6 && (
                            <span className="ev">+{meta.values.length - 6}</span>
                          )}
                        </div>
                      )}
                      <div className="sdkp">
                        <IconCode size={9} /> <code>sdk.set("{meta.sdk || a.k}", …)</code>
                        <span style={{ marginLeft: "auto", color: "var(--fg-4)" }}>
                          e.g. {a.ex}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
            <div className="register-row">
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => onRegisterAttribute && onRegisterAttribute()}
              >
                <IconPlus size={11} /> Register new attribute
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Overrides — collapsible */}
      <div className="cc-card">
        <div
          className={`col-sec-hd ${overridesOpen ? "open" : ""}`}
          onClick={() => setOverridesOpen(!overridesOpen)}
        >
          <span className="chev">
            <IconChevRight size={12} />
          </span>
          <IconUserPin size={13} style={{ color: "var(--purple)" }} />
          <span className="ttl">Overrides</span>
          <span className="count">{overrides.length}</span>
          <span style={{ fontSize: 11.5, color: "var(--fg-3)" }}>
            force TRUE / FALSE per user, short-circuits the whole stack
          </span>
          <button
            className="row-edit-btn add"
            onClick={(e) => {
              e.stopPropagation();
              onAddOverride && onAddOverride();
            }}
          >
            <IconPlus size={11} /> Add override
          </button>
        </div>
        {overridesOpen && (
          <div className="ov-table">
            <div className="ov-row head">
              <span>User · email</span>
              <span>Force</span>
              <span>Reason</span>
              <span>Expires</span>
              <span></span>
            </div>
            {overrides.map((o) => (
              <div key={o.id} className="ov-row">
                <span className="key">{o.user_id}</span>
                <span>
                  <span className={`ov-pill ${o.force === "TRUE" ? "t" : "f"}`}>
                    {o.force === "TRUE" ? <IconCheckSm size={9} /> : <IconX size={9} />}
                    {o.force}
                  </span>
                </span>
                <span className="reason">{o.reason}</span>
                <span className="expiry">{o.expiry}</span>
                <button className="ic-btn danger" title="Remove">
                  <IconTrash size={11} />
                </button>
              </div>
            ))}
            {overrides.length === 0 && (
              <div
                style={{
                  padding: "18px 16px",
                  textAlign: "center",
                  color: "var(--fg-3)",
                  fontSize: 12.5,
                }}
              >
                No overrides yet. Add one to force a specific user past or below the gate stack.
              </div>
            )}
          </div>
        )}
      </div>

      <div className="hint-bar">
        <IconBookOpen size={13} style={{ color: "var(--accent)", flexShrink: 0 }} />
        <div>
          <b>Tip.</b> Order matters. Put broad allows (employees, beta cohort) at the top so they
          don't get bucketed into a partial rollout below. Click a gate to expand it inline; the
          attributes panel on the right adds a new rule to whichever gate is expanded.
        </div>
      </div>
    </>
  );
}

// ─── Step 3 — Review ─────────────────────────────────────────────
function StepReview({ details, gates, onShowSdk, onShowDiff, killswitch }) {
  const condCount = gates.filter((g) => g.type === "condition" && !g.locked).length;
  const rollCount = gates.filter((g) => g.type === "rollout" && !g.locked).length;
  const publicG = gates[gates.length - 1];
  const [sdkLang, setSdkLang] = gsState("ts");

  return (
    <>
      <div className="step-head">
        <div>
          <div className="stem">step 3 · publish</div>
          <h2>Review and integrate</h2>
          <p>
            One last look at the stack and the SDK call sites this gatekeeper will be reachable
            from. Publishing creates a new version — clients fetching{" "}
            <code
              style={{
                fontFamily: "var(--mono)",
                background: "var(--bg-3)",
                padding: "1px 5px",
                borderRadius: 3,
              }}
            >
              {details.key}
            </code>{" "}
            after rollout see it within ~30 s.
          </p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
          <span className="pill-stat draft">
            <IconEdit size={11} /> draft v4 · unpublished
          </span>
          <span className="kv-ind pending">
            <span className="dot" /> Pending publish · KV will sync in ~30s
          </span>
        </div>
      </div>

      {killswitch && (
        <div className="ks-banner on" style={{ padding: "10px 14px" }}>
          <div className="icn">
            <IconAlert size={16} />
          </div>
          <div className="body">
            <div className="ttl">
              Killswitch is engaged <b>FORCING FALSE</b>
            </div>
            <div className="sub">
              Publishing this draft does <b>not</b> disengage the killswitch — go back to step 1 to
              flip it off if you want the new stack to evaluate.
            </div>
          </div>
        </div>
      )}

      <div className="rv-grid">
        <div className="cc-card rv-list">
          <div className="cc-hd">
            <span className="ttl">Summary</span>
            <span className="sub">v3 → v4 (draft)</span>
            <button className="row-edit-btn" style={{ marginLeft: "auto" }} onClick={onShowDiff}>
              <IconDiff size={11} /> View diff
            </button>
          </div>
          <div className="rv-item">
            <span className="lbl">Title</span>
            <span className="val">{details.title}</span>
          </div>
          <div className="rv-item">
            <span className="lbl">Key</span>
            <span className="val mono">acme/{details.key}</span>
          </div>
          <div className="rv-item">
            <span className="lbl">Folder · Group</span>
            <span className="val mono">
              {details.folder} / {details.group}
            </span>
          </div>
          <div className="rv-item">
            <span className="lbl">Description</span>
            <span className="val dim">{details.description}</span>
          </div>
          <div className="rv-item">
            <span className="lbl">Owner</span>
            <span className="val" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {(() => {
                const o = memberByName(details.owner);
                return (
                  <>
                    <span className="av av-sm" style={{ background: avBg(o.hue) }}>
                      {o.init}
                    </span>{" "}
                    {o.name}
                  </>
                );
              })()}
            </span>
          </div>
          <div className="rv-item">
            <span className="lbl">Gates</span>
            <span className="val">
              <b style={{ fontWeight: 500 }}>{gates.length}</b> total
              <span style={{ color: "var(--fg-3)" }}>
                {" "}
                · {condCount} condition{condCount === 1 ? "" : "s"}· {rollCount} rollout
                {rollCount === 1 ? "" : "s"}· 1 public floor at{" "}
                <b style={{ color: "var(--fg-2)", fontFamily: "var(--mono)" }}>
                  {publicG?.percentage}%
                </b>
              </span>
            </span>
          </div>
          <div className="rv-item">
            <span className="lbl">Evaluation</span>
            <span className="val mono dim">top → bottom · short-circuit on first PASS</span>
          </div>
          <div className="rv-item">
            <span className="lbl">Killswitch</span>
            <span className="val">
              {killswitch ? (
                <span style={{ color: "var(--danger)", fontFamily: "var(--mono)", fontSize: 12 }}>
                  <IconAlert size={11} style={{ verticalAlign: -2 }} /> ENGAGED — forces FALSE
                </span>
              ) : (
                <span style={{ color: "var(--fg-3)", fontFamily: "var(--mono)", fontSize: 12 }}>
                  standby
                </span>
              )}
            </span>
          </div>
        </div>

        <div className="cc-card">
          <div className="cc-hd">
            <span className="ttl">Gate stack preview</span>
            <span className="sub">flow</span>
          </div>
          <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 8 }}>
            {gates.map((g, i) => (
              <div style={{ display: "contents" }} key={g.id}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 12px",
                    background: "var(--bg-2)",
                    border: "1px solid var(--line)",
                    borderRadius: "var(--r-sm)",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--mono)",
                      fontSize: 11,
                      color: "var(--fg-4)",
                      width: 24,
                    }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 6,
                      display: "grid",
                      placeItems: "center",
                      background: g.locked
                        ? "var(--bg-3)"
                        : g.type === "rollout"
                          ? "color-mix(in oklab, var(--accent) 12%, var(--bg-3))"
                          : "color-mix(in oklab, var(--info) 12%, var(--bg-3))",
                      color: g.locked
                        ? "var(--fg-3)"
                        : g.type === "rollout"
                          ? "var(--accent)"
                          : "var(--info)",
                      border: "1px solid var(--line-2)",
                      flexShrink: 0,
                    }}
                  >
                    {g.locked ? (
                      <IconLock size={11} />
                    ) : g.type === "rollout" ? (
                      <IconSliders size={11} />
                    ) : (
                      <IconBranch size={11} />
                    )}
                  </div>
                  <span
                    style={{
                      flex: 1,
                      fontSize: 12.5,
                      color: "var(--fg-2)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {autoTitle(g)}
                  </span>
                  <span style={{ fontFamily: "var(--mono)", fontSize: 10.5, color: "var(--fg-3)" }}>
                    {g.type === "rollout"
                      ? `${g.percentage || 0}%`
                      : `${g.rules?.length || 0} rule${(g.rules?.length || 0) === 1 ? "" : "s"}`}
                  </span>
                </div>
                {i < gates.length - 1 && (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "center",
                      color: "var(--fg-4)",
                      fontFamily: "var(--mono)",
                      fontSize: 9.5,
                      letterSpacing: ".08em",
                    }}
                  >
                    ↓ FAIL
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="cc-card">
        <div className="cc-hd">
          <span className="ttl">Integrate</span>
          <span className="sub">copy-paste into your codebase</span>
          <button className="row-edit-btn" style={{ marginLeft: "auto" }} onClick={onShowSdk}>
            <IconCode size={11} /> Open in dialog
          </button>
        </div>
        <div className="sdk-tabs">
          {SDK_LANGS.map((l) => (
            <button
              key={l.k}
              className={sdkLang === l.k ? "active" : ""}
              onClick={() => setSdkLang(l.k)}
            >
              {l.label}
            </button>
          ))}
        </div>
        <div className="sdk-body">
          <button className="copy-fab">
            <IconCopy2 size={11} /> Copy
          </button>
          <pre>{sdkSnippets(details.key)[sdkLang]}</pre>
        </div>
      </div>

      {/* Publish vs Save-draft action card */}
      <div className="cc-card">
        <div className="cc-hd">
          <span className="ttl">Apply changes</span>
          <span className="sub">save draft · publish</span>
          <span className="kv-ind synced" style={{ marginLeft: "auto" }}>
            <span className="dot" /> v3 live · KV synced 2m ago
          </span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0 }}>
          <div
            style={{
              padding: "18px 20px",
              borderRight: "1px solid var(--line)",
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 8,
                  background: "var(--bg-3)",
                  border: "1px solid var(--line-2)",
                  display: "grid",
                  placeItems: "center",
                  color: "var(--fg-2)",
                }}
              >
                <IconEdit size={14} />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500 }}>Save draft</div>
                <div
                  style={{
                    fontFamily: "var(--mono)",
                    fontSize: 10.5,
                    color: "var(--fg-3)",
                    letterSpacing: ".04em",
                    textTransform: "uppercase",
                  }}
                >
                  no propagation
                </div>
              </div>
            </div>
            <div style={{ fontSize: 12.5, color: "var(--fg-3)", lineHeight: 1.55 }}>
              Keep editing — your draft is autosaved every change and shared with the team. SDK
              callers continue to see v3 results until you publish.
            </div>
            <button className="btn btn-secondary" style={{ alignSelf: "flex-start" }}>
              <IconEdit size={11} /> Save draft
            </button>
          </div>
          <div
            style={{
              padding: "18px 20px",
              display: "flex",
              flexDirection: "column",
              gap: 10,
              background: "color-mix(in oklab, var(--accent) 4%, transparent)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 8,
                  background: "color-mix(in oklab, var(--accent) 22%, var(--bg-3))",
                  border: "1px solid color-mix(in oklab, var(--accent) 40%, var(--line-2))",
                  display: "grid",
                  placeItems: "center",
                  color: "var(--accent)",
                }}
              >
                <IconRocket size={14} />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500 }}>Publish v4</div>
                <div
                  style={{
                    fontFamily: "var(--mono)",
                    fontSize: 10.5,
                    color: "var(--accent)",
                    letterSpacing: ".04em",
                    textTransform: "uppercase",
                  }}
                >
                  rebuilds KV · ~30 s propagation
                </div>
              </div>
            </div>
            <div style={{ fontSize: 12.5, color: "var(--fg-2)", lineHeight: 1.55 }}>
              Atomic commit. All SDKs fetching{" "}
              <code
                style={{
                  fontFamily: "var(--mono)",
                  background: "var(--bg-3)",
                  padding: "1px 5px",
                  borderRadius: 3,
                }}
              >
                {details.key}
              </code>{" "}
              switch to v4 within ~30 seconds. Webhook subscribers fire immediately.
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-ghost btn-sm" onClick={onShowDiff}>
                <IconDiff size={11} /> Review diff
              </button>
              <button className="btn btn-primary">
                <IconRocket size={11} /> Publish v4
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="hint-bar">
        <IconRocket size={13} style={{ color: "var(--accent)", flexShrink: 0 }} />
        <div>
          <b>Publishing</b> creates v4. Old SDK clients keep their cached v3 result for ~30 s before
          re-fetching. Webhook subscribers fire immediately. To stage instead, dial the public floor
          to 0% and roll specific gates first.
        </div>
      </div>
    </>
  );
}

Object.assign(window, { StepDetails, StepGates, StepReview });
