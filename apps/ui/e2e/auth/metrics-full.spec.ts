import { expect, test, type Page } from "@playwright/test";

const RUN = Date.now();

// ── Helpers ───────────────────────────────────────────────────────────────────

function metricRow(page: Page, name: string) {
  return page.getByText(name, { exact: true }).locator("..").locator("..");
}

// ── Form UI ───────────────────────────────────────────────────────────────────

test.describe("Metrics form UI", () => {
  test("aggregation selector has all five options", async ({ page }) => {
    await page.goto("/dashboard/experiments/metrics");
    const sel = page.locator("#metric-agg");
    await expect(sel).toBeVisible();
    for (const opt of ["count_users", "count_events", "sum", "avg", "retention_Nd"]) {
      await expect(sel.locator(`option[value="${opt}"]`)).toHaveCount(1);
    }
  });

  test("default aggregation is count_users", async ({ page }) => {
    await page.goto("/dashboard/experiments/metrics");
    await expect(page.locator("#metric-agg")).toHaveValue("count_users");
  });

  test("sum aggregation shows value-path field", async ({ page }) => {
    await page.goto("/dashboard/experiments/metrics");
    await page.locator("#metric-agg").selectOption("sum");
    // Forward-looking: value_path field expected for sum/avg aggregations
    await expect(
      page.locator("#metric-value-path").or(page.getByLabel(/value.*path/i)),
    ).toBeVisible();
  });

  test("avg aggregation shows value-path field", async ({ page }) => {
    await page.goto("/dashboard/experiments/metrics");
    await page.locator("#metric-agg").selectOption("avg");
    await expect(
      page.locator("#metric-value-path").or(page.getByLabel(/value.*path/i)),
    ).toBeVisible();
  });

  test("count_users does not show value-path field", async ({ page }) => {
    await page.goto("/dashboard/experiments/metrics");
    // Default is count_users — no value_path needed
    await expect(
      page.locator("#metric-value-path").or(page.getByLabel(/value.*path/i)),
    ).not.toBeVisible();
  });
});

// ── count_users metric ────────────────────────────────────────────────────────

test.describe("count_users metric — CRUD", () => {
  test.describe.configure({ mode: "serial" });

  const name = `e2m_cu_${RUN}`;

  test("create count_users metric → aggregation label in list", async ({ page }) => {
    await page.goto("/dashboard/experiments/metrics");
    await page.locator("#metric-name").fill(name);
    await page.locator("#metric-event").fill("e2e_event");
    await page.locator("#metric-agg").selectOption("count_users");
    await page.getByRole("button", { name: /^new metric$/i }).click();

    await expect(page).toHaveURL(/\/dashboard\/experiments\/metrics/);
    await expect(page.getByText(name)).toBeVisible();
    await expect(metricRow(page, name).getByText(/count_users on e2e_event/i)).toBeVisible();
  });

  test("cleanup: delete count_users metric", async ({ page }) => {
    await page.goto("/dashboard/experiments/metrics");
    await metricRow(page, name)
      .getByRole("button", { name: /^delete$/i })
      .click();
    await expect(page.getByText(name)).not.toBeVisible();
  });
});

// ── count_events metric ───────────────────────────────────────────────────────

test.describe("count_events metric — CRUD", () => {
  test.describe.configure({ mode: "serial" });

  const name = `e2m_ce_${RUN}`;

  test("create count_events metric → label in list", async ({ page }) => {
    await page.goto("/dashboard/experiments/metrics");
    await page.locator("#metric-name").fill(name);
    await page.locator("#metric-event").fill("e2e_event");
    await page.locator("#metric-agg").selectOption("count_events");
    await page.getByRole("button", { name: /^new metric$/i }).click();

    await expect(page).toHaveURL(/\/dashboard\/experiments\/metrics/);
    await expect(metricRow(page, name).getByText(/count_events on e2e_event/i)).toBeVisible();
  });

  test("cleanup: delete count_events metric", async ({ page }) => {
    await page.goto("/dashboard/experiments/metrics");
    await metricRow(page, name)
      .getByRole("button", { name: /^delete$/i })
      .click();
    await expect(page.getByText(name)).not.toBeVisible();
  });
});

// ── sum metric ────────────────────────────────────────────────────────────────

test.describe("sum metric — CRUD with value_path", () => {
  test.describe.configure({ mode: "serial" });

  const name = `e2m_sum_${RUN}`;

  test("create sum metric with value_path → label in list", async ({ page }) => {
    await page.goto("/dashboard/experiments/metrics");
    await page.locator("#metric-name").fill(name);
    await page.locator("#metric-event").fill("e2e_event");
    await page.locator("#metric-agg").selectOption("sum");

    // Fill value_path if the field is present (forward-looking for sum/avg)
    const valuePath = page.locator("#metric-value-path").or(page.getByLabel(/value.*path/i));
    if ((await valuePath.count()) > 0) {
      await valuePath.fill("amount");
    }

    await page.getByRole("button", { name: /^new metric$/i }).click();

    await expect(page).toHaveURL(/\/dashboard\/experiments\/metrics/);
    await expect(page.getByText(name)).toBeVisible();
    await expect(metricRow(page, name).getByText(/sum on e2e_event/i)).toBeVisible();
  });

  test("cleanup: delete sum metric", async ({ page }) => {
    await page.goto("/dashboard/experiments/metrics");
    await metricRow(page, name)
      .getByRole("button", { name: /^delete$/i })
      .click();
    await expect(page.getByText(name)).not.toBeVisible();
  });
});

// ── avg metric ────────────────────────────────────────────────────────────────

test.describe("avg metric — CRUD with value_path", () => {
  test.describe.configure({ mode: "serial" });

  const name = `e2m_avg_${RUN}`;

  test("create avg metric → label in list", async ({ page }) => {
    await page.goto("/dashboard/experiments/metrics");
    await page.locator("#metric-name").fill(name);
    await page.locator("#metric-event").fill("e2e_event");
    await page.locator("#metric-agg").selectOption("avg");

    const valuePath = page.locator("#metric-value-path").or(page.getByLabel(/value.*path/i));
    if ((await valuePath.count()) > 0) {
      await valuePath.fill("latency_ms");
    }

    await page.getByRole("button", { name: /^new metric$/i }).click();

    await expect(page).toHaveURL(/\/dashboard\/experiments\/metrics/);
    await expect(metricRow(page, name).getByText(/avg on e2e_event/i)).toBeVisible();
  });

  test("cleanup: delete avg metric", async ({ page }) => {
    await page.goto("/dashboard/experiments/metrics");
    await metricRow(page, name)
      .getByRole("button", { name: /^delete$/i })
      .click();
    await expect(page.getByText(name)).not.toBeVisible();
  });
});

// ── retention_Nd metric ───────────────────────────────────────────────────────

test.describe("retention_Nd metric — CRUD", () => {
  test.describe.configure({ mode: "serial" });

  const name = `e2m_ret_${RUN}`;

  test("create retention_Nd metric → label in list", async ({ page }) => {
    await page.goto("/dashboard/experiments/metrics");
    await page.locator("#metric-name").fill(name);
    await page.locator("#metric-event").fill("e2e_event");
    await page.locator("#metric-agg").selectOption("retention_Nd");
    await page.getByRole("button", { name: /^new metric$/i }).click();

    await expect(page).toHaveURL(/\/dashboard\/experiments\/metrics/);
    await expect(metricRow(page, name).getByText(/retention_nd on e2e_event/i)).toBeVisible();
  });

  test("cleanup: delete retention_Nd metric", async ({ page }) => {
    await page.goto("/dashboard/experiments/metrics");
    await metricRow(page, name)
      .getByRole("button", { name: /^delete$/i })
      .click();
    await expect(page.getByText(name)).not.toBeVisible();
  });
});

// ── Winsorize and MDE ─────────────────────────────────────────────────────────

test.describe("Metric advanced fields — winsorize_pct and MDE", () => {
  test.describe.configure({ mode: "serial" });

  const name = `e2m_adv_${RUN}`;

  test("winsorize_pct field defaults to 99", async ({ page }) => {
    await page.goto("/dashboard/experiments/metrics");
    const winsorizeField = page.locator("#metric-winsorize").or(page.getByLabel(/winsoriz/i));
    expect(await winsorizeField.count(), "winsorize_pct field not yet implemented").toBeGreaterThan(
      0,
    );
    await expect(winsorizeField).toHaveValue("99");
  });

  test("mde (min detectable effect) field accepts a number", async ({ page }) => {
    await page.goto("/dashboard/experiments/metrics");
    const mdeField = page.locator("#metric-mde").or(page.getByLabel(/min.*detectable/i));
    expect(await mdeField.count(), "MDE field not yet implemented").toBeGreaterThan(0);
    await mdeField.fill("0.02");
    await expect(mdeField).toHaveValue("0.02");

    // Create and clean up
    await page.locator("#metric-name").fill(name);
    await page.locator("#metric-event").fill("e2e_event");
    await page.getByRole("button", { name: /^new metric$/i }).click();
    await expect(page).toHaveURL(/\/dashboard\/experiments\/metrics/);
    await metricRow(page, name)
      .getByRole("button", { name: /^delete$/i })
      .click();
  });
});
