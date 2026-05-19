import { expect, test } from "@playwright/test";

type NavCase = {
  startAt: string;
  label: RegExp;
  url: RegExp;
  heading: RegExp;
};

const GATES_NAV: NavCase[] = [
  {
    startAt: "/dashboard/e2e-project-id/gates",
    label: /^gates$/i,
    url: /\/dashboard\/e2e-project-id\/gates$/,
    heading: /^gates$/i,
  },
];

const CONFIGS_NAV: NavCase[] = [
  {
    startAt: "/dashboard/e2e-project-id/configs/values",
    label: /^configs$/i,
    url: /\/dashboard\/e2e-project-id\/configs\/values$/,
    // Configs page header — falls back to hero "Tune your app …" copy when
    // the project has no configs yet, but earlier tests seed at least one
    // config so the PageHeader title is what renders here.
    heading: /^configs$/i,
  },
];

// The redesigned project sidebar surfaces only top-level product tabs;
// sub-product navigation (Universes/Metrics/Events/Attributes) lives inside
// the experiments routes themselves, not in the global sidebar.
const EXPERIMENTS_NAV: NavCase[] = [
  {
    startAt: "/dashboard/e2e-project-id/experiments",
    label: /^experiments$/i,
    url: /\/dashboard\/e2e-project-id\/experiments$/,
    heading: /^experiments$/i,
  },
];

async function runNavSuite(page: import("@playwright/test").Page, cases: NavCase[]) {
  // Some product pages render a secondary <aside> (e.g. configs tree). Scope
  // assertions to the primary navigation rail, which is always the first.
  const sidebar = page.locator("aside").first();
  for (const c of cases) {
    await page.goto(c.startAt);
    await expect(sidebar).toBeVisible();
    await sidebar.getByRole("link", { name: c.label }).first().click();
    await expect(page).toHaveURL(c.url);
    await expect(page.getByRole("heading", { name: c.heading })).toBeVisible();
  }
}

test.describe("Sidebar navigation", () => {
  test("renders Gates product nav items", async ({ page }) => {
    await runNavSuite(page, GATES_NAV);
  });

  test("renders Configs product nav items", async ({ page }) => {
    await runNavSuite(page, CONFIGS_NAV);
  });

  test("renders Experiments product nav items", async ({ page }) => {
    await runNavSuite(page, EXPERIMENTS_NAV);
  });

  test("active nav item is visually highlighted", async ({ page }) => {
    await page.goto("/dashboard/e2e-project-id/experiments");

    const sidebar = page.locator("aside").first();
    const active = sidebar.getByRole("link", { name: /^experiments$/i }).first();
    await expect(active).toBeVisible();
    // Active state is communicated via background colour + a left rail.
    await expect(active).toHaveClass(/text-foreground/);
  });

  test("shared nav exposes SDK Keys and Settings from Configs and Experiments", async ({
    page,
  }) => {
    const sidebar = page.locator("aside").first();

    await page.goto("/dashboard/e2e-project-id/configs/values");
    await sidebar.getByRole("link", { name: /^sdk keys$/i }).click();
    await expect(page).toHaveURL(/\/dashboard\/e2e-project-id\/keys$/);

    await page.goto("/dashboard/e2e-project-id/experiments");
    await sidebar.getByRole("link", { name: /^settings$/i }).click();
    await expect(page).toHaveURL(/\/dashboard\/e2e-project-id\/settings$/);
  });

  test("top-bar brand link returns to overview", async ({ page }) => {
    await page.goto("/dashboard/e2e-project-id/settings");
    await page.getByRole("link", { name: /^shipeasy$/i }).click();
    // Brand link goes to /dashboard which redirects into the active project.
    await expect(page).toHaveURL(/\/dashboard(\/e2e-project-id)?$/);
  });
});
