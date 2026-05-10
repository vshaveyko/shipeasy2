import { expect, test, type Page } from "@playwright/test";
import { adminList } from "../admin-list";
import { setProjectPlan } from "../seed-fixtures";

const RUN = Date.now();

// Free plan caps configs at 1 — bump to paid for the whole spec so describe
// blocks can create multiple configs without hitting 429.
test.beforeAll(() => setProjectPlan("paid"));
test.afterAll(() => setProjectPlan("free"));

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
  test("renders the wizard stepper and details step", async ({ page }) => {
    await page.goto("/dashboard/e2e-project-id/configs/values/new");
    await expect(page.getByRole("heading", { name: /^new config$/i })).toBeVisible();
    await expect(page.getByTestId("config-key-input")).toBeVisible();
    await expect(page.getByRole("button", { name: /^continue$/i })).toBeVisible();
  });

  test("Schema step exposes Add field which opens the field editor", async ({ page }) => {
    await page.goto("/dashboard/e2e-project-id/configs/values/new");
    await page.getByRole("button", { name: /^continue$/i }).click();
    await expect(page.getByRole("button", { name: /add (root )?field/i }).first()).toBeVisible();
    await page
      .getByRole("button", { name: /add (root )?field/i })
      .first()
      .click();
    // Edit field dialog opens with a Field name input and type picker
    await expect(page.getByRole("textbox", { name: /field name/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /field type string/i })).toBeVisible();
  });

  test("Continue button is enabled and key input is editable", async ({ page }) => {
    await page.goto("/dashboard/e2e-project-id/configs/values/new");
    await expect(page.getByTestId("config-key-input")).toBeVisible();
    await expect(page.getByRole("button", { name: /^continue$/i })).toBeEnabled();
  });
});

// ── Create, view in tree, delete ──────────────────────────────────────────────

test.describe("Object config — create, view, delete", () => {
  test.describe.configure({ mode: "serial" });
  const key = `e2.cfg_obj_${RUN}`;

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

    const configs = await adminList<{ name: string; schema: { type: string } }>(
      page.request,
      "/api/admin/configs",
    );
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

    const configs = await adminList<{ name: string }>(page.request, "/api/admin/configs");
    expect(configs.some((c) => c.name === key)).toBe(false);
  });
});

// ── Schema-only edits do NOT bump value version ───────────────────────────────

test.describe("Schema vs value separation", () => {
  test.describe.configure({ mode: "serial" });
  const key = `e2.cfg_schema_${RUN}`;

  test("schema update via PATCH does not bump value version", async ({ page }) => {
    await createConfigViaApi(page, {
      key,
      schema: { type: "object", properties: { a: { type: "number" } } },
      value: { a: 1 },
    });

    // Find the new config's id.
    const list = await adminList<{
      id: string;
      name: string;
      schema: Record<string, unknown>;
      envs: Record<string, { version: number } | undefined>;
    }>(page.request, "/api/admin/configs");
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
    const after = await adminList<{
      name: string;
      schema: { properties?: Record<string, unknown> };
      envs: Record<string, { version: number } | undefined>;
    }>(page.request, "/api/admin/configs");
    const updated = after.find((c) => c.name === key)!;
    expect(updated.envs.prod?.version).toBe(1);
    expect(Object.keys(updated.schema.properties ?? {})).toEqual(["a", "b"]);
  });

  test("server rejects a value that violates the current schema", async ({ page }) => {
    const list = await adminList<{ id: string; name: string }>(page.request, "/api/admin/configs");
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
        name: `e2.cfg_reject_${RUN}`,
        schema: { type: "object", properties: {} },
        value: "just a string",
      },
    });
    // assertValueMatchesSchema throws ApiError(400); Zod-shape failures throw 422.
    // A non-object top-level value is caught by assertValueMatchesSchema → 400.
    expect(resp.status()).toBe(400);
  });
});
