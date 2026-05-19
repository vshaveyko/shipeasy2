// Shipeasy — Home v1: "Mission Control" layout.
// Renders the default Home page. Loads on top of home-lib.jsx (data + components).

// ── Page entry ────────────────────────────────────────────────

function HomePage() {
  const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/ {
    mode: "busy",
  }; /*EDITMODE-END*/

  const [values, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const mode = values.mode;
  const firstRun = mode === "first-run";

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
                <IconPlus size={12} /> New record{" "}
                <span className="kbd" style={{ marginLeft: 6 }}>
                  ⌘ N
                </span>
              </button>
            </>
          }
        />

        <div className="home">
          <Hero mode={mode} name="Maya" />

          <div className="home-body">
            <div className="home-main">
              {firstRun && (
                <section>
                  <OnboardingChecklist />
                </section>
              )}

              {!firstRun && DECISIONS.length > 0 && (
                <section>
                  <div className="h-sec">
                    <h2>Decisions waiting on you</h2>
                    <div className="h-sec-aside">
                      <span>{mode === "busy" ? "2" : "1"} of 6 live · ranked by impact</span>
                      <span style={{ color: "var(--fg-4)" }}>·</span>
                      <a>View all experiments →</a>
                    </div>
                  </div>
                  <div className="dec-row">
                    {(mode === "busy" ? DECISIONS : [DECISIONS[0]]).map((d) => (
                      <DecisionCard key={d.id} d={d} />
                    ))}
                    {mode !== "busy" && (
                      <div
                        className="dec-card info"
                        style={{
                          background: "var(--bg-1)",
                          borderStyle: "dashed",
                          opacity: 0.7,
                        }}
                      >
                        <div className="dec-head">
                          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                            <div className="dec-tag" style={{ color: "var(--fg-4)" }}>
                              ◷ STILL GATHERING
                            </div>
                            <h3 style={{ color: "var(--fg-2)" }}>
                              <span className="t-mono" style={{ fontSize: 14 }}>
                                welcome_email_5min
                              </span>
                            </h3>
                            <p className="desc">
                              4 more days to clear 95%. Trending positive at +6.8% lift.
                            </p>
                          </div>
                        </div>
                        <div
                          style={{
                            textAlign: "center",
                            padding: "12px 0",
                            color: "var(--fg-4)",
                            fontFamily: "var(--mono)",
                            fontSize: 11,
                          }}
                        >
                          Projected significance: Friday · 4 PM
                        </div>
                      </div>
                    )}
                  </div>
                </section>
              )}

              <section className={firstRun ? "lock-fade" : ""}>
                <div className="h-sec">
                  <h2>Live now</h2>
                  <div className="h-sec-aside">
                    {firstRun ? (
                      <span className="lock-pill">
                        <IconLock size={9} /> Activates after step 3
                      </span>
                    ) : (
                      <>
                        <span>6 records · 4.2k evals/min</span>
                        <span style={{ color: "var(--fg-4)" }}>·</span>
                        <a>Open unified list →</a>
                      </>
                    )}
                  </div>
                </div>
                <div className="tile-grid">
                  {LIVE_EXPERIMENTS.map((r) => (
                    <LiveTile key={r.id} r={r} />
                  ))}
                </div>
              </section>

              <section className={firstRun ? "lock-fade" : ""}>
                <div className="h-sec">
                  <h2>Stream</h2>
                  <div className="h-sec-aside">
                    {firstRun ? (
                      <span className="lock-pill">
                        <IconLock size={9} /> Empty — no activity yet
                      </span>
                    ) : (
                      <>
                        <span>since you were away · 14h</span>
                        <span style={{ color: "var(--fg-4)" }}>·</span>
                        <a>View full audit log →</a>
                      </>
                    )}
                  </div>
                </div>
                <ActivityStream />
              </section>

              <section>
                <div className="h-sec">
                  <h2>Quick create</h2>
                  <div className="h-sec-aside">
                    <span>or press</span> <span className="kbd">⌘ K</span>
                  </div>
                </div>
                <Launchpad />
              </section>
            </div>

            <div className="home-rail">
              <HealthRingsCard mode={firstRun ? "day-1" : mode} />
              <AlertsCard mode={firstRun ? "quiet" : mode} />
              <PinnedCard />
              <ClaudeTile />
            </div>
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

ReactDOM.createRoot(document.getElementById("app")).render(<HomePage />);
