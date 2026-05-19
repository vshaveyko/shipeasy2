// Shipeasy — Configs list/edit page (two-pane: rail + editor + activity).
//
// Implements the /dashboard/[projectId]/configs/values surface from the PRD:
//  - left rail: search, groups by namespace, per-row meta, bulk-select
//  - right pane: meta strip + two-pane editor (schema | value) + activity feed
//  - empty state if zero configs
//  - delete (two-click), publish/draft/discard flows (mocked)

const { useState: clState, useMemo: clMemo, useEffect: clEffect } = React;

function ConfigsListPage() {
  // ── Configs state ─────────────────────────────────────────────
  const [configs, setConfigs] = clState(SEED_CONFIGS);
  const [activeId, setActiveId] = clState(SEED_CONFIGS[0]?.id || null);
  const [q, setQ] = clState("");

  // Bulk selection (rail)
  const [bulk, setBulk] = clState(new Set());
  const bulkMode = bulk.size > 0;

  // Modals
  const [showIntegration, setShowIntegration] = clState(false);
  const [showImport, setShowImport] = clState(false);
  const [confirmDelete, setConfirmDelete] = clState(null); // array of configs

  // Editor mode (visual / json)
  const [schemaMode, setSchemaMode] = clState("visual");
  const [schemaDirty, setSchemaDirty] = clState(false);
  const [valueDirty, setValueDirty] = clState(false);

  // Buffers — when activeId changes, snapshot schema + value
  const active = clMemo(() => configs.find((c) => c.id === activeId) || null, [configs, activeId]);

  const [schemaBuf, setSchemaBuf] = clState(() => active?.schema || []);
  const [valueBuf, setValueBuf] = clState(() => active?.draft?.value || active?.value || {});

  clEffect(() => {
    if (!active) return;
    setSchemaBuf(active.schema || []);
    setValueBuf(active.draft?.value || active.value || {});
    setSchemaDirty(false);
    setValueDirty(false);
    setSchemaMode("visual");
  }, [activeId]);

  // Auto-redirect on initial load if no active
  clEffect(() => {
    if (!activeId && configs.length) {
      const sorted = [...configs].sort((a, b) => a.name.localeCompare(b.name));
      setActiveId(sorted[0].id);
    }
  }, [configs.length]);

  const groups = clMemo(() => groupConfigs(configs, q), [configs, q]);

  // ── Actions ────────────────────────────────────────────────────
  function toggleBulk(id) {
    const next = new Set(bulk);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setBulk(next);
  }
  function clearBulk() {
    setBulk(new Set());
  }
  function doBulkDelete() {
    const items = configs.filter((c) => bulk.has(c.id));
    setConfirmDelete(items);
  }
  function deleteConfirmed(items) {
    const ids = new Set(items.map((c) => c.id));
    const remaining = configs.filter((c) => !ids.has(c.id));
    setConfigs(remaining);
    if (ids.has(activeId)) setActiveId(remaining[0]?.id || null);
    setBulk(new Set());
    setConfirmDelete(null);
  }
  function saveDraft() {
    setConfigs((prev) =>
      prev.map((c) =>
        c.id !== activeId
          ? c
          : {
              ...c,
              draft: {
                baseVersion: c.version,
                authorEmail: "you@acme.co",
                updatedAt: "just now",
                value: valueBuf,
              },
              activity: [
                {
                  at: "just now",
                  actor: "you@acme.co",
                  kind: "draft",
                  verb: "saved a draft",
                  detail: "value buffer captured",
                },
                ...c.activity,
              ],
            },
      ),
    );
    setValueDirty(false);
  }
  function publish() {
    const errs = (schemaBuf || []).flatMap((f) => {
      const e = validateField(f, valueBuf?.[f.key]);
      return e ? [e] : [];
    });
    if (errs.length) return; // would inline-error
    setConfigs((prev) =>
      prev.map((c) =>
        c.id !== activeId
          ? c
          : {
              ...c,
              version: c.version + 1,
              value: valueBuf,
              schema: schemaBuf,
              draft: null,
              publishedAt: "just now",
              publishedBy: "you@acme.co",
              activity: [
                {
                  at: "just now",
                  actor: "you@acme.co",
                  kind: "publish",
                  verb: `published v${c.version + 1}`,
                  detail: "CDN rebuild · 1.4s",
                },
                ...c.activity,
              ],
            },
      ),
    );
    setSchemaDirty(false);
    setValueDirty(false);
  }
  function discard() {
    if (!active) return;
    setValueBuf(active.value);
    setSchemaBuf(active.schema || []);
    setSchemaDirty(false);
    setValueDirty(false);
    if (active.draft) {
      setConfigs((prev) =>
        prev.map((c) =>
          c.id !== activeId
            ? c
            : {
                ...c,
                draft: null,
                activity: [
                  {
                    at: "just now",
                    actor: "you@acme.co",
                    kind: "draft",
                    verb: "discarded a draft",
                  },
                  ...c.activity,
                ],
              },
        ),
      );
    }
  }
  function saveSchema() {
    setConfigs((prev) =>
      prev.map((c) =>
        c.id !== activeId
          ? c
          : {
              ...c,
              schema: schemaBuf,
              activity: [
                {
                  at: "just now",
                  actor: "you@acme.co",
                  kind: "schema",
                  verb: "updated the schema",
                  detail: `now ${countFields(schemaBuf)} field(s)`,
                },
                ...c.activity,
              ],
            },
      ),
    );
    setSchemaDirty(false);
  }

  // Empty project state
  if (configs.length === 0 && !q) {
    return (
      <div className="app">
        <Sidebar active="configs" />
        <div>
          <Topbar
            crumbs={["Acme Co.", "Configs"]}
            actions={
              <>
                <a href="configs-new.html" className="btn btn-primary">
                  <IconPlus size={11} /> New config
                </a>
              </>
            }
          />
          <div style={{ padding: 28 }}>
            <EmptyState
              kind="configs"
              onStart={() => (location.href = "configs-new.html")}
              onDemo={() => setConfigs(SEED_CONFIGS)}
            />
          </div>
        </div>
      </div>
    );
  }

  // ── Schema validates current published value? (for warning) ──
  const publishedValueValid = active
    ? (active.schema || []).every((f) => validateField(f, active.value?.[f.key]) === null)
    : true;

  return (
    <div className="app">
      <Sidebar active="configs" />
      <div>
        <Topbar
          crumbs={["Acme Co.", "Configs", active ? active.name : ""]}
          actions={
            <>
              <a href="configs-new.html" className="btn btn-primary">
                <IconPlus size={11} /> New config
              </a>
            </>
          }
        />

        <div className="page" style={{ paddingBottom: 32 }}>
          {/* Page head */}
          <div className="page-head">
            <div>
              <div className="t-caps dim-2" style={{ marginBottom: 8 }}>
                {configs.length} configs · {configs.filter((c) => c.draft).length} draft
                {configs.filter((c) => c.draft).length === 1 ? "" : "s"} pending · last publish 2h
                ago
              </div>
              <h1>Configs</h1>
              <p>
                Versioned JSON-Schema–backed configuration. Edit the schema, edit the value, publish
                — your SDK callers see the change within seconds.
              </p>
            </div>
            <div className="flex gap-3 items-center">
              <button className="btn btn-secondary" onClick={() => setShowIntegration(true)}>
                <IconCode size={12} /> SDK integration
              </button>
            </div>
          </div>

          {/* Two-pane grid */}
          <div className="cfg2">
            {/* ── Rail ─────────────────────────────────────── */}
            <div className={"cfg-rail" + (bulkMode ? " bulk" : "")}>
              <div className="rail-hd">
                <div className="row">
                  <div className="input" style={{ flex: 1, height: 30 }}>
                    <IconSearch size={11} style={{ color: "var(--fg-3)" }} />
                    <input
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                      placeholder="Filter configs by name…"
                    />
                  </div>
                  <a href="configs-new.html" className="btn btn-primary btn-sm" title="New config">
                    <IconPlus size={11} />
                  </a>
                </div>
                <div className="meta">
                  <span>{configs.length} configs</span>
                  <span className="dot" />
                  <span>
                    {groups.length} namespace{groups.length === 1 ? "" : "s"}
                  </span>
                  {bulkMode && (
                    <>
                      <span className="dot" />
                      <span style={{ color: "var(--accent)" }}>{bulk.size} selected</span>
                    </>
                  )}
                </div>
              </div>
              <div className="rail-body">
                {groups.map((g) => (
                  <div key={g.ns}>
                    <div className="cfg-grp">
                      <span className="gn">{g.ns}</span>
                      <span className="gc">{g.items.length}</span>
                    </div>
                    {g.items.map((c) => {
                      const isActive = c.id === activeId;
                      const isSelected = bulk.has(c.id);
                      return (
                        <div
                          key={c.id}
                          className={
                            "cfg-item" +
                            (isActive ? " active" : "") +
                            (isSelected ? " is-selected" : "")
                          }
                          onClick={(e) => {
                            if (e.target.closest(".cb")) return;
                            setActiveId(c.id);
                          }}
                        >
                          <div
                            className={"cb" + (isSelected ? " on" : "")}
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleBulk(c.id);
                            }}
                          />
                          <div className="nm">
                            <span className="k">{c.name}</span>
                            <span className="meta">
                              <span>
                                {countFields(c.schema)} field
                                {countFields(c.schema) === 1 ? "" : "s"}
                              </span>
                              <span className="dot" />
                              <span>{c.publishedAt}</span>
                            </span>
                          </div>
                          <div className="right">
                            {c.draft && <span className="dbadge">draft</span>}
                            <span className="vbadge">v{c.version}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
                {groups.length === 0 && (
                  <div
                    style={{
                      padding: "24px 14px",
                      textAlign: "center",
                      color: "var(--fg-4)",
                      fontSize: 12,
                    }}
                  >
                    No configs match "
                    <span style={{ fontFamily: "var(--mono)", color: "var(--fg-3)" }}>{q}</span>"
                  </div>
                )}
              </div>
              <div className="rail-ft">
                {bulkMode ? (
                  <>
                    <span className="left">{bulk.size} selected</span>
                    <button className="btn btn-ghost btn-sm" onClick={clearBulk}>
                      Clear
                    </button>
                    <button className="btn btn-danger btn-sm" onClick={doBulkDelete}>
                      <IconTrash size={10} /> Delete
                    </button>
                  </>
                ) : (
                  <>
                    <span className="left">⌘K to search · ↑↓ to navigate</span>
                  </>
                )}
              </div>
            </div>

            {/* ── Editor pane ─────────────────────────────── */}
            {active ? (
              <div className="cfg-pane">
                {/* Sticky head */}
                <div className="cfg-pane-hd">
                  <div className="row" style={{ gap: 14 }}>
                    <span className="name">{active.name}</span>
                    <span className="pill-stat valid">v{active.version} live</span>
                    {active.draft && (
                      <span
                        className="pill-stat draft"
                        title={`${active.draft.authorEmail} · from v${active.draft.baseVersion}`}
                      >
                        DRAFT · {active.draft.authorEmail}
                      </span>
                    )}
                    <div style={{ flex: 1 }} />
                    <button className="btn btn-ghost btn-sm" disabled title="History — coming soon">
                      <IconHistory size={11} /> History
                    </button>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => setShowIntegration(true)}
                    >
                      <IconCode size={11} /> Integrate
                    </button>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => setConfirmDelete([active])}
                    >
                      <IconTrash size={11} /> Delete
                    </button>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={discard}
                      disabled={!active.draft && !valueDirty && !schemaDirty}
                    >
                      Discard
                    </button>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={publish}
                      disabled={!active.draft && !valueDirty && !schemaDirty}
                    >
                      <IconRocket size={11} /> Publish v{active.version + 1}
                    </button>
                  </div>
                  {active.description && <div className="desc">{active.description}</div>}
                  <div className="meta">
                    <span>
                      <b>last published</b> {active.publishedAt} by {active.publishedBy}
                    </span>
                    <span className="sep">·</span>
                    <span>
                      <b>fields</b> {countFields(active.schema)}
                    </span>
                    <span className="sep">·</span>
                    <span>
                      <b>kv</b> live · synced
                    </span>
                    {active.owner && (
                      <>
                        <span className="sep">·</span>
                        <span>
                          <b>owner</b> {active.owner}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {!publishedValueValid && (
                  <div style={{ padding: "0 20px", marginTop: 14 }}>
                    <div className="val-banner danger">
                      <div className="icn">
                        <IconAlert size={13} />
                      </div>
                      <div className="body">
                        <div className="ttl">Published value no longer matches the schema</div>
                        <div style={{ fontSize: 12, color: "var(--fg-3)" }}>
                          Schema was edited; the value at <code>v{active.version}</code> would fail
                          validation now. Save a new value as a draft, then publish.
                        </div>
                      </div>
                      <div className="acts">
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => {
                            setValueBuf(active.value);
                          }}
                        >
                          Inspect
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Editor — schema left, value right */}
                <div className="cfg-pane-body">
                  {/* Schema column */}
                  <div className="pane-col">
                    <div className="col-hd">
                      <span className="ttl">Schema</span>
                      {schemaDirty && <span className="pill-stat draft">unsaved</span>}
                      <div className="act">
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => setSchemaBuf(active.schema || [])}
                          disabled={!schemaDirty}
                        >
                          <IconRefreshCcw size={10} /> Reset
                        </button>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={saveSchema}
                          disabled={!schemaDirty}
                        >
                          <IconCheck size={10} /> Save schema
                        </button>
                      </div>
                    </div>
                    <SchemaBuilder
                      schema={schemaBuf}
                      onChange={(s) => {
                        setSchemaBuf(s);
                        setSchemaDirty(true);
                      }}
                      mode={schemaMode}
                      setMode={setSchemaMode}
                      onImport={() => setShowImport(true)}
                    />
                  </div>

                  {/* Value column */}
                  <div className="pane-col">
                    <div className="col-hd">
                      <span className="ttl">Value</span>
                      {valueDirty && <span className="pill-stat draft">unsaved</span>}
                      {!valueDirty && active.draft && (
                        <span className="pill-stat draft">DRAFT loaded</span>
                      )}
                      <div className="act">
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => setValueBuf(active.value)}
                          disabled={!valueDirty && !active.draft}
                        >
                          <IconRefreshCcw size={10} /> Reset to v{active.version}
                        </button>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={saveDraft}
                          disabled={!valueDirty}
                        >
                          <IconEdit size={10} /> Save draft
                        </button>
                      </div>
                    </div>
                    <ValueForm
                      schema={schemaBuf}
                      value={valueBuf}
                      onChange={(v) => {
                        setValueBuf(v);
                        setValueDirty(true);
                      }}
                    />
                  </div>
                </div>

                {/* Activity feed */}
                <div
                  style={{
                    padding: "18px 20px",
                    borderTop: "1px solid var(--line)",
                    background: "var(--bg-1)",
                  }}
                >
                  <div className="col-hd" style={{ marginBottom: 10 }}>
                    <span className="ttl">Activity</span>
                    <span
                      style={{
                        fontFamily: "var(--mono)",
                        fontSize: 10.5,
                        color: "var(--fg-4)",
                        marginLeft: 6,
                      }}
                    >
                      {active.activity.length} event{active.activity.length === 1 ? "" : "s"}
                    </span>
                    <div className="act">
                      <button className="btn btn-ghost btn-sm" disabled>
                        <IconDownload size={10} /> Export
                      </button>
                    </div>
                  </div>
                  <div className="act-feed">
                    {active.activity.map((a, i) => (
                      <div key={i} className={"act-row " + a.kind}>
                        <div className="ico">
                          {a.kind === "publish" ? (
                            <IconRocket size={11} />
                          ) : a.kind === "draft" ? (
                            <IconEdit size={11} />
                          ) : a.kind === "schema" ? (
                            <IconBraces size={11} />
                          ) : a.kind === "create" ? (
                            <IconPlus size={11} />
                          ) : a.kind === "danger" ? (
                            <IconTrash size={11} />
                          ) : (
                            <IconActivity size={11} />
                          )}
                        </div>
                        <div className="when">{a.at}</div>
                        <div className="what">
                          <b>{a.actor}</b> {a.verb}
                          {a.detail && (
                            <>
                              {" "}
                              · <span style={{ color: "var(--fg-3)" }}>{a.detail}</span>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="cfg-pane-empty">
                <div className="inner">
                  <div className="icn">
                    <IconSliders size={20} />
                  </div>
                  <h3>Select a config to edit</h3>
                  <p>
                    Pick one from the rail, or create a new one to get a typed config in front of
                    your SDK.
                  </p>
                  <a href="configs-new.html" className="btn btn-primary">
                    <IconPlus size={11} /> New config
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <IntegrationModal
        open={showIntegration}
        configName={active?.name}
        schema={schemaBuf}
        value={valueBuf}
        onClose={() => setShowIntegration(false)}
      />

      <ImportJsonModal
        open={showImport}
        onClose={() => setShowImport(false)}
        onImportPayload={(payload) => {
          const inferred = inferSchemaFromPayload(payload);
          setSchemaBuf(inferred);
          setValueBuf(payload);
          setSchemaDirty(true);
          setValueDirty(true);
        }}
        onImportSchema={(js) => {
          // crude top-level adoption from a JSON Schema
          const props = js.properties || {};
          const req = new Set(js.required || []);
          const fields = Object.entries(props).map(([k, p]) =>
            mkField(k, p.type || "string", {
              required: req.has(k),
              description: p.description,
              min: p.minimum,
              max: p.maximum,
              pattern: p.pattern,
              enum: p.enum,
            }),
          );
          setSchemaBuf(fields);
          setSchemaDirty(true);
        }}
      />

      <ConfirmDeleteModal
        open={!!confirmDelete}
        items={confirmDelete || []}
        onCancel={() => setConfirmDelete(null)}
        onConfirm={() => deleteConfirmed(confirmDelete)}
      />
    </div>
  );
}

Object.assign(window, { ConfigsListPage });
ReactDOM.createRoot(document.getElementById("app")).render(<ConfigsListPage />);
