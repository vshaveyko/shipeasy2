import { describe, it, expect } from "vitest";

describe("@shipeasy/sdk server", () => {
  it("exports a version string", async () => {
    const mod = await import("../server/index");
    expect(typeof mod.version).toBe("string");
    expect(mod.version).toBe("1.0.0");
  });
});

describe("@shipeasy/sdk client", () => {
  it("exports a version string", async () => {
    const mod = await import("../client/index");
    expect(typeof mod.version).toBe("string");
    expect(mod.version).toBe("1.0.0");
  });
});
