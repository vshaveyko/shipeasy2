// Chart primitives for the metrics page.

function Sparkline({ data, color = "var(--accent)", w = 72, h = 24, fill = false }) {
  if (!data || !data.length) return null;
  const min = Math.min(...data),
    max = Math.max(...data);
  const r = max - min || 1;
  const pts = data.map((v, i) => [
    (i / (data.length - 1)) * w,
    h - ((v - min) / r) * (h - 3) - 1.5,
  ]);
  const poly = pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area =
    `M0,${h} ` +
    pts.map(([x, y], i) => `${i ? "L" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ") +
    ` L${w},${h} Z`;
  const last = pts[pts.length - 1];
  return (
    <svg width={w} height={h} style={{ display: "block", overflow: "visible" }}>
      {fill && <path d={area} fill={color} fillOpacity="0.14" />}
      <polyline
        points={poly}
        fill="none"
        stroke={color}
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={last[0]} cy={last[1]} r="2" fill={color} />
    </svg>
  );
}

function MainChart({ active }) {
  const W = 900,
    H = 240,
    padL = 46,
    padR = 14,
    padT = 14,
    padB = 28;
  const cw = W - padL - padR,
    ch = H - padT - padB;
  const series = [
    {
      k: "user_checkout",
      label: "user_checkout",
      color: "var(--accent)",
      data: [
        60, 62, 65, 70, 72, 75, 78, 82, 86, 90, 94, 98, 102, 108, 114, 118, 124, 130, 138, 146, 158,
        170, 180, 194,
      ],
    },
    {
      k: "user_startcheckout",
      label: "user_startcheckout",
      color: "var(--info)",
      data: [
        420, 430, 440, 455, 460, 470, 475, 485, 495, 510, 520, 535, 548, 560, 575, 590, 610, 630,
        650, 670, 690, 710, 728, 748,
      ],
    },
    {
      k: "cart_abandoned",
      label: "cart_abandoned",
      color: "var(--warn)",
      data: [
        180, 178, 175, 170, 168, 170, 172, 170, 168, 165, 160, 158, 155, 152, 148, 150, 148, 146,
        144, 142, 140, 138, 134, 132,
      ],
    },
  ];
  const visible = series.filter((s) => active[s.k]);
  const all = visible.flatMap((s) => s.data);
  const yMax = Math.max(...(all.length ? all : [1])) * 1.12;
  const x = (i) => padL + (i / (series[0].data.length - 1)) * cw;
  const y = (v) => padT + ch - (v / yMax) * ch;
  const path = (d) =>
    d.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const hours = ["00:00", "04:00", "08:00", "12:00", "16:00", "20:00", "now"];

  return (
    <svg
      width="100%"
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      style={{ display: "block", height: 240 }}
    >
      <defs>
        <linearGradient id="gAccent" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="var(--accent)" stopOpacity="0.22" />
          <stop offset="1" stopColor="var(--accent)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 0.25, 0.5, 0.75, 1].map((p, i) => {
        const yy = padT + ch * p;
        const v = Math.round(yMax * (1 - p));
        return (
          <g key={i}>
            <line
              x1={padL}
              x2={W - padR}
              y1={yy}
              y2={yy}
              stroke="var(--line)"
              strokeDasharray="2 4"
            />
            <text
              x={padL - 8}
              y={yy + 3}
              textAnchor="end"
              fontFamily="var(--mono)"
              fontSize="9.5"
              fill="var(--fg-4)"
            >
              {v}
            </text>
          </g>
        );
      })}
      {active["user_checkout"] && (
        <path
          d={`${path(series[0].data)} L${x(series[0].data.length - 1)},${padT + ch} L${padL},${padT + ch} Z`}
          fill="url(#gAccent)"
        />
      )}
      {visible.map((s) => (
        <path
          key={s.k}
          d={path(s.data)}
          fill="none"
          stroke={s.color}
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
      {visible.map((s) => (
        <g key={s.k + "p"}>
          <circle
            cx={x(s.data.length - 1)}
            cy={y(s.data[s.data.length - 1])}
            r="3.5"
            fill={s.color}
            stroke="var(--bg-1)"
            strokeWidth="2"
          />
        </g>
      ))}
      {hours.map((h, i) => {
        const xx = padL + (i / (hours.length - 1)) * cw;
        return (
          <text
            key={i}
            x={xx}
            y={H - 10}
            textAnchor="middle"
            fontFamily="var(--mono)"
            fontSize="9.5"
            fill={i === hours.length - 1 ? "var(--accent)" : "var(--fg-4)"}
          >
            {h}
          </text>
        );
      })}
    </svg>
  );
}

function VitalGauge({ val, good, poor, status }) {
  // 0 .. poor*1.2 visualized; good and poor markers shown
  const max = poor * 1.2;
  const pct = Math.min(100, (val / max) * 100);
  const goodPct = (good / max) * 100;
  const poorPct = (poor / max) * 100;
  const color =
    status === "good" ? "var(--accent)" : status === "warn" ? "var(--warn)" : "var(--danger)";
  return (
    <div
      style={{
        position: "relative",
        height: 8,
        borderRadius: 4,
        background: "var(--bg-3)",
        overflow: "visible",
        border: "1px solid var(--line)",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: "0 auto 0 0",
          width: `${pct}%`,
          background: `linear-gradient(90deg,
          color-mix(in oklab, ${color} 70%, transparent),
          ${color})`,
          borderRadius: 3,
        }}
      />
      <div
        style={{
          position: "absolute",
          top: -3,
          bottom: -3,
          left: `${goodPct}%`,
          width: 1.5,
          background: "var(--fg-3)",
        }}
        title={`good ≤ ${good}`}
      />
      <div
        style={{
          position: "absolute",
          top: -3,
          bottom: -3,
          left: `${poorPct}%`,
          width: 1.5,
          background: "var(--danger)",
          opacity: 0.6,
        }}
        title={`poor ≥ ${poor}`}
      />
    </div>
  );
}

Object.assign(window, { Sparkline, MainChart, VitalGauge });
