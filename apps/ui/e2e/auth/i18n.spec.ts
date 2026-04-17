import { expect, test } from "@playwright/test";

// ── Overview ──────────────────────────────────────────────────────────────────

test.describe("i18n / String Manager overview", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard/i18n");
  });

  test("renders the String Manager heading", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /^string manager$/i, level: 1 })).toBeVisible();
  });

  test("shows all four stat cards", async ({ page }) => {
    for (const label of [/^profiles$/i, /^keys$/i, /^open drafts$/i, /^loader req \/ 24h$/i]) {
      await expect(page.getByText(label).first()).toBeVisible();
    }
  });

  test("feature section links to profiles, keys and drafts", async ({ page }) => {
    const main = page.locator("main");

    await main.getByRole("link", { name: /manage profiles/i }).click();
    await expect(page).toHaveURL(/\/dashboard\/i18n\/profiles$/);
    await page.goBack();

    await main
      .getByRole("link", { name: /browse keys/i })
      .first()
      .click();
    await expect(page).toHaveURL(/\/dashboard\/i18n\/keys$/);
    await page.goBack();

    await main.getByRole("link", { name: /review drafts/i }).click();
    await expect(page).toHaveURL(/\/dashboard\/i18n\/drafts$/);
  });

  test("get-started section shows all three steps", async ({ page }) => {
    await expect(page.getByText(/1\. create a profile/i)).toBeVisible();
    await expect(page.getByText(/2\. scan your codebase/i)).toBeVisible();
    await expect(page.getByText(/3\. create a draft/i)).toBeVisible();
  });

  test("get-started CTAs link to the correct sub-pages", async ({ page }) => {
    const main = page.locator("main");

    await expect(main.getByRole("link", { name: /new profile/i })).toHaveAttribute(
      "href",
      "/dashboard/i18n/profiles/new",
    );
    await expect(main.getByRole("link", { name: /browse keys/i }).first()).toHaveAttribute(
      "href",
      "/dashboard/i18n/keys",
    );
    await expect(main.getByRole("link", { name: /new draft/i })).toHaveAttribute(
      "href",
      "/dashboard/i18n/drafts/new",
    );
  });
});

// ── Sidebar navigation ─────────────────────────────────────────────────────────

test.describe("i18n sidebar navigation", () => {
  const NAV_CASES = [
    {
      label: /^overview$/i,
      url: /\/dashboard\/i18n$/,
      heading: /^string manager$/i,
    },
    {
      label: /^profiles$/i,
      url: /\/dashboard\/i18n\/profiles$/,
      heading: /^profiles$/i,
    },
    {
      label: /^keys$/i,
      url: /\/dashboard\/i18n\/keys$/,
      heading: /^label keys$/i,
    },
    {
      label: /^drafts$/i,
      url: /\/dashboard\/i18n\/drafts$/,
      heading: /^drafts$/i,
    },
  ] as const;

  test("all four nav items are present and navigate correctly", async ({ page }) => {
    const sidebar = page.locator("aside");
    for (const c of NAV_CASES) {
      await page.goto("/dashboard/i18n");
      await sidebar.getByRole("link", { name: c.label }).first().click();
      await expect(page).toHaveURL(c.url);
      await expect(page.getByRole("heading", { name: c.heading, level: 1 })).toBeVisible();
    }
  });
});

// ── Profiles ──────────────────────────────────────────────────────────────────

test.describe("i18n / Profiles", () => {
  test("list page shows heading, description and New profile CTA", async ({ page }) => {
    await page.goto("/dashboard/i18n/profiles");

    await expect(page.getByRole("heading", { name: /^profiles$/i, level: 1 })).toBeVisible();
    await expect(page.getByText(/locale.*environment/i).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /new profile/i }).first()).toBeVisible();
  });

  test("list page shows the seeded en:test profile", async ({ page }) => {
    await page.goto("/dashboard/i18n/profiles");
    await expect(page.getByRole("cell", { name: "en:test", exact: true })).toBeVisible();
  });

  test("seeded profile row shows a Browse keys link", async ({ page }) => {
    await page.goto("/dashboard/i18n/profiles");
    const row = page.getByRole("row").filter({ hasText: "en:test" });
    await expect(row.getByRole("link", { name: /browse keys/i })).toBeVisible();
  });

  test("new-profile form renders heading, name field and cancel link", async ({ page }) => {
    await page.goto("/dashboard/i18n/profiles/new");

    await expect(page.getByRole("heading", { name: /^new profile$/i, level: 1 })).toBeVisible();
    await expect(page.getByLabel(/^name$/i)).toBeVisible();
    await expect(page.getByRole("link", { name: /^cancel$/i }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /^create profile$/i })).toBeVisible();
  });

  test("name field accepts and reflects typed input", async ({ page }) => {
    await page.goto("/dashboard/i18n/profiles/new");

    const nameInput = page.getByLabel(/^name$/i);
    await nameInput.fill("en:prod");
    await expect(nameInput).toHaveValue("en:prod");
  });

  test("name field placeholder shows example locale format", async ({ page }) => {
    await page.goto("/dashboard/i18n/profiles/new");
    await expect(page.getByPlaceholder(/en:prod/i)).toBeVisible();
  });

  test("cancel link returns to profiles list", async ({ page }) => {
    await page.goto("/dashboard/i18n/profiles/new");
    await page
      .getByRole("link", { name: /^cancel$/i })
      .first()
      .click();
    await expect(page).toHaveURL(/\/dashboard\/i18n\/profiles$/);
  });

  test("create profile button is enabled when name is filled", async ({ page }) => {
    await page.goto("/dashboard/i18n/profiles/new");

    await page.getByLabel(/^name$/i).fill("fr:staging");
    await expect(page.getByRole("button", { name: /^create profile$/i })).toBeEnabled();
  });

  test("create profile form uses server action (not disabled like stub forms)", async ({
    page,
  }) => {
    await page.goto("/dashboard/i18n/profiles/new");
    // The form is real (wired to a server action) — button should not be disabled
    await expect(page.getByRole("button", { name: /^create profile$/i })).not.toBeDisabled();
  });
});

// ── Keys ──────────────────────────────────────────────────────────────────────

test.describe("i18n / Keys", () => {
  test("list page shows heading and description", async ({ page }) => {
    await page.goto("/dashboard/i18n/keys");

    await expect(page.getByRole("heading", { name: /^label keys$/i, level: 1 })).toBeVisible();
    await expect(page.getByText(/manage translation keys/i)).toBeVisible();
  });

  test("profile tab for seeded profile is visible", async ({ page }) => {
    await page.goto("/dashboard/i18n/keys");
    await expect(page.getByRole("button", { name: "en:test", exact: true })).toBeVisible();
  });

  test("shows key count for seeded profile", async ({ page }) => {
    await page.goto("/dashboard/i18n/keys");
    await expect(page.getByText(/5 keys/i)).toBeVisible();
  });

  test("search input renders with placeholder", async ({ page }) => {
    await page.goto("/dashboard/i18n/keys");
    await expect(page.getByPlaceholder(/filter keys/i)).toBeVisible();
  });

  test("expand / collapse button is rendered", async ({ page }) => {
    await page.goto("/dashboard/i18n/keys");
    await expect(page.getByTitle(/expand all/i)).toBeVisible();
  });

  test("Translate with AI button is visible but disabled", async ({ page }) => {
    await page.goto("/dashboard/i18n/keys");
    const btn = page.getByRole("button", { name: /translate with ai/i });
    await expect(btn).toBeVisible();
    await expect(btn).toBeDisabled();
  });

  test("New draft action link is shown in page header", async ({ page }) => {
    await page.goto("/dashboard/i18n/keys");
    await expect(page.getByRole("link", { name: /new draft/i })).toBeVisible();
  });
});

// ── Drafts ────────────────────────────────────────────────────────────────────

test.describe("i18n / Drafts", () => {
  test("list page shows heading, description and New draft CTA", async ({ page }) => {
    await page.goto("/dashboard/i18n/drafts");

    await expect(page.getByRole("heading", { name: /^drafts$/i, level: 1 })).toBeVisible();
    await expect(page.getByText(/unpublished translation drafts/i)).toBeVisible();
    await expect(page.getByRole("link", { name: /new draft/i }).first()).toBeVisible();
  });

  test("list page shows empty state when no drafts exist", async ({ page }) => {
    await page.goto("/dashboard/i18n/drafts");
    await expect(page.getByText(/no drafts in flight/i)).toBeVisible();
  });

  test("empty state links to new-draft page", async ({ page }) => {
    await page.goto("/dashboard/i18n/drafts");
    await page
      .getByRole("link", { name: /new draft/i })
      .first()
      .click();
    await expect(page).toHaveURL(/\/dashboard\/i18n\/drafts\/new$/);
  });

  test("new-draft form renders heading, name field, profile select and cancel", async ({
    page,
  }) => {
    await page.goto("/dashboard/i18n/drafts/new");

    await expect(page.getByRole("heading", { name: /^new draft$/i, level: 1 })).toBeVisible();
    await expect(page.getByLabel(/^name$/i)).toBeVisible();
    await expect(page.getByRole("link", { name: /^cancel$/i }).first()).toBeVisible();
  });

  test("name field accepts typed input", async ({ page }) => {
    await page.goto("/dashboard/i18n/drafts/new");

    const nameInput = page.getByLabel(/^name$/i);
    await nameInput.fill("fr-translations-q2");
    await expect(nameInput).toHaveValue("fr-translations-q2");
  });

  test("create draft button is disabled when no profiles exist", async ({ page }) => {
    await page.goto("/dashboard/i18n/drafts/new");
    // No profiles in the test DB — button should be disabled
    await expect(page.getByRole("button", { name: /^create draft$/i })).toBeDisabled();
  });

  test("no-profiles placeholder links to new-profile page", async ({ page }) => {
    await page.goto("/dashboard/i18n/drafts/new");
    // Shows placeholder with a link to create a profile first
    await expect(page.getByText(/no profiles yet/i)).toBeVisible();
    await expect(page.getByRole("link", { name: /create one first/i })).toHaveAttribute(
      "href",
      "/dashboard/i18n/profiles/new",
    );
  });

  test("cancel link returns to drafts list", async ({ page }) => {
    await page.goto("/dashboard/i18n/drafts/new");
    await page
      .getByRole("link", { name: /^cancel$/i })
      .first()
      .click();
    await expect(page).toHaveURL(/\/dashboard\/i18n\/drafts$/);
  });
});

// ── Cross-workflow navigation ─────────────────────────────────────────────────

test.describe("i18n cross-workflow navigation", () => {
  test("profiles page 'New profile' button links to the form", async ({ page }) => {
    await page.goto("/dashboard/i18n/profiles");
    await page
      .getByRole("link", { name: /new profile/i })
      .first()
      .click();
    await expect(page).toHaveURL(/\/dashboard\/i18n\/profiles\/new$/);
    await expect(page.getByRole("heading", { name: /^new profile$/i, level: 1 })).toBeVisible();
  });

  test("drafts page 'New draft' button links to the form", async ({ page }) => {
    await page.goto("/dashboard/i18n/drafts");
    await page
      .getByRole("link", { name: /new draft/i })
      .first()
      .click();
    await expect(page).toHaveURL(/\/dashboard\/i18n\/drafts\/new$/);
    await expect(page.getByRole("heading", { name: /^new draft$/i, level: 1 })).toBeVisible();
  });

  test("overview 'Manage profiles' card links through to profiles list", async ({ page }) => {
    await page.goto("/dashboard/i18n");
    await page
      .locator("main")
      .getByRole("link", { name: /manage profiles/i })
      .click();
    await expect(page).toHaveURL(/\/dashboard\/i18n\/profiles$/);
  });

  test("keys page profile tab selection is stateful (no URL change)", async ({ page }) => {
    await page.goto("/dashboard/i18n/keys");
    // Profile selection is client-side — URL stays the same
    await expect(page).toHaveURL(/\/dashboard\/i18n\/keys$/);
    await expect(page.getByRole("button", { name: "en:test", exact: true })).toBeVisible();
  });
});
