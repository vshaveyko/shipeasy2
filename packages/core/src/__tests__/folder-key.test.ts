import { describe, it, expect } from "vitest";
import { folderKey } from "../kv/rebuild";

describe("folderKey", () => {
  it("emits bare name when folder is null", () => {
    expect(folderKey(null, "my_gate")).toBe("my_gate");
  });

  it("emits bare name when folder is undefined", () => {
    expect(folderKey(undefined, "my_gate")).toBe("my_gate");
  });

  it("emits bare name when folder is empty string", () => {
    expect(folderKey("", "my_gate")).toBe("my_gate");
  });

  it("emits folder/name when folder set", () => {
    expect(folderKey("checkout", "new_cart")).toBe("checkout/new_cart");
  });

  it("matches the public SDK split: folder/name → [folder, name]", () => {
    const key = folderKey("growth", "onboarding");
    const [folder, ...rest] = key.split("/");
    expect(folder).toBe("growth");
    expect(rest.join("/")).toBe("onboarding");
  });
});
