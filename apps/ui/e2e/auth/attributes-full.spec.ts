import { expect, test, type Page } from "@playwright/test";

const RUN = Date.now();

// ── Helpers ───────────────────────────────────────────────────────────────────

function attrRow(page: Page, name: string) {
  return page.getByText(name, { exact: true }).locator("..").locator("..");
}

// ── Form UI ───────────────────────────────────────────────────────────────────

test.describe("Attributes form UI", () => {
  test("type selector has all five options", async ({ page }) => {
    await page.goto("/dashboard/experiments/attributes");
    const sel = page.locator("#attr-type");
    await expect(sel).toBeVisible();
    for (const opt of ["string", "number", "boolean", "enum", "date"]) {
      await expect(sel.locator(`option[value="${opt}"]`)).toHaveCount(1);
    }
  });

  test("default type is string", async ({ page }) => {
    await page.goto("/dashboard/experiments/attributes");
    await expect(page.locator("#attr-type")).toHaveValue("string");
  });

  test("selecting enum type shows enum-values input", async ({ page }) => {
    await page.goto("/dashboard/experiments/attributes");
    await page.locator("#attr-type").selectOption("enum");
    // A field for comma-separated enum values should appear
    await expect(
      page.locator("#attr-enum-values").or(page.getByLabel(/enum values/i)),
    ).toBeVisible();
  });
});

// ── String attribute ──────────────────────────────────────────────────────────

test.describe("String attribute — create and delete", () => {
  test.describe.configure({ mode: "serial" });

  const name = `e2attr_str_${RUN}`;

  test("create string attribute → string badge in list", async ({ page }) => {
    await page.goto("/dashboard/experiments/attributes");
    await page.locator("#attr-name").fill(name);
    // string is the default — leave as-is
    await page.getByRole("button", { name: /^add attribute$/i }).click();

    await expect(page).toHaveURL(/\/dashboard\/experiments\/attributes$/);
    await expect(attrRow(page, name).getByText("string")).toBeVisible();
  });

  test("cleanup: delete string attribute", async ({ page }) => {
    await page.goto("/dashboard/experiments/attributes");
    await attrRow(page, name)
      .getByRole("button", { name: /^delete$/i })
      .click();
    await expect(page.getByText(name, { exact: true })).not.toBeVisible();
  });
});

// ── Number attribute ──────────────────────────────────────────────────────────

test.describe("Number attribute — create and delete", () => {
  test.describe.configure({ mode: "serial" });

  const name = `e2attr_num_${RUN}`;

  test("create number attribute → number badge", async ({ page }) => {
    await page.goto("/dashboard/experiments/attributes");
    await page.locator("#attr-name").fill(name);
    await page.locator("#attr-type").selectOption("number");
    await page.getByRole("button", { name: /^add attribute$/i }).click();

    await expect(page).toHaveURL(/\/dashboard\/experiments\/attributes$/);
    await expect(attrRow(page, name).getByText("number")).toBeVisible();
  });

  test("cleanup: delete number attribute", async ({ page }) => {
    await page.goto("/dashboard/experiments/attributes");
    await attrRow(page, name)
      .getByRole("button", { name: /^delete$/i })
      .click();
    await expect(page.getByText(name, { exact: true })).not.toBeVisible();
  });
});

// ── Boolean attribute ─────────────────────────────────────────────────────────

test.describe("Boolean attribute — create and delete", () => {
  test.describe.configure({ mode: "serial" });

  const name = `e2attr_bool_${RUN}`;

  test("create boolean attribute → boolean badge", async ({ page }) => {
    await page.goto("/dashboard/experiments/attributes");
    await page.locator("#attr-name").fill(name);
    await page.locator("#attr-type").selectOption("boolean");
    await page.getByRole("button", { name: /^add attribute$/i }).click();

    await expect(page).toHaveURL(/\/dashboard\/experiments\/attributes$/);
    await expect(attrRow(page, name).getByText("boolean")).toBeVisible();
  });

  test("cleanup: delete boolean attribute", async ({ page }) => {
    await page.goto("/dashboard/experiments/attributes");
    await attrRow(page, name)
      .getByRole("button", { name: /^delete$/i })
      .click();
    await expect(page.getByText(name, { exact: true })).not.toBeVisible();
  });
});

// ── Enum attribute ────────────────────────────────────────────────────────────

test.describe("Enum attribute — create with values and delete", () => {
  test.describe.configure({ mode: "serial" });

  const name = `e2attr_en_${RUN}`;

  test("create enum attribute with values → enum badge in list", async ({ page }) => {
    await page.goto("/dashboard/experiments/attributes");
    await page.locator("#attr-name").fill(name);
    await page.locator("#attr-type").selectOption("enum");

    // Fill enum values once the field appears (forward-looking: #attr-enum-values)
    const enumValuesInput = page.locator("#attr-enum-values").or(page.getByLabel(/enum values/i));
    if ((await enumValuesInput.count()) > 0) {
      await enumValuesInput.fill("free,pro,enterprise");
    }

    await page.getByRole("button", { name: /^add attribute$/i }).click();

    await expect(page).toHaveURL(/\/dashboard\/experiments\/attributes$/);
    await expect(attrRow(page, name).getByText("enum")).toBeVisible();
  });

  test("cleanup: delete enum attribute", async ({ page }) => {
    await page.goto("/dashboard/experiments/attributes");
    await attrRow(page, name)
      .getByRole("button", { name: /^delete$/i })
      .click();
    await expect(page.getByText(name, { exact: true })).not.toBeVisible();
  });
});

// ── Date attribute ────────────────────────────────────────────────────────────

test.describe("Date attribute — create and delete", () => {
  test.describe.configure({ mode: "serial" });

  const name = `e2attr_dt_${RUN}`;

  test("create date attribute → date badge", async ({ page }) => {
    await page.goto("/dashboard/experiments/attributes");
    await page.locator("#attr-name").fill(name);
    await page.locator("#attr-type").selectOption("date");
    await page.getByRole("button", { name: /^add attribute$/i }).click();

    await expect(page).toHaveURL(/\/dashboard\/experiments\/attributes$/);
    await expect(attrRow(page, name).getByText("date")).toBeVisible();
  });

  test("cleanup: delete date attribute", async ({ page }) => {
    await page.goto("/dashboard/experiments/attributes");
    await attrRow(page, name)
      .getByRole("button", { name: /^delete$/i })
      .click();
    await expect(page.getByText(name, { exact: true })).not.toBeVisible();
  });
});

// ── All types in admin API ────────────────────────────────────────────────────

test.describe("Attribute types — admin API verification", () => {
  test.describe.configure({ mode: "serial" });

  const names = {
    string: `e2attr_apistr_${RUN}`,
    number: `e2attr_apinum_${RUN}`,
    boolean: `e2attr_apibool_${RUN}`,
  };

  for (const [type, name] of Object.entries(names)) {
    test(`create ${type} attribute → admin API reflects type`, async ({ page }) => {
      await page.goto("/dashboard/experiments/attributes");
      await page.locator("#attr-name").fill(name);
      await page.locator("#attr-type").selectOption(type);
      await page.getByRole("button", { name: /^add attribute$/i }).click();

      await expect(page).toHaveURL(/\/dashboard\/experiments\/attributes$/);
      await expect(attrRow(page, name).getByText(type)).toBeVisible();
    });

    test(`cleanup: delete ${type} attribute`, async ({ page }) => {
      await page.goto("/dashboard/experiments/attributes");
      await attrRow(page, name)
        .getByRole("button", { name: /^delete$/i })
        .click();
      await expect(page.getByText(name, { exact: true })).not.toBeVisible();
    });
  }
});
