/**
 * Geometric conic-gradient Shipeasy brand mark, exactly matching the design's
 * `.sb-brand .mark` block. Used in the sidebar and auth shell.
 */
export function BrandMark({ size = 22 }: { size?: number }) {
  const inner = Math.max(6, size - 10);
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: Math.max(4, size * 0.27),
        background:
          "conic-gradient(from 140deg, var(--se-accent), var(--se-bg) 40%, var(--se-accent) 80%)",
        boxShadow: "0 0 0 1px var(--se-line-2)",
        position: "relative",
      }}
      aria-hidden="true"
    >
      <div
        style={{
          position: "absolute",
          inset: (size - inner) / 2,
          width: inner,
          height: inner,
          background: "var(--se-bg)",
          borderRadius: Math.max(3, size * 0.14),
          boxShadow: "inset 0 0 0 1px var(--se-line-2)",
        }}
      />
    </div>
  );
}
