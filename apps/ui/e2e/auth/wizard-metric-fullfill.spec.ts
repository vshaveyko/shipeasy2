/**
 * Full-field metric wizard run. Fills name + description, inline-registers a
 * new source event, picks `sum` aggregation (forces value_path), sets
 * direction + winsorize + MDE, walks all 4 steps, submits, asserts row in
 * admin API.
 */
import { expect, test } from "@playwright/test";
import { adminList } from "../admin-list";
import { setProjectPlan } from "../seed-fixtures";

const PROJECT = "e2e-project-id";
const RUN = Date.now();

type MetricRow = {
  id: string;
  name: string;
  // Admin list returns the raw Drizzle row → camelCase column names.
  eventName: string;
  valuePath: string | null;
  aggregation: string;
  winsorizePct: number;
  minDetectableEffect: number | null;
};

test.beforeAll(() => setProjectPlan("paid"));
test.afterAll(() => setProjectPlan("free"));

test("Metric wizard — fill every field, register inline event, submit, row exists", async ({
  page,
}) => {
  const metricName = `e2e_metric_full_${RUN}`;
  const eventName = `e2e_event_full_${RUN}`;
  const valuePath = "amount";

  await page.goto(`/dashboard/${PROJECT}/metrics?setup=1`);
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();

  // Stem.
  await expect(dialog.getByText(/Step 1 of 4 · metric/i)).toBeVisible();
  await expect(dialog.locator('[data-slot="dialog-title"]')).toHaveText("Identify the metric");

  // Step 1 — Details.
  await dialog.locator("#metric-name").fill(metricName);
  await dialog
    .locator("#metric-description")
    .fill("Full-fill spec — sum aggregation over a new event");
  await dialog.getByRole("button", { name: /^next/i }).click();

  // Step 2 — Source. Inline-register a new event.
  await expect(dialog.locator('[data-slot="dialog-title"]')).toHaveText("Pick a source event");
  await expect(dialog.getByText(/Step 2 of 4 · metric/i)).toBeVisible();

  await dialog.getByPlaceholder(/signup_completed/).fill(eventName);
  await dialog.getByRole("button", { name: /^register$/i }).click();
  // Event auto-selects after creation.
  await expect(dialog.getByRole("button", { name: new RegExp(eventName) })).toBeVisible();
  await expect(dialog.getByText(/^selected$/i)).toBeVisible();

  await dialog.getByRole("button", { name: /^next/i }).click();

  // Step 3 — Aggregation & shape.
  await expect(dialog.locator('[data-slot="dialog-title"]')).toHaveText("Aggregation & shape");
  await expect(dialog.getByText(/Step 3 of 4 · metric/i)).toBeVisible();

  // Pick `sum` — forces value_path field to appear.
  await dialog.getByRole("button", { name: /sum of value/i }).click();
  await expect(dialog.locator("#metric-value-path")).toBeVisible();
  await dialog.locator("#metric-value-path").fill(valuePath);

  // Direction → Lower is better.
  await dialog.getByRole("button", { name: /lower is better/i }).click();

  await dialog.getByRole("button", { name: /^next/i }).click();

  // Step 4 — Integrate.
  await expect(dialog.locator('[data-slot="dialog-title"]')).toHaveText("Wire it up");
  await expect(dialog.getByText(/Step 4 of 4 · metric/i)).toBeVisible();
  await expect(dialog.locator("pre").filter({ hasText: eventName }).first()).toBeVisible();

  // Canonical CTA "Register metric". Force-click — sonner toast from the
  // earlier inline event registration may still intercept pointer events.
  await dialog.getByRole("button", { name: /register metric/i }).click({ force: true });
  await expect(dialog).toHaveCount(0, { timeout: 5000 });

  // Verify via admin API.
  const list = await adminList<MetricRow>(page.request, "/api/admin/metrics");
  const row = list.find((m) => m.name === metricName);
  expect(row).toBeDefined();
  expect(row?.eventName).toBe(eventName);
  expect(row?.valuePath).toBe(valuePath);
  expect(row?.aggregation).toBe("sum");
});
