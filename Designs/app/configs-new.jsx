// Shipeasy — New config wizard (4 steps: Details, Schema, Default values, Review).
//
// Implements /dashboard/[projectId]/configs/values/new from the PRD.

const { useState: cnState, useMemo: cnMemo, useEffect: cnEffect } = React;

const STEPS = [
  {
    k: "details",
    label: "Details",
    short: "Details",
    tag: "1 / 4",
    valid: (s) => /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)*$/.test(s.name || "") && s.name.length >= 3,
  },
  { k: "schema", label: "Schema", short: "Schema", tag: "2 / 4", valid: (s) => true },
  { k: "value", label: "Defaults", short: "Defaults", tag: "3 / 4", valid: (s) => true },
  { k: "review", label: "Review", short: "Review", tag: "4 / 4", valid: (s) => true },
];

const SCHEMA_TEMPLATES = [
  {
    k: "tiers",
    name: "Tiered pricing",
    desc: "Public-facing pricing tiers with seat + experiment limits.",
    icon: IconLayers,
    schema: [
      mkField("starter", "object", {
        required: true,
        properties: [
          mkField("name", "string", { required: true, default: "Starter" }),
          mkField("price_usd", "number", { required: true, min: 0, default: 0 }),
          mkField("seats", "integer", { default: 3 }),
        ],
      }),
      mkField("pro", "object", {
        required: true,
        properties: [
          mkField("name", "string", { required: true, default: "Pro" }),
          mkField("price_usd", "number", { required: true, default: 29 }),
          mkField("seats", "integer", { default: 10 }),
        ],
      }),
      mkField("team", "object", {
        properties: [
          mkField("name", "string", { required: true, default: "Team" }),
          mkField("price_usd", "number", { default: 99 }),
          mkField("seats", "integer", { default: 25 }),
        ],
      }),
    ],
  },
  {
    k: "ratelimit",
    name: "Rate-limit policy",
    desc: "Default rule + an ordered array of per-tier overrides.",
    icon: IconShield,
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
  },
  {
    k: "copy",
    name: "UI copy block",
    desc: "Marketing or onboarding strings you want to A/B without redeploying.",
    icon: IconBookOpen,
    schema: [
      mkField("hero_title", "string", { required: true, max: 80, default: "Welcome" }),
      mkField("hero_subtitle", "string", { max: 160 }),
      mkField("primary_cta", "string", { default: "Get started" }),
    ],
  },
];

/* Seed an initial value from a schema's defaults */
function seedValue(schema) {
  const out = {};
  (schema || []).forEach((f) => {
    if (f.default !== undefined) out[f.key] = f.default;
    else if (f.type === "object") out[f.key] = seedValue(f.properties || []);
    else if (f.type === "array") out[f.key] = [];
    else if (f.type === "boolean") out[f.key] = false;
    else if (f.type === "number" || f.type === "integer") out[f.key] = 0;
    else if (f.type === "string") out[f.key] = "";
  });
  return out;
}

function NewConfigWizard() {
  const [step, setStep] = cnState(1);

  // Step 1 — details
  const [details, setDetails] = cnState({
    name: "",
    description: "",
    owner: "",
    group: "",
  });

  // Step 2 — schema
  const [schema, setSchema] = cnState([]);
  const [schemaMode, setSchemaMode] = cnState("visual");
  const [showImport, setShowImport] = cnState(false);
  const [pickedTemplate, setPickedTemplate] = cnState(null);

  // Step 3 — default value
  const [value, setValue] = cnState({});

  cnEffect(() => {
    // when template is picked, seed schema + value
    if (pickedTemplate) {
      const tpl = SCHEMA_TEMPLATES.find((t) => t.k === pickedTemplate);
      if (tpl) {
        setSchema(JSON.parse(JSON.stringify(tpl.schema)).map((f) => ({ ...f, id: fid() })));
        // re-seed defaults too
        setValue(seedValue(tpl.schema));
      }
    }
  }, [pickedTemplate]);

  cnEffect(() => {
    // When schema changes, also fill any missing defaults into value
    setValue((prev) => {
      const filled = { ...prev };
      (schema || []).forEach((f) => {
        if (filled[f.key] === undefined) {
          if (f.default !== undefined) filled[f.key] = f.default;
          else if (f.type === "boolean") filled[f.key] = false;
          else if (f.type === "number" || f.type === "integer") filled[f.key] = 0;
          else if (f.type === "string") filled[f.key] = "";
          else if (f.type === "array") filled[f.key] = [];
          else if (f.type === "object") filled[f.key] = {};
        }
      });
      return filled;
    });
  }, [JSON.stringify(schema.map((f) => [f.key, f.type, f.default]))]); // shallow signature

  // Modals
  const [showIntegration, setShowIntegration] = cnState(false);

  // Validations
  const nameOk = /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)*$/.test(details.name);
  const nameLen = details.name.length;
  const valueErrs = cnMemo(() => {
    return (schema || []).flatMap((f) => {
      const e = validateField(f, value?.[f.key]);
      return e ? [{ key: f.key, err: e }] : [];
    });
  }, [schema, value]);

  function gotoStep(n) {
    if (n < 1 || n > 4) return;
    if (n > step) {
      // gate forward only by required step validity
      if (step === 1 && !nameOk && !(details.name.length === 0 && n === 2)) return;
    }
    setStep(n);
  }

  // ── Renders ───────────────────────────────────────────────
  const stepInfo = [
    {
      stem: "Step 1 of 4",
      title: "Identify the config",
      sub: "Pick a name, describe what it controls. The name is the SDK key — permanent, so make it descriptive.",
    },
    {
      stem: "Step 2 of 4",
      title: "Define the shape",
      sub: "Add the fields your SDK should see. Each gets a type and optional required flag — types here become TypeScript types over there.",
    },
    {
      stem: "Step 3 of 4",
      title: "Seed the initial value",
      sub: "This becomes the first published version. Every field is validated against the schema before publish.",
    },
    {
      stem: "Step 4 of 4",
      title: "Review & integrate",
      sub: "One last look. Press Create & publish to write the schema and seed v1.",
    },
  ];

  const WizHead = () => {
    const info = stepInfo[step - 1];
    return (
      <div className="wiz-head">
        <div className="left">
          <div className="stem">{info.stem}</div>
          <h2>
            {info.title}
            <span className="help-tip" tabIndex={0} data-tip={info.sub}>
              <IconHelp size={11} />
            </span>
            {step === 1 && (
              <span
                className={"pill-stat " + (nameOk ? "valid" : "draft")}
                style={{ fontSize: 9.5, padding: "3px 8px" }}
              >
                {nameOk ? (
                  <>
                    <IconCheck size={10} /> name ok
                  </>
                ) : (
                  <>name required</>
                )}
              </span>
            )}
            {step === 2 && (
              <span className="pill-stat valid" style={{ fontSize: 9.5, padding: "3px 8px" }}>
                {countFields(schema)} field{countFields(schema) === 1 ? "" : "s"}
              </span>
            )}
            {step === 3 && (
              <span
                className={"pill-stat " + (valueErrs.length ? "danger" : "valid")}
                style={{ fontSize: 9.5, padding: "3px 8px" }}
              >
                {valueErrs.length
                  ? `${valueErrs.length} error${valueErrs.length === 1 ? "" : "s"}`
                  : "validates"}
              </span>
            )}
            {step === 4 && (
              <span className="pill-stat valid" style={{ fontSize: 9.5, padding: "3px 8px" }}>
                ready · publish v1
              </span>
            )}
          </h2>
        </div>
        <div className="right">
          <div className="wiz-stepper compact" style={{ flexShrink: 0, padding: "6px 10px" }}>
            {STEPS.map((s, i) => {
              const cls = i + 1 === step ? "current" : i + 1 < step ? "done" : "";
              return (
                <div key={s.k} style={{ display: "contents" }}>
                  {i > 0 && <div className={"wiz-conn" + (i < step ? " done" : "")} />}
                  <div
                    className={`wiz-step ${cls}`}
                    onClick={() => gotoStep(i + 1)}
                    title={s.label}
                  >
                    <span className="num">{i + 1 < step ? <IconCheck size={10} /> : i + 1}</span>
                    <div className="body">
                      <span className="lbl">{s.label}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const Footer = () => (
    <div className="wiz-foot">
      <div className="meta">
        <span>not yet persisted · cancel discards everything</span>
        <span className="sep">·</span>
        <span>
          {countFields(schema)} field{countFields(schema) === 1 ? "" : "s"}
        </span>
        {valueErrs.length > 0 && (
          <>
            <span className="sep">·</span>
            <span style={{ color: "var(--danger)" }}>
              {valueErrs.length} validation error{valueErrs.length === 1 ? "" : "s"}
            </span>
          </>
        )}
      </div>
      <div className="acts">
        <a href="configs.html" className="btn btn-ghost">
          Cancel
        </a>
        {step > 1 && (
          <button className="btn btn-secondary" onClick={() => gotoStep(step - 1)}>
            <IconArrowLeft size={11} /> Back
          </button>
        )}
        {step < 4 ? (
          <button
            className="btn btn-primary"
            disabled={step === 1 && !nameOk}
            onClick={() => gotoStep(step + 1)}
          >
            Next · {STEPS[step].label} <IconArrowRight size={11} />
          </button>
        ) : (
          <button className="btn btn-primary" disabled={!nameOk || valueErrs.length > 0}>
            <IconRocket size={11} /> Create & publish v1
          </button>
        )}
      </div>
    </div>
  );

  return (
    <>
      <div className="app">
        <Sidebar active="configs" />
        <div>
          <Topbar
            crumbs={["Acme Co.", "Configs", "new"]}
            actions={
              <>
                <a href="configs.html" className="btn btn-ghost">
                  Cancel
                </a>
                <button className="btn btn-primary" disabled={!nameOk || valueErrs.length > 0}>
                  <IconRocket size={11} /> Create & publish
                </button>
              </>
            }
          />

          <div
            className="page"
            style={{
              gap: 14,
              paddingTop: 18,
              paddingBottom: 24,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <WizHead />

            {step === 1 && (
              <StepDetails
                details={details}
                setDetails={setDetails}
                nameOk={nameOk}
                nameLen={nameLen}
              />
            )}
            {step === 2 && (
              <StepSchema
                schema={schema}
                setSchema={setSchema}
                schemaMode={schemaMode}
                setSchemaMode={setSchemaMode}
                onImport={() => setShowImport(true)}
                pickedTemplate={pickedTemplate}
                setPickedTemplate={setPickedTemplate}
              />
            )}
            {step === 3 && <StepValue schema={schema} value={value} setValue={setValue} />}
            {step === 4 && (
              <StepReview
                details={details}
                schema={schema}
                value={value}
                onShowIntegration={() => setShowIntegration(true)}
              />
            )}

            <Footer />
          </div>
        </div>
      </div>

      <ImportJsonModal
        open={showImport}
        onClose={() => setShowImport(false)}
        onImportPayload={(payload) => {
          const inferred = inferSchemaFromPayload(payload);
          setSchema(inferred);
          setValue(payload);
        }}
        onImportSchema={(js) => {
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
          setSchema(fields);
        }}
      />

      <IntegrationModal
        open={showIntegration}
        configName={details.name}
        schema={schema}
        value={value}
        onClose={() => setShowIntegration(false)}
      />
    </>
  );
}

/* ────────────────────────────────────────────────────────────
   Step 1 — Details
   ──────────────────────────────────────────────────────────── */
function StepDetails({ details, setDetails, nameOk, nameLen }) {
  return (
    <>
      <div className="cc-card">
        <div className="cf-row">
          <div className="lbl">
            name <span className="req">·</span>
          </div>
          <div>
            <div className={"ed-input mono " + (details.name && !nameOk ? "is-error" : "")}>
              <span className="pre">configs/</span>
              <input
                value={details.name}
                onChange={(e) =>
                  setDetails({
                    ...details,
                    name: e.target.value.toLowerCase().replace(/[^a-z0-9._]/g, ""),
                  })
                }
                placeholder="platform.checkout"
                autoFocus
              />
            </div>
            <div className="help">
              <span>
                Dotted-namespace convention — text before the first <code>.</code> becomes the
                namespace folder in the rail. Example: <code>platform.checkout</code> →{" "}
                <b>platform</b> group.
              </span>
            </div>
            {details.name && !nameOk && (
              <div className="help" style={{ color: "var(--danger)" }}>
                <span>
                  Use lowercase letters, digits, underscores, and dots. Must start with a letter.
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="cf-row">
          <div className="lbl">description</div>
          <div>
            <textarea
              className="ed-textarea"
              value={details.description}
              onChange={(e) => setDetails({ ...details, description: e.target.value })}
              placeholder="What does this config control? Who reads it?"
            />
            <div className="help">
              <span>
                Shown in the rail, in the SDK code-completion, and in the integration snippet.
              </span>
            </div>
          </div>
        </div>

        <div className="cf-row">
          <div className="lbl">owner</div>
          <div>
            <div style={{ maxWidth: 360 }}>
              <CSelect
                value={details.owner}
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
                  {
                    v: "sam@acme.co",
                    label: "Sam Reyes",
                    meta: "sam@acme.co",
                    icon: (
                      <span className="avatar-inline" style={{ background: "#ec4899" }}>
                        S
                      </span>
                    ),
                  },
                ]}
                onChange={(v) => setDetails({ ...details, owner: v })}
                size="md"
              />
            </div>
            <div className="help">
              <span>The person on the hook for keeping this honest. Optional.</span>
            </div>
          </div>
        </div>

        <div className="cf-row">
          <div className="lbl">group</div>
          <div>
            <div style={{ maxWidth: 360 }}>
              <CSelect
                value={details.group}
                placeholder="— pick or leave empty —"
                options={[
                  {
                    v: "",
                    label: "(no group)",
                    icon: <IconLayers size={11} style={{ color: "var(--fg-4)" }} />,
                  },
                  {
                    v: "commerce",
                    label: "commerce",
                    icon: <IconLayers size={11} style={{ color: "var(--accent)" }} />,
                    meta: "4 configs",
                  },
                  {
                    v: "platform",
                    label: "platform",
                    icon: <IconLayers size={11} style={{ color: "var(--info)" }} />,
                    meta: "3 configs",
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
                  {
                    v: "email",
                    label: "email",
                    icon: <IconLayers size={11} style={{ color: "var(--fg-3)" }} />,
                    meta: "1 config",
                  },
                  {
                    v: "feature",
                    label: "feature",
                    icon: <IconLayers size={11} style={{ color: "var(--fg-3)" }} />,
                    meta: "1 config",
                  },
                ]}
                onChange={(v) => setDetails({ ...details, group: v })}
                size="md"
              />
            </div>
            <div className="help">
              <span>
                Free-text label — used by humans for grouping beyond the dotted namespace. Optional.
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="val-banner ok">
        <div className="icn">
          <IconInfo size={13} />
        </div>
        <div className="body">
          <div className="ttl">Naming is permanent</div>
          <div style={{ fontSize: 12, color: "var(--fg-3)" }}>
            Once published, this key shows up in every SDK call:{" "}
            <code
              style={{
                fontFamily: "var(--mono)",
                background: "var(--bg-3)",
                padding: "1px 5px",
                borderRadius: 3,
                color: "var(--fg-2)",
              }}
            >
              getConfig('{details.name || "platform.checkout"}', …)
            </code>{" "}
            — renaming later means a coordinated SDK rollout.
          </div>
        </div>
      </div>
    </>
  );
}

/* ────────────────────────────────────────────────────────────
   Step 2 — Schema
   ──────────────────────────────────────────────────────────── */
function StepSchema({
  schema,
  setSchema,
  schemaMode,
  setSchemaMode,
  onImport,
  pickedTemplate,
  setPickedTemplate,
}) {
  const empty = !schema || schema.length === 0;

  if (empty) {
    return (
      <div className="cc-card">
        <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Two primary methods, side-by-side */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div
              className="ss-method"
              onClick={() => setSchema([mkField("new_field", "string", { required: true })])}
            >
              <div className="icn">
                <IconPlus size={15} />
              </div>
              <div className="body">
                <div className="ttl">Build field-by-field</div>
                <div className="sub">
                  Start with one empty field, add more as you go. Best when the shape isn't fixed
                  yet.
                </div>
              </div>
              <div className="arrow">
                <IconArrowRight size={12} />
              </div>
            </div>
            <div className="ss-method" onClick={onImport}>
              <div className="icn">
                <IconUpload size={15} />
              </div>
              <div className="body">
                <div className="ttl">Paste JSON</div>
                <div className="sub">
                  Drop in an example payload (types are inferred) or a full JSON Schema. Round-trips
                  with the visual editor.
                </div>
              </div>
              <div className="arrow">
                <IconArrowRight size={12} />
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="ss-or">
            <span className="ln" />
            <span className="lbl">or start from a common shape</span>
            <span className="ln" />
          </div>

          {/* Template gallery — real field previews */}
          <div className="ss-gallery">
            {SCHEMA_TEMPLATES.map((t) => {
              const I = t.icon;
              const isActive = pickedTemplate === t.k;
              return (
                <div
                  key={t.k}
                  className={"ss-tpl" + (isActive ? " active" : "")}
                  onClick={() => setPickedTemplate(t.k)}
                >
                  <div className="hd">
                    <div className="icn">
                      <I size={13} />
                    </div>
                    <div className="ttl">{t.name}</div>
                    <span className="count">
                      {t.schema.length} field{t.schema.length === 1 ? "" : "s"}
                    </span>
                  </div>
                  <div className="desc">{t.desc}</div>
                  <div className="fields">
                    {t.schema.slice(0, 5).map((f) => (
                      <div key={f.id} className="frow">
                        <span className="k">{f.key}</span>
                        {f.required && <span className="req">·required</span>}
                        <TypePill type={f.type} />
                      </div>
                    ))}
                    {t.schema.length > 5 && (
                      <div className="frow more">+ {t.schema.length - 5} more</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="cc-card">
      <div className="cc-hd">
        <div className="ttl">Schema fields</div>
        <span className="sub">click a row to edit · ⌫ to remove</span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 6, alignItems: "center" }}>
          <button className="btn btn-ghost btn-sm" onClick={onImport}>
            <IconUpload size={11} /> Import
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => setSchema([])}>
            <IconTrash size={11} /> Clear
          </button>
        </div>
      </div>
      <div style={{ padding: 18 }}>
        <SchemaBuilder
          schema={schema}
          onChange={setSchema}
          mode={schemaMode}
          setMode={setSchemaMode}
          onImport={onImport}
        />
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
   Step 3 — Default values
   ──────────────────────────────────────────────────────────── */
function StepValue({ schema, value, setValue }) {
  return (
    <>
      <div className="cc-card">
        <div className="cc-hd">
          <div className="ttl">v1 value</div>
          <span className="sub">live-validated</span>
        </div>
        <div style={{ padding: 18 }}>
          <ValueForm schema={schema} value={value} onChange={setValue} />
        </div>
      </div>
    </>
  );
}

/* ────────────────────────────────────────────────────────────
   Step 4 — Review & integrate
   ──────────────────────────────────────────────────────────── */
function StepReview({ details, schema, value, onShowIntegration }) {
  const jsonSchema = toJsonSchema(schema);
  return (
    <>
      <div className="rv-grid">
        <div className="cc-card">
          <div className="cc-hd">
            <div className="ttl">Summary</div>
            <span className="sub">details · schema · value</span>
          </div>
          <div className="rv-list">
            <div className="rv-item">
              <div className="lbl">name</div>
              <div className="val mono">
                {details.name || <span style={{ color: "var(--fg-4)" }}>—</span>}
              </div>
            </div>
            <div className="rv-item">
              <div className="lbl">description</div>
              <div className="val dim">
                {details.description || <span style={{ color: "var(--fg-4)" }}>—</span>}
              </div>
            </div>
            <div className="rv-item">
              <div className="lbl">owner / group</div>
              <div className="val mono">
                {details.owner || <span style={{ color: "var(--fg-4)" }}>—</span>}
                <span style={{ color: "var(--fg-4)", margin: "0 6px" }}>·</span>
                {details.group || <span style={{ color: "var(--fg-4)" }}>—</span>}
              </div>
            </div>
            <div className="rv-item">
              <div className="lbl">namespace</div>
              <div className="val mono">{namespaceOf(details.name || "misc")}</div>
            </div>
            <div className="rv-item">
              <div className="lbl">fields</div>
              <div className="val">
                {countFields(schema)} total
                <span style={{ color: "var(--fg-4)", margin: "0 6px" }}>·</span>
                <span style={{ color: "var(--accent)" }}>
                  {(schema || []).filter((f) => f.required).length} required
                </span>
              </div>
            </div>
            <div className="rv-item">
              <div className="lbl">first version</div>
              <div className="val mono">v1 · just now</div>
            </div>
          </div>
        </div>

        <div className="cc-card">
          <div className="cc-hd">
            <div className="ttl">Schema</div>
            <span className="sub">draft 2020-12</span>
            <div style={{ marginLeft: "auto" }}>
              <button className="btn btn-ghost btn-sm" onClick={onShowIntegration}>
                <IconCode size={11} /> SDK snippet
              </button>
            </div>
          </div>
          <div className="json-raw" style={{ borderRadius: 0, border: "none", maxHeight: 200 }}>
            {highlightJson(jsonSchema)}
          </div>
        </div>
      </div>

      <div className="cc-card">
        <div className="cc-hd">
          <div className="ttl">v1 value</div>
          <span className="sub">passes validation</span>
        </div>
        <div className="json-raw" style={{ borderRadius: 0, border: "none", maxHeight: 280 }}>
          {highlightJson(value)}
        </div>
      </div>

      <div className="val-banner ok">
        <div className="icn">
          <IconRocket size={13} />
        </div>
        <div className="body">
          <div className="ttl">Publish triggers a synchronous CDN rebuild</div>
          <div style={{ fontSize: 12, color: "var(--fg-3)" }}>
            Typically 1–2 seconds. You'll land on the edit page once the version is live; failures
            show inline here.
          </div>
        </div>
        <div className="acts">
          <button className="btn btn-secondary btn-sm" onClick={onShowIntegration}>
            <IconCode size={11} /> Preview integration
          </button>
        </div>
      </div>
    </>
  );
}

Object.assign(window, { NewConfigWizard });
ReactDOM.createRoot(document.getElementById("app")).render(<NewConfigWizard />);
