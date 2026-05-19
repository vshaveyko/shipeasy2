import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Not found" };

export default function GlobalNotFound() {
  return (
    <html lang="en" className="dark" data-theme="dark" style={{ colorScheme: "dark" }}>
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          background: "#0a0a0a",
          color: "#e5e5e5",
          display: "grid",
          placeItems: "center",
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial',
        }}
      >
        <div
          style={{
            maxWidth: 480,
            padding: "24px 28px",
            border: "1px solid #2a2a2a",
            borderRadius: 12,
            background: "#111",
          }}
        >
          <div
            style={{
              fontSize: 11,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "#888",
              marginBottom: 8,
            }}
          >
            404 · Not found
          </div>
          <h1 style={{ fontSize: 18, fontWeight: 500, margin: 0 }}>This page doesn’t exist.</h1>
          <p style={{ fontSize: 13, color: "#a0a0a0", marginTop: 8 }}>
            The URL is mistyped, or the resource was deleted.
          </p>
          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            <Link
              href="/dashboard"
              style={{
                fontSize: 13,
                padding: "6px 12px",
                background: "#222",
                color: "#e5e5e5",
                border: "1px solid #333",
                borderRadius: 8,
                textDecoration: "none",
              }}
            >
              Back to dashboard
            </Link>
            <Link
              href="https://docs.shipeasy.ai"
              style={{
                fontSize: 13,
                padding: "6px 12px",
                background: "transparent",
                color: "#a0a0a0",
                border: "1px solid #333",
                borderRadius: 8,
                textDecoration: "none",
              }}
            >
              Open docs
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}
