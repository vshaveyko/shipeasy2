import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  readConfigOverride as getConfigOverride,
  readExpOverride as getExpOverride,
  readGateOverride as getGateOverride,
  isDevtoolsRequested,
} from "@shipeasy/sdk/client";

/**
 * The override readers are the seam the devtools overlay drives — flipping
 * these via URL params is the published "QA / repro a session" surface, so
 * they need to be tied down before any refactor (the devtools bundle and
 * the React provider must agree on the param shapes character-for-character).
 *
 * They live in @shipeasy/sdk/client now; this spec stays here because it
 * exercises the runtime contract relied on by both the React provider and
 * the devtools overlay.
 */

const originalLocation = window.location;

function setSearch(search: string): void {
  // jsdom permits `Location` reassignment via a writable URL setter.
  window.history.replaceState({}, "", `https://example.com/${search}`);
}

beforeEach(() => {
  setSearch("");
});

afterEach(() => {
  // Reset between tests so leaked params don't bleed.
  setSearch("");
  void originalLocation;
});

describe("isDevtoolsRequested", () => {
  it("returns true when ?se=1 is present", () => {
    setSearch("?se=1");
    expect(isDevtoolsRequested()).toBe(true);
  });

  it("returns true for legacy ?se_devtools and ?se-devtools spellings", () => {
    setSearch("?se_devtools=1");
    expect(isDevtoolsRequested()).toBe(true);
    setSearch("?se-devtools=1");
    expect(isDevtoolsRequested()).toBe(true);
  });

  it("returns false when no devtools param is present", () => {
    setSearch("?other=1");
    expect(isDevtoolsRequested()).toBe(false);
  });
});

describe("getGateOverride", () => {
  it("reads se_ks_<name>", () => {
    setSearch("?se_ks_my_gate=true");
    expect(getGateOverride("my_gate")).toBe(true);
  });

  it("reads legacy se_gate_<name> and se-gate-<name> aliases", () => {
    setSearch("?se_gate_alpha=false");
    expect(getGateOverride("alpha")).toBe(false);
    setSearch("?se-gate-beta=on");
    expect(getGateOverride("beta")).toBe(true);
  });

  it("returns null when no override is set", () => {
    expect(getGateOverride("anything")).toBeNull();
  });

  it("returns null for unparseable boolean strings", () => {
    setSearch("?se_ks_unknown=maybe");
    expect(getGateOverride("unknown")).toBeNull();
  });
});

describe("getConfigOverride", () => {
  it("decodes plain JSON config values", () => {
    setSearch(`?se_config_announce=${encodeURIComponent('{"enabled":true}')}`);
    expect(getConfigOverride("announce")).toEqual({ enabled: true });
  });

  it("decodes b64-prefixed config values for long blobs", () => {
    const value = btoa(JSON.stringify({ k: "v" }))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
    setSearch(`?se_config_big=${encodeURIComponent("b64:" + value)}`);
    expect(getConfigOverride("big")).toEqual({ k: "v" });
  });

  it("returns undefined when no override is set", () => {
    expect(getConfigOverride("missing")).toBeUndefined();
  });
});

describe("getExpOverride", () => {
  it("returns the variant name for se_exp_<name>", () => {
    setSearch("?se_exp_pricing=variant_b");
    expect(getExpOverride("pricing")).toBe("variant_b");
  });

  it("treats 'default' and 'none' and empty as no override", () => {
    setSearch("?se_exp_pricing=default");
    expect(getExpOverride("pricing")).toBeNull();
    setSearch("?se_exp_pricing=none");
    expect(getExpOverride("pricing")).toBeNull();
    setSearch("?se_exp_pricing=");
    expect(getExpOverride("pricing")).toBeNull();
  });

  it("falls through to legacy se-exp-<name>", () => {
    setSearch("?se-exp-checkout=control");
    expect(getExpOverride("checkout")).toBe("control");
  });
});
