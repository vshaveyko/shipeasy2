const LOGOS = [
  "Trusted by teams shipping fast at",
  "◆ ANVIL",
  "◇ NORTHWIND",
  "✦ PARALLEL",
  "◎ COLDSTART",
  "◉ ORBITAL",
  "◈ PRIMER",
  "▲ HELIX",
  "✧ KINDRED",
  "◌ MERIDIAN",
  "◉ VECTOR",
];

export function LandingTicker() {
  return (
    <div className="lp-ticker">
      <div className="lp-ticker-track">
        {Array.from({ length: 3 }).flatMap((_, r) =>
          LOGOS.map((l, i) => (
            <span key={`${r}-${i}`}>
              <b>{l}</b>
            </span>
          )),
        )}
      </div>
    </div>
  );
}
