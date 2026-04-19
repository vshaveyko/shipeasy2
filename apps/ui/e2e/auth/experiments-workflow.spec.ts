import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

const RUN = Date.now();

// ── Helpers ───────────────────────────────────────────────────────────────────

function expRow(page: Page, name: string) {
  return page.getByText(name, { exact: true }).locator("..").locator("..");
}

async function cleanupExperiment(request: APIRequestContext, name: string) {
  try {
    const resp = await request.get("/api/admin/experiments");
    if (!resp.ok()) return;
    const exps = await resp.json();
    const exp = exps.find((e: { name: string }) => e.name === name);
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

async function getExperimentId(page: Page, name: string): Promise<string> {
  const resp = await page.request.get("/api/admin/experiments");
  const exps = await resp.json();
  const exp = exps.find((e: { name: string }) => e.name === name);
  if (!exp) throw new Error(`Experiment '${name}' not found in admin API`);
  return exp.id;
}

// ── Quick-profile UI ──────────────────────────────────────────────────────────

test.describe("New experiment form UI", () => {
  test("renders all five quick-setup profiles", async ({ page }) => {
    await page.goto("/dashboard/experiments/new");
    for (const label of ["Conversion", "Revenue", "Retention", "Performance", "Onboarding"]) {
      await expect(page.getByText(label, { exact: true })).toBeVisible();
    }
  });

  test("Conversion profile is selected by default and shows its goal metric", async ({ page }) => {
    await page.goto("/dashboard/experiments/new");
    await expect(page.getByText("conversion_rate")).toBeVisible();
  });

  test("selecting Revenue profile shows revenue_per_user metric", async ({ page }) => {
    await page.goto("/dashboard/experiments/new");
    await page.getByText("Revenue", { exact: true }).locator("..").click();
    await expect(page.getByText("revenue_per_user")).toBeVisible();
  });

  test("selecting Retention profile shows d7_retention metric", async ({ page }) => {
    await page.goto("/dashboard/experiments/new");
    await page.getByText("Retention", { exact: true }).locator("..").click();
    await expect(page.getByText("d7_retention")).toBeVisible();
  });

  test("selecting Performance profile shows p50_latency_ms metric", async ({ page }) => {
    await page.goto("/dashboard/experiments/new");
    await page.getByText("Performance", { exact: true }).locator("..").click();
    await expect(page.getByText("p50_latency_ms")).toBeVisible();
  });

  test("selecting Onboarding profile shows activation_rate metric", async ({ page }) => {
    await page.goto("/dashboard/experiments/new");
    await page.getByText("Onboarding", { exact: true }).locator("..").click();
    await expect(page.getByText("activation_rate")).toBeVisible();
  });

  test("Add variant button adds a third group row and updates the split", async ({ page }) => {
    await page.goto("/dashboard/experiments/new");
    // Initially 2 groups: control and test — verify via input values
    await expect(page.locator('input[name="group_name_0"]')).toHaveValue("control");
    await expect(page.locator('input[name="group_name_1"]')).toHaveValue("test");

    await page.getByRole("button", { name: /\+ add variant/i }).click();

    // 3 groups now — variant_2 input appeared
    await expect(page.locator('input[name="group_name_2"]')).toHaveValue("variant_2");
    // Each group shows ~33%
    await expect(page.getByText("33%").first()).toBeVisible();
  });

  test("allocation slider updates the percentage display", async ({ page }) => {
    await page.goto("/dashboard/experiments/new");
    const slider = page.locator("input[type=range]");
    await slider.evaluate((el: HTMLInputElement) => {
      // Use native setter so React's synthetic onChange fires
      Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")!.set!.call(
        el,
        "60",
      );
      el.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await expect(page.getByText("60%")).toBeVisible();
  });

  test("cancel link returns to experiments list", async ({ page }) => {
    await page.goto("/dashboard/experiments/new");
    await page
      .getByRole("link", { name: /^cancel$/i })
      .first()
      .click();
    await expect(page).toHaveURL(/\/dashboard\/experiments$/);
  });
});

// ── Conversion experiment — full lifecycle ────────────────────────────────────

test.describe("Conversion experiment — full lifecycle", () => {
  test.describe.configure({ mode: "serial" });

  const name = `e2exp_conv_${RUN}`;

  test.afterAll(async ({ request }) => {
    await cleanupExperiment(request, name);
  });

  test("create draft experiment → appears in list with 'draft' badge", async ({ page }) => {
    await page.goto("/dashboard/experiments/new");
    // Conversion selected by default
    await page.locator("#exp-key").fill(name);
    await page.locator("#exp-question").fill("Does the new checkout increase conversions?");
    await page.getByRole("button", { name: /^save draft$/i }).click();

    await expect(page).toHaveURL(/\/dashboard\/experiments$/);
    await expect(expRow(page, name).getByText(/draft/i)).toBeVisible();
  });

  test("admin API returns experiment with correct name and 2 groups", async ({ page }) => {
    const resp = await page.request.get("/api/admin/experiments");
    expect(resp.ok()).toBe(true);
    const exps = await resp.json();
    const exp = exps.find((e: { name: string }) => e.name === name);
    expect(exp).toBeDefined();
    expect(exp.groups).toHaveLength(2);
    expect(exp.groups[0].name).toBe("control");
    expect(exp.groups[1].name).toBe("test");
    expect(exp.status).toBe("draft");
  });

  test("results page: draft experiment shows 'Draft' status stat and '—' verdict", async ({
    page,
  }) => {
    const id = await getExperimentId(page, name);
    await page.goto(`/dashboard/experiments/${id}`);

    await expect(page.getByText("Draft", { exact: true })).toBeVisible(); // status stat card
    await expect(page.getByText("—").first()).toBeVisible(); // verdict stat card
    await expect(page.getByText(/no results yet/i)).toBeVisible();
  });

  test("results page: setup card shows groups and universe", async ({ page }) => {
    const id = await getExperimentId(page, name);
    await page.goto(`/dashboard/experiments/${id}`);

    await expect(page.getByText(/control/i)).toBeVisible();
    await expect(page.getByText(/universe: default/i)).toBeVisible();
  });

  test("start experiment → list shows 'running' badge, detail page shows Start button gone", async ({
    page,
  }) => {
    await page.goto("/dashboard/experiments");
    await expRow(page, name)
      .getByRole("button", { name: /^start$/i })
      .click();

    await expect(page).toHaveURL(/\/dashboard\/experiments$/);
    await expect(expRow(page, name).getByText(/running/i)).toBeVisible();

    // Detail page: no Start button, Stop button present
    const id = await getExperimentId(page, name);
    await page.goto(`/dashboard/experiments/${id}`);
    await expect(page.getByRole("button", { name: /^start$/i })).not.toBeVisible();
    await expect(page.getByRole("button", { name: /^stop$/i })).toBeVisible();
  });

  test("results page for running experiment: status stat shows 'Running'", async ({ page }) => {
    const id = await getExperimentId(page, name);
    await page.goto(`/dashboard/experiments/${id}`);

    await expect(page.getByText("Running", { exact: true })).toBeVisible();
    await expect(page.getByText("0", { exact: true })).toBeVisible(); // days running (0 on day of start)
  });

  test("stop experiment from detail page → list shows 'stopped' badge", async ({ page }) => {
    const id = await getExperimentId(page, name);
    await page.goto(`/dashboard/experiments/${id}`);
    await page.getByRole("button", { name: /^stop$/i }).click();

    await expect(page).toHaveURL(/\/dashboard\/experiments$/);
    await expect(expRow(page, name).getByText(/stopped/i)).toBeVisible();
  });

  test("stopped experiment: admin API status=stopped, results endpoint returns empty array", async ({
    page,
  }) => {
    const id = await getExperimentId(page, name);

    const expResp = await page.request.get(`/api/admin/experiments/${id}`);
    const exp = await expResp.json();
    expect(exp.status).toBe("stopped");

    const resResp = await page.request.get(`/api/admin/experiments/${id}/results`);
    expect(resResp.ok()).toBe(true);
    const { results } = await resResp.json();
    expect(results).toHaveLength(0);
  });

  test("delete stopped experiment → removed from list and admin API", async ({ page }) => {
    await page.goto("/dashboard/experiments");
    await expRow(page, name)
      .getByRole("button", { name: /^delete$/i })
      .click();

    await expect(page.getByText(name, { exact: true })).not.toBeVisible();

    const resp = await page.request.get("/api/admin/experiments");
    const exps = await resp.json();
    const exp = exps.find((e: { name: string }) => e.name === name);
    expect(exp).toBeUndefined();
  });
});

// ── Multi-variant experiment (3 groups) ───────────────────────────────────────

test.describe("Multi-variant experiment — 3 groups", () => {
  test.describe.configure({ mode: "serial" });

  const name = `e2exp_mv_${RUN}`;

  test.afterAll(async ({ request }) => {
    await cleanupExperiment(request, name);
  });

  test("create with 3 groups → admin API stores 3 groups with correct weights", async ({
    page,
  }) => {
    await page.goto("/dashboard/experiments/new");
    // Add a third variant
    await page.getByRole("button", { name: /\+ add variant/i }).click();
    // Rename variant_2 for clarity
    await page.locator('input[name="group_name_2"]').fill("variant_b");

    await page.locator("#exp-key").fill(name);
    await page.getByRole("button", { name: /^save draft$/i }).click();

    await expect(page).toHaveURL(/\/dashboard\/experiments$/);

    const resp = await page.request.get("/api/admin/experiments");
    const exps = await resp.json();
    const exp = exps.find((e: { name: string }) => e.name === name);
    expect(exp).toBeDefined();
    expect(exp.groups).toHaveLength(3);
    // All weights sum to 10000
    const weightSum = exp.groups.reduce((acc: number, g: { weight: number }) => acc + g.weight, 0);
    expect(weightSum).toBe(10000);
    // Third group name matches what we typed
    const variant = exp.groups.find((g: { name: string }) => g.name === "variant_b");
    expect(variant).toBeDefined();
  });

  test("results page: setup card shows all 3 groups", async ({ page }) => {
    const id = await getExperimentId(page, name);
    await page.goto(`/dashboard/experiments/${id}`);

    // Setup card text: "control 33% / test 33% / variant_b 34% — Allocation …"
    await expect(page.getByText(/control \d+%/i)).toBeVisible();
    await expect(page.getByText(/variant_b \d+%/i)).toBeVisible();
  });

  test("cleanup: delete multi-variant experiment", async ({ page }) => {
    await page.goto("/dashboard/experiments");
    await expRow(page, name)
      .getByRole("button", { name: /^delete$/i })
      .click();
    await expect(page.getByText(name, { exact: true })).not.toBeVisible();
  });
});

// ── Revenue experiment with partial allocation ────────────────────────────────

test.describe("Revenue experiment — 60% allocation", () => {
  test.describe.configure({ mode: "serial" });

  const name = `e2exp_rev_${RUN}`;

  test.afterAll(async ({ request }) => {
    await cleanupExperiment(request, name);
  });

  test("create with Revenue profile and 60% allocation → allocation_pct=6000", async ({ page }) => {
    await page.goto("/dashboard/experiments/new");
    await page.getByText("Revenue", { exact: true }).locator("..").click();

    const slider = page.locator("input[type=range]");
    await slider.evaluate((el) => {
      (el as HTMLInputElement).value = "60";
      el.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await page.locator("#exp-key").fill(name);
    await page.getByRole("button", { name: /^save draft$/i }).click();

    await expect(page).toHaveURL(/\/dashboard\/experiments$/);

    const resp = await page.request.get("/api/admin/experiments");
    const exps = await resp.json();
    const exp = exps.find((e: { name: string }) => e.name === name);
    expect(exp).toBeDefined();
    expect(exp.allocationPct).toBe(6000); // 60% * 100
  });

  test("results page shows 60% allocation in setup card", async ({ page }) => {
    const id = await getExperimentId(page, name);
    await page.goto(`/dashboard/experiments/${id}`);

    await expect(page.getByText(/allocation 60%/i)).toBeVisible();
  });

  test("cleanup: delete revenue experiment", async ({ page }) => {
    await page.goto("/dashboard/experiments");
    await expRow(page, name)
      .getByRole("button", { name: /^delete$/i })
      .click();
    await expect(page.getByText(name, { exact: true })).not.toBeVisible();
  });
});

// ── Results-page display with synthetic metric data ───────────────────────────

test.describe("Results page — SRM and verdict display states", () => {
  const tmpName = `e2exp_verdict_${RUN}`;

  test.afterAll(async ({ request }) => {
    await cleanupExperiment(request, tmpName);
  });

  test("verdict shows '—' when results array is empty (new draft)", async ({ page }) => {
    await page.goto("/dashboard/experiments/new");
    await page.locator("#exp-key").fill(tmpName);
    await page.getByRole("button", { name: /^save draft$/i }).click();
    await expect(page).toHaveURL(/\/dashboard\/experiments$/);

    const id = await getExperimentId(page, tmpName);
    await page.goto(`/dashboard/experiments/${id}`);

    // No analysis run yet → verdict must be "—"
    await expect(page.getByText("Goal metric", { exact: true })).toBeVisible();
    await expect(page.getByText("—").first()).toBeVisible();
    await expect(page.getByText(/no results yet/i)).toBeVisible();
  });
});
