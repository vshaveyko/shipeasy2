import { describe, expect, it } from "vitest";
import { decodeCursor, encodeCursor, pageQuerySchema } from "../pagination";

describe("cursor codec", () => {
  it("round-trips ts + id", () => {
    const parts = { ts: "2026-01-15T12:34:56.000Z", id: "gat_abc123" };
    expect(decodeCursor(encodeCursor(parts))).toEqual(parts);
  });

  it("emits url-safe base64 (no +, /, or =)", () => {
    const cursor = encodeCursor({ ts: "2026-01-15T12:34:56.000Z", id: "x".repeat(40) });
    expect(cursor).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("rejects cursors that aren't base64", () => {
    expect(() => decodeCursor("!!!not-base64!!!")).toThrow();
  });

  it("rejects cursors missing the separator", () => {
    // Encoded "no-separator-here" has no pipe.
    const bad = btoa("no-separator-here").replace(/=+$/, "");
    expect(() => decodeCursor(bad)).toThrow(/separator/);
  });

  it("refuses to encode a ts containing the separator", () => {
    expect(() => encodeCursor({ ts: "bad|value", id: "x" })).toThrow();
  });
});

describe("pageQuerySchema", () => {
  it("applies defaults when limit/cursor are absent", () => {
    expect(pageQuerySchema.parse({})).toEqual({ limit: 100 });
  });

  it("coerces a string limit", () => {
    expect(pageQuerySchema.parse({ limit: "25" })).toEqual({ limit: 25 });
  });

  it("rejects a limit above the max", () => {
    expect(() => pageQuerySchema.parse({ limit: 1000 })).toThrow();
  });

  it("rejects a limit below 1", () => {
    expect(() => pageQuerySchema.parse({ limit: 0 })).toThrow();
  });
});
