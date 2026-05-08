import { expect, test, type Page } from "@playwright/test";

const RUN = Date.now();

// ── Helpers ───────────────────────────────────────────────────────────────────

function treeItem(page: Page, name: string) {
  return page
    .getByRole("link", { name: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`) })
    .first();
}

/**
 * Create a config via the admin API. The new-config UI is now a schema-driven
 * form — exercising every field type via the UI is covered separately by the
 * "New config form UI" describe. Here we just need rows to operate on.
 */
async function createConfigViaApi(
  page: Page,
  opts: {
    key: string;
    schema?: Record<string, unknown>;
    value?: unknown;
    description?: string;
  },
): Promise<void> {
  const schema = opts.schema ?? {
    type: "object",
    properties: {},
    additionalProperties: true,
  };
  const resp = await page.request.post("/api/admin/configs", {
    data: {
      name: opts.key,
      schema,
      value: opts.value ?? {},
      ...(opts.description ? { description: opts.description } : {}),
    },
  });
  expect(resp.ok()).toBe(true);
}

async function deleteActiveConfig(page: Page): Promise<void> {
  // Editor uses an inline two-step confirm — first click reveals "Confirm delete".
  await page.getByRole("button", { name: /delete config/i }).click();
  await page.getByRole("button", { name: /confirm delete/i }).click();
  await expect(page).toHaveURL(/\/dashboard\/e2e-project-id\/configs\/values\/?$/);
}

// ── New-config form UI (schema builder + value form) ──────────────────────────

test.describe("New config form UI", () => {
  test("renders the schema builder with an Add field button", async ({ page }) => {
    await page.goto("/dashboard/e2e-project-id/configs/values/new");
    await expect(page.getByRole("heading", { name: /^new config$/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /add field/i })).toBeVisible();
  });

  test("clicking Add field appends a new row with name + type controls", async ({ page }) => {
    await page.goto("/dashboard/e2e-project-id/configs/values/new");
    await page.getByRole("button", { name: /add field/i }).click();
    await expect(page.getByRole("textbox", { name: /field name/i })).toBeVisible();
    await expect(page.getByRole("combobox", { name: /field type/i })).toBeVisible();
  });

  test("create button is enabled and configurable", async ({ page }) => {
    await page.goto("/dashboard/e2e-project-id/configs/values/new");
    await expect(page.getByTestId("config-key-input")).toBeVisible();
    await expect(page.getByRole("button", { name: /^create config$/i })).toBeEnabled();
  });
});

// ── Create, view in tree, delete ──────────────────────────────────────────────

test.describe("Object config — create, view, delete", () => {
  test.describe.configure({ mode: "serial" });
  const key = `e2cfg_obj_${RUN}`;

  test("create via API and verify tree shows the new key", async ({ page }) => {
    await createConfigViaApi(page, {
      key,
      schema: {
        type: "object",
        properties: { greeting: { type: "string" } },
      },
      value: { greeting: "hello" },
    });
    await page.goto("/dashboard/e2e-project-id/configs/values");
    await expect(treeItem(page, key)).toBeVisible();

    const resp = await page.request.get("/api/admin/configs");
    expect(resp.ok()).toBe(true);
    const configs = (await resp.json()) as { name: string; schema: { type: string } }[];
    const cfg = configs.find((c) => c.name === key);
    expect(cfg).toBeDefined();
    expect(cfg!.schema.type).toBe("object");
  });

  test("editor shows env tabs and prod is active by default", async ({ page }) => {
    await page.goto("/dashboard/e2e-project-id/configs/values");
    await treeItem(page, key).click();
    await expect(page.getByRole("tab", { name: "prod" })).toHaveAttribute("aria-selected", "true");
    await expect(page.getByRole("tab", { name: "dev" })).toHaveAttribute("aria-selected", "false");
  });

  test("delete from editor removes it from the list", async ({ page }) => {
    await page.goto("/dashboard/e2e-project-id/configs/values");
    await treeItem(page, key).click();
    await deleteActiveConfig(page);

    const resp = await page.request.get("/api/admin/configs");
    const configs = (await resp.json()) as { name: string }[];
    expect(configs.some((c) => c.name === key)).toBe(false);
  });
});

// ── Schema-only edits do NOT bump value version ───────────────────────────────

test.describe("Schema vs value separation", () => {
  test.describe.configure({ mode: "serial" });
  const key = `e2cfg_schema_${RUN}`;

  test("schema update via PATCH does not bump value version", async ({ page }) => {
    await createConfigViaApi(page, {
      key,
      schema: { type: "object", properties: { a: { type: "number" } } },
      value: { a: 1 },
    });

    // Find the new config's id.
    const list = (await (await page.request.get("/api/admin/configs")).json()) as {
      id: string;
      name: string;
      schema: Record<string, unknown>;
      envs: Record<string, { version: number } | undefined>;
    }[];
    const cfg = list.find((c) => c.name === key)!;
    expect(cfg.envs.prod?.version).toBe(1);

    // PATCH the schema only.
    const patchResp = await page.request.patch(`/api/admin/configs/${cfg.id}`, {
      data: {
        schema: {
          type: "object",
          properties: { a: { type: "number" }, b: { type: "string" } },
        },
      },
    });
    expect(patchResp.ok()).toBe(true);

    // Version unchanged after schema-only update.
    const after = (await (await page.request.get("/api/admin/configs")).json()) as {
      name: string;
      schema: { properties?: Record<string, unknown> };
      envs: Record<string, { version: number } | undefined>;
    }[];
    const updated = after.find((c) => c.name === key)!;
    expect(updated.envs.prod?.version).toBe(1);
    expect(Object.keys(updated.schema.properties ?? {})).toEqual(["a", "b"]);
  });

  test("server rejects a value that violates the current schema", async ({ page }) => {
    const list = (await (await page.request.get("/api/admin/configs")).json()) as {
      id: string;
      name: string;
    }[];
    const cfg = list.find((c) => c.name === key)!;

    // Tighten schema: require `b`.
    await page.request.patch(`/api/admin/configs/${cfg.id}`, {
      data: {
        schema: {
          type: "object",
          properties: { a: { type: "number" }, b: { type: "string" } },
          required: ["b"],
        },
      },
    });

    // Try to publish a draft missing `b`.
    const draftResp = await page.request.put(`/api/admin/configs/${cfg.id}/drafts`, {
      data: { env: "dev", value: { a: 5 } },
    });
    // Schema validation runs in saveDraft; should fail with 400.
    expect(draftResp.status()).toBe(400);
  });

  test("cleanup", async ({ page }) => {
    await page.goto("/dashboard/e2e-project-id/configs/values");
    await treeItem(page, key).click();
    await deleteActiveConfig(page);
  });
});

// ── Top-level non-object value is rejected ────────────────────────────────────

test.describe("Object-only enforcement", () => {
  test("creating a config with a non-object value returns 400", async ({ page }) => {
    const resp = await page.request.post("/api/admin/configs", {
      data: {
        name: `e2cfg_reject_${RUN}`,
        schema: { type: "object", properties: {} },
        value: "just a string",
      },
    });
    expect(resp.status()).toBe(400);
  });
});
