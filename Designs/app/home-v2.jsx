// Shipeasy — Home v2: "Focus Inbox" layout.
// Linear-inspired prioritized queue + preview pane. Designed for solo PMs
// and async teams — answers "what's the next thing I should do?" instead
// of "what's the state of everything?". Keyboard-driven: j/k to navigate,
// enter to action, e to expand details.

const { useState: useS2 } = React;

// ── Build the queue from shared data ──────────────────────────
function buildQueue(mode) {
  if (mode === "first-run") {
    // First-run: queue is the onboarding steps, top-of-mind.
    return [
      ...ONB_STEPS.filter((s) => !s.done)
        .slice(0, 3)
        .map((s, i) => ({
          id: `onb-${s.k}`,
          group: "now",
          kind: "setup",
          icon: s.icon,
          title: s.title,
          pill: i === 0 ? { cls: "now", txt: "NEXT" } : null,
          desc: s.desc,
          meta: `step ${ONB_STEPS.findIndex((x) => x.k === s.k) + 1} of 6 · ~${s.est}`,
          when: "now",
          verb: "⏎ start",
        })),
      ...ONB_STEPS.filter((s) => s.done).map((s) => ({
        id: `onb-${s.k}`,
        group: "done",
        kind: "setup",
        icon: s.icon,
        title: s.title,
        desc: "completed",
        meta: "·",
        when: "today",
        verb: "",
      })),
    ];
  }
  // Returning user
  const items = [];
  // Decisions become NOW items
  DECISIONS.forEach((d, i) => {
    const pillMap = {
      ship: { cls: "now", txt: "SHIP READY" },
      extend: { cls: "", txt: "EXTEND" },
      kill: { cls: "dng", txt: "AT RISK" },
    };
    items.push({
      id: d.id,
      group: "now",
      kind: "decision",
      icon: <IconFlask size={11} />,
      title: d.title,
      tag: d.tag,
      pill: pillMap[d.verdict],
      desc: d.desc,
      meta: d.meta,
      when: d.verdict === "ship" ? "overnight" : "2 days left",
      verb: d.verdict === "ship" ? "⏎ ship" : d.verdict === "extend" ? "⏎ keep" : "⏎ review",
      d, // attach original for preview
    });
  });
  // Busy: alerts become NOW items
  if (mode === "busy") {
    ALERT_ITEMS.forEach((a, i) => {
      items.push({
        id: `al-${i}`,
        group: "now",
        kind: "alert",
        icon: <IconAlertTriangle size={11} />,
        title:
          a.sev === "danger"
            ? "SLA breach · p99 api_latency"
            : i === 1
              ? "Killswitch auto-armed"
              : "Gate predicate failure",
        pill: a.sev === "danger" ? { cls: "dng", txt: "CRITICAL" } : { cls: "wrn", txt: "WARNING" },
        desc: a.meta,
        meta: a.sev === "danger" ? "rule: p99_api_latency > 800ms" : "",
        when: a.when,
        verb: "⏎ open",
        alert: a,
      });
    });
  }
  // Scheduled / projected items (SOON)
  items.push({
    id: "soon-1",
    group: "soon",
    kind: "projected",
    icon: <IconClock size={11} />,
    title: "welcome_email_5min projected to clear",
    pill: { cls: "", txt: "PROJECTED" },
    desc: "On track to hit 95% significance on Friday at 4 PM.",
    meta: "experiment · auto-notify on sig",
    when: "Fri 4pm",
    verb: "snooze",
  });
  items.push({
    id: "soon-2",
    group: "soon",
    kind: "projected",
    icon: <IconRocket size={11} />,
    title: "dashboard_v2 starts rollout",
    pill: null,
    desc: "Scheduled to flip from draft → 10% traffic. Owner: Maya.",
    meta: "experiment · draft",
    when: "tomorrow 9am",
    verb: "snooze",
  });
  // Watch (live, no action needed)
  LIVE_EXPERIMENTS.filter((r) => r.status === "live")
    .slice(0, 4)
    .forEach((r) => {
      items.push({
        id: `wch-${r.id}`,
        group: "watch",
        kind: "live",
        icon: <KindIcon kind={r.kind} />,
        title: r.id,
        desc: r.desc,
        meta: r.meta,
        when: "live",
        verb: "",
        live: r,
      });
    });
  // Done today (collapse to count later — show 2 here)
  items.push({
    id: "done-1",
    group: "done",
    kind: "shipped",
    icon: <IconCheck size={11} />,
    title: "search_typo_tolerance · shipped winner",
    desc: "+4.7% lift made permanent · rollout 100%",
    meta: "5h ago · Kai S.",
    when: "5h ago",
    verb: "",
  });
  items.push({
    id: "done-2",
    group: "done",
    kind: "edit",
    icon: <IconShield size={11} />,
    title: "premium_features rule edited",
    desc: "Added ctx.user.ltv > 1000 to predicate · v6 → v7",
    meta: "1h ago · Maya P.",
    when: "1h ago",
    verb: "",
  });
  return items;
}

// ── Preview pane content ──────────────────────────────────────
function PreviewBody({ item }) {
  if (!item)
    return (
      <div style={{ padding: "80px 40px", textAlign: "center", color: "var(--fg-3)" }}>
        <IconCheckCircle size={28} style={{ color: "var(--accent)" }} />
        <div style={{ fontSize: 14, marginTop: 10 }}>Nothing selected · queue is clear</div>
      </div>
    );

  if (item.kind === "decision") {
    const d = item.d;
    return (
      <>
        <div className="fx-prv-head">
          <span
            className={`pill ${item.pill?.cls === "dng" ? "dng" : item.pill?.cls === "wrn" ? "wrn" : "now"}`}
            style={{
              fontFamily: "var(--mono)",
              fontSize: 9.5,
              letterSpacing: ".06em",
              textTransform: "uppercase",
              padding: "2px 7px",
              borderRadius: 3,
              color: "var(--accent)",
              background: "var(--accent-soft)",
              border: "1px solid color-mix(in oklab, var(--accent) 30%, transparent)",
            }}
          >
            {item.pill.txt}
          </span>
          <span style={{ fontSize: 13, color: "var(--fg-2)" }}>
            <span className="t-mono">{d.title}</span> · {d.tag}
          </span>
          <div className="nav">
            <span className="kbd">J</span>
            <span className="kbd">K</span> nav ·
            <span className="kbd" style={{ marginLeft: 6 }}>
              ⏎
            </span>{" "}
            action ·
            <span className="kbd" style={{ marginLeft: 6 }}>
              E
            </span>{" "}
            open full
          </div>
        </div>
        <div className="fx-prv-body">
          <h2>
            {d.verdict === "ship" && <span style={{ color: "var(--accent)" }}>⏵</span>}
            <span className="t-mono">{d.title}</span>
          </h2>
          <p className="lede">{d.desc}</p>

          <div className="fx-prv-kpis">
            {d.stats.map((s, i) => (
              <div key={i} className="cell">
                <div className="k">{s.k}</div>
                <div className={`v ${s.acc ? "acc" : ""}${s.dng ? "dng" : ""}`}>{s.v}</div>
                <div className="d">{s.d}</div>
              </div>
            ))}
            <div className="cell">
              <div className="k">DURATION</div>
              <div className="v">{d.verdict === "ship" ? "6d" : "3d"}</div>
              <div className="d">{d.verdict === "ship" ? "sig reached" : "+4 days projected"}</div>
            </div>
          </div>

          <div>
            <div className="t-caps dim-2" style={{ marginBottom: 8 }}>
              95% confidence interval · primary metric
            </div>
            <CIbar low={d.ci.low} high={d.ci.high} mean={d.ci.mean} />
            <div className="t-mono-xs dim-2" style={{ marginTop: 10, lineHeight: 1.6 }}>
              {d.verdict === "ship" ? (
                <>
                  CI excludes zero (5.6% to 11.2%, mean 8.4%). p-value 0.008. Required
                  min-detectable-effect of 2% was cleared 4 days ago — extra runtime is paying
                  diminishing returns. <b style={{ color: "var(--fg)" }}>Recommendation: ship.</b>
                </>
              ) : (
                <>
                  CI still crosses zero (-1.2% to +9.4%, mean +6.8%). Need 1,200 more daily samples
                  to clear 95%. At current 800/day traffic, projected to reach significance by
                  Friday 4pm. <b style={{ color: "var(--fg)" }}>Recommendation: let it run.</b>
                </>
              )}
            </div>
          </div>

          <div>
            <div className="t-caps dim-2" style={{ marginBottom: 10 }}>
              Recent activity on this experiment
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
                paddingLeft: 14,
                borderLeft: "1px solid var(--line)",
              }}
            >
              <div style={{ fontFamily: "var(--mono)", fontSize: 11.5, color: "var(--fg-2)" }}>
                <span style={{ color: "var(--fg-4)" }}>just now</span> · sig 99.2% reached ·
                auto-flagged
              </div>
              <div style={{ fontFamily: "var(--mono)", fontSize: 11.5, color: "var(--fg-2)" }}>
                <span style={{ color: "var(--fg-4)" }}>2d ago</span> · traffic bumped 25% → 50%
              </div>
              <div style={{ fontFamily: "var(--mono)", fontSize: 11.5, color: "var(--fg-2)" }}>
                <span style={{ color: "var(--fg-4)" }}>6d ago</span> · started · 25% traffic
              </div>
            </div>
          </div>

          <div className="fx-prv-actions">
            {d.verdict === "ship" ? (
              <>
                <button className="btn btn-primary">
                  <IconRocket size={12} /> Ship winner
                </button>
                <button className="btn btn-secondary">Extend 24h</button>
                <button className="btn btn-ghost">Open full results</button>
                <span
                  style={{
                    marginLeft: "auto",
                    fontFamily: "var(--mono)",
                    fontSize: 11,
                    color: "var(--fg-4)",
                  }}
                >
                  shipping flips rollout to 100% · audit logged
                </span>
              </>
            ) : (
              <>
                <button className="btn btn-primary">
                  <IconCheck size={12} /> Keep running
                </button>
                <button className="btn btn-secondary">Pause</button>
                <button className="btn btn-ghost">Investigate</button>
              </>
            )}
          </div>
        </div>
      </>
    );
  }

  if (item.kind === "alert") {
    return (
      <>
        <div className="fx-prv-head">
          <span
            style={{
              fontFamily: "var(--mono)",
              fontSize: 9.5,
              letterSpacing: ".06em",
              textTransform: "uppercase",
              padding: "2px 7px",
              borderRadius: 3,
              color: "var(--danger)",
              background: "var(--danger-soft)",
              border: "1px solid color-mix(in oklab, var(--danger) 30%, transparent)",
            }}
          >
            {item.pill.txt}
          </span>
          <span style={{ fontSize: 13, color: "var(--fg-2)" }}>alert · {item.when} ago</span>
          <div className="nav">
            <span className="kbd">⏎</span> ack
          </div>
        </div>
        <div className="fx-prv-body">
          <h2>{item.title}</h2>
          <p className="lede">
            {item.desc}. The killswitch <span className="t-mono">new_checkout</span> was auto-armed
            22 minutes ago. Holding for cooldown; will re-evaluate at 10:04.
          </p>

          <div className="fx-prv-kpis">
            <div className="cell">
              <div className="k">P99 NOW</div>
              <div className="v dng">872ms</div>
              <div className="d">SLA 800ms</div>
            </div>
            <div className="cell">
              <div className="k">BREACHES TODAY</div>
              <div className="v wrn">3</div>
              <div className="d">vs 0 yesterday</div>
            </div>
            <div className="cell">
              <div className="k">ERROR RATE</div>
              <div className="v wrn">0.31%</div>
              <div className="d">budget 0.05%</div>
            </div>
            <div className="cell">
              <div className="k">AFFECTED</div>
              <div className="v">~4%</div>
              <div className="d">checkout cohort</div>
            </div>
          </div>

          <div className="fx-prv-actions">
            <button className="btn btn-primary">Acknowledge</button>
            <button className="btn btn-secondary">
              <IconPower size={12} /> Disarm killswitch
            </button>
            <button className="btn btn-ghost">Open metric</button>
            <button className="btn btn-ghost">Ask Claude to diagnose</button>
          </div>
        </div>
      </>
    );
  }

  if (item.kind === "setup") {
    return (
      <>
        <div className="fx-prv-head">
          <span
            style={{
              fontFamily: "var(--mono)",
              fontSize: 9.5,
              letterSpacing: ".06em",
              textTransform: "uppercase",
              padding: "2px 7px",
              borderRadius: 3,
              color: "var(--accent)",
              background: "var(--accent-soft)",
              border: "1px solid color-mix(in oklab, var(--accent) 30%, transparent)",
            }}
          >
            SETUP · STEP 3 / 6
          </span>
          <div className="nav">
            <span className="kbd">⏎</span> begin
          </div>
        </div>
        <div className="fx-prv-body">
          <h2>{item.title}</h2>
          <p className="lede">{item.desc}</p>
          <div
            style={{
              background: "var(--bg-1)",
              border: "1px solid var(--line)",
              borderRadius: "var(--r-md)",
              padding: "14px 16px",
              fontFamily: "var(--mono)",
              fontSize: 12.5,
              lineHeight: 1.7,
              color: "var(--fg)",
            }}
          >
            <span style={{ color: "var(--fg-4)" }}>{"// any file in your app"}</span>
            {"\n"}
            <span style={{ color: "#a78bfa" }}>import</span>
            {" { log } "}
            <span style={{ color: "#a78bfa" }}>from</span>{" "}
            <span style={{ color: "var(--accent)" }}>'@shipeasy/sdk'</span>
            {";\n\n"}
            <span style={{ color: "#74c7ec" }}>log</span>(
            <span style={{ color: "var(--accent)" }}>'hello_shipeasy'</span>);
          </div>
          <div
            style={{
              display: "flex",
              gap: 10,
              padding: "12px 14px",
              background: "var(--bg-2)",
              border: "1px dashed var(--line-2)",
              borderRadius: "var(--r-md)",
              alignItems: "center",
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "var(--warn)",
                animation: "blink 1s infinite",
              }}
            />
            <span style={{ fontSize: 12.5 }}>Listening for your first event…</span>
            <button className="btn btn-ghost btn-sm" style={{ marginLeft: "auto" }}>
              <IconCpu size={11} /> Simulate it
            </button>
          </div>
          <div className="fx-prv-actions">
            <button className="btn btn-primary">Open install guide</button>
            <button className="btn btn-secondary">
              <IconSparkles size={12} /> Have Claude do it
            </button>
            <button className="btn btn-ghost">Skip · I'll do this later</button>
          </div>
        </div>
      </>
    );
  }

  if (item.kind === "live") {
    const r = item.live;
    return (
      <>
        <div className="fx-prv-head">
          <span className="badge badge-live">
            <span className="dot" />
            LIVE
          </span>
          <span style={{ fontSize: 13, color: "var(--fg-2)" }}>
            <span className="t-mono">{r.id}</span> · watching · no action needed
          </span>
          <div className="nav">
            <span className="kbd">⏎</span> open
          </div>
        </div>
        <div className="fx-prv-body">
          <h2>
            <span className="t-mono">{r.id}</span>
          </h2>
          <p className="lede">
            {r.desc}. {r.meta}.
          </p>
          <div className="fx-prv-kpis">
            <div className="cell">
              <div className="k">PRIMARY</div>
              <div className={`v ${r.lift > 0 ? "acc" : "dng"}`}>
                {r.lift != null ? (r.lift > 0 ? "+" : "") + r.lift.toFixed(1) + "%" : "—"}
              </div>
              <div className="d">vs control</div>
            </div>
            <div className="cell">
              <div className="k">STATE</div>
              <div className="v">{r.status === "live" ? "⏵" : "⏸"}</div>
              <div className="d">{r.status}</div>
            </div>
            <div className="cell">
              <div className="k">TREND · 12H</div>
              <div className="v">
                <Sparkline data={r.spark} neg={r.neg} h={20} />
              </div>
              <div className="d">{r.spark[r.spark.length - 1] > r.spark[0] ? "up" : "down"}</div>
            </div>
            <div className="cell">
              <div className="k">OWNER</div>
              <div
                className="v"
                style={{ fontSize: 14, display: "flex", alignItems: "center", gap: 6 }}
              >
                <span
                  className="av"
                  style={{
                    background: r.owner[1],
                    color: r.owner[1] === "#00d08a" ? "#07120d" : "#fff",
                  }}
                >
                  {r.owner[0]}
                </span>
              </div>
              <div className="d">acme team</div>
            </div>
          </div>
        </div>
      </>
    );
  }

  // shipped / edit / projected — small preview
  return (
    <>
      <div className="fx-prv-head">
        <span style={{ fontSize: 13, color: "var(--fg-3)" }}>
          {item.kind === "shipped"
            ? "completed today"
            : item.kind === "edit"
              ? "audit log"
              : "scheduled"}
        </span>
      </div>
      <div className="fx-prv-body">
        <h2>{item.title}</h2>
        <p className="lede">{item.desc}</p>
        <div className="t-mono-xs dim-2">{item.meta}</div>
      </div>
    </>
  );
}

// ── Page ──────────────────────────────────────────────────────
function HomeV2() {
  const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/ {
    mode: "busy",
  }; /*EDITMODE-END*/
  const [values, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const mode = values.mode;
  const queue = buildQueue(mode);
  const [selId, setSel] = useS2(queue[0]?.id);
  const selected = queue.find((q) => q.id === selId) || queue[0];

  const groups = [
    {
      k: "now",
      title: mode === "first-run" ? "NEXT UP · SET UP YOUR WORKSPACE" : "NEEDS YOU NOW",
      cls: "now",
    },
    { k: "soon", title: "SCHEDULED · THIS WEEK", cls: "soon" },
    { k: "watch", title: "WATCHING · NO ACTION", cls: "watch" },
    { k: "done", title: "DONE TODAY", cls: "done" },
  ];

  // Greeting
  const greet =
    mode === "first-run" ? (
      <>
        Welcome to <em>acme-web</em>
      </>
    ) : mode === "busy" ? (
      <>
        Morning, <em>Maya</em>. <span style={{ color: "var(--accent)" }}>5 items</span> need a
        decision.
      </>
    ) : (
      <>
        Morning, <em>Maya</em>. <span style={{ color: "var(--accent)" }}>1 thing</span> for you
        today.
      </>
    );

  const sub =
    mode === "first-run"
      ? "Three minutes to a live workspace · ⌘K to search anything"
      : mode === "busy"
        ? "Tuesday · May 14 · 9:42 · ranked by impact · ⌘K to search"
        : "Tuesday · May 14 · 9:42 · everything else is green · ⌘K to search";

  return (
    <div className="app">
      <Sidebar active="home" />
      <div style={{ minWidth: 0, display: "flex", flexDirection: "column", height: "100vh" }}>
        <Topbar
          crumbs={["Acme Co.", "Home"]}
          actions={
            <>
              <button className="btn btn-secondary">
                <IconSparkles size={12} /> Ask Claude
              </button>
            </>
          }
        />

        <div className="fx-shell">
          {/* Head */}
          <div className="fx-head">
            <div className="greet">
              <h1>{greet}</h1>
              <div className="sub">{sub}</div>
            </div>
            <div className="ml-auto">
              <div className="keys">
                <span className="kbd">J</span>
                <span className="kbd">K</span>
                <span>navigate</span>
                <span style={{ margin: "0 6px", color: "var(--fg-4)" }}>·</span>
                <span className="kbd">⏎</span>
                <span>action</span>
                <span style={{ margin: "0 6px", color: "var(--fg-4)" }}>·</span>
                <span className="kbd">E</span>
                <span>expand</span>
                <span style={{ margin: "0 6px", color: "var(--fg-4)" }}>·</span>
                <span className="kbd">⌘ K</span>
                <span>search</span>
              </div>
              <button className="btn btn-ghost btn-sm">
                <IconFilter size={11} /> Filter
              </button>
              <button className="btn btn-primary btn-sm">
                <IconPlus size={11} /> New
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="fx-body">
            <div className="fx-queue">
              {groups.map((g) => {
                const items = queue.filter((q) => q.group === g.k);
                if (items.length === 0) return null;
                return (
                  <React.Fragment key={g.k}>
                    <div className={`fx-section ${g.cls}`}>
                      <h2>{g.title}</h2>
                      <span className="ct">{items.length}</span>
                    </div>
                    {items.map((it) => (
                      <div
                        key={it.id}
                        className={`fx-row ${g.cls} ${selId === it.id ? "sel" : ""} ${
                          it.pill?.cls === "dng" ? "danger" : it.pill?.cls === "wrn" ? "warn" : ""
                        }`}
                        onClick={() => setSel(it.id)}
                      >
                        <div className="pri" />
                        <div className="ic">{it.icon}</div>
                        <div className="main">
                          <div className="top">
                            <div className="title">
                              {it.kind === "decision" || it.kind === "live" ? (
                                <span className="t-mono">{it.title}</span>
                              ) : (
                                <span>{it.title}</span>
                              )}
                              {it.tag && (
                                <span className="tag" style={{ fontSize: 10, padding: "1px 6px" }}>
                                  {it.tag}
                                </span>
                              )}
                            </div>
                            {it.pill && (
                              <span className={`pill ${it.pill.cls}`}>{it.pill.txt}</span>
                            )}
                          </div>
                          <div className="desc">{it.desc}</div>
                          {it.meta && <div className="meta">{it.meta}</div>}
                        </div>
                        <div className="when-act">
                          <span className="when">{it.when}</span>
                          {it.verb && <span className="verb">{it.verb}</span>}
                        </div>
                      </div>
                    ))}
                  </React.Fragment>
                );
              })}
            </div>

            <div className="fx-preview">
              <PreviewBody item={selected} />
            </div>
          </div>

          {/* Status bar */}
          <div className="fx-statusbar">
            <div className="item">
              <span className={`dot ${mode === "busy" ? "red" : "green"}`} />
              <span className="lbl">{mode === "busy" ? "p99 872ms · breach" : "p99 612ms"}</span>
            </div>
            <span className="sep">·</span>
            <div className="item">
              <span className={`dot ${mode === "busy" ? "amber" : "green"}`} />
              <span className="lbl">errors {mode === "busy" ? "0.31%" : "0.04%"}</span>
            </div>
            <span className="sep">·</span>
            <div className="item">
              events {mode === "first-run" ? "0" : mode === "busy" ? "5.8k" : "4.2k"}/min
            </div>
            <span className="sep">·</span>
            <div className="item">
              live {mode === "first-run" ? "0" : "6"} exp · {mode === "first-run" ? "0" : "12"}{" "}
              gates
            </div>
            <span style={{ marginLeft: "auto", display: "flex", gap: 14, alignItems: "center" }}>
              <span>build {mode === "first-run" ? "—" : "v0.9.4 · 2h ago"}</span>
              <span className="sep">·</span>
              <span>acme-web · prod</span>
            </span>
          </div>
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

ReactDOM.createRoot(document.getElementById("app")).render(<HomeV2 />);
