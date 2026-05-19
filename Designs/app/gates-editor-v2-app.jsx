// Gate-editor orchestrator (v2) — wires Shell + Steps + Modals + Drawer

const { useState: gaState, useMemo: gaMemo, useEffect: gaEffect, useRef: gaRef } = React;

// Small Search icon (used in template picker)
const IconSearch = (p) => (
  <_Icon {...p}>
    <circle cx="11" cy="11" r="7" />
    <line x1="21" x2="16.65" y1="21" y2="16.65" />
  </_Icon>
);
window.IconSearch = IconSearch;

const SEED_DETAILS = {
  title: "Premium features",
  key: "premium_features",
  keyLocked: true,
  folder: "commerce",
  group: "premium",
  description:
    "Master gatekeeper for the paid feature surface (export, audit log, SSO config). Every premium-only render path checks this. Falls through to a public 0% rollout — keep that floor low until pricing is finalized.",
  owner: "Maya Patel",
};

function GatesApp() {
  const [step, setStep] = gaState(2); // land on Stack step — the showcase
  const [details, setDetails] = gaState(SEED_DETAILS);
  const [gates, setGates] = gaState(seedGates);
  const [overrides, setOverrides] = gaState(SEED_OVERRIDES);
  const [killswitch, setKillswitch] = gaState(false);

  // Modal / drawer state
  const [showTplPicker, setShowTplPicker] = gaState(false);
  const [showSaveAsTpl, setShowSaveAsTpl] = gaState(null);
  const [showEditDetails, setShowEditDetails] = gaState(false);
  const [showSdk, setShowSdk] = gaState(false);
  const [showKillConfirm, setShowKillConfirm] = gaState(false);
  const [showAddOverride, setShowAddOverride] = gaState(false);
  const [showRegAttr, setShowRegAttr] = gaState(false);
  const [showDiff, setShowDiff] = gaState(false);
  const [drawer, setDrawer] = gaState(null); // 'versions' | 'audit' | null

  function addGate(gate) {
    const newGate = { ...gate, id: gid() };
    setGates((prev) => {
      const next = prev.slice();
      const lockedIdx = next.findIndex((g) => g.locked);
      next.splice(lockedIdx >= 0 ? lockedIdx : next.length, 0, newGate);
      return next;
    });
    setShowTplPicker(false);
  }

  function addOverride(o) {
    setOverrides((prev) => [...prev, o]);
  }

  function gotoStep(n) {
    setStep(n);
  }

  // ── Page header ───────────────────────────────────────────────
  const PageHeader = () => (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 14,
        padding: "4px 4px 0",
        justifyContent: "space-between",
      }}
    >
      <div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontFamily: "var(--mono)",
            fontSize: 11,
            color: "var(--fg-3)",
            marginBottom: 6,
          }}
        >
          <IconShieldGate size={12} />
          <span>gatekeeper</span>
          <span style={{ color: "var(--fg-4)" }}>·</span>
          <span>
            {details.folder} / {details.group}
          </span>
          <span style={{ color: "var(--fg-4)" }}>·</span>
          <span style={{ color: "var(--fg-2)" }}>acme/{details.key}</span>
          <span className="pill-stat draft" style={{ marginLeft: 6 }}>
            draft v4
          </span>
          {killswitch && (
            <span
              className="pill-stat"
              style={{
                background: "color-mix(in oklab, var(--danger) 18%, transparent)",
                color: "var(--danger)",
                borderColor: "color-mix(in oklab, var(--danger) 45%, transparent)",
                marginLeft: 0,
              }}
            >
              <IconAlert size={10} /> KILLSWITCH
            </span>
          )}
        </div>
        <h1
          style={{
            fontSize: 30,
            fontWeight: 600,
            letterSpacing: "-0.02em",
            margin: 0,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          {details.title}
          <button className="ic-btn" title="Edit details" onClick={() => setShowEditDetails(true)}>
            <IconEdit size={14} />
          </button>
        </h1>
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <span className="kv-ind synced">
          <span className="dot" /> v3 live · synced 2m
        </span>
        <button className="btn btn-ghost btn-sm" onClick={() => setDrawer("versions")}>
          <IconHistory size={11} /> History
        </button>
        <button className="btn btn-ghost btn-sm" onClick={() => setDrawer("audit")}>
          <IconList2 size={11} /> Audit
        </button>
        <button className="btn btn-ghost btn-sm" onClick={() => setShowSdk(true)}>
          <IconCode size={11} /> SDK
        </button>
        <button className="btn btn-ghost btn-sm">
          <IconCopy2 size={11} /> Duplicate
        </button>
      </div>
    </div>
  );

  // ── Killswitch banner (always shown above stepper, prominent when on) ─
  const KsBanner = () => (
    <div className={`ks-banner ${killswitch ? "on" : ""}`}>
      <div className="icn">
        <IconAlert size={18} />
      </div>
      <div className="body">
        <div className="ttl">
          {killswitch ? (
            <>
              Killswitch is <b>ENGAGED</b>
            </>
          ) : (
            <>
              Master killswitch{" "}
              <b
                style={{
                  color: "var(--fg-3)",
                  background: "var(--bg-3)",
                  borderColor: "var(--line-2)",
                }}
              >
                standby
              </b>
            </>
          )}
        </div>
        <div className="sub">
          {killswitch ? (
            <>
              Every SDK call to <code>{details.key}</code> currently returns
              <b style={{ color: "var(--danger)", padding: "0 4px" }}>false</b> — the stack below is
              bypassed entirely. Disengage to resume normal evaluation.
            </>
          ) : (
            <>
              Flip on to instantly disable <code>{details.key}</code> for all callers, regardless of
              the stack. Useful for incident response.
            </>
          )}
        </div>
      </div>
      <button
        className={`ks-switch ${killswitch ? "on" : ""}`}
        onClick={() => setShowKillConfirm(true)}
      />
    </div>
  );

  // ── Wizard stepper ────────────────────────────────────────────
  const Stepper = () => (
    <div className="wiz-stepper">
      {STEPS.map((s, i) => (
        <div key={s.k} style={{ display: "contents" }}>
          {i > 0 && <div className={`wiz-conn ${i < step ? "done" : ""}`} />}
          <div
            className={`wiz-step ${i + 1 === step ? "current" : i + 1 < step ? "done" : ""}`}
            onClick={() => gotoStep(i + 1)}
          >
            <span className="num">{i + 1 < step ? <IconCheckSm size={12} /> : i + 1}</span>
            <div className="body">
              <span className="lbl">{s.label}</span>
              <span className="tag">{s.tag}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  // ── Footer ────────────────────────────────────────────────────
  const Footer = () => (
    <div className="wiz-foot">
      <div className="meta">
        <span>v4 draft · autosaved 12s ago</span>
        <span className="sep">·</span>
        <span>{gates.length} gates</span>
        <span className="sep">·</span>
        <span style={{ color: "var(--accent)" }}>
          {gates.filter((g) => !g.locked).length} editable
        </span>
        {overrides.length > 0 && (
          <>
            <span className="sep">·</span>
            <span style={{ color: "var(--purple)" }}>
              {overrides.length} override{overrides.length === 1 ? "" : "s"}
            </span>
          </>
        )}
      </div>
      <div className="acts">
        {step > 1 && (
          <button className="btn btn-ghost" onClick={() => gotoStep(step - 1)}>
            <IconArrowLeft size={11} /> Back
          </button>
        )}
        <button className="btn btn-ghost btn-sm">Discard</button>
        <button className="btn btn-secondary btn-sm">
          <IconEdit size={11} /> Save draft
        </button>
        {step < 3 ? (
          <button className="btn btn-primary" onClick={() => gotoStep(step + 1)}>
            Next: {STEPS[step].label} <IconArrowRight size={11} />
          </button>
        ) : (
          <>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowDiff(true)}>
              <IconDiff size={11} /> Diff
            </button>
            <button className="btn btn-primary">
              <IconRocket size={11} /> Publish v4
            </button>
          </>
        )}
      </div>
    </div>
  );

  return (
    <>
      <div className="app">
        <Sidebar active="gatekeepers" />
        <div>
          <Topbar
            crumbs={["Acme Co.", "Gatekeepers", details.title]}
            actions={
              <>
                <button className="btn btn-ghost btn-sm" onClick={() => setDrawer("versions")}>
                  <IconHistory size={11} /> History
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => setShowSdk(true)}>
                  <IconCode size={11} /> SDK
                </button>
                <button className="btn btn-ghost">Discard</button>
                <button className="btn btn-secondary">
                  <IconEdit size={11} /> Save draft
                </button>
              </>
            }
          />
          <div
            className="page"
            style={{
              gap: 18,
              paddingBottom: 32,
              display: "flex",
              flexDirection: "column",
              minHeight: "calc(100vh - 100px)",
            }}
          >
            <PageHeader />
            <KsBanner />
            <Stepper />

            {step === 1 && (
              <StepDetails
                details={details}
                onEdit={() => setShowEditDetails(true)}
                killswitch={killswitch}
                onKillswitchToggle={() => setShowKillConfirm(true)}
              />
            )}
            {step === 2 && (
              <StepGates
                gates={gates}
                onUpd={setGates}
                onAdd={addGate}
                onPickTemplate={() => setShowTplPicker(true)}
                onSaveAsTemplate={(g) => setShowSaveAsTpl(g)}
                overrides={overrides}
                onAddOverride={() => setShowAddOverride(true)}
                onRegisterAttribute={() => setShowRegAttr(true)}
              />
            )}
            {step === 3 && (
              <StepReview
                details={details}
                gates={gates}
                killswitch={killswitch}
                onShowSdk={() => setShowSdk(true)}
                onShowDiff={() => setShowDiff(true)}
              />
            )}

            <div style={{ flex: 1 }} />
            <Footer />
          </div>
        </div>
      </div>

      <TemplatePickerModal
        open={showTplPicker}
        onClose={() => setShowTplPicker(false)}
        onPick={addGate}
      />
      <SaveAsTemplateModal
        open={!!showSaveAsTpl}
        gate={showSaveAsTpl}
        onClose={() => setShowSaveAsTpl(null)}
        onSaved={() => {}}
      />
      <EditDetailsModal
        open={showEditDetails}
        details={details}
        onClose={() => setShowEditDetails(false)}
        onSave={setDetails}
      />
      <GateSdkModal open={showSdk} configKey={details.key} onClose={() => setShowSdk(false)} />
      <KillswitchConfirmModal
        open={showKillConfirm}
        gateKey={details.key}
        action={killswitch ? "disable" : "enable"}
        onClose={() => setShowKillConfirm(false)}
        onConfirm={() => setKillswitch((k) => !k)}
      />
      <AddOverrideModal
        open={showAddOverride}
        onClose={() => setShowAddOverride(false)}
        onAdd={addOverride}
      />
      <RegisterAttributeModal
        open={showRegAttr}
        onClose={() => setShowRegAttr(false)}
        onSave={() => {}}
      />
      <DiffModal
        open={showDiff}
        onClose={() => setShowDiff(false)}
        oldStack={OLD_STACK_V3}
        newStack={gates}
      />
      <HistoryDrawer open={drawer !== null} mode={drawer} onClose={() => setDrawer(null)} />
    </>
  );
}

ReactDOM.createRoot(document.getElementById("app")).render(<GatesApp />);
