import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { adminList } from "../admin-list";
import { setProjectPlan } from "../seed-fixtures";

const RUN = Date.now();

// ── Helpers ───────────────────────────────────────────────────────────────────

async function getExperimentId(page: Page, name: string): Promise<string> {
  const exps = await adminList<{ id: string; name: string }>(
    page.request,
    "/api/admin/experiments",
  );
  const exp = exps.find((e) => e.name === name);
  if (!exp) throw new Error(`Experiment '${name}' not found`);
  return exp.id;
}

async function seedDraft(
  request: APIRequestContext,
  name: string,
  opts: { extraVariants?: number } = {},
) {
  const groups: { name: string; weight: number }[] = [
    { name: "control", weight: 5000 },
    { name: "test", weight: 5000 },
  ];
  if (opts.extraVariants && opts.extraVariants > 0) {
    const total = 2 + opts.extraVariants;
    const base = Math.floor(10000 / total);
    const remainder = 10000 - base * total;
    const rebalanced: { name: string; weight: number }[] = [
      { name: "control", weight: base + remainder },
      { name: "test", weight: base },
    ];
    for (let i = 2; i < total; i++) {
      rebalanced.push({ name: `variant_${i}`, weight: base });
    }
    groups.length = 0;
    groups.push(...rebalanced);
  }
  const res = await request.post("/api/admin/experiments", {
    data: {
      name,
      universe: "default",
      allocation_pct: 10000,
      groups,
    },
  });
  if (!res.ok()) {
    throw new Error(`seed failed: ${res.status()} ${await res.text()}`);
  }
}

async function cleanupExperiment(request: APIRequestContext, name: string) {
  try {
    const exps = await adminList<{ id: string; name: string; status: string }>(
      request,
      "/api/admin/experiments",
    ).catch(() => null);
    if (!exps) return;
    const exp = exps.find((e) => e.name === name);
    if (!exp) return;
    if (exp.status === "running") {
      await request.post(`/api/admin/experiments/${exp.id}/status`, {
        data: { status: "stopped" },
      });
    }
    await request.delete(`/api/admin/experiments/${exp.id}`);
  } catch {
    // best-effort cleanup
  }
}

// ── Stat tile labels ─────────────────────────────────────────────────────────

test.describe("Detail page — stat tile labels", () => {
  test("four stat tiles: Users / control · Days running · Verdict · Significance", async ({
    page,
  }) => {
    await page.goto("/dashboard/e2e-project-id/experiments/any_id");
    await expect(page.getByText(/^users \/ control$/i)).toBeVisible();
    await expect(page.getByText(/^days running$/i)).toBeVisible();
    await expect(page.getByText(/^verdict$/i)).toBeVisible();
    // "Significance" appears in both the stat tile label and the threshold hint;
    // first() pins to the stat tile.
    await expect(page.getByText(/^significance$/i).first()).toBeVisible();
  });
});

// ── Draft experiment results state ───────────────────────────────────────────

test.describe("Detail page — draft state", () => {
  test.describe.configure({ mode: "serial" });

  const name = `e2res_draft_${RUN}`;

  test.beforeAll(async ({ request }) => {
    await seedDraft(request, name);
  });

  test.afterAll(async ({ request }) => {
    await cleanupExperiment(request, name);
  });

  test("header card shows the DRAFT badge", async ({ page }) => {
    const id = await getExperimentId(page, name);
    await page.goto(`/dashboard/e2e-project-id/experiments/${id}`);
    await expect(page.getByText(/^DRAFT$/)).toBeVisible();
  });

  test("Verdict tile shows 'Wait' before any analysis", async ({ page }) => {
    const id = await getExperimentId(page, name);
    await page.goto(`/dashboard/e2e-project-id/experiments/${id}`);
    // deriveVerdict returns "Wait" when no treatment results exist.
    await expect(page.getByText(/^wait$/i).first()).toBeVisible();
  });

  test("Empty state replaces the secondary-metrics card", async ({ page }) => {
    const id = await getExperimentId(page, name);
    await page.goto(`/dashboard/e2e-project-id/experiments/${id}`);
    await expect(page.getByText(/no results yet/i)).toBeVisible();
  });

  test("Days running tile shows 0", async ({ page }) => {
    const id = await getExperimentId(page, name);
    await page.goto(`/dashboard/e2e-project-id/experiments/${id}`);
    // The stat-tile value '0' renders inside the Days-running tile.
    await expect(page.getByText(/^days running$/i)).toBeVisible();
    await expect(page.getByText("0").first()).toBeVisible();
  });

  test("Users / control tile shows '—' (no exposures yet)", async ({ page }) => {
    const id = await getExperimentId(page, name);
    await page.goto(`/dashboard/e2e-project-id/experiments/${id}`);
    await expect(page.getByText(/^users \/ control$/i)).toBeVisible();
    await expect(page.getByText("—").first()).toBeVisible();
  });

  test("Start Experiment button visible; Stop button is not", async ({ page }) => {
    const id = await getExperimentId(page, name);
    await page.goto(`/dashboard/e2e-project-id/experiments/${id}`);
    // The detail page header now uses bare "Start" / "Stop" labels; the
    // legacy "Start Experiment" copy lives only on the list-row buttons.
    await expect(page.getByRole("button", { name: /^start$/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /^stop$/i })).not.toBeVisible();
  });

  test("Right rail shows the Guardrails section", async ({ page }) => {
    const id = await getExperimentId(page, name);
    await page.goto(`/dashboard/e2e-project-id/experiments/${id}`);
    await expect(page.getByText(/^guardrails$/i).first()).toBeVisible();
  });

  test("Variants card lists control + test", async ({ page }) => {
    const id = await getExperimentId(page, name);
    await page.goto(`/dashboard/e2e-project-id/experiments/${id}`);
    await expect(page.getByRole("heading", { name: /^variants$/i })).toBeVisible();
    await expect(page.getByText(/baseline/i)).toBeVisible();
    await expect(page.getByText(/^control$/)).toBeVisible();
  });
});

// ── Running experiment state ─────────────────────────────────────────────────

test.describe("Detail page — running state", () => {
  test.describe.configure({ mode: "serial" });

  const name = `e2res_run_${RUN}`;

  test.beforeAll(async ({ request }) => {
    await seedDraft(request, name);
    const exps = await adminList<{ id: string; name: string }>(request, "/api/admin/experiments");
    const exp = exps.find((e) => e.name === name)!;
    await request.post(`/api/admin/experiments/${exp.id}/status`, {
      data: { status: "running" },
    });
  });

  test.afterAll(async ({ request }) => {
    await cleanupExperiment(request, name);
  });

  test("Header badge reads LIVE", async ({ page }) => {
    const id = await getExperimentId(page, name);
    await page.goto(`/dashboard/e2e-project-id/experiments/${id}`);
    await expect(page.getByText(/^LIVE/)).toBeVisible();
  });

  test("Stop Experiment button visible; Start button is not", async ({ page }) => {
    const id = await getExperimentId(page, name);
    await page.goto(`/dashboard/e2e-project-id/experiments/${id}`);
    await expect(page.getByRole("button", { name: /^stop$/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /^start$/i })).not.toBeVisible();
  });

  test("Verdict is 'Wait' before first analysis", async ({ page }) => {
    const id = await getExperimentId(page, name);
    await page.goto(`/dashboard/e2e-project-id/experiments/${id}`);
    await expect(page.getByText(/^wait$/i).first()).toBeVisible();
  });

  test("Days running shows 0 on the day of start", async ({ page }) => {
    const id = await getExperimentId(page, name);
    await page.goto(`/dashboard/e2e-project-id/experiments/${id}`);
    await expect(page.getByText("0").first()).toBeVisible();
  });
});

// ── Stopped experiment ───────────────────────────────────────────────────────

test.describe("Detail page — stopped state", () => {
  test.describe.configure({ mode: "serial" });

  const name = `e2res_stop_${RUN}`;

  test.beforeAll(async ({ request }) => {
    await seedDraft(request, name);
    const exps = await adminList<{ id: string; name: string }>(request, "/api/admin/experiments");
    const exp = exps.find((e) => e.name === name)!;
    await request.post(`/api/admin/experiments/${exp.id}/status`, {
      data: { status: "running" },
    });
    await request.post(`/api/admin/experiments/${exp.id}/status`, {
      data: { status: "stopped" },
    });
  });

  test.afterAll(async ({ request }) => {
    await cleanupExperiment(request, name);
  });

  test("Header badge reads STOPPED", async ({ page }) => {
    const id = await getExperimentId(page, name);
    await page.goto(`/dashboard/e2e-project-id/experiments/${id}`);
    await expect(page.getByText(/^STOPPED$/)).toBeVisible();
  });

  test("Neither Start nor Stop button is visible once stopped", async ({ page }) => {
    const id = await getExperimentId(page, name);
    await page.goto(`/dashboard/e2e-project-id/experiments/${id}`);
    await expect(page.getByRole("button", { name: /^start$/i })).not.toBeVisible();
    await expect(page.getByRole("button", { name: /^stop$/i })).not.toBeVisible();
  });

  test("admin API confirms status=stopped", async ({ page }) => {
    const id = await getExperimentId(page, name);
    const resp = await page.request.get(`/api/admin/experiments/${id}`);
    const exp = await resp.json();
    expect(exp.status).toBe("stopped");
  });
});

// ── Sequential testing — plan-gated copy ─────────────────────────────────────

test.describe("Detail page — sequential testing copy", () => {
  test("free-plan project renders the 'upgrade to Pro for mSPRT' activity row", async ({
    page,
  }) => {
    await page.goto("/dashboard/e2e-project-id/experiments/any_id");
    await expect(
      page
        .getByText(/sequential testing unavailable/i)
        .or(page.getByText(/upgrade to pro for msprt/i))
        .first(),
    ).toBeVisible();
  });
});

// ── Multi-variant detail card ────────────────────────────────────────────────

test.describe("Detail page — multi-variant", () => {
  test.describe.configure({ mode: "serial" });

  const name = `e2res_mv_${RUN}`;

  test.beforeAll(async ({ request }) => {
    setProjectPlan("paid");
    await seedDraft(request, name, { extraVariants: 1 });
  });

  test.afterAll(async ({ request }) => {
    await cleanupExperiment(request, name);
    setProjectPlan("free");
  });

  test("Variants card lists all 3 group names", async ({ page }) => {
    const id = await getExperimentId(page, name);
    await page.goto(`/dashboard/e2e-project-id/experiments/${id}`);
    // Standalone v2 detail tags the first variant with "· baseline" inside
    // the same <span>; pin via the meta-variant container instead.
    await expect(page.locator(".meta-variant.ctrl").getByText("control")).toBeVisible();
    await expect(page.getByText(/^test$/)).toBeVisible();
    await expect(page.getByText(/^variant_2$/)).toBeVisible();
  });

  test("admin API: 3 groups sum to 10000 weight", async ({ page }) => {
    const id = await getExperimentId(page, name);
    const resp = await page.request.get(`/api/admin/experiments/${id}`);
    const exp = await resp.json();
    expect(exp.groups).toHaveLength(3);
    const sum = exp.groups.reduce((acc: number, g: { weight: number }) => acc + g.weight, 0);
    expect(sum).toBe(10000);
  });
});
