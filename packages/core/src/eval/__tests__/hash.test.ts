import { describe, it, expect } from "vitest";
import { murmur3_v1, getHashFn } from "../hash";

describe("murmur3_v1", () => {
  it("returns 0 for empty string with seed 0", () => {
    expect(murmur3_v1("", 0)).toBe(0);
  });

  it("is deterministic — same input always produces same output", () => {
    expect(murmur3_v1("user-123")).toBe(murmur3_v1("user-123"));
  });

  it("returns an unsigned 32-bit integer for various inputs", () => {
    const inputs = ["", "a", "ab", "abc", "abcd", "abcde", "hello world"];
    for (const input of inputs) {
      const h = murmur3_v1(input);
      expect(h).toBeGreaterThanOrEqual(0);
      expect(h).toBeLessThanOrEqual(0xffffffff);
      expect(Number.isInteger(h)).toBe(true);
    }
  });

  it("handles all tail byte lengths (1, 2, 3 bytes remaining after blocks)", () => {
    expect(murmur3_v1("a")).not.toBe(murmur3_v1("ab"));
    expect(murmur3_v1("ab")).not.toBe(murmur3_v1("abc"));
    expect(murmur3_v1("abc")).not.toBe(murmur3_v1("abcd"));
  });

  it("different seeds produce different hashes", () => {
    expect(murmur3_v1("test", 0)).not.toBe(murmur3_v1("test", 1));
  });

  it("different inputs produce different hashes", () => {
    expect(murmur3_v1("user-1")).not.toBe(murmur3_v1("user-2"));
    expect(murmur3_v1("gate-a:user-1")).not.toBe(murmur3_v1("gate-b:user-1"));
  });

  it("bucketing via modulo 10000 stays in [0, 9999]", () => {
    const inputs = ["user-1", "user-2", "user-100", "test:user-42", "salt:alloc:uid"];
    for (const input of inputs) {
      const bucket = murmur3_v1(input) % 10000;
      expect(bucket).toBeGreaterThanOrEqual(0);
      expect(bucket).toBeLessThan(10000);
    }
  });

  it("distributes reasonably across 10000 buckets (no extreme clustering)", () => {
    const buckets = new Set<number>();
    for (let i = 0; i < 1000; i++) {
      buckets.add(murmur3_v1(`user-${i}`) % 10000);
    }
    // With 1000 unique users, expect at least 900 unique buckets (very unlikely to collide that often)
    expect(buckets.size).toBeGreaterThan(900);
  });
});

describe("murmur3_v1 — cross-language parity vectors", () => {
  // All SDKs must produce identical values for these inputs.
  // Verified against murmurhash-js (npm) and the production-format vectors in 04-evaluation.md.
  // Note: 04-evaluation.md has incorrect short-string vectors for 1-5 char inputs (doc bug).
  // The "exp_001:..." production vectors are authoritative — endianness bugs surface there.
  it.each([
    ["", 0x00000000],
    ["a", 0x3c2569b2],
    ["ab", 0x9bbfd75f],
    ["abc", 0xb3dd93fa],
    ["aaaa", 0x7eeed987],
    ["aaaaa", 0xe9ca302b],
    ["The quick brown fox jumps over the lazy dog", 0x2e4ff723],
    ["exp_001:alloc:user_abc", 0x4032d3f7],
    ["exp_001:group:user_abc", 0x49cf4eee],
  ] as [string, number][])("murmur3_v1(%j)", (input, expected) => {
    expect(murmur3_v1(input)).toBe(expected >>> 0);
  });
});

describe("getHashFn", () => {
  it("returns a function that matches murmur3_v1 for version 1", () => {
    const fn = getHashFn(1);
    expect(fn("hello")).toBe(murmur3_v1("hello"));
  });

  it("returns murmur3_v1 when version is undefined (default)", () => {
    const fn = getHashFn(undefined);
    expect(fn("hello")).toBe(murmur3_v1("hello"));
  });

  it("falls back to murmur3_v1 for unknown version", () => {
    const fn = getHashFn(99);
    expect(fn("hello")).toBe(murmur3_v1("hello"));
  });
});
