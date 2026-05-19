// App root + tweaks panel wiring.

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/ {
  accent: "green",
  mode: "dark",
  density: "regular",
}; /*EDITMODE-END*/

const ACCENTS = {
  green: "oklch(0.78 0.17 155)",
  violet: "oklch(0.72 0.18 295)",
  orange: "oklch(0.74 0.17 55)",
  blue: "oklch(0.72 0.17 245)",
  amber: "oklch(0.84 0.16 85)",
};
const ACCENT_SWATCH = {
  green: "#00d08a",
  violet: "#7c5cff",
  orange: "#ff8445",
  blue: "#3b82f6",
  amber: "#eab308",
};

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  useReveal();

  React.useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--accent", ACCENTS[t.accent] || ACCENTS.green);
    root.classList.toggle("light", t.mode === "light");
    root.classList.toggle("dense", t.density === "dense");
    root.classList.toggle("airy", t.density === "airy");
  }, [t.accent, t.mode, t.density]);

  return (
    <>
      <Nav />
      <Hero />
      <Ticker />
      <FeaturesTabs />
      <HowItWorks />
      <CliSection />
      <Dashboard />
      <UseCases />
      <Pricing />
      <Faq />
      <CtaFooter />

      <TweaksPanel>
        <TweakSection label="Theme" />
        <TweakRadio
          label="Mode"
          value={t.mode}
          options={[
            { value: "dark", label: "Dark" },
            { value: "light", label: "Light" },
          ]}
          onChange={(v) => setTweak("mode", v)}
        />
        <div className="twk-row">
          <div className="twk-lbl">
            <span>Accent</span>
            <span className="twk-val">{t.accent}</span>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {Object.keys(ACCENTS).map((k) => (
              <button
                key={k}
                onClick={() => setTweak("accent", k)}
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 7,
                  border: "1px solid rgba(0,0,0,.12)",
                  background: ACCENT_SWATCH[k],
                  cursor: "default",
                  outline: t.accent === k ? "2px solid rgba(0,0,0,.6)" : "none",
                  outlineOffset: "1px",
                }}
              />
            ))}
          </div>
        </div>

        <TweakSection label="Layout" />
        <TweakRadio
          label="Density"
          value={t.density}
          options={["dense", "regular", "airy"]}
          onChange={(v) => setTweak("density", v)}
        />
      </TweaksPanel>
    </>
  );
}

ReactDOM.createRoot(document.getElementById("app")).render(<App />);
