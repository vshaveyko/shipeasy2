import * as React from "react";

import { cn } from "@/lib/utils";

type SparklineIntent = "accent" | "info" | "warn" | "danger" | "neutral";

const strokeStyles: Record<SparklineIntent, string> = {
  accent: "var(--se-accent)",
  info: "var(--se-info)",
  warn: "var(--se-warn)",
  danger: "var(--se-danger)",
  neutral: "var(--se-fg-3)",
};

function Sparkline({
  points,
  width = 96,
  height = 28,
  intent = "accent",
  filled = true,
  className,
  ...props
}: Omit<React.ComponentProps<"svg">, "children" | "points" | "width" | "height"> & {
  points: number[];
  width?: number;
  height?: number;
  intent?: SparklineIntent;
  filled?: boolean;
}) {
  if (points.length === 0) {
    return <span aria-hidden className={cn("inline-block", className)} style={{ width, height }} />;
  }
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const step = points.length > 1 ? width / (points.length - 1) : width;
  const coords = points.map((p, i) => {
    const x = i * step;
    const y = height - ((p - min) / span) * (height - 2) - 1;
    return [x, y] as const;
  });
  const path = coords
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`)
    .join(" ");
  const area = `${path} L${width},${height} L0,${height} Z`;
  const stroke = strokeStyles[intent];
  return (
    <svg
      role="img"
      aria-label="Sparkline"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={cn("overflow-visible", className)}
      {...props}
    >
      {filled ? (
        <path d={area} fill={`color-mix(in oklab, ${stroke} 18%, transparent)`} stroke="none" />
      ) : null}
      <path
        d={path}
        fill="none"
        stroke={stroke}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

export { Sparkline };
