import { describe, it, expect } from "vitest";
import { name } from "../index";

describe("@shipeasy/mcp-server", () => {
  it("exports the package name constant", () => {
    expect(name).toBe("@shipeasy/mcp-server");
  });

  it("name is a non-empty string", () => {
    expect(typeof name).toBe("string");
    expect(name.length).toBeGreaterThan(0);
  });
});
