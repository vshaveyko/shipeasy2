import { expect, test } from "@playwright/test";

/**
 * End-to-end for bulk-delete on the i18n keys table. Isolated from the shared
 * `en:test` seed so deletions don't clobber other specs: creates its own
 * profile, pushes a small fixture tree via the admin API, then drives the UI.
 *
 * NOTE: this spec deliberately avoids any copy that flows through `t("…")`
 * (e.g. "Expand all", "filter keys", "5 keys") — the app does not yet wrap
 * with `ShipEasyI18nProvider`, so those strings render as raw keys. Only
 * plain-English aria-labels I control are used as selectors.
 */

const RUN = Date.now();

test.describe("i18n keys — bulk selection + delete", () => {
  test.describe.configure({ mode: "serial" });

  const profileName = `bulk:e2e${RUN}`;
  let profileId = "";

  test.beforeAll(async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: "e2e/.auth/user.json" });
    const page = await ctx.newPage();

    const createRes = await page.request.post("/api/admin/i18n/profiles", {
      data: { name: profileName },
    });
    expect(createRes.status(), await createRes.text()).toBe(201);
    const created = (await createRes.json()) as { id: string };
    profileId = created.id;

    // Fixture tree: two subtrees of 2 leaves each + one standalone leaf.
    const pushRes = await page.request.post("/api/admin/i18n/keys", {
      data: {
        profile_id: profileId,
        chunk: "default",
        keys: [
          { key: "bulk.one.alpha", value: "Alpha" },
          { key: "bulk.one.beta", value: "Beta" },
          { key: "bulk.two.gamma", value: "Gamma" },
          { key: "bulk.two.delta", value: "Delta" },
          { key: "bulk.standalone", value: "Standalone" },
        ],
      },
    });
    expect(pushRes.status(), await pushRes.text()).toBe(201);

    await ctx.close();
  });

  test.afterAll(async ({ browser }) => {
    if (!profileId) return;
    const ctx = await browser.newContext({ storageState: "e2e/.auth/user.json" });
    const page = await ctx.newPage();
    await page.request.delete(`/api/admin/i18n/profiles/${profileId}`);
    await ctx.close();
  });

  /** Load the keys page, switch to our fixture profile, expand the tree. */
  async function openProfile(page: import("@playwright/test").Page) {
    await page.goto("/dashboard/i18n/keys");
    await page.getByRole("button", { name: profileName, exact: true }).click();
    // Wait for table header — appears once sections load from the API.
    await expect(page.getByLabel("Select all visible keys")).toBeVisible();
    // Each expand chevron click may trigger a lazy fetch. Wait for network
    // idle after each click so the loaded sub-tree is rendered before we look
    // for the next set of chevrons. Four passes covers a 2-level tree.
    for (let i = 0; i < 4; i++) {
      const folderChevrons = page.locator('button[aria-label="Expand"]');
      if ((await folderChevrons.count()) === 0) break;
      await folderChevrons.nth(0).click();
      await page.waitForLoadState("networkidle");
    }
  }

  test("bulk actions bar is hidden when nothing is selected", async ({ page }) => {
    await openProfile(page);
    await expect(page.getByText(/\d+ selected/)).not.toBeAttached();
  });

  test("checking one leaf shows the bar with '1 selected'", async ({ page }) => {
    await openProfile(page);
    await page.getByLabel("Select key bulk.standalone").check();
    await expect(page.getByText("1 selected")).toBeVisible();
  });

  test("'Clear' button removes the selection and hides the bar", async ({ page }) => {
    await openProfile(page);
    await page.getByLabel("Select key bulk.standalone").check();
    await expect(page.getByText("1 selected")).toBeVisible();
    await page.getByLabel("Clear selection").click();
    await expect(page.getByText(/\d+ selected/)).not.toBeAttached();
    await expect(page.getByLabel("Select key bulk.standalone")).not.toBeChecked();
  });

  test("select-all header checkbox selects every visible leaf", async ({ page }) => {
    await openProfile(page);
    await page.getByLabel("Select all visible keys").check();
    await expect(page.getByText("5 selected")).toBeVisible();
  });

  test("folder checkbox toggles all descendants", async ({ page }) => {
    await openProfile(page);
    await page.getByLabel("Select subtree bulk.one").check();
    await expect(page.getByText("2 selected")).toBeVisible();
    await expect(page.getByLabel("Select key bulk.one.alpha")).toBeChecked();
    await expect(page.getByLabel("Select key bulk.one.beta")).toBeChecked();
    await expect(page.getByLabel("Select key bulk.two.gamma")).not.toBeChecked();
  });

  test("folder checkbox is indeterminate when only some descendants are selected", async ({
    page,
  }) => {
    await openProfile(page);
    await page.getByLabel("Select key bulk.one.alpha").check();
    const folderCb = page.getByLabel("Select subtree bulk.one");
    // indeterminate is a DOM property, not an attribute — read it directly.
    await expect
      .poll(async () => await folderCb.evaluate((el: HTMLInputElement) => el.indeterminate))
      .toBe(true);
  });

  test("dismissing the confirm dialog aborts the delete", async ({ page }) => {
    await openProfile(page);
    await page.getByLabel("Select key bulk.standalone").check();
    await expect(page.getByText("1 selected")).toBeVisible();

    page.once("dialog", (dialog) => dialog.dismiss());
    await page.getByRole("button", { name: "Delete", exact: true }).click();

    // Key still exists and selection preserved.
    await expect(page.getByLabel("Select key bulk.standalone")).toBeVisible();
    await expect(page.getByText("1 selected")).toBeVisible();
  });

  // Runs last — mutates server state.
  test("bulk-delete a subtree removes all of its leaves, leaves the rest", async ({ page }) => {
    await openProfile(page);
    // Confirm fixture state before the mutation.
    await expect(page.getByLabel("Select key bulk.two.gamma")).toBeVisible();
    await expect(page.getByLabel("Select key bulk.two.delta")).toBeVisible();

    await page.getByLabel("Select subtree bulk.two").check();
    await expect(page.getByText("2 selected")).toBeVisible();

    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "Delete", exact: true }).click();

    // Bar clears.
    await expect(page.getByText(/\d+ selected/)).not.toBeAttached();

    // The two deleted leaves are gone.
    await expect(page.getByLabel("Select key bulk.two.gamma")).not.toBeAttached();
    await expect(page.getByLabel("Select key bulk.two.delta")).not.toBeAttached();

    // Others remain.
    await expect(page.getByLabel("Select key bulk.one.alpha")).toBeVisible();
    await expect(page.getByLabel("Select key bulk.one.beta")).toBeVisible();
    await expect(page.getByLabel("Select key bulk.standalone")).toBeVisible();
  });
});
