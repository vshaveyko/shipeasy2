import { expect, test, type Page } from "@playwright/test";

const RUN = Date.now();

// ── Helpers ───────────────────────────────────────────────────────────────────

function configRow(page: Page, name: string) {
  return page.getByText(name, { exact: true }).locator("..");
}

// ── Type-selector UI ──────────────────────────────────────────────────────────

test.describe("New config form UI", () => {
  test("renders all five value-type options", async ({ page }) => {
    await page.goto("/dashboard/configs/values/new");
    for (const label of ["String", "Number", "Boolean", "Object", "Array"]) {
      await expect(page.getByText(label, { exact: true })).toBeVisible();
    }
  });

  test("String is selected by default and shows a text input", async ({ page }) => {
    await page.goto("/dashboard/configs/values/new");
    // String is the default — the visible input should be type text
    const valueInput = page.locator("#config-value");
    await expect(valueInput).toBeVisible();
    await expect(valueInput).toHaveAttribute("type", "text");
  });

  test("selecting Number shows a number input", async ({ page }) => {
    await page.goto("/dashboard/configs/values/new");
    await page.getByText("Number", { exact: true }).locator("..").click();
    await expect(page.locator("#config-value")).toHaveAttribute("type", "number");
  });

  test("selecting Boolean shows a select element", async ({ page }) => {
    await page.goto("/dashboard/configs/values/new");
    await page.getByText("Boolean", { exact: true }).locator("..").click();
    // select appears instead of input
    await expect(page.locator("#config-value")).toBeVisible();
    const tagName = await page.locator("#config-value").evaluate((el) => el.tagName.toLowerCase());
    expect(tagName).toBe("select");
  });

  test("selecting Object shows a textarea for JSON", async ({ page }) => {
    await page.goto("/dashboard/configs/values/new");
    await page.getByText("Object", { exact: true }).locator("..").click();
    const tagName = await page.locator("#config-value").evaluate((el) => el.tagName.toLowerCase());
    expect(tagName).toBe("textarea");
  });

  test("typing a string value shows a live preview", async ({ page }) => {
    await page.goto("/dashboard/configs/values/new");
    await page.locator("#config-value").fill("hello world");
    await expect(page.getByText('"hello world"')).toBeVisible();
  });

  test("typing a number shows a live preview", async ({ page }) => {
    await page.goto("/dashboard/configs/values/new");
    await page.getByText("Number", { exact: true }).locator("..").click();
    await page.locator("#config-value").fill("42");
    await expect(page.getByText("42")).toBeVisible();
  });

  test("cancel returns to values list", async ({ page }) => {
    await page.goto("/dashboard/configs/values/new");
    await page
      .getByRole("link", { name: /^cancel$/i })
      .first()
      .click();
    await expect(page).toHaveURL(/\/dashboard\/configs\/values$/);
  });
});

// ── String config CRUD ────────────────────────────────────────────────────────

test.describe("String config — full CRUD", () => {
  test.describe.configure({ mode: "serial" });

  const key = `e2cfg_str_${RUN}`;

  test("create string config with value 'hello' → appears in list and in admin API", async ({
    page,
  }) => {
    await page.goto("/dashboard/configs/values/new");
    await page.locator("#config-key").fill(key);
    await page.locator("#config-value").fill("hello");
    await page.getByRole("button", { name: /^create config$/i }).click();

    await expect(page).toHaveURL(/\/dashboard\/configs\/values$/);
    await expect(page.getByText(key, { exact: true })).toBeVisible();

    const resp = await page.request.get("/api/admin/configs");
    expect(resp.ok()).toBe(true);
    const configs = await resp.json();
    const cfg = configs.find((c: { name: string }) => c.name === key);
    expect(cfg).toBeDefined();
  });

  test("delete string config → removed from list and admin API", async ({ page }) => {
    await page.goto("/dashboard/configs/values");
    await configRow(page, key)
      .getByRole("button", { name: /^delete$/i })
      .click();

    await expect(page.getByText(key, { exact: true })).not.toBeVisible();

    const resp = await page.request.get("/api/admin/configs");
    const configs = await resp.json();
    const cfg = configs.find((c: { name: string }) => c.name === key);
    expect(cfg).toBeUndefined();
  });
});

// ── Number config ─────────────────────────────────────────────────────────────

test.describe("Number config — create and verify", () => {
  test.describe.configure({ mode: "serial" });

  const key = `e2cfg_num_${RUN}`;

  test("create number config with value 99 → propagates to admin API", async ({ page }) => {
    await page.goto("/dashboard/configs/values/new");
    await page.getByText("Number", { exact: true }).locator("..").click();
    await page.locator("#config-key").fill(key);
    await page.locator("#config-value").fill("99");
    await page.getByRole("button", { name: /^create config$/i }).click();

    await expect(page).toHaveURL(/\/dashboard\/configs\/values$/);
    await expect(page.getByText(key, { exact: true })).toBeVisible();

    const resp = await page.request.get("/api/admin/configs");
    const configs = await resp.json();
    const cfg = configs.find((c: { name: string }) => c.name === key);
    expect(cfg).toBeDefined();
  });

  test("cleanup: delete number config", async ({ page }) => {
    await page.goto("/dashboard/configs/values");
    await configRow(page, key)
      .getByRole("button", { name: /^delete$/i })
      .click();
    await expect(page.getByText(key, { exact: true })).not.toBeVisible();
  });
});

// ── Boolean config ────────────────────────────────────────────────────────────

test.describe("Boolean config — create with true value", () => {
  test.describe.configure({ mode: "serial" });

  const key = `e2cfg_bool_${RUN}`;

  test("create boolean config (true) → appears in list", async ({ page }) => {
    await page.goto("/dashboard/configs/values/new");
    await page.getByText("Boolean", { exact: true }).locator("..").click();
    await page.locator("#config-key").fill(key);
    // Default is "false"; select "true"
    await page.locator("#config-value").selectOption("true");
    await page.getByRole("button", { name: /^create config$/i }).click();

    await expect(page).toHaveURL(/\/dashboard\/configs\/values$/);
    await expect(page.getByText(key, { exact: true })).toBeVisible();
  });

  test("cleanup: delete boolean config", async ({ page }) => {
    await page.goto("/dashboard/configs/values");
    await configRow(page, key)
      .getByRole("button", { name: /^delete$/i })
      .click();
    await expect(page.getByText(key, { exact: true })).not.toBeVisible();
  });
});

// ── Object config ─────────────────────────────────────────────────────────────

test.describe("Object config — create with valid JSON", () => {
  test.describe.configure({ mode: "serial" });

  const key = `e2cfg_obj_${RUN}`;

  test("create object config with JSON → appears in list", async ({ page }) => {
    await page.goto("/dashboard/configs/values/new");
    await page.getByText("Object", { exact: true }).locator("..").click();
    await page.locator("#config-key").fill(key);
    await page.locator("#config-value").fill('{"threshold": 50, "enabled": true}');
    await page.getByRole("button", { name: /^create config$/i }).click();

    await expect(page).toHaveURL(/\/dashboard\/configs\/values$/);
    await expect(page.getByText(key, { exact: true })).toBeVisible();
  });

  test("cleanup: delete object config", async ({ page }) => {
    await page.goto("/dashboard/configs/values");
    await configRow(page, key)
      .getByRole("button", { name: /^delete$/i })
      .click();
    await expect(page.getByText(key, { exact: true })).not.toBeVisible();
  });
});

// ── Array config ──────────────────────────────────────────────────────────────

test.describe("Array config — create with JSON array", () => {
  test.describe.configure({ mode: "serial" });

  const key = `e2cfg_arr_${RUN}`;

  test("create array config with JSON array → appears in list", async ({ page }) => {
    await page.goto("/dashboard/configs/values/new");
    await page.getByText("Array", { exact: true }).locator("..").click();
    await page.locator("#config-key").fill(key);
    await page.locator("#config-value").fill('["plan_a", "plan_b", "plan_c"]');
    await page.getByRole("button", { name: /^create config$/i }).click();

    await expect(page).toHaveURL(/\/dashboard\/configs\/values$/);
    await expect(page.getByText(key, { exact: true })).toBeVisible();
  });

  test("cleanup: delete array config", async ({ page }) => {
    await page.goto("/dashboard/configs/values");
    await configRow(page, key)
      .getByRole("button", { name: /^delete$/i })
      .click();
    await expect(page.getByText(key, { exact: true })).not.toBeVisible();
  });
});
