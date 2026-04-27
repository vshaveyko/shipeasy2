// /openapi.json — public, unauthenticated. Verify shape so codegen consumers
// don't silently break when paths/schemas are renamed.

import { describe, it, expect } from "vitest";
import { makeTestEnv } from "./helpers/test-env";
import app from "../index";

describe("GET /openapi.json", () => {
  it("serves a 3.0 spec with the SDK paths and schemas", async () => {
    const t = await makeTestEnv();
    const resp = await app.fetch(new Request("http://worker/openapi.json"), t.env, {
      waitUntil: () => {},
      passThroughOnException: () => {},
      props: {},
    } as unknown as ExecutionContext);

    expect(resp.status).toBe(200);
    expect(resp.headers.get("Content-Type")).toContain("application/json");
    expect(resp.headers.get("Access-Control-Allow-Origin")).toBe("*");

    const spec = (await resp.json()) as {
      openapi: string;
      paths: Record<string, unknown>;
      components: { schemas: Record<string, unknown> };
    };

    expect(spec.openapi).toMatch(/^3\.0\./);
    for (const path of [
      "/sdk/flags",
      "/sdk/experiments",
      "/sdk/evaluate",
      "/sdk/bootstrap",
      "/collect",
    ]) {
      expect(spec.paths[path], `missing path ${path}`).toBeDefined();
    }
    for (const schema of [
      "FlagsBlob",
      "ExperimentsBlob",
      "EvaluateRequest",
      "EvaluateResult",
      "CollectRequest",
    ]) {
      expect(spec.components.schemas[schema], `missing schema ${schema}`).toBeDefined();
    }
  });
});
