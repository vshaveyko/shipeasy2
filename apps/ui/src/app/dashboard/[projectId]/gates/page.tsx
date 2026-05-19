import type { Metadata } from "next";
import { AlertTriangle } from "lucide-react";

import { readFlashError } from "@/lib/flash-error";
import { GatesContent } from "./gates-content";
import { GATE_ERROR_COOKIE } from "./gate-error-cookie";

export const metadata: Metadata = { title: "Gates" };

export default async function GatesPage() {
  const error = await readFlashError(GATE_ERROR_COOKIE);

  return (
    <>
      {error && (
        <div
          className="mx-4 mt-4 rounded-[var(--radius-md)] border p-4"
          style={{
            background: "color-mix(in oklab, var(--se-danger) 12%, var(--se-bg-1))",
            borderColor: "color-mix(in oklab, var(--se-danger) 35%, transparent)",
          }}
          role="alert"
        >
          <div
            className="t-caps mb-2 flex items-center gap-2"
            style={{ color: "var(--se-danger)" }}
          >
            <AlertTriangle className="size-3" />
            <span>Gate action failed</span>
          </div>
          <p className="text-[13px] text-[var(--se-fg)]">{error}</p>
        </div>
      )}
      <GatesContent />
    </>
  );
}
