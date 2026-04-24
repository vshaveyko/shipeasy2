import { expect, test, type Page } from "@playwright/test";

const RUN = Date.now();

// ── Helpers ───────────────────────────────────────────────────────────────────

function treeItem(page: Page, name: string) {
  return page
    .getByRole("link", { name: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`) })
    .first();
}

async function createConfig(
  page: Page,
  opts: { key: string; type?: "string" | "number" | "boolean" | "object" | "array"; value: string },
): Promise<void> {
  await page.goto("/dashboard/configs/values/new");
  const type = opts.type ?? "string";
  if (type !== "string") {
    await page.getByText(type.charAt(0).toUpperCase() + type.slice(1), { exact: true }).click();
  }
  await page.locator("#config-key").fill(opts.key);
  if (type === "boolean") {
    await page.locator("#config-value").selectOption(opts.value);
  } else {
    await page.locator("#config-value").fill(opts.value);
  }
  await page.getByRole("button", { name: /^create config$/i }).click();
  // After create the user lands on the new config's detail page.
  await expect(page).toHaveURL(/\/dashboard\/configs\/values\/[^/]+$/);
}

async function deleteActiveConfig(page: Page): Promise<void> {
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: /delete config/i }).click();
  await expect(page).toHaveURL(/\/dashboard\/configs\/values\/?$/);
}

// ── Type-selector UI (create page) ────────────────────────────────────────────

test.describe("New config form UI", () => {
  test("renders all five value-type options", async ({ page }) => {
    await page.goto("/dashboard/configs/values/new");
    for (const label of ["String", "Number", "Boolean", "Object", "Array"]) {
      await expect(page.getByText(label, { exact: true })).toBeVisible();
    }
  });

  test("String is selected by default and shows a text input", async ({ page }) => {
    await page.goto("/dashboard/configs/values/new");
    const valueInput = page.locator("#config-value");
    await expect(valueInput).toBeVisible();
    await expect(valueInput).toHaveAttribute("type", "text");
  });

  test("selecting Number shows a number input", async ({ page }) => {
    await page.goto("/dashboard/configs/values/new");
    await page.getByText("Number", { exact: true }).click();
    await expect(page.locator("#config-value")).toHaveAttribute("type", "number");
  });

  test("selecting Boolean shows a select element", async ({ page }) => {
    await page.goto("/dashboard/configs/values/new");
    await page.getByText("Boolean", { exact: true }).click();
    const tagName = await page.locator("#config-value").evaluate((el) => el.tagName.toLowerCase());
    expect(tagName).toBe("select");
  });

  test("selecting Object shows a textarea for JSON", async ({ page }) => {
    await page.goto("/dashboard/configs/values/new");
    await page.getByText("Object", { exact: true }).click();
    const tagName = await page.locator("#config-value").evaluate((el) => el.tagName.toLowerCase());
    expect(tagName).toBe("textarea");
  });
});

// ── Create, view in tree, delete ──────────────────────────────────────────────

test.describe("String config — create, view, delete", () => {
  test.describe.configure({ mode: "serial" });
  const key = `e2cfg_str_${RUN}`;

  test("create lands on editor page and tree shows the new key", async ({ page }) => {
    await createConfig(page, { key, value: "hello" });
    await expect(treeItem(page, key)).toBeVisible();

    const resp = await page.request.get("/api/admin/configs");
    expect(resp.ok()).toBe(true);
    const configs = (await resp.json()) as { name: string }[];
    expect(configs.some((c) => c.name === key)).toBe(true);
  });

  test("editor shows env tabs and prod is active by default", async ({ page }) => {
    await treeItem(page, key).click();
    await expect(page.getByRole("tab", { name: "prod" })).toHaveAttribute("aria-selected", "true");
    await expect(page.getByRole("tab", { name: "dev" })).toHaveAttribute("aria-selected", "false");
  });

  test("delete from editor removes it from the list", async ({ page }) => {
    await treeItem(page, key).click();
    await deleteActiveConfig(page);

    const resp = await page.request.get("/api/admin/configs");
    const configs = (await resp.json()) as { name: string }[];
    expect(configs.some((c) => c.name === key)).toBe(false);
  });
});

// ── Draft → Publish flow (the new workflow) ───────────────────────────────────

test.describe("Draft and publish flow", () => {
  test.describe.configure({ mode: "serial" });
  const key = `e2cfg_pub_${RUN}`;

  test("create config to publish into", async ({ page }) => {
    await createConfig(page, {
      key,
      type: "object",
      value: JSON.stringify({ a: 1 }),
    });
  });

  test("editing the draft and publishing creates a new version", async ({ page }) => {
    await page.goto("/dashboard/configs/values");
    await treeItem(page, key).click();

    // Switch to dev env (versions are independent per env).
    await page.getByRole("tab", { name: "dev" }).click();

    // Replace the draft JSON with a new object.
    const newValue = JSON.stringify({ a: 2, b: "two" }, null, 2);
    const textarea = page.locator("textarea").first();
    await textarea.fill(newValue);

    // Publish sends the draft live.
    await page.getByTestId("publish-button").click();
    await expect(page.getByText(/Published to dev/i)).toBeVisible();

    const resp = await page.request.get(`/api/admin/configs`);
    const configs = (await resp.json()) as {
      id: string;
      name: string;
      envs: Record<string, { version: number } | undefined>;
    }[];
    const cfg = configs.find((c) => c.name === key)!;
    expect(cfg.envs.dev?.version).toBe(2);
    expect(cfg.envs.prod?.version).toBe(1);
  });

  test("cleanup", async ({ page }) => {
    await page.goto("/dashboard/configs/values");
    await treeItem(page, key).click();
    await deleteActiveConfig(page);
  });
});

// ── Number / Boolean / Object / Array creates ─────────────────────────────────

test.describe("Typed configs — smoke", () => {
  test.describe.configure({ mode: "serial" });

  const specs: Array<{
    label: string;
    type: "number" | "boolean" | "object" | "array";
    value: string;
    suffix: string;
  }> = [
    { label: "number", type: "number", value: "99", suffix: "num" },
    { label: "boolean", type: "boolean", value: "true", suffix: "bool" },
    {
      label: "object",
      type: "object",
      value: '{"threshold": 50, "enabled": true}',
      suffix: "obj",
    },
    { label: "array", type: "array", value: '["a", "b"]', suffix: "arr" },
  ];

  for (const { label, type, value, suffix } of specs) {
    test(`create ${label} config and delete it`, async ({ page }) => {
      const key = `e2cfg_${suffix}_${RUN}`;
      await createConfig(page, { key, type, value });
      await expect(treeItem(page, key)).toBeVisible();
      await deleteActiveConfig(page);
    });
  }
});
