// Shipeasy — Home v3: "Instrument Cluster" layout.
// Parallel monitoring split by record-type. Each of the four big record
// kinds (experiments, gates, killswitches, metrics) gets its own
// self-contained instrument panel — like a real cockpit cluster where
// each gauge owns a domain. Best for ops/SRE-leaning teams who think in
// product areas rather than in priority queues.

// ── Compact hero stats ────────────────────────────────────────
function ICHeroStats({ mode }) {
  if (mode === "first-run") {
    return (
      <div className="ic-hero-stats">
        <div className="cell">
          <div className="k">SETUP</div>
          <div className="v acc">2/6</div>
        </div>
        <div className="cell">
          <div className="k">EVENTS</div>
          <div className="v">0</div>
        </div>
        <div className="cell">
          <div className="k">TEAM</div>
          <div className="v">1</div>
        </div>
        <div className="cell">
          <div className="k">STATUS</div>
          <div className="v acc">RDY</div>
        </div>
      </div>
    );
  }
  if (mode === "day-1") {
    return (
      <div className="ic-hero-stats">
        <div className="cell">
          <div className="k">DECISIONS</div>
          <div className="v acc">1</div>
        </div>
        <div className="cell">
          <div className="k">EVENTS · 24H</div>
          <div className="v">14.3M</div>
        </div>
        <div className="cell">
          <div className="k">P99 API</div>
          <div className="v">612ms</div>
        </div>
        <div className="cell">
          <div className="k">ERRORS</div>
          <div className="v">0.04%</div>
        </div>
        <div className="cell">
          <div className="k">UPTIME</div>
          <div className="v acc">99.96%</div>
        </div>
      </div>
    );
  }
  return (
    <div className="ic-hero-stats">
      <div className="cell">
        <div className="k">DECISIONS</div>
        <div className="v acc">2</div>
      </div>
      <div className="cell">
        <div className="k">ALERTS</div>
        <div className="v dng">3</div>
      </div>
      <div className="cell">
        <div className="k">EVENTS · 24H</div>
        <div className="v">18.7M</div>
      </div>
      <div className="cell">
        <div className="k">P99 API</div>
        <div className="v dng">872ms</div>
      </div>
      <div className="cell">
        <div className="k">ERRORS</div>
        <div className="v wrn">0.31%</div>
      </div>
    </div>
  );
}

// ── Experiments instrument ────────────────────────────────────
function ExperimentsInstrument({ mode }) {
  const live = LIVE_EXPERIMENTS.filter((r) => r.kind === "exp" && r.status === "live");
  const all = mode === "first-run" ? [] : live;
  return (
    <div className="ic-inst">
      <div className="ic-inst-head">
        <div className="ic">
          <IconFlask size={13} />
        </div>
        <h3>Experiments</h3>
        <span className="ct">{mode === "first-run" ? "0 live" : "4 live · 2 ready"}</span>
        <div className="right">
          {mode !== "first-run" && (
            <>
              <span className="live-dot" /> 22.7k samples/h
            </>
          )}
        </div>
      </div>
      <div className="ic-inst-stats">
        <div className="cell">
          <div className="k">READY TO SHIP</div>
          <div className="v acc">{mode === "first-run" ? "—" : mode === "busy" ? "1" : "1"}</div>
          <div className="d">{mode === "first-run" ? "set up first" : "checkout_v3"}</div>
        </div>
        <div className="cell">
          <div className="k">GATHERING</div>
          <div className="v">{mode === "first-run" ? "0" : "3"}</div>
          <div className="d">{mode === "first-run" ? "—" : "avg 73% sig"}</div>
        </div>
        <div className="cell">
          <div className="k">WEEK · CUM LIFT</div>
          <div className="v acc">{mode === "first-run" ? "—" : "+18.3%"}</div>
          <div className="d">{mode === "first-run" ? "—" : "4 wins shipped"}</div>
        </div>
      </div>
      <div className="ic-inst-body">
        {mode === "first-run" ? (
          <div
            style={{
              padding: "30px 18px",
              textAlign: "center",
              color: "var(--fg-3)",
              display: "flex",
              flexDirection: "column",
              gap: 6,
              alignItems: "center",
            }}
          >
            <IconFlask size={20} style={{ color: "var(--fg-4)" }} />
            <div style={{ fontSize: 12.5 }}>No experiments yet · finish setup to unlock</div>
            <button className="btn btn-secondary btn-sm" style={{ marginTop: 6 }}>
              <IconPlus size={11} /> New experiment
            </button>
          </div>
        ) : (
          <>
            {/* The "needs decision" experiment is hottest — flag it */}
            <div
              className="ic-row"
              style={{
                background: "color-mix(in oklab, var(--accent) 6%, transparent)",
                borderLeft: "3px solid var(--accent)",
              }}
            >
              <span className="dot live" />
              <div className="name">
                <div className="ln">
                  checkout_v3{" "}
                  <span
                    style={{
                      color: "var(--accent)",
                      fontFamily: "var(--mono)",
                      fontSize: 10,
                      marginLeft: 6,
                    }}
                  >
                    ⏵ SHIP READY
                  </span>
                </div>
                <div className="meta">99.2% sig · 14.2k samples · 6 days</div>
              </div>
              <Sparkline data={[30, 33, 31, 37, 41, 44, 49, 52, 58, 62, 69, 72]} h={18} />
              <div className="val acc">+8.4%</div>
            </div>
            {all.slice(0, 3).map((r) => (
              <div key={r.id} className="ic-row">
                <span className={`dot ${r.status === "paused" ? "warn" : "live"}`} />
                <div className="name">
                  <div className="ln">{r.id}</div>
                  <div className="meta">{r.meta}</div>
                </div>
                <Sparkline data={r.spark} neg={r.neg} h={18} />
                <div className={`val ${r.lift > 0 ? "acc" : "dng"}`}>
                  {r.lift != null ? (r.lift > 0 ? "+" : "") + r.lift.toFixed(1) + "%" : "—"}
                </div>
              </div>
            ))}
          </>
        )}
      </div>
      <div className="ic-inst-foot">
        <span>24 total · 6 live · 12 completed</span>
        <a>open experiments →</a>
      </div>
    </div>
  );
}

// ── Gates instrument ──────────────────────────────────────────
function GatesInstrument({ mode }) {
  return (
    <div className="ic-inst">
      <div className="ic-inst-head">
        <div className="ic">
          <IconShield size={13} />
        </div>
        <h3>Gates</h3>
        <span className="ct">{mode === "first-run" ? "5 built-in" : "12 · 8.2k evals/min"}</span>
        <div className="right">
          {mode !== "first-run" && (
            <>
              <span className="live-dot" /> 4.8ms p50
            </>
          )}
        </div>
      </div>
      <div className="ic-inst-stats">
        <div className="cell">
          <div className="k">EVAL P50</div>
          <div className="v">{mode === "first-run" ? "—" : "4.8ms"}</div>
          <div className="d">{mode === "first-run" ? "—" : "budget 5ms"}</div>
        </div>
        <div className="cell">
          <div className="k">PASS RATE · 1H</div>
          <div className="v">{mode === "first-run" ? "—" : "42.6%"}</div>
          <div className="d">{mode === "first-run" ? "—" : "8.2k of 19.3k"}</div>
        </div>
        <div className="cell">
          <div className="k">RECENT EDITS</div>
          <div className="v">{mode === "first-run" ? "0" : "3"}</div>
          <div className="d">{mode === "first-run" ? "—" : "last 24h"}</div>
        </div>
      </div>
      <div className="ic-inst-body">
        {mode === "first-run" ? (
          <div style={{ padding: "24px 18px", textAlign: "center", color: "var(--fg-3)" }}>
            <div style={{ fontSize: 12.5, marginBottom: 8 }}>5 built-in gates ready to use:</div>
            <div
              style={{
                display: "flex",
                gap: 6,
                flexWrap: "wrap",
                justifyContent: "center",
                fontFamily: "var(--mono)",
                fontSize: 11,
              }}
            >
              {["is_employee", "mobile_only", "eu_user", "admin", "trial_user"].map((g) => (
                <span key={g} className="tag">
                  {g}
                </span>
              ))}
            </div>
          </div>
        ) : (
          <>
            <div className="ic-row">
              <span className="dot live" />
              <div className="name">
                <div className="ln">premium_features</div>
                <div className="meta">custom · 12.4% pass · edited 1h ago</div>
              </div>
              <Sparkline data={[12, 12, 13, 12, 12, 13, 13, 12, 13, 12, 13, 12]} h={18} />
              <div className="val">8.2k/min</div>
            </div>
            <div className="ic-row">
              <span className="dot live" />
              <div className="name">
                <div className="ln">employee_only</div>
                <div className="meta">built-in · 0.4% pass</div>
              </div>
              <Sparkline data={[5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5]} h={18} />
              <div className="val">14.3k/h</div>
            </div>
            <div className="ic-row">
              <span className="dot warn" />
              <div className="name">
                <div className="ln">high_value_customer</div>
                <div className="meta">predicate failed on 142 evals · auto-disabled</div>
              </div>
              <Sparkline data={[8, 9, 8, 8, 9, 4, 2, 1, 0, 0, 0, 0]} neg={true} h={18} />
              <div className="val dng">0</div>
            </div>
            <div className="ic-row">
              <span className="dot live" />
              <div className="name">
                <div className="ln">mobile_only</div>
                <div className="meta">built-in · 67.2% pass</div>
              </div>
              <Sparkline data={[60, 62, 64, 66, 67, 68, 67, 68, 67, 68, 67, 67]} h={18} />
              <div className="val">9.1k/h</div>
            </div>
          </>
        )}
      </div>
      <div className="ic-inst-foot">
        <span>12 total · 1 disabled</span>
        <a>open gates →</a>
      </div>
    </div>
  );
}

// ── Killswitches instrument ───────────────────────────────────
function KillswitchesInstrument({ mode }) {
  const armed = mode === "busy";
  return (
    <div className="ic-inst">
      <div className="ic-inst-head">
        <div className="ic">
          <IconPower size={13} />
        </div>
        <h3>Killswitches</h3>
        <span className="ct">{mode === "first-run" ? "0" : "8 deployed"}</span>
        <div className="right">
          {armed ? (
            <span style={{ color: "var(--warn)" }}>⚠ 1 armed</span>
          ) : (
            mode !== "first-run" && (
              <>
                <span className="live-dot" /> all standing by
              </>
            )
          )}
        </div>
      </div>
      <div className="ic-big">
        {mode === "first-run" ? (
          <div
            style={{
              padding: "14px",
              textAlign: "center",
              color: "var(--fg-3)",
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}
          >
            <IconPower size={20} style={{ color: "var(--fg-4)", margin: "0 auto" }} />
            <div style={{ fontSize: 12.5 }}>
              Wrap risky code in <span className="t-mono">killswitch()</span> · flip from dashboard
              in &lt;1s.
            </div>
          </div>
        ) : armed ? (
          <>
            <div className="arm">
              <span className="blink" />
              <div className="l">
                <div className="nm">new_checkout · AUTO-ARMED</div>
                <div className="desc">err 0.04 → 0.31% · cooldown 13:24 left</div>
              </div>
              <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
                <button className="btn btn-ghost btn-sm">Disarm</button>
                <button className="btn btn-danger btn-sm">Pull</button>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div className="t-caps dim-2">Today · trigger windows</div>
              <div className="ic-stripe">
                <div className="seg ok">
                  <span className="lbl">00–08 · ok</span>
                </div>
                <div className="seg ok">
                  <span className="lbl">08–09 · ok</span>
                </div>
                <div className="seg warn">
                  <span className="lbl">09:18 · err spike</span>
                </div>
                <div className="seg alert">
                  <span className="lbl">09:22 · armed</span>
                </div>
                <div className="seg" style={{ background: "var(--bg-3)" }}>
                  <span className="lbl">10–24</span>
                </div>
              </div>
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 6,
                fontSize: 11.5,
                fontFamily: "var(--mono)",
                color: "var(--fg-3)",
              }}
            >
              <div>7 other switches · standing by · last triggered 4d ago</div>
              <div>auto-trigger rules: 5 · auto-disarm: 8 (cooldown 15min)</div>
            </div>
          </>
        ) : (
          <>
            <div style={{ padding: "14px", display: "flex", gap: 14, alignItems: "center" }}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  background: "var(--accent-soft)",
                  border: "1px solid color-mix(in oklab, var(--accent) 30%, transparent)",
                  display: "grid",
                  placeItems: "center",
                  color: "var(--accent)",
                }}
              >
                <IconCheck size={22} />
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 500, letterSpacing: "-0.005em" }}>
                  All clear · 8 switches standing by
                </div>
                <div className="t-mono-xs dim-2" style={{ marginTop: 2 }}>
                  last triggered 4d ago · new_checkout (now disarmed)
                </div>
              </div>
            </div>
            <div className="t-caps dim-2">Recent · 7 days</div>
            <div className="ic-stripe">
              <div className="seg ok">
                <span className="lbl">Mon</span>
              </div>
              <div className="seg ok">
                <span className="lbl">Tue</span>
              </div>
              <div className="seg ok">
                <span className="lbl">Wed</span>
              </div>
              <div className="seg warn">
                <span className="lbl">Thu · 1</span>
              </div>
              <div className="seg ok">
                <span className="lbl">Fri</span>
              </div>
              <div className="seg ok">
                <span className="lbl">Sat</span>
              </div>
              <div className="seg ok">
                <span className="lbl">Sun</span>
              </div>
            </div>
          </>
        )}
      </div>
      <div className="ic-inst-foot">
        <span>
          {mode === "first-run" ? "add your first" : "8 active · cooldown auto · audit logged"}
        </span>
        <a>open killswitches →</a>
      </div>
    </div>
  );
}

// ── Metrics / SLAs instrument ─────────────────────────────────
function MetricsInstrument({ mode }) {
  const busy = mode === "busy";
  return (
    <div className="ic-inst">
      <div className="ic-inst-head">
        <div className="ic">
          <IconChart size={13} />
        </div>
        <h3>Metrics &amp; SLAs</h3>
        <span className="ct">{mode === "first-run" ? "4 auto" : "34 · 4 SLA budgets"}</span>
        <div className="right">
          {mode !== "first-run" &&
            (busy ? (
              <span style={{ color: "var(--danger)" }}>⚠ 1 SLA breach</span>
            ) : (
              <>
                <span className="live-dot" /> all green
              </>
            ))}
        </div>
      </div>
      <div className="ic-inst-stats">
        <div className="cell">
          <div className="k">P99 · API</div>
          <div className={`v ${busy ? "dng" : ""}`}>
            {mode === "first-run" ? "—" : busy ? "872ms" : "612ms"}
          </div>
          <div className="d">
            {mode === "first-run" ? "—" : busy ? "SLA 800ms · ⚠" : "SLA 800ms · ok"}
          </div>
        </div>
        <div className="cell">
          <div className="k">ERR RATE · 1H</div>
          <div className={`v ${busy ? "wrn" : ""}`}>
            {mode === "first-run" ? "—" : busy ? "0.31%" : "0.04%"}
          </div>
          <div className="d">
            {mode === "first-run" ? "—" : busy ? "budget 0.05%" : "budget 0.05% · ok"}
          </div>
        </div>
        <div className="cell">
          <div className="k">LCP · WEB</div>
          <div className="v">{mode === "first-run" ? "—" : "2.1s"}</div>
          <div className="d">{mode === "first-run" ? "—" : "good · 74% pass"}</div>
        </div>
      </div>
      <div className="ic-inst-body">
        {mode === "first-run" ? (
          <div style={{ padding: "18px", display: "flex", flexDirection: "column", gap: 8 }}>
            <div className="t-caps dim-2">Auto-collected · turn on with init()</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {["Web Vitals", "JS errors", "Page views", "API timing"].map((m) => (
                <div
                  key={m}
                  style={{
                    padding: "8px 10px",
                    background: "var(--bg-2)",
                    border: "1px solid var(--line)",
                    borderRadius: "var(--r-sm)",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <span
                    style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--fg-4)" }}
                  />
                  <span style={{ fontSize: 12, fontFamily: "var(--mono)" }}>{m}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            <div className="ic-row">
              <span className={`dot ${busy ? "kill" : "live"}`} />
              <div className="name">
                <div className="ln">p99_api_latency</div>
                <div className="meta">
                  SLA: 800ms · {busy ? "3 breaches today" : "within budget"}
                </div>
              </div>
              <Sparkline
                data={
                  busy
                    ? [600, 610, 620, 640, 680, 750, 820, 870, 880, 870, 870, 872]
                    : [580, 590, 600, 605, 612, 610, 608, 612, 615, 612, 610, 612]
                }
                neg={busy}
                h={18}
              />
              <div className={`val ${busy ? "dng" : ""}`}>{busy ? "872ms" : "612ms"}</div>
            </div>
            <div className="ic-row">
              <span className={`dot ${busy ? "warn" : "live"}`} />
              <div className="name">
                <div className="ln">error_rate</div>
                <div className="meta">budget: 0.05% · {busy ? "over · auto-armed" : "ok"}</div>
              </div>
              <Sparkline
                data={
                  busy
                    ? [4, 4, 4, 5, 8, 15, 25, 30, 31, 30, 31, 31]
                    : [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4]
                }
                neg={busy}
                h={18}
              />
              <div className={`val ${busy ? "dng" : ""}`}>{busy ? "0.31%" : "0.04%"}</div>
            </div>
            <div className="ic-row">
              <span className="dot live" />
              <div className="name">
                <div className="ln">revenue_per_visitor</div>
                <div className="meta">primary · checkout_v3 lifting</div>
              </div>
              <Sparkline data={[30, 33, 31, 37, 41, 44, 49, 52, 58, 62, 69, 72]} h={18} />
              <div className="val acc">+8.4%</div>
            </div>
            <div className="ic-row">
              <span className="dot live" />
              <div className="name">
                <div className="ln">lcp_p75</div>
                <div className="meta">Web Vitals · target ≤2.5s</div>
              </div>
              <Sparkline data={[22, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21]} h={18} />
              <div className="val">2.1s</div>
            </div>
          </>
        )}
      </div>
      <div className="ic-inst-foot">
        <span>{mode === "first-run" ? "4 auto · 0 custom yet" : "34 tracked · 4 with SLAs"}</span>
        <a>open metrics →</a>
      </div>
    </div>
  );
}

// ── Page entry ────────────────────────────────────────────────
function HomeV3() {
  const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/ {
    mode: "busy",
  }; /*EDITMODE-END*/
  const [values, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const mode = values.mode;
  const firstRun = mode === "first-run";

  let h1, sub, eyebrow;
  if (firstRun) {
    eyebrow = (
      <>
        <span>Tuesday · May 14</span>
        <span style={{ color: "var(--fg-4)" }}>·</span>
        <span>new workspace</span>
      </>
    );
    h1 = (
      <>
        Welcome to <em>acme-web</em>. Each panel below activates as you set up its record type.
      </>
    );
    sub =
      "Install the SDK first, then each instrument fills with live data. Built-in gates and auto-collected metrics work immediately on init() — experiments and killswitches need at least one record.";
  } else if (mode === "day-1") {
    eyebrow = (
      <>
        <span>Tuesday · May 14 · 9:42</span>
        <span style={{ color: "var(--fg-4)" }}>·</span>
        <span style={{ color: "var(--accent)" }}>● LIVE · 4.2k events/min</span>
      </>
    );
    h1 = (
      <>
        Good morning, <em>Maya</em>.{" "}
        <span style={{ color: "var(--accent)" }}>All instruments green.</span>
      </>
    );
    sub =
      "Four panels below — experiments, gates, killswitches, metrics. One experiment is ready to ship; everything else is on track.";
  } else {
    eyebrow = (
      <>
        <span>Tuesday · May 14 · 9:42</span>
        <span style={{ color: "var(--fg-4)" }}>·</span>
        <span style={{ color: "var(--accent)" }}>● LIVE · 5.8k events/min</span>
        <span style={{ color: "var(--fg-4)" }}>·</span>
        <span style={{ color: "var(--warn)" }}>⚠ 1 SLA breach</span>
      </>
    );
    h1 = (
      <>
        Morning, <em>Maya</em>.{" "}
        <span style={{ color: "var(--danger)" }}>Metrics panel needs eyes.</span>
      </>
    );
    sub =
      "p99 api_latency has breached SLA 3× today; killswitch auto-armed. Two experiments waiting on your call — one is ready to ship.";
  }

  return (
    <div className="app">
      <Sidebar active="home" />
      <div style={{ minWidth: 0 }}>
        <Topbar
          crumbs={["Acme Co.", "Home"]}
          actions={
            <>
              <button className="btn btn-secondary">
                <IconSparkles size={12} /> Ask Claude
              </button>
              <button className="btn btn-primary">
                <IconPlus size={12} /> New record
              </button>
            </>
          }
        />

        <div className="ic-page">
          <div className="ic-hero">
            <div className="greet">
              <div className="eyebrow">{eyebrow}</div>
              <h1>{h1}</h1>
              <p className="sub">{sub}</p>
            </div>
            <ICHeroStats mode={mode} />
          </div>

          <div className="ic-cluster">
            <ExperimentsInstrument mode={mode} />
            <GatesInstrument mode={mode} />
            <KillswitchesInstrument mode={mode} />
            <MetricsInstrument mode={mode} />
          </div>

          {firstRun ? (
            <div className="ic-strip">
              <div style={{ gridColumn: "span 2" }}>
                <OnboardingChecklist />
              </div>
            </div>
          ) : (
            <div className="ic-strip">
              <section>
                <div className="h-sec">
                  <h2>Stream · since you were away</h2>
                  <div className="h-sec-aside">
                    <a>view full audit log →</a>
                  </div>
                </div>
                <ActivityStream />
              </section>
              <section style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <ClaudeTile />
                <PinnedCard />
              </section>
            </div>
          )}
        </div>

        <TweaksPanel title="Tweaks">
          <TweakSection label="View mode">
            <TweakRadio
              label="Workspace state"
              value={mode}
              options={[
                { value: "first-run", label: "First-run" },
                { value: "day-1", label: "Quiet day" },
                { value: "busy", label: "Busy day" },
              ]}
              onChange={(v) => setTweak("mode", v)}
            />
          </TweakSection>
        </TweaksPanel>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("app")).render(<HomeV3 />);
