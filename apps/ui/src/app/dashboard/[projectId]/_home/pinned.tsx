"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Hash, Plus, X } from "lucide-react";

type PinKind = "experiment" | "gate" | "killswitch" | "config" | "metric";

interface Pin {
  id: string;
  kind: PinKind;
  label: string;
  meta?: string;
}

const KIND_LABEL: Record<PinKind, string> = {
  experiment: "experiment",
  gate: "gate",
  killswitch: "killswitch",
  config: "config",
  metric: "metric",
};

const KIND_PATH: Record<PinKind, string> = {
  experiment: "experiments",
  gate: "gates",
  killswitch: "killswitches",
  config: "configs/values",
  metric: "metrics",
};

function storageKey(projectId: string) {
  return `shipeasy.pins.${projectId}`;
}

function readPins(projectId: string): Pin[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(storageKey(projectId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (p): p is Pin =>
        p != null &&
        typeof p === "object" &&
        typeof (p as Pin).id === "string" &&
        typeof (p as Pin).kind === "string" &&
        typeof (p as Pin).label === "string",
    );
  } catch {
    return [];
  }
}

function writePins(projectId: string, pins: Pin[]) {
  try {
    window.localStorage.setItem(storageKey(projectId), JSON.stringify(pins));
  } catch {
    // ignore quota / private mode
  }
}

export function Pinned({ projectId }: { projectId: string }) {
  const [pins, setPins] = useState<Pin[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setPins(readPins(projectId));
    setMounted(true);
  }, [projectId]);

  function remove(id: string) {
    const next = pins.filter((p) => p.id !== id);
    setPins(next);
    writePins(projectId, next);
  }

  return (
    <div className="rail-card">
      <div className="rail-card-head">
        <Hash className="size-3" />
        <h3>Pinned</h3>
        <span className="aside">{mounted ? pins.length : 0}</span>
      </div>
      {!mounted || pins.length === 0 ? (
        <div style={{ padding: "14px 16px", fontSize: 12.5, color: "var(--se-fg-3)" }}>
          Pin a record from any list page to anchor it here.{" "}
          <Link
            href={`/dashboard/${projectId}/experiments`}
            style={{ color: "var(--se-accent)", textDecoration: "underline" }}
          >
            Browse experiments
          </Link>
          .
        </div>
      ) : (
        pins.map((p) => (
          <div key={p.id} className="pin-row">
            <Link
              href={`/dashboard/${projectId}/${KIND_PATH[p.kind]}?open=${p.id}`}
              className="pin-row"
              style={{
                display: "contents",
                color: "inherit",
                textDecoration: "none",
              }}
            >
              <div className="ic">
                <Hash className="size-3" />
              </div>
              <div className="body">
                <div className="ln">{p.label}</div>
                <div className="meta">
                  {KIND_LABEL[p.kind]}
                  {p.meta ? ` · ${p.meta}` : ""}
                </div>
              </div>
            </Link>
            <button
              type="button"
              onClick={() => remove(p.id)}
              aria-label={`Unpin ${p.label}`}
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                color: "var(--se-fg-4)",
                padding: 4,
              }}
            >
              <X className="size-3" />
            </button>
          </div>
        ))
      )}
      {mounted && pins.length > 0 ? (
        <div
          style={{
            padding: "8px 14px",
            borderTop: "1px solid var(--se-line)",
            fontFamily: "var(--se-mono)",
            fontSize: 10.5,
            color: "var(--se-fg-4)",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <Plus className="size-2.5" />
          Pin more from list pages (click the pin icon on a row).
        </div>
      ) : null}
    </div>
  );
}

/**
 * Imperative helper for list pages to add a pin without touching this file's
 * internal storage shape. Returns `true` if added, `false` if already pinned.
 */
export function addPin(projectId: string, pin: Pin): boolean {
  if (typeof window === "undefined") return false;
  const current = readPins(projectId);
  if (current.some((p) => p.id === pin.id)) return false;
  const next = [pin, ...current].slice(0, 8);
  writePins(projectId, next);
  return true;
}
