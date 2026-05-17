import { expect, test, type Page } from "@playwright/test";
import { adminList } from "../admin-list";
import { setProjectPlan } from "../seed-fixtures";

const RUN = Date.now();

// Free plan caps configs at 1 — bump to paid for the whole spec so describe
// blocks can create multiple configs without hitting 429.
test.beforeAll(() => setProjectPlan("paid"));
test.afterAll(() => setProjectPlan("free"));

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Row visible in the UnifiedList closed-table. Scope to the full-table pane to
 * avoid colliding with the rail/detail mirrors of the same name once the row
 * is opened.
 */
function tableRow(page: Page, name: string) {
  return page.locator('[data-slot="pane-full"]').getByText(name, { exact: true }).first();
}

async function createConfigViaApi(
  page: Page,
  opts: {
    key: string;
    schema?: Record<string, unknown>;
    value?: unknown;
    description?: string;
  },
): Promise<string> {
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
  const body = (await resp.json()) as { id?: string; name?: string };
  if (body?.id) return body.id;
  const list = await adminList<{ id: string; name: string }>(page.request, "/api/admin/configs");
  const cfg = list.find((c) => c.name === opts.key);
  if (!cfg) throw new Error(`Could not resolve id for ${opts.key}`);
  return cfg.id;
}

async function deleteActiveConfig(page: Page): Promise<void> {
  // DetailPane sticky header exposes a "Delete" button — aria-label
  // "Delete config from detail pane". Clicking opens a confirm `<Dialog>`
  // whose submit reads "Delete config".
  await page.getByRole("button", { name: /delete config from detail pane/i }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /^delete config$/i })
    .click();
}

// ── New-config wizard UI (BigModalWizard) ────────────────────────────────────

test.describe("New config wizard UI", () => {
  test("?new=1 renders the wizard dialog with Details step", async ({ page }) => {
    await page.goto("/dashboard/e2e-project-id/configs/values?new=1");
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByTestId("config-key-input")).toBeVisible();
    await expect(dialog.getByRole("button", { name: /next/i })).toBeVisible();
    // Stepper exposes 4 steps — buttons labelled 1..4 sit alongside their
    // visible labels.
    await expect(dialog.getByText(/^details$/i).first()).toBeVisible();
    await expect(dialog.getByText(/^schema$/i).first()).toBeVisible();
    await expect(dialog.getByText(/^defaults$/i).first()).toBeVisible();
    await expect(dialog.getByText(/^review$/i).first()).toBeVisible();
  });

  test("Next is disabled until a valid key is typed", async ({ page }) => {
    await page.goto("/dashboard/e2e-project-id/configs/values?new=1");
    const dialog = page.getByRole("dialog");
    const next = dialog.getByRole("button", { name: /next/i });
    await expect(next).toBeDisabled();
    await dialog.getByTestId("config-key-input").fill(`e2.wiz_ok_${RUN}`);
    await expect(next).toBeEnabled();
  });

  test("Schema step exposes Add field which opens the field editor", async ({ page }) => {
    await page.goto("/dashboard/e2e-project-id/configs/values?new=1");
    const dialog = page.getByRole("dialog");
    await dialog.getByTestId("config-key-input").fill(`e2.wiz_schema_${RUN}`);
    await dialog.getByRole("button", { name: /next/i }).click();
    await expect(dialog.getByRole("button", { name: /^add field$/i }).first()).toBeVisible();
    await dialog
      .getByRole("button", { name: /^add field$/i })
      .first()
      .click();
    const inner = page.getByRole("dialog").last();
    await expect(inner.getByRole("textbox", { name: /field name/i })).toBeVisible();
    await expect(inner.getByRole("button", { name: /field type string/i })).toBeVisible();
  });

  test("close button strips ?new=1", async ({ page }) => {
    await page.goto("/dashboard/e2e-project-id/configs/values?new=1");
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: /^close$/i }).click();
    await expect(page).toHaveURL(/\/dashboard\/e2e-project-id\/configs\/values\/?$/);
  });
});

// ── Create, view in list, delete ──────────────────────────────────────────────

test.describe("Object config — create, view in list, delete", () => {
  test.describe.configure({ mode: "serial" });
  const key = `e2.cfg_obj_${RUN}`;
  let id: string;

  test("create via API and verify the row shows up in the closed table", async ({ page }) => {
    id = await createConfigViaApi(page, {
      key,
      schema: {
        type: "object",
        properties: { greeting: { type: "string" } },
      },
      value: { greeting: "hello" },
    });
    await page.goto("/dashboard/e2e-project-id/configs/values");
    await expect(tableRow(page, key)).toBeVisible();
  });

  test("open detail via ?open=<id> shows env tabs with prod active", async ({ page }) => {
    await page.goto(`/dashboard/e2e-project-id/configs/values?open=${id}`);
    const detail = page.locator('[data-slot="detail-pane"]');
    await expect(detail.getByRole("tab", { name: "prod" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await expect(detail.getByRole("tab", { name: "dev" })).toHaveAttribute(
      "aria-selected",
      "false",
    );
  });

  test("delete from the detail pane removes it from the list", async ({ page }) => {
    await page.goto(`/dashboard/e2e-project-id/configs/values?open=${id}`);
    await deleteActiveConfig(page);

    // onDeleted strips ?open=<id>; the closed table should no longer carry the row.
    await expect(page).toHaveURL(/\/dashboard\/e2e-project-id\/configs\/values\/?$/);
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

    const list = await adminList<{
      id: string;
      name: string;
      schema: Record<string, unknown>;
      envs: Record<string, { version: number } | undefined>;
    }>(page.request, "/api/admin/configs");
    const cfg = list.find((c) => c.name === key)!;
    expect(cfg.envs.prod?.version).toBe(1);

    const patchResp = await page.request.patch(`/api/admin/configs/${cfg.id}`, {
      data: {
        schema: {
          type: "object",
          properties: { a: { type: "number" }, b: { type: "string" } },
        },
      },
    });
    expect(patchResp.ok()).toBe(true);

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

    await page.request.patch(`/api/admin/configs/${cfg.id}`, {
      data: {
        schema: {
          type: "object",
          properties: { a: { type: "number" }, b: { type: "string" } },
          required: ["b"],
        },
      },
    });

    const draftResp = await page.request.put(`/api/admin/configs/${cfg.id}/drafts`, {
      data: { env: "dev", value: { a: 5 } },
    });
    expect(draftResp.status()).toBe(400);
  });

  test("cleanup", async ({ page }) => {
    const list = await adminList<{ id: string; name: string }>(page.request, "/api/admin/configs");
    const cfg = list.find((c) => c.name === key);
    if (!cfg) return;
    await page.request.delete(`/api/admin/configs/${cfg.id}`);
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
    expect(resp.status()).toBe(400);
  });
});
