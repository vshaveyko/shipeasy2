import { expect, test, type APIRequestContext } from "@playwright/test";

import { adminList } from "../admin-list";
import { setProjectPlan } from "../seed-fixtures";

const RUN = Date.now();

// ── State-control helpers ─────────────────────────────────────────────────────
//
// The cockpit's discriminator is derived server-side from counts of gates +
// configs + experiments (running vs. not). To assert each branch the suite
// drains the workspace into a known shape, then restores rough emptiness in
// `afterAll`. We don't try to preserve sibling-spec seed state — this suite
// runs in its own serial describe block.

interface GateRow {
  id: string;
  name: string;
}
interface ConfigRow {
  id: string;
  name: string;
}
interface ExperimentRow {
  id: string;
  name: string;
  status: "draft" | "running" | "stopped" | "archived";
}

async function clearWorkspace(request: APIRequestContext): Promise<void> {
  // Stop any running experiments before deleting; the admin DELETE blocks
  // running ones.
  const exps = await adminList<ExperimentRow>(request, "/api/admin/experiments").catch(
    () => [] as ExperimentRow[],
  );
  for (const e of exps) {
    if (e.status === "running") {
      await request
        .post(`/api/admin/experiments/${e.id}/status`, { data: { status: "stopped" } })
        .catch(() => {});
    }
    await request.delete(`/api/admin/experiments/${e.id}`).catch(() => {});
  }
  const gates = await adminList<GateRow>(request, "/api/admin/gates").catch(() => [] as GateRow[]);
  for (const g of gates) {
    await request.delete(`/api/admin/gates/${g.id}`).catch(() => {});
  }
  const configs = await adminList<ConfigRow>(request, "/api/admin/configs").catch(
    () => [] as ConfigRow[],
  );
  for (const c of configs) {
    await request.delete(`/api/admin/configs/${c.id}`).catch(() => {});
  }
}

async function seedGate(request: APIRequestContext, name: string): Promise<string> {
  const res = await request.post("/api/admin/gates", {
    data: { name, rollout_pct: 0, rules: [], enabled: true },
  });
  expect(res.ok(), `seed gate failed: ${await res.text().catch(() => "")}`).toBeTruthy();
  return ((await res.json()) as { id: string }).id;
}

async function seedRunningExperiment(request: APIRequestContext, name: string): Promise<string> {
  const create = await request.post("/api/admin/experiments", {
    data: {
      name,
      universe: "default",
      allocation_pct: 10000,
      groups: [
        { name: "control", weight: 5000 },
        { name: "treatment", weight: 5000 },
      ],
    },
  });
  expect(
    create.ok(),
    `seed experiment failed: ${await create.text().catch(() => "")}`,
  ).toBeTruthy();
  const id = ((await create.json()) as { id: string }).id;
  const start = await request.post(`/api/admin/experiments/${id}/status`, {
    data: { status: "running" },
  });
  expect(start.ok(), `start experiment failed: ${await start.text().catch(() => "")}`).toBeTruthy();
  return id;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test.describe("Home cockpit — state transitions", () => {
  test.describe.configure({ mode: "serial" });

  // Paid plan: free caps experiments and configs at 1, which the state
  // transitions trip while moving busy → quiet → first-run.
  test.beforeAll(() => setProjectPlan("paid"));
  test.afterAll(async ({ request }) => {
    await clearWorkspace(request);
    setProjectPlan("free");
  });

  test.beforeEach(async ({ request }) => {
    await clearWorkspace(request);
  });

  test("first-run: empty workspace renders onboarding + first-run hero", async ({ page }) => {
    await page.goto("/dashboard");

    const cockpit = page.locator('[data-slot="home-cockpit"]');
    await expect(cockpit).toHaveAttribute("data-state", "first-run");
    await expect(page.locator('[data-slot="home-hero"]')).toHaveAttribute(
      "data-state",
      "first-run",
    );

    // Onboarding checklist renders 4 steps with the expected hrefs. Decisions
    // section is hidden in first-run (mutual-exclusion branch).
    const onb = page.locator('[data-slot="home-onboarding"]');
    await expect(onb).toBeVisible();
    await expect(page.locator('[data-slot="home-decisions"]')).toHaveCount(0);

    const steps = onb.getByRole("link");
    await expect(steps).toHaveCount(4);
    await expect(steps.nth(0)).toHaveAttribute("href", "/dashboard/e2e-project-id/keys");
    await expect(steps.nth(1)).toHaveAttribute("href", "/dashboard/e2e-project-id/keys#create-key");
    await expect(steps.nth(2)).toHaveAttribute("href", "/dashboard/e2e-project-id/metrics");
    await expect(steps.nth(3)).toHaveAttribute("href", "/dashboard/e2e-project-id/gates");

    // First-run banner with "Create an SDK key" CTA.
    const banner = page.locator('[data-slot="banner"]');
    await expect(banner).toBeVisible();
    await expect(banner.getByText(/your workspace is ready/i)).toBeVisible();
    await expect(banner.getByRole("link", { name: /create an sdk key/i })).toHaveAttribute(
      "href",
      "/dashboard/e2e-project-id/keys",
    );
  });

  test("quiet: workspace with records but no running experiments shows empty decisions", async ({
    page,
    request,
  }) => {
    await seedGate(request, `e2hc_quiet_gate_${RUN}`);
    await page.goto("/dashboard");

    const cockpit = page.locator('[data-slot="home-cockpit"]');
    await expect(cockpit).toHaveAttribute("data-state", "quiet");

    // Decisions row renders the "all clear" empty state and the empty data
    // attribute is set on the section.
    const decisions = page.locator('[data-slot="home-decisions"]');
    await expect(decisions).toBeVisible();
    await expect(decisions).toHaveAttribute("data-empty", "true");
    await expect(decisions.getByText(/nothing pending/i)).toBeVisible();

    // Onboarding is hidden outside first-run.
    await expect(page.locator('[data-slot="home-onboarding"]')).toHaveCount(0);

    // Live-now section is omitted when zero running experiments.
    await expect(page.locator('[data-slot="home-live"]')).toHaveCount(0);
  });

  test("busy: running experiments populate decisions + live tiles", async ({ page, request }) => {
    const expName = `e2hc_busy_exp_${RUN}`;
    const expId = await seedRunningExperiment(request, expName);

    await page.goto("/dashboard");

    const cockpit = page.locator('[data-slot="home-cockpit"]');
    await expect(cockpit).toHaveAttribute("data-state", "busy");

    // DecisionsRow renders the synthesized card with a link into the
    // experiment detail pane.
    const decisions = page.locator('[data-slot="home-decisions"]');
    await expect(decisions).toBeVisible();
    await expect(decisions).not.toHaveAttribute("data-empty", "true");
    const card = decisions.getByRole("link", { name: new RegExp(expName) });
    await expect(card).toHaveAttribute(
      "href",
      `/dashboard/e2e-project-id/experiments?open=${expId}`,
    );

    // LiveNow renders a compact tile with the RUNNING badge.
    const live = page.locator('[data-slot="home-live"]');
    await expect(live).toBeVisible();
    const tile = live.getByRole("link", { name: new RegExp(expName) });
    await expect(tile).toHaveAttribute(
      "href",
      `/dashboard/e2e-project-id/experiments?open=${expId}`,
    );
    await expect(tile.locator('[data-slot="status-badge"][data-tone="live"]')).toContainText(
      /RUNNING/i,
    );
  });
});

// ── Launchpad navigation ──────────────────────────────────────────────────────

test.describe("Home cockpit — launchpad", () => {
  test.describe.configure({ mode: "serial" });

  test("new config link opens the configs wizard", async ({ page }) => {
    await page.goto("/dashboard");
    await page
      .locator('[data-slot="home-launchpad"]')
      .getByRole("link", { name: /^new config$/i })
      .click();
    await expect(page).toHaveURL(/\/dashboard\/e2e-project-id\/configs\/values\?new=1$/);
    await expect(page.getByRole("dialog")).toBeVisible();
  });

  test("new experiment link opens the experiments wizard", async ({ page }) => {
    await page.goto("/dashboard");
    await page
      .locator('[data-slot="home-launchpad"]')
      .getByRole("link", { name: /^new experiment$/i })
      .click();
    await expect(page).toHaveURL(/\/dashboard\/e2e-project-id\/experiments\?new=1$/);
    await expect(page.getByRole("dialog")).toBeVisible();
  });

  test("new killswitch link opens the killswitches wizard", async ({ page }) => {
    await page.goto("/dashboard");
    await page
      .locator('[data-slot="home-launchpad"]')
      .getByRole("link", { name: /^new killswitch$/i })
      .click();
    await expect(page).toHaveURL(/\/dashboard\/e2e-project-id\/killswitches\?new=1$/);
    await expect(page.getByRole("dialog")).toBeVisible();
  });

  test("send first event link opens the metrics setup wizard", async ({ page }) => {
    await page.goto("/dashboard");
    await page
      .locator('[data-slot="home-launchpad"]')
      .getByRole("link", { name: /send first event/i })
      .click();
    await expect(page).toHaveURL(/\/dashboard\/e2e-project-id\/metrics\?setup=1$/);
    await expect(page.getByRole("dialog")).toBeVisible();
  });
});
