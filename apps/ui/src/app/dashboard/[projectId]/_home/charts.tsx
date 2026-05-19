"use client";

import { Area, AreaChart, ResponsiveContainer } from "recharts";

export function Sparkline({
  data,
  neg = false,
  id,
}: {
  data: number[];
  neg?: boolean;
  id?: string;
}) {
  const stroke = neg ? "var(--se-danger)" : "var(--se-accent)";
  const gradId = `sp-grad-${id ?? "n"}`;
  const rows = data.map((v, i) => ({ i, v }));
  return (
    <ResponsiveContainer width="100%" height={28}>
      <AreaChart data={rows} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={stroke} stopOpacity={0.4} />
            <stop offset="100%" stopColor={stroke} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="v"
          stroke={stroke}
          strokeWidth={1.5}
          fill={`url(#${gradId})`}
          isAnimationActive={false}
          dot={false}
          activeDot={{ r: 2.5, stroke, strokeWidth: 1, fill: stroke }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

const TONE_VARS = {
  accent: "var(--se-accent)",
  info: "var(--se-info)",
  warn: "var(--se-warn)",
  danger: "var(--se-danger)",
  purple: "var(--se-purple)",
} as const;

export type RingTone = keyof typeof TONE_VARS;

export function HealthRing({
  k,
  label,
  detail,
  value,
  tone = "accent",
}: {
  k: string;
  label: string;
  detail: string;
  value: number;
  tone?: RingTone;
}) {
  const pct = Math.max(0, Math.min(100, value));
  const toneVar = TONE_VARS[tone];
  const cardClass = `ring-card ${tone === "accent" ? "" : tone}`;
  const donutClass = pct >= 90 && tone !== "danger" && tone !== "warn" ? "donut alive" : "donut";
  const size = 72;
  const stroke = 7;
  const r = (size - stroke) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const dash = (pct / 100) * circumference;
  return (
    <div className={cardClass}>
      <div className={donutClass}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--se-bg-3)" strokeWidth={stroke} />
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={toneVar}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circumference - dash}`}
            transform={`rotate(-90 ${cx} ${cy})`}
          />
        </svg>
        <div className="v" style={{ color: toneVar }}>
          <span className="num">{Math.round(pct)}</span>
          <span className="pct">%</span>
        </div>
      </div>
      <div className="meta">
        <div className="k">{k}</div>
        <div className="l">{label}</div>
        <div className="d">{detail}</div>
      </div>
    </div>
  );
}
