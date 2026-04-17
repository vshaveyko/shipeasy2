import path from "node:path";
import { expect, test } from "@playwright/test";

const AUTH_FILE = path.join(__dirname, "../.auth/user.json");

// Unique per-run prefix so parallel/repeated runs don't collide.
const RUN = Date.now();

// ─────────────────────────────────────────────────────────────────────────────
// § 1  Keys table — smoke (seeded en:test profile with 5 keys)
// ─────────────────────────────────────────────────────────────────────────────

test.describe("i18n Keys table — smoke", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard/i18n/keys");
  });

  test("renders the page heading", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /^label keys$/i, level: 1 })).toBeVisible();
  });

  test("profile tab for seeded profile is present", async ({ page }) => {
    await expect(page.getByRole("button", { name: "en:test", exact: true })).toBeVisible();
  });

  test("shows 5 keys for seeded profile", async ({ page }) => {
    await expect(page.getByText("5 keys")).toBeVisible();
  });

  test("search / filter input renders", async ({ page }) => {
    await expect(page.getByPlaceholder(/filter keys/i)).toBeVisible();
  });

  test("Expand all button renders", async ({ page }) => {
    await expect(page.getByTitle("Expand all")).toBeVisible();
  });

  test("Translate with AI button is present and disabled", async ({ page }) => {
    const btn = page.getByRole("button", { name: /translate with ai/i });
    await expect(btn).toBeVisible();
    await expect(btn).toBeDisabled();
  });

  test("tree starts collapsed — 'Sign in' leaf is not rendered", async ({ page }) => {
    // auth.login.title value is inside a collapsed subtree; should not be in DOM yet
    await expect(page.getByText("Sign in")).not.toBeAttached();
  });

  test("root-level leaf 'simple' is always visible without expanding", async ({ page }) => {
    await expect(page.getByText("Simple value")).toBeVisible();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// § 2  Keys table — search / filter
// ─────────────────────────────────────────────────────────────────────────────

test.describe("i18n Keys table — search", () => {
  test.describe.configure({ mode: "serial" });

  test("searching 'auth' narrows count to 3 keys", async ({ page }) => {
    await page.goto("/dashboard/i18n/keys");
    await page.getByPlaceholder(/filter keys/i).fill("auth");
    await expect(page.getByText("3 keys")).toBeVisible();
  });

  test("searching 'auth' auto-expands tree and shows leaf values", async ({ page }) => {
    await page.goto("/dashboard/i18n/keys");
    await page.getByPlaceholder(/filter keys/i).fill("auth");
    await expect(page.getByText("Sign in")).toBeVisible();
    await expect(page.getByText("Welcome back")).toBeVisible();
    await expect(page.getByText("Create account")).toBeVisible();
  });

  test("searching by value 'Sign in' matches 1 key", async ({ page }) => {
    await page.goto("/dashboard/i18n/keys");
    await page.getByPlaceholder(/filter keys/i).fill("Sign in");
    await expect(page.getByText("1 key")).toBeVisible();
    await expect(page.getByText("Sign in")).toBeVisible();
  });

  test("unmatched search shows 'no keys match' message", async ({ page }) => {
    await page.goto("/dashboard/i18n/keys");
    await page.getByPlaceholder(/filter keys/i).fill("xyzzy-no-match");
    await expect(page.getByText(/no keys match/i)).toBeVisible();
  });

  test("clearing search restores all 5 keys", async ({ page }) => {
    await page.goto("/dashboard/i18n/keys");
    const input = page.getByPlaceholder(/filter keys/i);
    await input.fill("auth");
    await expect(page.getByText("3 keys")).toBeVisible();
    await input.clear();
    await expect(page.getByText("5 keys")).toBeVisible();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// § 3  Keys table — expand / collapse
// ─────────────────────────────────────────────────────────────────────────────

test.describe("i18n Keys table — expand collapse", () => {
  test("Expand all reveals all leaf values", async ({ page }) => {
    await page.goto("/dashboard/i18n/keys");
    await page.getByTitle("Expand all").click();
    await expect(page.getByText("Sign in")).toBeVisible();
    await expect(page.getByText("Welcome back")).toBeVisible();
    await expect(page.getByText("Create account")).toBeVisible();
    await expect(page.getByText("Dashboard")).toBeVisible();
  });

  test("Collapse all hides subtree values after expanding", async ({ page }) => {
    await page.goto("/dashboard/i18n/keys");
    await page.getByTitle("Expand all").click();
    await expect(page.getByText("Sign in")).toBeVisible();
    // Button text switches to "Collapse" after expand
    await page.getByTitle("Collapse all").click();
    await expect(page.getByText("Sign in")).not.toBeAttached();
  });

  test("clicking scope button toggles children", async ({ page }) => {
    await page.goto("/dashboard/i18n/keys");
    // "auth" scope has an Expand aria-label button next to it
    await page.getByRole("button", { name: "Expand", exact: true }).first().click();
    // auth's children (login, signup) appear
    await expect(page.getByRole("button", { name: "Expand", exact: true }).first()).toBeVisible();
    // Collapse again
    await page.getByRole("button", { name: "Collapse", exact: true }).first().click();
    await expect(page.getByText("Sign in")).not.toBeAttached();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// § 4  Keys table — inline editing (published values)
// ─────────────────────────────────────────────────────────────────────────────

test.describe("i18n Keys table — inline editing", () => {
  test.describe.configure({ mode: "serial" });

  // Restore the seeded value once all editing tests complete.
  test.afterAll(async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: AUTH_FILE });
    const p = await ctx.newPage();
    await p.goto("/dashboard/i18n/keys");
    await p.getByTitle("Expand all").click();
    const cell = p.getByText(`e2e-edited-${RUN}`);
    if ((await cell.count()) > 0) {
      await cell.click();
      await p.locator("textarea").fill("Sign in");
      await p.locator("textarea").press("Control+Enter");
      await expect(p.locator("textarea")).not.toBeAttached();
    }
    await ctx.close();
  });

  test("pressing Escape on open textarea cancels edit without saving", async ({ page }) => {
    await page.goto("/dashboard/i18n/keys");
    await page.getByTitle("Expand all").click();
    await page.getByText("Sign in").click();
    const textarea = page.locator("textarea");
    await expect(textarea).toBeVisible();
    await expect(textarea).toHaveValue("Sign in");
    await textarea.press("Escape");
    await expect(textarea).not.toBeAttached();
    await expect(page.getByText("Sign in")).toBeVisible();
  });

  test("Save and Cancel icon buttons appear while editing", async ({ page }) => {
    await page.goto("/dashboard/i18n/keys");
    await page.getByTitle("Expand all").click();
    await page.getByText("Sign in").click();
    await expect(page.getByRole("button", { name: /save/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /cancel/i })).toBeVisible();
    // Cancel closes edit
    await page.getByRole("button", { name: /cancel/i }).click();
    await expect(page.locator("textarea")).not.toBeAttached();
  });

  test("Ctrl+Enter saves the new value and exits edit mode", async ({ page }) => {
    const newValue = `e2e-edited-${RUN}`;
    await page.goto("/dashboard/i18n/keys");
    await page.getByTitle("Expand all").click();
    await page.getByText("Sign in").click();
    await page.locator("textarea").fill(newValue);
    await page.locator("textarea").press("Control+Enter");
    await expect(page.locator("textarea")).not.toBeAttached();
    await expect(page.getByText(newValue)).toBeVisible();
  });

  test("saved value persists after a full page reload", async ({ page }) => {
    const newValue = `e2e-edited-${RUN}`;
    await page.goto("/dashboard/i18n/keys");
    await page.getByTitle("Expand all").click();
    await expect(page.getByText(newValue)).toBeVisible();
  });

  test("clicking Save button also commits the edit", async ({ page }) => {
    // Restore to "Sign in" via Save button (undoes the afterAll restoration for isolation)
    const current = `e2e-edited-${RUN}`;
    await page.goto("/dashboard/i18n/keys");
    await page.getByTitle("Expand all").click();
    await page.getByText(current).click();
    await page.locator("textarea").fill("Sign in");
    await page.getByRole("button", { name: /save/i }).click();
    await expect(page.locator("textarea")).not.toBeAttached();
    await expect(page.getByText("Sign in")).toBeVisible();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// § 5  Draft workflow — create → translate → abandon
// ─────────────────────────────────────────────────────────────────────────────

test.describe("i18n Keys table — draft workflow", () => {
  test.describe.configure({ mode: "serial" });

  const dName = `e2e-${RUN}-keys-draft`;

  // Create the draft before any draft tests run.
  test.beforeAll(async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: AUTH_FILE });
    const p = await ctx.newPage();
    await p.goto("/dashboard/i18n/drafts/new");
    await p.getByLabel(/^name$/i).fill(dName);
    await p.locator("#draft-profile").selectOption({ label: "en:test" });
    await p.getByRole("button", { name: /^create draft$/i }).click();
    await expect(p).toHaveURL(/\/dashboard\/i18n\/drafts$/);
    await ctx.close();
  });

  // Abandon then delete the draft after all draft tests finish.
  test.afterAll(async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: AUTH_FILE });
    const p = await ctx.newPage();
    await p.goto("/dashboard/i18n/drafts");
    const row = p.getByRole("row").filter({ hasText: dName });
    const abandonBtn = row.getByRole("button", { name: /^abandon$/i });
    if ((await abandonBtn.count()) > 0) await abandonBtn.click();
    const deleteBtn = p.getByRole("button", {
      name: new RegExp(`delete draft ${dName}`, "i"),
    });
    if ((await deleteBtn.count()) > 0) await deleteBtn.click();
    await ctx.close();
  });

  test("draft dropdown appears on keys page for the profile", async ({ page }) => {
    await page.goto("/dashboard/i18n/keys");
    // The draft select is only shown when open drafts exist for the selected profile
    const draftSelect = page.locator("select").filter({ hasText: dName });
    await expect(draftSelect).toBeVisible();
  });

  test("selecting draft shows 'ref' label and translate placeholder for leaves", async ({
    page,
  }) => {
    await page.goto("/dashboard/i18n/keys");
    await page.locator("select").selectOption({ label: dName });
    // Expand all to see leaf rows in draft mode
    await page.getByTitle("Expand all").click();
    // "ref" labels appear in each leaf row
    await expect(page.getByText("ref").first()).toBeVisible();
    // Placeholder for un-translated keys
    await expect(page.getByText(/click to translate/i).first()).toBeVisible();
  });

  test("published ref value is shown above the draft input area", async ({ page }) => {
    await page.goto("/dashboard/i18n/keys");
    await page.locator("select").selectOption({ label: dName });
    await page.getByTitle("Expand all").click();
    // The published value "Sign in" should appear as the ref
    await expect(page.getByText("Sign in")).toBeVisible();
  });

  test("clicking translate placeholder opens a textarea", async ({ page }) => {
    await page.goto("/dashboard/i18n/keys");
    await page.locator("select").selectOption({ label: dName });
    await page.getByTitle("Expand all").click();
    await page
      .getByText(/click to translate/i)
      .first()
      .click();
    await expect(page.locator("textarea")).toBeVisible();
  });

  test("Escape cancels draft edit without saving", async ({ page }) => {
    await page.goto("/dashboard/i18n/keys");
    await page.locator("select").selectOption({ label: dName });
    await page.getByTitle("Expand all").click();
    await page
      .getByText(/click to translate/i)
      .first()
      .click();
    await page.locator("textarea").fill("Connexion");
    await page.locator("textarea").press("Escape");
    await expect(page.locator("textarea")).not.toBeAttached();
    await expect(page.getByText("Connexion")).not.toBeAttached();
  });

  test("saving a draft translation shows the translated value", async ({ page }) => {
    await page.goto("/dashboard/i18n/keys");
    await page.locator("select").selectOption({ label: dName });
    await page.getByTitle("Expand all").click();
    await page
      .getByText(/click to translate/i)
      .first()
      .click();
    await page.locator("textarea").fill("Connexion");
    await page.locator("textarea").press("Control+Enter");
    await expect(page.locator("textarea")).not.toBeAttached();
    await expect(page.getByText("Connexion")).toBeVisible();
  });

  test("amber dot indicator appears on a key that has a draft translation", async ({ page }) => {
    await page.goto("/dashboard/i18n/keys");
    await page.locator("select").selectOption({ label: dName });
    await page.getByTitle("Expand all").click();
    // The amber dot has title="Draft value exists"
    await expect(page.locator('[title="Draft value exists"]').first()).toBeVisible();
  });

  test("switching back to Published hides the draft UI and amber dot", async ({ page }) => {
    await page.goto("/dashboard/i18n/keys");
    await page.locator("select").selectOption({ label: dName });
    await page.getByTitle("Expand all").click();
    // Switch back to published
    await page.locator("select").selectOption({ label: "Published" });
    await expect(page.getByText(/click to translate/i)).not.toBeAttached();
    await expect(page.locator('[title="Draft value exists"]')).not.toBeAttached();
    // Values now shown in plain edit mode (no "ref" prefix)
    await expect(page.getByText("ref")).not.toBeAttached();
  });

  test("abandoning the draft removes it from the dropdown", async ({ page }) => {
    // Abandon via the drafts list page
    await page.goto("/dashboard/i18n/drafts");
    const row = page.getByRole("row").filter({ hasText: dName });
    await row.getByRole("button", { name: /^abandon$/i }).click();
    await expect(page).toHaveURL(/\/dashboard\/i18n\/drafts$/);

    // Now visit keys page — draft dropdown should not contain the draft
    await page.goto("/dashboard/i18n/keys");
    const draftSelect = page.locator("select").filter({ hasText: dName });
    await expect(draftSelect).toHaveCount(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// § 6  Full i18n workflow — profile lifecycle + draft lifecycle
// ─────────────────────────────────────────────────────────────────────────────

test.describe("i18n full workflow", () => {
  test.describe.configure({ mode: "serial" });

  const pName = `fr:e2e${RUN}`;
  const dName = `e2e-${RUN}-flow-draft`;

  // Best-effort cleanup: delete the profile (cascades to chunks/keys/drafts).
  test.afterAll(async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: AUTH_FILE });
    const p = await ctx.newPage();
    await p.goto("/dashboard/i18n/profiles");
    const btn = p.getByRole("button", { name: new RegExp(`delete profile ${pName}`, "i") });
    if ((await btn.count()) > 0) await btn.click();
    await ctx.close();
  });

  test("create new profile → appears as a tab on the keys page", async ({ page }) => {
    await page.goto("/dashboard/i18n/profiles/new");
    await page.getByLabel(/^name$/i).fill(pName);
    await page.getByRole("button", { name: /^create profile$/i }).click();
    await expect(page).toHaveURL(/\/dashboard\/i18n\/profiles$/);

    await page.goto("/dashboard/i18n/keys");
    await expect(page.getByRole("button", { name: pName, exact: true })).toBeVisible();
  });

  test("clicking new profile tab shows 'no keys for this profile'", async ({ page }) => {
    await page.goto("/dashboard/i18n/keys");
    await page.getByRole("button", { name: pName, exact: true }).click();
    await expect(page.getByText(/no keys for this profile/i)).toBeVisible();
  });

  test("new profile tab shows 0 keys count", async ({ page }) => {
    await page.goto("/dashboard/i18n/keys");
    await page.getByRole("button", { name: pName, exact: true }).click();
    await expect(page.getByText("0 keys")).toBeVisible();
  });

  test("create draft for new profile → draft appears in dropdown on keys page", async ({
    page,
  }) => {
    await page.goto("/dashboard/i18n/drafts/new");
    await page.getByLabel(/^name$/i).fill(dName);
    await page.locator("#draft-profile").selectOption({ label: pName });
    await page.getByRole("button", { name: /^create draft$/i }).click();
    await expect(page).toHaveURL(/\/dashboard\/i18n\/drafts$/);

    await page.goto("/dashboard/i18n/keys");
    await page.getByRole("button", { name: pName, exact: true }).click();
    const draftSelect = page.locator("select").filter({ hasText: dName });
    await expect(draftSelect).toBeVisible();
  });

  test("draft row in drafts list shows correct profile name and Open status", async ({ page }) => {
    await page.goto("/dashboard/i18n/drafts");
    const row = page.getByRole("row").filter({ hasText: dName });
    await expect(row.getByText(pName)).toBeVisible();
    await expect(row.getByText(/^open$/i).first()).toBeVisible();
  });

  test("abandon draft → no longer shown in keys page dropdown", async ({ page }) => {
    await page.goto("/dashboard/i18n/drafts");
    await page
      .getByRole("row")
      .filter({ hasText: dName })
      .getByRole("button", { name: /^abandon$/i })
      .click();
    await expect(page).toHaveURL(/\/dashboard\/i18n\/drafts$/);

    await page.goto("/dashboard/i18n/keys");
    await page.getByRole("button", { name: pName, exact: true }).click();
    // No open drafts remain → dropdown should not be rendered
    await expect(page.locator("select").filter({ hasText: dName })).toHaveCount(0);
  });

  test("delete profile → its tab disappears from the keys page", async ({ page }) => {
    await page.goto("/dashboard/i18n/profiles");
    await page.getByRole("button", { name: new RegExp(`delete profile ${pName}`, "i") }).click();
    await expect(page).toHaveURL(/\/dashboard\/i18n\/profiles$/);

    await page.goto("/dashboard/i18n/keys");
    await expect(page.getByRole("button", { name: pName, exact: true })).not.toBeAttached();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// § 7  Keys CRUD in the context of profiles
// ─────────────────────────────────────────────────────────────────────────────

test.describe("i18n Profiles CRUD — keys page integration", () => {
  test.describe.configure({ mode: "serial" });

  const pName = `de:e2e${RUN}`;

  test.afterAll(async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: AUTH_FILE });
    const p = await ctx.newPage();
    await p.goto("/dashboard/i18n/profiles");
    const btn = p.getByRole("button", { name: new RegExp(`delete profile ${pName}`, "i") });
    if ((await btn.count()) > 0) await btn.click();
    await ctx.close();
  });

  test("newly created profile shows in profiles list with 0 keys", async ({ page }) => {
    await page.goto("/dashboard/i18n/profiles/new");
    await page.getByLabel(/^name$/i).fill(pName);
    await page.getByRole("button", { name: /^create profile$/i }).click();
    await expect(page).toHaveURL(/\/dashboard\/i18n\/profiles$/);
    const row = page.getByRole("row").filter({ hasText: pName });
    await expect(row.getByRole("cell", { name: "0", exact: true })).toBeVisible();
  });

  test("Browse keys link from profiles table opens keys page with that profile active", async ({
    page,
  }) => {
    await page.goto("/dashboard/i18n/profiles");
    const row = page.getByRole("row").filter({ hasText: pName });
    await row.getByRole("link", { name: /browse keys/i }).click();
    await expect(page).toHaveURL(/\/dashboard\/i18n\/keys/);
    await expect(page.getByRole("heading", { name: /^label keys$/i, level: 1 })).toBeVisible();
  });

  test("delete profile removes it from the profiles list", async ({ page }) => {
    await page.goto("/dashboard/i18n/profiles");
    await page.getByRole("button", { name: new RegExp(`delete profile ${pName}`, "i") }).click();
    await expect(page).toHaveURL(/\/dashboard\/i18n\/profiles$/);
    await expect(page.getByRole("cell", { name: pName, exact: true })).not.toBeVisible();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// § 8  Draft list CRUD — full lifecycle (create → abandon → delete)
// ─────────────────────────────────────────────────────────────────────────────

test.describe("i18n Drafts — full lifecycle", () => {
  test.describe.configure({ mode: "serial" });

  const pName = `e2e-${RUN}-lc-p`;
  const dName = `e2e-${RUN}-lc-d`;

  test.beforeAll(async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: AUTH_FILE });
    const p = await ctx.newPage();
    await p.goto("/dashboard/i18n/profiles/new");
    await p.getByLabel(/^name$/i).fill(pName);
    await p.getByRole("button", { name: /^create profile$/i }).click();
    await expect(p).toHaveURL(/\/dashboard\/i18n\/profiles$/);
    await ctx.close();
  });

  test.afterAll(async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: AUTH_FILE });
    const p = await ctx.newPage();
    await p.goto("/dashboard/i18n/profiles");
    const btn = p.getByRole("button", { name: new RegExp(`delete profile ${pName}`, "i") });
    if ((await btn.count()) > 0) await btn.click();
    await ctx.close();
  });

  test("create draft → appears in list with Open status and correct profile", async ({ page }) => {
    await page.goto("/dashboard/i18n/drafts/new");
    await page.getByLabel(/^name$/i).fill(dName);
    await page.locator("#draft-profile").selectOption({ label: pName });
    await page.getByRole("button", { name: /^create draft$/i }).click();
    await expect(page).toHaveURL(/\/dashboard\/i18n\/drafts$/);
    const row = page.getByRole("row").filter({ hasText: dName });
    await expect(row.getByText(/^open$/i).first()).toBeVisible();
    await expect(row.getByText(pName)).toBeVisible();
  });

  test("draft row shows creator email", async ({ page }) => {
    await page.goto("/dashboard/i18n/drafts");
    const row = page.getByRole("row").filter({ hasText: dName });
    await expect(row.getByText(/e2e@shipeasy\.test/i)).toBeVisible();
  });

  test("abandon draft → status badge changes to Abandoned, Abandon button disappears", async ({
    page,
  }) => {
    await page.goto("/dashboard/i18n/drafts");
    const row = page.getByRole("row").filter({ hasText: dName });
    await row.getByRole("button", { name: /^abandon$/i }).click();
    await expect(page).toHaveURL(/\/dashboard\/i18n\/drafts$/);
    const updated = page.getByRole("row").filter({ hasText: dName });
    await expect(updated.getByText(/^abandoned$/i).first()).toBeVisible();
    await expect(updated.getByRole("button", { name: /^abandon$/i })).not.toBeVisible();
  });

  test("delete button appears for abandoned draft", async ({ page }) => {
    await page.goto("/dashboard/i18n/drafts");
    await expect(
      page.getByRole("button", { name: new RegExp(`delete draft ${dName}`, "i") }),
    ).toBeVisible();
  });

  test("delete abandoned draft → removed from list", async ({ page }) => {
    await page.goto("/dashboard/i18n/drafts");
    await page.getByRole("button", { name: new RegExp(`delete draft ${dName}`, "i") }).click();
    await expect(page).toHaveURL(/\/dashboard\/i18n\/drafts$/);
    await expect(page.getByRole("row").filter({ hasText: dName })).toHaveCount(0);
  });
});
