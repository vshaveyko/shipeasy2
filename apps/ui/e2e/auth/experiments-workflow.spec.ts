import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { adminList } from "../admin-list";
import { setProjectPlan } from "../seed-fixtures";

const RUN = Date.now();

// Free plan caps experiments at 1; this spec exercises multiple full
// lifecycles. Bump to paid for the whole spec.
test.beforeAll(() => setProjectPlan("paid"));
test.afterAll(() => setProjectPlan("free"));

// ── Helpers ───────────────────────────────────────────────────────────────────

function expRow(page: Page, name: string) {
  return page
    .locator('[data-slot="pane-full"]')
    .getByText(name, { exact: true })
    .locator("xpath=ancestor::tr[1]");
}

async function cleanupExperiment(request: APIRequestContext, name: string) {
  try {
    const exps = await adminList<{ id: string; name: string; status: string }>(
      request,
      "/api/admin/experiments",
    ).catch(() => null);
    if (!exps) return;
    const exp = exps.find((e) => e.name === name);
    if (!exp) return;
    if (exp.status === "running") {
      await request.post(`/api/admin/experiments/${exp.id}/status`, {
        data: { status: "stopped" },
      });
    }
    await request.delete(`/api/admin/experiments/${exp.id}`);
  } catch {
    // best-effort cleanup
  }
}

async function getExperimentId(page: Page, name: string): Promise<string> {
  const exps = await adminList<{ id: string; name: string }>(
    page.request,
    "/api/admin/experiments",
  );
  const exp = exps.find((e) => e.name === name);
  if (!exp) throw new Error(`Experiment '${name}' not found in admin API`);
  return exp.id;
}

/**
 * Drive the BigModalWizard (`?new=1`) end-to-end through to Create.
 * Lands back on `/experiments` after the Server Action redirect.
 */
async function createViaWizard(
  page: Page,
  name: string,
  opts: {
    hypothesis?: string;
    tag?: string;
    extraVariants?: number;
  } = {},
) {
  await page.goto("/dashboard/e2e-project-id/experiments?new=1");
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();

  // Step 1 — Name & describe
  await dialog.getByTestId("experiment-name-input").fill(name);
  if (opts.hypothesis !== undefined) {
    await dialog.locator("#experiment-description").fill(opts.hypothesis);
  }
  if (opts.tag !== undefined) {
    await dialog.locator("#experiment-tag").fill(opts.tag);
  }
  await dialog.getByRole("button", { name: /^next/i }).click();

  // Step 2 — Audience & traffic (keep defaults: default universe, 100%, no gate)
  await dialog
    .getByText(/audience & traffic/i)
    .first()
    .waitFor();
  await dialog.getByRole("button", { name: /^next/i }).click();

  // Step 3 — Variants
  await dialog.getByRole("heading", { name: /^variants$/i }).waitFor();
  for (let i = 0; i < (opts.extraVariants ?? 0); i++) {
    await dialog.getByRole("button", { name: /^add variant$/i }).click();
  }
  await dialog.getByRole("button", { name: /^next/i }).click();

  // Step 4 — Review → submit
  await dialog.getByRole("heading", { name: /^review$/i }).waitFor();
  await dialog.getByRole("button", { name: /create experiment/i }).click();

  // After submit the server action calls redirect() back to /experiments
  // (no `?new=1`). Wait for the dialog to close + URL to strip the query.
  await expect(page.getByRole("dialog")).toBeHidden({ timeout: 15_000 });
  await expect(page).not.toHaveURL(/[?&]new=1\b/);
  // SWR refetch — pin to the closed-table pane so the rail mirror doesn't
  // double-match strict-mode.
  await expect(
    page.locator('[data-slot="pane-full"]').getByText(name, { exact: true }),
  ).toBeVisible({ timeout: 15_000 });
}

// ── Wizard UI surface (BigModalWizard) ──────────────────────────────────────

test.describe("New experiment wizard — BigModalWizard UI", () => {
  test("renders the 4-step stepper", async ({ page }) => {
    await page.goto("/dashboard/e2e-project-id/experiments?new=1");
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    // Footer copy: "Step N of M · <label>" — pin to 4 total.
    await expect(dialog.getByText(/step 1 of 4/i).first()).toBeVisible();
    for (const label of ["Name & describe", "Audience & traffic", "Variants", "Review"]) {
      await expect(dialog.getByText(new RegExp(label, "i")).first()).toBeVisible();
    }
  });

  test("Next is disabled until a valid name is entered", async ({ page }) => {
    await page.goto("/dashboard/e2e-project-id/experiments?new=1");
    const dialog = page.getByRole("dialog");
    const next = dialog.getByRole("button", { name: /^next/i });
    await expect(next).toBeDisabled();
    await dialog.getByTestId("experiment-name-input").fill("checkout_v3");
    await expect(next).toBeEnabled();
  });

  test("step 3 starts with control + treatment variants and an Add variant button", async ({
    page,
  }) => {
    await page.goto("/dashboard/e2e-project-id/experiments?new=1");
    const dialog = page.getByRole("dialog");
    await dialog.getByTestId("experiment-name-input").fill("two_variants");
    await dialog.getByRole("button", { name: /^next/i }).click();
    await dialog.getByRole("button", { name: /^next/i }).click();

    await expect(dialog.getByTestId("variant-name-0")).toHaveValue("control");
    await expect(dialog.getByTestId("variant-name-1")).toHaveValue("treatment");
    await expect(dialog.getByRole("button", { name: /^add variant$/i })).toBeVisible();
  });

  test("Add variant button adds a third variant row and rebalances weights", async ({ page }) => {
    await page.goto("/dashboard/e2e-project-id/experiments?new=1");
    const dialog = page.getByRole("dialog");
    await dialog.getByTestId("experiment-name-input").fill("three_variants");
    await dialog.getByRole("button", { name: /^next/i }).click();
    await dialog.getByRole("button", { name: /^next/i }).click();
    await dialog.getByRole("button", { name: /^add variant$/i }).click();

    await expect(dialog.getByTestId("variant-name-2")).toBeVisible();
    // After rebalance, weights are 34/33/33 — at least one 33% chip renders.
    await expect(dialog.getByText(/\b33%\b/).first()).toBeVisible();
  });

  test("Esc closes the wizard and strips ?new=1", async ({ page }) => {
    await page.goto("/dashboard/e2e-project-id/experiments?new=1");
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toBeHidden();
    await expect(page).not.toHaveURL(/[?&]new=1\b/);
  });

  test("Review step renders summary cards and a Create button", async ({ page }) => {
    await page.goto("/dashboard/e2e-project-id/experiments?new=1");
    const dialog = page.getByRole("dialog");
    await dialog.getByTestId("experiment-name-input").fill("review_demo");
    await dialog.getByRole("button", { name: /^next/i }).click();
    await dialog.getByRole("button", { name: /^next/i }).click();
    await dialog.getByRole("button", { name: /^next/i }).click();

    await expect(dialog.getByRole("heading", { name: /^review$/i })).toBeVisible();
    await expect(dialog.getByText(/^name$/i).first()).toBeVisible();
    await expect(dialog.getByText(/^variants$/i).first()).toBeVisible();
    await expect(dialog.getByRole("button", { name: /create experiment/i })).toBeVisible();
  });
});

// ── Conversion experiment — full lifecycle ────────────────────────────────────

test.describe("Two-variant experiment — full lifecycle", () => {
  test.describe.configure({ mode: "serial" });

  const name = `e2exp_two_${RUN}`;

  test.afterAll(async ({ request }) => {
    await cleanupExperiment(request, name);
  });

  test("create draft via wizard → appears in list with 'draft' badge", async ({ page }) => {
    await createViaWizard(page, name, {
      hypothesis: "Two variants. Default split.",
    });
    await expect(expRow(page, name).getByText(/^draft$/i)).toBeVisible();
  });

  test("admin API stores name, hypothesis, 2 groups, draft status", async ({ page }) => {
    const exps = await adminList<{
      name: string;
      status: string;
      description: string | null;
      groups: { name: string; weight: number }[];
    }>(page.request, "/api/admin/experiments");
    const exp = exps.find((e) => e.name === name);
    expect(exp).toBeDefined();
    expect(exp!.groups).toHaveLength(2);
    expect(exp!.groups[0].name).toBe("control");
    expect(exp!.groups[1].name).toBe("treatment");
    expect(exp!.status).toBe("draft");
    expect(exp!.description).toContain("Two variants");
  });

  test("start experiment from list → 'running' badge appears", async ({ page }) => {
    await page.goto("/dashboard/e2e-project-id/experiments");
    await expRow(page, name)
      .getByRole("button", { name: /start experiment/i })
      .click();

    await expect(expRow(page, name).getByText(/^running$/i)).toBeVisible();
  });

  test("stop experiment from list → 'stopped' badge", async ({ page }) => {
    await page.goto("/dashboard/e2e-project-id/experiments");
    await expRow(page, name)
      .getByRole("button", { name: /stop experiment/i })
      .click();

    await expect(expRow(page, name).getByText(/^stopped$/i)).toBeVisible();
  });

  test("delete stopped experiment via row action → vanishes from list", async ({ page }) => {
    await page.goto("/dashboard/e2e-project-id/experiments");
    await expRow(page, name)
      .getByRole("button", { name: /delete experiment/i })
      .click();

    // SWR mutate is async; give the refetch a generous window before asserting.
    // Scope to pane-full to avoid the rail-pane mirror of the same name.
    await expect(
      page.locator('[data-slot="pane-full"]').getByText(name, { exact: true }),
    ).not.toBeVisible({ timeout: 15_000 });

    await expect
      .poll(async () => {
        const exps = await adminList<{ name: string }>(page.request, "/api/admin/experiments");
        return exps.find((e) => e.name === name);
      })
      .toBeUndefined();
  });
});

// ── Multi-variant experiment (3 groups) ───────────────────────────────────────

test.describe("Multi-variant experiment — 3 groups via wizard", () => {
  test.describe.configure({ mode: "serial" });

  const name = `e2exp_mv_${RUN}`;

  test.afterAll(async ({ request }) => {
    await cleanupExperiment(request, name);
  });

  test("create with 3 groups → admin API stores 3 groups, weights sum to 10000", async ({
    page,
  }) => {
    await createViaWizard(page, name, { extraVariants: 1 });

    const exps = await adminList<{
      name: string;
      groups: { name: string; weight: number }[];
    }>(page.request, "/api/admin/experiments");
    const exp = exps.find((e) => e.name === name);
    expect(exp).toBeDefined();
    expect(exp!.groups).toHaveLength(3);
    const sum = exp!.groups.reduce((acc, g) => acc + g.weight, 0);
    expect(sum).toBe(10000);
  });

  test("detail page: variants card lists all 3 group names", async ({ page }) => {
    const id = await getExperimentId(page, name);
    await page.goto(`/dashboard/e2e-project-id/experiments/${id}`);

    // Standalone v2 detail tags the first variant with "· baseline" inside
    // the same <span>, so /^control$/ as text-content matches the parent;
    // pin via the meta-variant container instead.
    await expect(page.locator(".meta-variant.ctrl").getByText("control")).toBeVisible();
    await expect(page.getByText(/^treatment$/)).toBeVisible();
    await expect(page.getByText(/^variant_2$/)).toBeVisible();
  });

  test("cleanup: delete multi-variant experiment", async ({ page }) => {
    await page.goto("/dashboard/e2e-project-id/experiments");
    await expRow(page, name)
      .getByRole("button", { name: /delete experiment/i })
      .click();
    await expect(
      page.locator('[data-slot="pane-full"]').getByText(name, { exact: true }),
    ).not.toBeVisible({ timeout: 15_000 });
  });
});

// ── Embedded detail pane (UnifiedList) ───────────────────────────────────────

test.describe("Experiments detail pane — embedded summary", () => {
  test.describe.configure({ mode: "serial" });

  const name = `e2exp_detail_${RUN}`;

  test.beforeAll(async ({ browser }) => {
    const ctx = await browser.newContext({
      storageState: require("path").join(__dirname, "../.auth/user.json"),
    });
    const p = await ctx.newPage();
    await createViaWizard(p, name);
    await ctx.close();
  });

  test.afterAll(async ({ request }) => {
    await cleanupExperiment(request, name);
  });

  test("row click adds ?open=<id> and renders the embedded summary", async ({ page }) => {
    const id = await getExperimentId(page, name);
    await page.goto("/dashboard/e2e-project-id/experiments");

    await expRow(page, name).click();
    await expect(page).toHaveURL(new RegExp(`[?&]open=${id}\\b`));

    const detail = page.locator('[data-slot="detail-pane"]');
    await expect(detail).toBeVisible();
    await expect(detail.getByText(/draft/i).first()).toBeVisible();
    await expect(detail.getByText(/allocation/i).first()).toBeVisible();
    await expect(detail.getByText(/variants/i).first()).toBeVisible();
  });

  test("'Open full view' link points at the standalone detail page", async ({ page }) => {
    const id = await getExperimentId(page, name);
    await page.goto(`/dashboard/e2e-project-id/experiments?open=${id}`);
    const link = page.getByTestId("experiment-detail-fullview-link");
    await expect(link).toHaveAttribute(
      "href",
      new RegExp(`/dashboard/e2e-project-id/experiments/${id}$`),
    );
  });

  test("Esc strips ?open and collapses the detail pane", async ({ page }) => {
    const id = await getExperimentId(page, name);
    await page.goto(`/dashboard/e2e-project-id/experiments?open=${id}`);
    await expect(page.locator('[data-slot="detail-pane"]')).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page).not.toHaveURL(/[?&]open=/);
  });
});
