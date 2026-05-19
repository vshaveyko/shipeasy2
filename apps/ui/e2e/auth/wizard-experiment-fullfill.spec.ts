/**
 * Full-field experiment wizard run. Seeds a goal metric via admin API, then
 * walks Basics → Audience → Variants → Metrics → Integrate, filling every
 * field. Submits with "Start immediately" off so the experiment lands as a
 * draft (auto-stop on cleanup is simpler).
 */
import { expect, test, type APIRequestContext } from "@playwright/test";
import { adminList } from "../admin-list";
import { setProjectPlan } from "../seed-fixtures";

const PROJECT = "e2e-project-id";
const RUN = Date.now();

type ExperimentRow = {
  id: string;
  name: string;
  description: string | null;
  tag: string | null;
  universe: string;
  // Drizzle row → camelCase column names in the admin list response.
  allocationPct: number;
  status: string;
  groups: { name: string; weight: number }[];
};

test.beforeAll(() => setProjectPlan("paid"));
test.afterAll(() => setProjectPlan("free"));

async function seedEvent(request: APIRequestContext, name: string): Promise<void> {
  // Best-effort — 409 (already exists) is acceptable across retries.
  await request.post("/api/admin/events", { data: { name } }).catch(() => {});
}

async function seedMetric(
  request: APIRequestContext,
  metricName: string,
  eventName: string,
): Promise<void> {
  await seedEvent(request, eventName);
  // Best-effort — if the metric already exists from a previous attempt the
  // wizard will still see it in the dropdown, which is the only thing this
  // helper guarantees.
  await request
    .post("/api/admin/metrics", {
      data: {
        name: metricName,
        event_name: eventName,
        aggregation: "count_users",
        winsorize_pct: 99,
      },
    })
    .catch(() => {});
}

async function cleanupExperiment(request: APIRequestContext, slug: string): Promise<void> {
  const exps = await adminList<{ id: string; name: string; status: string }>(
    request,
    "/api/admin/experiments",
  );
  const e = exps.find((x) => x.name === slug);
  if (!e) return;
  if (e.status === "running") {
    await request
      .post(`/api/admin/experiments/${e.id}/status`, { data: { status: "stopped" } })
      .catch(() => {});
  }
  await request.delete(`/api/admin/experiments/${e.id}`).catch(() => {});
}

test("Experiment wizard — fill every field across 5 steps, save as draft", async ({ page }) => {
  const slug = `e2e_exp_full_${RUN}`;
  const tag = `q${RUN}`;
  const hypothesis = `Hypothesis ${RUN}: collapsing the address step into shipping lifts checkout conversion.`;
  const goalName = `e2e_exp_goal_${RUN}`;
  const guardName = `e2e_exp_guard_${RUN}`;

  // Clean up any experiment row left behind by a prior attempt so retries see
  // a clean slate (POST experiments is UNIQUE-constrained on name).
  await cleanupExperiment(page.request, slug);
  await seedMetric(page.request, goalName, `${goalName}_ev`);
  await seedMetric(page.request, guardName, `${guardName}_ev`);

  await page.goto(`/dashboard/${PROJECT}/experiments?new=1`);
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();

  // Stem.
  await expect(dialog.getByText(/Step 1 of 5 · experiment/i)).toBeVisible();
  await expect(dialog.locator('[data-slot="dialog-title"]')).toHaveText("Hypothesis & basics");

  // Step 1 — Basics.
  await dialog.locator("#experiment-name").fill(slug);
  await dialog.locator("#experiment-description").fill(hypothesis);
  await dialog.locator("#experiment-tag").fill(tag);
  const nextBtn = dialog.getByRole("button", { name: /^next/i });
  // Wait for the React state derived `isValid` to flip — without this the
  // click can hit a brief disabled window before the slug regex re-evaluates.
  await expect(nextBtn).toBeEnabled();
  await nextBtn.click();

  // Step 2 — Audience. Universe defaults to "default"; allocation defaults
  // to 100% (slider keyboard interaction is flaky with Base UI; leave the
  // default and verify it round-trips to 100%).
  await expect(dialog.locator('[data-slot="dialog-title"]')).toHaveText("Universe & allocation");
  await expect(dialog.getByText(/Step 2 of 5 · experiment/i)).toBeVisible();
  await expect(dialog.getByText(/^100% of universe$/)).toBeVisible();

  await dialog.getByRole("button", { name: /^next/i }).click();

  // Step 3 — Variants. Add a 3rd variant + rebalance.
  await expect(dialog.locator('[data-slot="dialog-title"]')).toHaveText("Variants & weights");
  await expect(dialog.getByText(/Step 3 of 5 · experiment/i)).toBeVisible();

  await dialog.getByRole("button", { name: /add variant/i }).click();
  await dialog.getByTestId("variant-name-2").fill("test_b");
  await dialog.getByRole("button", { name: /rebalance evenly/i }).click();
  // Sum should equal 100% with 3 variants.
  await expect(dialog.getByText(/100% ✓/)).toBeVisible();

  await dialog.getByRole("button", { name: /^next/i }).click();

  // Step 4 — Metrics.
  await expect(dialog.locator('[data-slot="dialog-title"]')).toHaveText("Goal & guardrails");
  await expect(dialog.getByText(/Step 4 of 5 · experiment/i)).toBeVisible();

  // Goal metric combobox — Base UI Combobox.Trigger has id passed through.
  // Click to open, type to filter, ArrowDown to highlight the match, Enter
  // to commit. Direct click on the option is unreliable because the chip
  // picker rendered below can overlap the portalled popup.
  const goalTrigger = dialog.locator("#experiment-goal-metric");
  await goalTrigger.click();
  // The Combobox.Input auto-focuses on open. Type to filter.
  await page.keyboard.type(goalName, { delay: 10 });
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  // Trigger now shows the selected goal name.
  await expect(goalTrigger.filter({ hasText: goalName })).toBeVisible();

  // Guardrail chip — pick the guardrail-only metric.
  await dialog.getByRole("button", { name: guardName, exact: true }).first().click();

  await dialog.getByRole("button", { name: /^next/i }).click();

  // Step 5 — Integrate. Turn OFF "Start immediately" so the experiment lands
  // as a draft (avoids leaving a running experiment behind).
  await expect(dialog.locator('[data-slot="dialog-title"]')).toHaveText("Wire it up");
  await expect(dialog.getByText(/Step 5 of 5 · experiment/i)).toBeVisible();

  const startNow = dialog.getByLabel(/start experiment immediately/i);
  await startNow.uncheck();

  // CTA changes to "Save as draft" when start is off.
  await dialog.getByRole("button", { name: /save as draft/i }).click();
  await expect(dialog).toHaveCount(0, { timeout: 5000 });

  // Verify in admin API.
  const list = await adminList<ExperimentRow>(page.request, "/api/admin/experiments");
  const row = list.find((e) => e.name === slug);
  expect(row).toBeDefined();
  expect(row?.tag).toBe(tag);
  expect(row?.universe).toBe("default");
  expect(row?.allocationPct).toBe(10000);
  expect(row?.status).toBe("draft");
  expect(row?.groups.map((g) => g.name).sort()).toEqual(["control", "test_b", "treatment"].sort());

  // Cleanup — delete the experiment + seeded metrics.
  if (row) {
    await page.request.delete(`/api/admin/experiments/${row.id}`).catch(() => {});
  }
  const metrics = await adminList<{ id: string; name: string }>(page.request, "/api/admin/metrics");
  for (const m of metrics) {
    if (m.name === goalName || m.name === guardName) {
      await page.request.delete(`/api/admin/metrics/${m.id}`).catch(() => {});
    }
  }
});
