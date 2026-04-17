import { expect, test } from "@playwright/test";

type NavCase = {
  startAt: string;
  label: RegExp;
  url: RegExp;
  heading: RegExp;
};

const CONFIGS_NAV: NavCase[] = [
  {
    startAt: "/dashboard/configs",
    label: /^overview$/i,
    url: /\/dashboard\/configs$/,
    heading: /^configs$/i,
  },
  {
    startAt: "/dashboard/configs",
    label: /^gates$/i,
    url: /\/dashboard\/configs\/gates$/,
    heading: /^gates$/i,
  },
  {
    startAt: "/dashboard/configs",
    label: /^configs$/i,
    url: /\/dashboard\/configs\/values$/,
    heading: /^dynamic configs$/i,
  },
];

const EXPERIMENTS_NAV: NavCase[] = [
  {
    startAt: "/dashboard/experiments",
    label: /^experiments$/i,
    url: /\/dashboard\/experiments$/,
    heading: /^experiments$/i,
  },
  {
    startAt: "/dashboard/experiments",
    label: /^universes$/i,
    url: /\/dashboard\/experiments\/universes$/,
    heading: /^universes$/i,
  },
  {
    startAt: "/dashboard/experiments",
    label: /^metrics$/i,
    url: /\/dashboard\/experiments\/metrics$/,
    heading: /^metrics$/i,
  },
  {
    startAt: "/dashboard/experiments",
    label: /^events$/i,
    url: /\/dashboard\/experiments\/events$/,
    heading: /^events$/i,
  },
  {
    startAt: "/dashboard/experiments",
    label: /^attributes$/i,
    url: /\/dashboard\/experiments\/attributes$/,
    heading: /^user attributes$/i,
  },
];

async function runNavSuite(page: import("@playwright/test").Page, cases: NavCase[]) {
  const sidebar = page.locator("aside");
  for (const c of cases) {
    await page.goto(c.startAt);
    await expect(sidebar).toBeVisible();
    await sidebar.getByRole("link", { name: c.label }).first().click();
    await expect(page).toHaveURL(c.url);
    await expect(page.getByRole("heading", { name: c.heading, level: 1 })).toBeVisible();
  }
}

test.describe("Sidebar navigation", () => {
  test("renders Configs product nav items", async ({ page }) => {
    await runNavSuite(page, CONFIGS_NAV);
  });

  test("renders Experiments product nav items", async ({ page }) => {
    await runNavSuite(page, EXPERIMENTS_NAV);
  });

  test("active nav item is visually highlighted", async ({ page }) => {
    await page.goto("/dashboard/experiments");

    const sidebar = page.locator("aside");
    const active = sidebar.getByRole("link", { name: /^experiments$/i }).first();
    await expect(active).toBeVisible();
    await expect(active).toHaveClass(/font-medium/);
  });

  test("shared nav exposes SDK Keys and Settings from Configs and Experiments", async ({
    page,
  }) => {
    const sidebar = page.locator("aside");

    await page.goto("/dashboard/configs");
    await sidebar.getByRole("link", { name: /^sdk keys$/i }).click();
    await expect(page).toHaveURL(/\/dashboard\/keys$/);

    await page.goto("/dashboard/experiments");
    await sidebar.getByRole("link", { name: /^settings$/i }).click();
    await expect(page).toHaveURL(/\/dashboard\/settings$/);
  });

  test("top-bar brand link returns to overview", async ({ page }) => {
    await page.goto("/dashboard/settings");
    await page.getByRole("link", { name: /^shipeasy$/i }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
  });
});
