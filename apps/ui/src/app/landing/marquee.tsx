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

/** Infinite logo marquee, doubled for seamless loop. */
export function LandingMarquee() {
  const items = [...LOGOS, ...LOGOS];
  return (
    <div className="lp-marquee" aria-hidden>
      <div className="lp-marquee-track">
        {items.map((l, i) => (
          <span key={i}>
            <b>{l}</b>
          </span>
        ))}
      </div>
    </div>
  );
}
