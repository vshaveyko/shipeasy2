import { describe, it, expect } from "vitest";
import { sha256, safeCompare } from "../crypto";

describe("sha256", () => {
  it("returns a lowercase hex string of 64 characters", async () => {
    const h = await sha256("hello");
    expect(h).toHaveLength(64);
    expect(h).toMatch(/^[0-9a-f]+$/);
  });

  it("returns the correct hash for empty string", async () => {
    expect(await sha256("")).toBe(
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    );
  });

  it("returns the correct hash for 'hello'", async () => {
    expect(await sha256("hello")).toBe(
      "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824",
    );
  });

  it("is deterministic — same input always produces same hash", async () => {
    const h1 = await sha256("sdk-key-abc");
    const h2 = await sha256("sdk-key-abc");
    expect(h1).toBe(h2);
  });

  it("different inputs produce different hashes", async () => {
    const h1 = await sha256("key-1");
    const h2 = await sha256("key-2");
    expect(h1).not.toBe(h2);
  });

  it("is sensitive to each character (avalanche effect)", async () => {
    const h1 = await sha256("a");
    const h2 = await sha256("b");
    expect(h1).not.toBe(h2);
  });
});

describe("safeCompare", () => {
  it("returns true for equal strings", () => {
    expect(safeCompare("abc", "abc")).toBe(true);
    expect(safeCompare("", "")).toBe(true);
    expect(safeCompare("hello world", "hello world")).toBe(true);
  });

  it("returns false for different strings of the same length", () => {
    expect(safeCompare("abc", "abd")).toBe(false);
    expect(safeCompare("aaa", "bbb")).toBe(false);
    expect(safeCompare("x", "y")).toBe(false);
  });

  it("returns false when lengths differ", () => {
    expect(safeCompare("abc", "abcd")).toBe(false);
    expect(safeCompare("", "a")).toBe(false);
    expect(safeCompare("longer", "short")).toBe(false);
  });

  it("returns false for one-character difference anywhere", () => {
    expect(safeCompare("abc", "Abc")).toBe(false);
    expect(safeCompare("abc", "abC")).toBe(false);
  });
});
