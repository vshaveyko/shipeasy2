"use client";

type SparklineProps = {
  data: number[];
  color?: string;
  w?: number;
  h?: number;
  fill?: boolean;
};

export function Sparkline({
  data,
  color = "var(--se-accent)",
  w = 72,
  h = 24,
  fill = false,
}: SparklineProps) {
  if (!data || data.length === 0) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map(
    (v, i) => [(i / (data.length - 1)) * w, h - ((v - min) / range) * (h - 3) - 1.5] as const,
  );
  const poly = pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `M0,${h} ${pts.map(([x, y]) => `L${x.toFixed(1)},${y.toFixed(1)}`).join(" ")} L${w},${h} Z`;
  const last = pts[pts.length - 1];
  return (
    <svg width={w} height={h} style={{ display: "block", overflow: "visible" }}>
      {fill && <path d={area} fill={color} fillOpacity={0.14} />}
      <polyline
        points={poly}
        fill="none"
        stroke={color}
        strokeWidth={1.3}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={last[0]} cy={last[1]} r={2} fill={color} />
    </svg>
  );
}

const SERIES = [
  {
    k: "user_checkout",
    color: "var(--se-accent)",
    data: [
      60, 62, 65, 70, 72, 75, 78, 82, 86, 90, 94, 98, 102, 108, 114, 118, 124, 130, 138, 146, 158,
      170, 180, 194,
    ],
  },
  {
    k: "user_startcheckout",
    color: "var(--se-info)",
    data: [
      420, 430, 440, 455, 460, 470, 475, 485, 495, 510, 520, 535, 548, 560, 575, 590, 610, 630, 650,
      670, 690, 710, 728, 748,
    ],
  },
  {
    k: "cart_abandoned",
    color: "var(--se-warn)",
    data: [
      180, 178, 175, 170, 168, 170, 172, 170, 168, 165, 160, 158, 155, 152, 148, 150, 148, 146, 144,
      142, 140, 138, 134, 132,
    ],
  },
] as const;

export function MainChart({ active }: { active: Record<string, boolean> }) {
  const W = 900;
  const H = 240;
  const padL = 46;
  const padR = 14;
  const padT = 14;
  const padB = 28;
  const cw = W - padL - padR;
  const ch = H - padT - padB;
  const visible = SERIES.filter((s) => active[s.k]);
  const all = visible.flatMap((s) => s.data);
  const yMax = Math.max(...(all.length ? all : [1])) * 1.12;
  const x = (i: number) => padL + (i / (SERIES[0].data.length - 1)) * cw;
  const y = (v: number) => padT + ch - (v / yMax) * ch;
  const path = (d: readonly number[]) =>
    d.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const hours = ["00:00", "04:00", "08:00", "12:00", "16:00", "20:00", "now"];
  const showAccentArea = active["user_checkout"];

  return (
    <svg
      width="100%"
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      style={{ display: "block", height: 240 }}
    >
      <defs>
        <linearGradient id="met-gAccent" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="var(--se-accent)" stopOpacity="0.22" />
          <stop offset="1" stopColor="var(--se-accent)" stopOpacity="0" />
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
              stroke="var(--se-line)"
              strokeDasharray="2 4"
            />
            <text
              x={padL - 8}
              y={yy + 3}
              textAnchor="end"
              fontFamily="var(--se-mono)"
              fontSize={9.5}
              fill="var(--se-fg-4)"
            >
              {v}
            </text>
          </g>
        );
      })}
      {showAccentArea && (
        <path
          d={`${path(SERIES[0].data)} L${x(SERIES[0].data.length - 1)},${padT + ch} L${padL},${padT + ch} Z`}
          fill="url(#met-gAccent)"
        />
      )}
      {visible.map((s) => (
        <path
          key={s.k}
          d={path(s.data)}
          fill="none"
          stroke={s.color}
          strokeWidth={1.7}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
      {visible.map((s) => (
        <circle
          key={`${s.k}-pt`}
          cx={x(s.data.length - 1)}
          cy={y(s.data[s.data.length - 1])}
          r={3.5}
          fill={s.color}
          stroke="var(--se-bg-1)"
          strokeWidth={2}
        />
      ))}
      {hours.map((h, i) => {
        const xx = padL + (i / (hours.length - 1)) * cw;
        return (
          <text
            key={i}
            x={xx}
            y={H - 10}
            textAnchor="middle"
            fontFamily="var(--se-mono)"
            fontSize={9.5}
            fill={i === hours.length - 1 ? "var(--se-accent)" : "var(--se-fg-4)"}
          >
            {h}
          </text>
        );
      })}
    </svg>
  );
}

export function VitalGauge({
  val,
  good,
  poor,
  status,
}: {
  val: number;
  good: number;
  poor: number;
  status: "good" | "warn" | "bad";
}) {
  const max = poor * 1.2;
  const pct = Math.min(100, (val / max) * 100);
  const goodPct = (good / max) * 100;
  const poorPct = (poor / max) * 100;
  const color =
    status === "good"
      ? "var(--se-accent)"
      : status === "warn"
        ? "var(--se-warn)"
        : "var(--se-danger)";
  return (
    <div
      style={{
        position: "relative",
        height: 8,
        borderRadius: 4,
        background: "var(--se-bg-3)",
        overflow: "visible",
        border: "1px solid var(--se-line)",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: "0 auto 0 0",
          width: `${pct}%`,
          background: `linear-gradient(90deg, color-mix(in oklab, ${color} 70%, transparent), ${color})`,
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
          background: "var(--se-fg-3)",
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
          background: "var(--se-danger)",
          opacity: 0.6,
        }}
        title={`poor ≥ ${poor}`}
      />
    </div>
  );
}
