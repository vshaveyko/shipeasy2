"use client";

import { useEffect, useState } from "react";

const VERBS = ["test", "ship", "measure", "rollback", "ramp"] as const;

/** Rotates the accent verb under the hero headline every ~2.4s. */
export function RotatingVerb() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const h = setInterval(() => setI((v) => (v + 1) % VERBS.length), 2400);
    return () => clearInterval(h);
  }, []);
  return (
    <span className="relative inline-block h-[1em] overflow-hidden align-baseline text-left">
      {VERBS.map((verb, idx) => (
        <span
          key={verb}
          className="absolute left-0 top-0 whitespace-nowrap text-[var(--se-accent)] transition-all duration-500"
          style={{
            fontFamily: "var(--se-serif)",
            fontStyle: "italic",
            fontWeight: 400,
            opacity: idx === i ? 1 : 0,
            transform:
              idx === i ? "translateY(0)" : idx < i ? "translateY(-80%)" : "translateY(80%)",
            filter: idx === i ? "none" : "blur(6px)",
          }}
        >
          {verb}
        </span>
      ))}
      {/* Sizing ghost to reserve width */}
      <span className="invisible" style={{ fontFamily: "var(--se-serif)", fontStyle: "italic" }}>
        rollback
      </span>
    </span>
  );
}
