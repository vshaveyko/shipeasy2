import { describe, it, expect, vi, beforeEach } from "vitest";
import { TEST_PROJECT_ID, TEST_EMAIL, createTestEnv, seedProject, req } from "@/test/helpers";
import { drizzle } from "drizzle-orm/d1";
import { universes, metrics, events } from "@shipeasy/core/db/schema";

const mockEnv = vi.hoisted(() => ({
  DB: null as unknown as D1Database,
  FLAGS_KV: null as unknown as KVNamespace,
}));
vi.mock("@opennextjs/cloudflare", () => ({
  getCloudflareContext: () => ({ env: mockEnv }),
  initOpenNextCloudflareForDev: vi.fn(),
}));
vi.mock("@/auth", () => ({
  auth: vi.fn().mockResolvedValue({ user: { email: TEST_EMAIL, project_id: TEST_PROJECT_ID } }),
}));

import { GET, POST } from "../route";
import { GET as GET_ONE, PATCH, DELETE } from "../[id]/route";
import { POST as SET_STATUS } from "../[id]/status/route";
import { POST as SET_METRICS, PATCH as PATCH_METRICS } from "../[id]/metrics/route";
import { GET as GET_RESULTS } from "../[id]/results/route";
import { GET as GET_TIMESERIES } from "../[id]/timeseries/route";
import { POST as REANALYZE } from "../[id]/reanalyze/route";

// Minimal valid experiment body
const EXP_BODY = {
  name: "checkout-exp",
  universe: "main",
  allocation_pct: 5000,
  groups: [
    { name: "control", weight: 5000, params: {} },
    { name: "treatment", weight: 5000, params: {} },
  ],
  params: {},
};

beforeEach(async () => {
  const env = createTestEnv();
  await seedProject(env);
  const db = drizzle(env.DB, {});
  await db.insert(universes).values({
    id: "uni_main",
    projectId: TEST_PROJECT_ID,
    name: "main",
    unitType: "user_id",
    holdoutRange: null,
    createdAt: new Date().toISOString(),
  });
  await db.insert(events).values({
    id: "evt_buy",
    projectId: TEST_PROJECT_ID,
    name: "purchase",
    description: "",
    properties: [],
    pending: 0,
    createdAt: new Date().toISOString(),
  });
  await db.insert(metrics).values({
    id: "met_rev",
    projectId: TEST_PROJECT_ID,
    name: "revenue",
    eventName: "purchase",
    valuePath: null,
    aggregation: "count_users",
    winsorizePct: 99,
    minDetectableEffect: null,
    updatedAt: new Date().toISOString(),
  });
  mockEnv.DB = env.DB;
  mockEnv.FLAGS_KV = env.FLAGS_KV;
});

async function createExp(name = "checkout-exp", body = EXP_BODY) {
  const res = await POST(req("POST", "/api/admin/experiments", { ...body, name }));
  expect(res.status).toBe(201);
  return res.json() as Promise<{ id: string; name: string }>;
}

describe("GET /admin/experiments", () => {
  it("returns empty list initially", async () => {
    expect(await (await GET(req("GET", "/api/admin/experiments"))).json()).toEqual([]);
  });

  it("lists created experiments", async () => {
    await createExp("exp-a");
    await createExp("exp-b");
    const body = (await (await GET(req("GET", "/api/admin/experiments"))).json()) as {
      name: string;
    }[];
    expect(body.map((e) => e.name).sort()).toEqual(["exp-a", "exp-b"]);
  });
});

describe("POST /admin/experiments", () => {
  it("creates an experiment (201)", async () => {
    const res = await POST(req("POST", "/api/admin/experiments", EXP_BODY));
    expect(res.status).toBe(201);
    const body = (await res.json()) as { id: string; name: string };
    expect(body.name).toBe("checkout-exp");
  });

  it("returns 409 for duplicate name", async () => {
    await createExp("dup");
    expect(
      (await POST(req("POST", "/api/admin/experiments", { ...EXP_BODY, name: "dup" }))).status,
    ).toBe(409);
  });

  it("returns 422 if universe not found", async () => {
    expect(
      (
        await POST(
          req("POST", "/api/admin/experiments", { ...EXP_BODY, universe: "no-such-universe" }),
        )
      ).status,
    ).toBe(422);
  });

  it("returns 422 if group weights don't sum to 10000", async () => {
    const bad = {
      ...EXP_BODY,
      groups: [
        { name: "control", weight: 3000, params: {} },
        { name: "treatment", weight: 3000, params: {} },
      ],
    };
    expect((await POST(req("POST", "/api/admin/experiments", bad))).status).toBe(422);
  });

  it("returns 422 if fewer than 2 groups", async () => {
    const bad = { ...EXP_BODY, groups: [{ name: "control", weight: 10000, params: {} }] };
    expect((await POST(req("POST", "/api/admin/experiments", bad))).status).toBe(422);
  });
});

describe("GET /admin/experiments/:id", () => {
  it("returns the experiment", async () => {
    const { id } = await createExp();
    const res = await GET_ONE(req("GET", `/api/admin/experiments/${id}`), {
      params: Promise.resolve({ id }),
    });
    expect(res.status).toBe(200);
    expect(((await res.json()) as { name: string }).name).toBe("checkout-exp");
  });

  it("returns 404 for unknown id", async () => {
    expect(
      (
        await GET_ONE(req("GET", "/api/admin/experiments/ghost"), {
          params: Promise.resolve({ id: "ghost" }),
        })
      ).status,
    ).toBe(404);
  });
});

describe("PATCH /admin/experiments/:id", () => {
  it("updates allocation_pct", async () => {
    const { id } = await createExp();
    expect(
      (
        await PATCH(req("PATCH", `/api/admin/experiments/${id}`, { allocation_pct: 8000 }), {
          params: Promise.resolve({ id }),
        })
      ).status,
    ).toBe(200);
  });

  it("returns 404 for unknown id", async () => {
    expect(
      (
        await PATCH(req("PATCH", "/api/admin/experiments/ghost", { allocation_pct: 100 }), {
          params: Promise.resolve({ id: "ghost" }),
        })
      ).status,
    ).toBe(404);
  });
});

describe("DELETE /admin/experiments/:id", () => {
  it("deletes a draft experiment", async () => {
    const { id } = await createExp();
    expect(
      (
        await DELETE(req("DELETE", `/api/admin/experiments/${id}`), {
          params: Promise.resolve({ id }),
        })
      ).status,
    ).toBe(200);
    expect(
      (
        await GET_ONE(req("GET", `/api/admin/experiments/${id}`), {
          params: Promise.resolve({ id }),
        })
      ).status,
    ).toBe(404);
  });

  it("returns 409 when deleting a running experiment", async () => {
    const { id } = await createExp();
    await SET_STATUS(req("POST", `/api/admin/experiments/${id}/status`, { status: "running" }), {
      params: Promise.resolve({ id }),
    });
    expect(
      (
        await DELETE(req("DELETE", `/api/admin/experiments/${id}`), {
          params: Promise.resolve({ id }),
        })
      ).status,
    ).toBe(409);
  });

  it("returns 404 for unknown id", async () => {
    expect(
      (
        await DELETE(req("DELETE", "/api/admin/experiments/ghost"), {
          params: Promise.resolve({ id: "ghost" }),
        })
      ).status,
    ).toBe(404);
  });
});

describe("POST /admin/experiments/:id/status", () => {
  it("transitions draft → running → stopped → archived", async () => {
    const { id } = await createExp();
    const p = (s: string) =>
      SET_STATUS(req("POST", `/api/admin/experiments/${id}/status`, { status: s }), {
        params: Promise.resolve({ id }),
      });

    expect(((await (await p("running")).json()) as { status: string }).status).toBe("running");
    expect(((await (await p("stopped")).json()) as { status: string }).status).toBe("stopped");
    expect(((await (await p("archived")).json()) as { status: string }).status).toBe("archived");
  });

  it("returns 409 stopping a non-running experiment", async () => {
    const { id } = await createExp();
    expect(
      (
        await SET_STATUS(
          req("POST", `/api/admin/experiments/${id}/status`, { status: "stopped" }),
          { params: Promise.resolve({ id }) },
        )
      ).status,
    ).toBe(409);
  });

  it("throws ZodError for invalid status (validation before withAdmin)", async () => {
    const { id } = await createExp();
    await expect(
      SET_STATUS(req("POST", `/api/admin/experiments/${id}/status`, { status: "paused" }), {
        params: Promise.resolve({ id }),
      }),
    ).rejects.toThrow();
  });

  it("returns 404 for unknown id", async () => {
    expect(
      (
        await SET_STATUS(
          req("POST", "/api/admin/experiments/ghost/status", { status: "running" }),
          { params: Promise.resolve({ id: "ghost" }) },
        )
      ).status,
    ).toBe(404);
  });
});

describe("POST /admin/experiments/:id/metrics", () => {
  it("assigns metrics to experiment", async () => {
    const { id } = await createExp();
    const res = await SET_METRICS(
      req("POST", `/api/admin/experiments/${id}/metrics`, {
        metrics: [{ metric_id: "met_rev", role: "goal" }],
      }),
      { params: Promise.resolve({ id }) },
    );
    expect(res.status).toBe(200);
  });

  it("clears metrics when empty array sent", async () => {
    const { id } = await createExp();
    await SET_METRICS(
      req("POST", `/api/admin/experiments/${id}/metrics`, {
        metrics: [{ metric_id: "met_rev", role: "goal" }],
      }),
      { params: Promise.resolve({ id }) },
    );
    expect(
      (
        await PATCH_METRICS(req("PATCH", `/api/admin/experiments/${id}/metrics`, { metrics: [] }), {
          params: Promise.resolve({ id }),
        })
      ).status,
    ).toBe(200);
  });

  it("returns 422 for unknown metric id", async () => {
    const { id } = await createExp();
    expect(
      (
        await SET_METRICS(
          req("POST", `/api/admin/experiments/${id}/metrics`, {
            metrics: [{ metric_id: "no_such", role: "goal" }],
          }),
          { params: Promise.resolve({ id }) },
        )
      ).status,
    ).toBe(422);
  });

  it("returns 404 for unknown experiment id", async () => {
    expect(
      (
        await SET_METRICS(req("POST", "/api/admin/experiments/ghost/metrics", { metrics: [] }), {
          params: Promise.resolve({ id: "ghost" }),
        })
      ).status,
    ).toBe(404);
  });
});

describe("GET /admin/experiments/:id/results", () => {
  it("returns empty results for new experiment", async () => {
    const { id } = await createExp();
    const res = await GET_RESULTS(req("GET", `/api/admin/experiments/${id}/results`), {
      params: Promise.resolve({ id }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { results: unknown[] };
    expect(body.results).toEqual([]);
  });

  it("returns 404 for unknown id", async () => {
    expect(
      (
        await GET_RESULTS(req("GET", "/api/admin/experiments/ghost/results"), {
          params: Promise.resolve({ id: "ghost" }),
        })
      ).status,
    ).toBe(404);
  });
});

describe("GET /admin/experiments/:id/timeseries", () => {
  it("returns empty series for new experiment", async () => {
    const { id } = await createExp();
    const res = await GET_TIMESERIES(req("GET", `/api/admin/experiments/${id}/timeseries`), {
      params: Promise.resolve({ id }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { series: unknown[] };
    expect(body.series).toEqual([]);
  });
});

describe("POST /admin/experiments/:id/reanalyze", () => {
  it("queues reanalysis", async () => {
    const { id } = await createExp();
    const res = await REANALYZE(req("POST", `/api/admin/experiments/${id}/reanalyze`), {
      params: Promise.resolve({ id }),
    });
    expect(res.status).toBe(200);
    expect(((await res.json()) as { queued: boolean }).queued).toBe(true);
  });

  it("returns 404 for unknown id", async () => {
    expect(
      (
        await REANALYZE(req("POST", "/api/admin/experiments/ghost/reanalyze"), {
          params: Promise.resolve({ id: "ghost" }),
        })
      ).status,
    ).toBe(404);
  });
});
