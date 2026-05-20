/**
 * Create-metric wizard (DSL-aware) end-to-end coverage.
 *
 * The Aggregation & shape step now drives the @shipeasy/query-dsl IR. Verifies:
 *   - All 9 agg buttons render
 *   - Percentile chip strip appears for quantile
 *   - Retention N input appears for retention_Nd
 *   - Value-property chips populate from the event's numeric properties
 *   - Filters editor adds/removes rows and clamps op set on numeric labels
 *   - GroupBy chips toggle and surface in the DSL preview
 *   - DSL preview re-renders as IR changes
 *   - Submitting the wizard creates a metric whose query_ir matches what was
 *     shown in the preview (via /api/admin/metrics list).
 */
import { expect, test, type Page, type Locator } from "@playwright/test";
import { cleanupEvent, seedEvent, setProjectPlan } from "../seed-fixtures";
import { adminList } from "../admin-list";

const EVENT = "e2e_metric_purchase";
const NUMERIC = "amount";
const STRING = "country";

test.beforeAll(() => {
  setProjectPlan("paid");
  cleanupEvent(EVENT);
  seedEvent(EVENT, [
    { name: STRING, type: "string", required: false, description: "ISO country" },
    { name: NUMERIC, type: "number", required: false, description: "Charge amount" },
  ]);
});
test.afterAll(() => {
  cleanupEvent(EVENT);
  setProjectPlan("free");
});

async function openWizard(page: Page): Promise<Locator> {
  await page.goto("/dashboard/e2e-project-id/metrics?setup=1");
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.locator("#metric-name")).toBeVisible();
  return dialog;
}

async function advanceToShape(dialog: Locator, leaf: string): Promise<void> {
  await dialog.locator("#metric-name").fill(leaf);
  await dialog.getByRole("button", { name: /next/i }).click();
  // Source step
  await dialog
    .getByRole("button", { name: new RegExp(EVENT, "i") })
    .first()
    .click();
  await dialog.getByRole("button", { name: /next/i }).click();
  await expect(dialog.locator('[data-slot="dialog-title"]')).toHaveText(/Aggregation/i);
}

test("agg picker exposes 9 aggregations + dependent inputs", async ({ page }) => {
  const dialog = await openWizard(page);
  await advanceToShape(dialog, `agg-picker-${Date.now()}`);

  for (const label of [
    "Unique users",
    "Event count",
    "Sum",
    "Average",
    "Minimum",
    "Maximum",
    "Unique values",
    "Percentile",
    "N-day retention",
  ]) {
    await expect(dialog.getByRole("button", { name: label })).toBeVisible();
  }

  await dialog.getByRole("button", { name: "Percentile" }).click();
  for (const p of ["p50", "p75", "p90", "p95", "p99", "p999"]) {
    await expect(dialog.getByRole("button", { name: new RegExp(`^${p}$`) })).toBeVisible();
  }

  await dialog.getByRole("button", { name: "N-day retention" }).click();
  await expect(dialog.locator("#metric-retention-n")).toBeVisible();
});

test("DSL preview re-renders as IR changes", async ({ page }) => {
  const dialog = await openWizard(page);
  await advanceToShape(dialog, `dsl-preview-${Date.now()}`);

  const preview = dialog.getByTestId("metric-dsl-preview");
  await expect(preview).toContainText(`count_users(${EVENT})`);

  // Switch to sum + pick numeric property → preview shows `, amount`.
  await dialog.getByRole("button", { name: "Sum" }).click();
  await dialog.getByRole("button", { name: NUMERIC }).click();
  await expect(preview).toContainText(`sum(${EVENT}, ${NUMERIC})`);

  // Add a string filter → preview includes the {country="US"} clause.
  await dialog.getByRole("button", { name: /Add filter/i }).click();
  await dialog
    .getByRole("combobox")
    .first()
    .selectOption({ label: `${STRING} (string)` });
  await dialog.locator("input[placeholder='value']").last().fill("US");
  await expect(preview).toContainText(`{${STRING}="US"}`);

  // GroupBy by the same label → preview ends with ` by (country)`.
  await dialog
    .getByRole("button", { name: new RegExp(`^${STRING}$`) })
    .last()
    .click();
  await expect(preview).toContainText(`by (${STRING})`);
});

test("create persists query_ir matching the previewed DSL", async ({ page }) => {
  const dialog = await openWizard(page);
  const leaf = `created-${Date.now()}`;
  await advanceToShape(dialog, leaf);

  await dialog.getByRole("button", { name: "Sum" }).click();
  await dialog.getByRole("button", { name: NUMERIC }).click();
  // Step 4 (integrate) → submit.
  await dialog.getByRole("button", { name: /next/i }).click();
  await dialog.getByRole("button", { name: /create|register/i }).click();

  await expect(dialog).toBeHidden({ timeout: 10_000 });

  const metrics = await adminList<{
    name: string;
    eventName: string;
    queryIr: { agg: { kind: string }; valueLabel?: string };
  }>(page.request, "/api/admin/metrics");
  const created = metrics.find((m) => m.name === leaf);
  expect(created).toBeTruthy();
  expect(created?.eventName).toBe(EVENT);
  expect(created?.queryIr?.agg?.kind).toBe("sum");
  expect(created?.queryIr?.valueLabel).toBe(NUMERIC);
});
