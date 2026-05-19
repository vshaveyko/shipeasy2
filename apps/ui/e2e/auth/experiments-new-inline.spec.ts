import { expect, test, type APIRequestContext } from "@playwright/test";
import { adminList } from "../admin-list";
import { setProjectPlan } from "../seed-fixtures";

/**
 * Standalone /experiments/new page (NewExperimentClient) — exercises the
 * inline "Create new universe" and "Create metric" modals embedded in the
 * experiment-create form, plus full publish.
 *
 * The BigModalWizard (?new=1) does NOT expose inline cross-entity create.
 */

const RUN = Date.now();

test.beforeAll(() => setProjectPlan("paid"));
test.afterAll(() => setProjectPlan("free"));

async function cleanupExperiment(request: APIRequestContext, name: string) {
  try {
    const exps = await adminList<{ id: string; name: string; status: string }>(
      request,
      "/api/admin/experiments",
    );
    const exp = exps.find((e) => e.name === name);
    if (!exp) return;
    if (exp.status === "running") {
      await request.post(`/api/admin/experiments/${exp.id}/status`, {
        data: { status: "stopped" },
      });
    }
    await request.delete(`/api/admin/experiments/${exp.id}`);
  } catch {
    /* best-effort */
  }
}

async function cleanupUniverse(request: APIRequestContext, name: string) {
  try {
    const us = await adminList<{ id: string; name: string }>(request, "/api/admin/universes");
    const u = us.find((x) => x.name === name);
    if (u) await request.delete(`/api/admin/universes/${u.id}`);
  } catch {
    /* best-effort */
  }
}

async function cleanupMetric(request: APIRequestContext, name: string) {
  try {
    const ms = await adminList<{ id: string; name: string }>(request, "/api/admin/metrics");
    const m = ms.find((x) => x.name === name);
    if (m) await request.delete(`/api/admin/metrics/${m.id}`);
  } catch {
    /* best-effort */
  }
}

// CreateMetricModal slugifies eventName via the local `slugify` helper which
// replaces every non-alphanumeric run with "-". The seeded event `e2e_event`
// therefore becomes `e2e-event` for count_users/count_events (no value path).
const SEEDED_EVENT_SLUG = "e2e-event";
const SEEDED_EVENT_SLUG_WITH_PATH = "e2e-event-amount"; // sum/avg

// ── Inline universe create ─────────────────────────────────────────────

test.describe("Inline create — universe from /experiments/new", () => {
  test.describe.configure({ mode: "serial" });

  const universeName = `e2u-inl-${RUN}`;

  test.afterAll(async ({ request }) => {
    await cleanupUniverse(request, universeName);
  });

  test("'Create new universe' button opens modal and creates inline", async ({ page }) => {
    await page.goto("/dashboard/e2e-project-id/experiments/new");
    await page.getByRole("button", { name: /create new universe/i }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(/^create universe$/i)).toBeVisible();

    await dialog.getByTestId("universe-name-input").fill(universeName);
    await dialog.getByTestId("universe-create-submit").click();
    await expect(dialog).toBeHidden({ timeout: 10_000 });

    // Universe auto-appended to the catalog → appears in select option text.
    await expect(page.getByTestId("experiment-universe-select")).toContainText(universeName);
  });

  test("inline universe shows up in admin API", async ({ request }) => {
    const us = await adminList<{
      name: string;
      unitType: string;
      holdoutRange: [number, number] | null;
    }>(request, "/api/admin/universes");
    const u = us.find((x) => x.name === universeName);
    expect(u, `universe '${universeName}' should exist`).toBeTruthy();
    expect(u?.unitType).toBe("user_id");
    expect(u?.holdoutRange).toBeNull();
  });
});

test.describe("Inline create — universe holdout toggle visibility on paid plan", () => {
  test.describe.configure({ mode: "serial" });

  test("holdout toggle renders and is enabled on paid plan", async ({ page }) => {
    await page.goto("/dashboard/e2e-project-id/experiments/new");
    await page.getByRole("button", { name: /create new universe/i }).click();
    const dialog = page.getByRole("dialog");
    const toggle = dialog.getByTestId("universe-holdout-toggle");
    await expect(toggle).toBeVisible();
    await expect(toggle).toBeEnabled();
    // Holdout-range fields are hidden until toggled
    await expect(dialog.getByText(/start slot/i)).toBeHidden();
    await toggle.click();
    await expect(dialog.getByText(/start slot/i)).toBeVisible();
  });
});

// ── Inline metric create (goal/guardrail/secondary) ────────────────────

test.describe("Inline create — goal metric from /experiments/new", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeAll(async ({ request }) => {
    await cleanupMetric(request, SEEDED_EVENT_SLUG);
  });
  test.afterAll(async ({ request }) => {
    await cleanupMetric(request, SEEDED_EVENT_SLUG);
  });

  test("'Pick a goal metric' opens CreateMetricModal", async ({ page }) => {
    await page.goto("/dashboard/e2e-project-id/experiments/new");
    await page.getByRole("button", { name: /pick a goal metric/i }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(/role · goal/i)).toBeVisible();
  });

  test("create goal metric with count_users on seeded event", async ({ page, request }) => {
    await page.goto("/dashboard/e2e-project-id/experiments/new");
    await page.getByRole("button", { name: /pick a goal metric/i }).click();
    const dialog = page.getByRole("dialog");

    // Pick the seeded e2e_event in the event-source list
    await dialog
      .getByRole("button", { name: /e2e_event/i })
      .first()
      .click();
    await dialog.getByTestId("metric-attach-submit").click();
    await expect(dialog).toBeHidden({ timeout: 10_000 });

    const ms = await adminList<{ name: string; aggregation: string; eventName: string }>(
      request,
      "/api/admin/metrics",
    );
    const m = ms.find((x) => x.name === SEEDED_EVENT_SLUG);
    expect(m, `metric '${SEEDED_EVENT_SLUG}' should exist`).toBeTruthy();
    expect(m?.aggregation).toBe("count_users");
    expect(m?.eventName).toBe("e2e_event");
  });
});

test.describe("Inline create — guardrail metric with MDE", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeAll(async ({ request }) => {
    await cleanupMetric(request, SEEDED_EVENT_SLUG);
  });
  test.afterAll(async ({ request }) => {
    await cleanupMetric(request, SEEDED_EVENT_SLUG);
  });

  test("guardrail role exposes MDE field and persists min_detectable_effect", async ({
    page,
    request,
  }) => {
    await page.goto("/dashboard/e2e-project-id/experiments/new");
    await page.getByRole("button", { name: /^add guardrail$/i }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText(/role · guardrail/i)).toBeVisible();

    await dialog
      .getByRole("button", { name: /e2e_event/i })
      .first()
      .click();
    await dialog.getByTestId("metric-attach-submit").click();
    await expect(dialog).toBeHidden({ timeout: 10_000 });

    const ms = await adminList<{ name: string; minDetectableEffect: number | null }>(
      request,
      "/api/admin/metrics",
    );
    const m = ms.find((x) => x.name === SEEDED_EVENT_SLUG);
    expect(m, "guardrail metric should exist").toBeTruthy();
    expect(m?.minDetectableEffect ?? 0).toBeGreaterThan(0); // default 0.02 from modal
  });
});

test.describe("Inline create — sum metric exposes value_path", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeAll(async ({ request }) => {
    await cleanupMetric(request, SEEDED_EVENT_SLUG_WITH_PATH);
  });
  test.afterAll(async ({ request }) => {
    await cleanupMetric(request, SEEDED_EVENT_SLUG_WITH_PATH);
  });

  test("switching agg→sum shows value_path; saves value_path on metric", async ({
    page,
    request,
  }) => {
    await page.goto("/dashboard/e2e-project-id/experiments/new");
    await page.getByRole("button", { name: /^add secondary$/i }).click();

    const dialog = page.getByRole("dialog");
    await dialog
      .getByRole("button", { name: /e2e_event/i })
      .first()
      .click();
    await dialog.getByTestId("metric-agg-select").selectOption("sum");

    // value_path field appears (label is exact "Value path")
    await expect(dialog.getByText("Value path", { exact: true })).toBeVisible();

    await dialog.getByTestId("metric-attach-submit").click();
    await expect(dialog).toBeHidden({ timeout: 10_000 });

    const ms = await adminList<{ name: string; aggregation: string; valuePath: string | null }>(
      request,
      "/api/admin/metrics",
    );
    const m = ms.find((x) => x.name === SEEDED_EVENT_SLUG_WITH_PATH);
    expect(m, "sum metric should exist").toBeTruthy();
    expect(m?.aggregation).toBe("sum");
    expect(m?.valuePath).toBe("amount");
  });
});

// ── End-to-end: create universe + inline goal metric + publish ──

test.describe("End-to-end inline — universe + goal metric + draft", () => {
  test.describe.configure({ mode: "serial" });

  // The modals slugify with `replace(/[^a-z0-9]+/g, "-")`, so underscores
  // collapse to dashes. Type the dash form directly to make admin-API search
  // match.
  const universeName = `e2u-e2e-${RUN}`;
  const experimentSlug = `e2exp-inl-${RUN}`;

  test.afterAll(async ({ request }) => {
    await cleanupExperiment(request, experimentSlug);
    await cleanupMetric(request, SEEDED_EVENT_SLUG);
    await cleanupUniverse(request, universeName);
  });

  test("create universe inline, attach inline goal metric, save as draft", async ({
    page,
    request,
  }) => {
    await cleanupMetric(request, SEEDED_EVENT_SLUG);
    await page.goto("/dashboard/e2e-project-id/experiments/new");

    // §2 fill experiment name — type the desired slug directly so slugify is a
    // no-op and we can find the experiment by slug in admin API.
    await page.getByTestId("new-experiment-name-input").fill(experimentSlug);

    // §3 create universe inline (auto-selected after create)
    await page.getByRole("button", { name: /create new universe/i }).click();
    let dialog = page.getByRole("dialog");
    await dialog.getByTestId("universe-name-input").fill(universeName);
    await dialog.getByTestId("universe-create-submit").click();
    await expect(dialog).toBeHidden({ timeout: 10_000 });

    // §6 attach inline goal metric
    await page.getByRole("button", { name: /pick a goal metric/i }).click();
    dialog = page.getByRole("dialog");
    await dialog
      .getByRole("button", { name: /e2e_event/i })
      .first()
      .click();
    await dialog.getByTestId("metric-attach-submit").click();
    await expect(dialog).toBeHidden({ timeout: 10_000 });

    // Save as draft (doesn't require copied-code checklist)
    await page
      .getByRole("button", { name: /save as draft/i })
      .first()
      .click();

    await expect(async () => {
      const exps = await adminList<{ name: string; universe: string; status: string }>(
        request,
        "/api/admin/experiments",
      );
      const e = exps.find((x) => x.name === experimentSlug);
      expect(e, `experiment '${experimentSlug}' should be in admin API`).toBeTruthy();
      expect(e?.universe).toBe(universeName);
      expect(e?.status).toBe("draft");
    }).toPass({ timeout: 15_000 });
  });
});
