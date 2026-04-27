"use client";

import { useEffect } from "react";

/**
 * Surfaces RSC render errors with their digest visible. Production builds
 * scrub the message ("An error occurred in the Server Components render…"),
 * but the digest is what you grep for in `wrangler tail` to find the real
 * stack. Showing it inline saves a CF-dashboard round-trip.
 */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[dashboard] route error", error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-[640px] flex-col gap-4 px-6 py-12">
      <div className="rounded-[var(--radius-lg)] border border-[var(--se-line)] bg-[var(--se-bg-1)] p-6">
        <div className="t-caps mb-2 text-[var(--se-danger)]">Something broke</div>
        <h1 className="text-[18px] font-medium">This page failed to render.</h1>
        <p className="mt-2 text-[13px] text-[var(--se-fg-3)]">
          Production hides the full message — the <code>digest</code> below is what to grep for in
          your worker logs (<code>wrangler tail shipeasy --format pretty</code>).
        </p>

        {error.digest ? (
          <div className="mt-4 rounded-[var(--radius-md)] border border-[var(--se-line)] bg-[var(--se-bg-2)] px-3 py-2 font-mono text-[12px] break-all">
            digest: {error.digest}
          </div>
        ) : null}

        {error.message ? (
          <div className="mt-3 rounded-[var(--radius-md)] border border-[var(--se-line)] bg-[var(--se-bg-2)] px-3 py-2 font-mono text-[12px] break-all">
            {error.message}
          </div>
        ) : null}

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={reset}
            className="rounded-md border border-[var(--se-line-2)] bg-[var(--se-bg-2)] px-3 py-1.5 text-[13px] hover:bg-[var(--se-bg-3)]"
          >
            Try again
          </button>
          <a
            href="/dashboard"
            className="rounded-md border border-[var(--se-line-2)] bg-[var(--se-bg-2)] px-3 py-1.5 text-[13px] hover:bg-[var(--se-bg-3)]"
          >
            Back to dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
