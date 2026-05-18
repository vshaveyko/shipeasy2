import { expect, test, type Page } from "@playwright/test";

import { setProjectPlan } from "../seed-fixtures";

// Free plan caps configs at 1; this spec creates configs + killswitches.
test.beforeAll(() => setProjectPlan("paid"));
test.afterAll(() => setProjectPlan("free"));

/**
 * End-to-end coverage for the shared IntegrationSnippetDialog.
 *
 * For every entity kind that exposes the row-level snippet trigger
 * (gates, experiments, configs, killswitches, translations) this spec:
 *   1. seeds an entity via the admin API,
 *   2. opens the entity's list page,
 *   3. clicks the row's `[data-integration-trigger]` button,
 *   4. asserts the dialog opens with the right kind, name, and a
 *      sensible default snippet,
 *   5. switches languages and re-checks the body,
 *   6. tears the entity down.
 */

const RUN = Date.now();
const PROJECT = "e2e-project-id";

interface KindSpec {
  kind: "gate" | "experiment" | "config" | "killswitch" | "translation";
  /** URL of the page that lists the entity. */
  pagePath: string;
  /** Heading the dialog should render. */
  dialogHeading: RegExp;
  /** Substring expected in the default-language (TS) snippet. */
  defaultSnippetContains: string;
  /** Language to switch to + substring expected after switch. */
  altLang: { id: string; contains: string };
  /** Pre-test setup: seed the entity. Returns the row's display name. */
  seed: (page: Page) => Promise<{ name: string; cleanup: () => Promise<void> }>;
  /** Optional extra step to expose the row (e.g., open profile in i18n). */
  prepareRow?: (page: Page, name: string) => Promise<void>;
}

async function deleteSafe(page: Page, url: string): Promise<void> {
  await page.request.delete(url).catch(() => {});
}

async function seedGate(page: Page, name: string): Promise<string> {
  // Schema expects snake_case `rollout_pct` and parses booleans for `enabled`.
  // Unknown camelCase keys would be stripped silently; use the canonical shape.
  const resp = await page.request.post("/api/admin/gates", {
    data: { name, rollout_pct: 0, rules: [], enabled: false },
  });
  expect(resp.ok(), await resp.text()).toBe(true);
  return ((await resp.json()) as { id: string }).id;
}

async function seedExperiment(page: Page, name: string): Promise<string> {
  const resp = await page.request.post("/api/admin/experiments", {
    data: {
      name,
      universe: "default",
      allocation_pct: 10000,
      groups: [
        { name: "control", weight: 5000 },
        { name: "test", weight: 5000 },
      ],
    },
  });
  expect(resp.ok(), await resp.text()).toBe(true);
  return ((await resp.json()) as { id: string }).id;
}

async function seedConfig(page: Page, name: string): Promise<string> {
  const resp = await page.request.post("/api/admin/configs", {
    data: {
      name,
      schema: { type: "object", properties: { value: { type: "string" } } },
      value: { value: "hi" },
    },
  });
  expect(resp.ok(), await resp.text()).toBe(true);
  return ((await resp.json()) as { id: string }).id;
}

async function seedKillswitch(page: Page, name: string): Promise<string> {
  const resp = await page.request.post("/api/admin/killswitches", {
    data: { name, value: false },
  });
  expect(resp.ok(), await resp.text()).toBe(true);
  return ((await resp.json()) as { id: string }).id;
}

async function seedTranslationProfile(
  page: Page,
  profileName: string,
  key: string,
): Promise<string> {
  const profileResp = await page.request.post("/api/admin/i18n/profiles", {
    data: { name: profileName },
  });
  expect(profileResp.status(), await profileResp.text()).toBe(201);
  const profileId = ((await profileResp.json()) as { id: string }).id;

  const pushResp = await page.request.post("/api/admin/i18n/keys", {
    data: {
      profile_id: profileId,
      chunk: "default",
      keys: [{ key, value: "Hello" }],
    },
  });
  expect(pushResp.status(), await pushResp.text()).toBe(201);
  return profileId;
}

const KINDS: KindSpec[] = [
  {
    kind: "gate",
    pagePath: `/dashboard/${PROJECT}/gates`,
    dialogHeading: /integrate this gate/i,
    defaultSnippetContains: "@shipeasy/sdk/server",
    altLang: { id: "python", contains: "from shipeasy import Shipeasy" },
    seed: async (page) => {
      const name = `e2e_snip_gate_${RUN}`;
      const id = await seedGate(page, name);
      return { name, cleanup: () => deleteSafe(page, `/api/admin/gates/${id}`) };
    },
  },
  {
    kind: "experiment",
    pagePath: `/dashboard/${PROJECT}/experiments`,
    dialogHeading: /integrate this experiment/i,
    defaultSnippetContains: "flags.getExperiment",
    altLang: { id: "go", contains: "GetExperiment" },
    seed: async (page) => {
      const name = `e2e_snip_exp_${RUN}`;
      const id = await seedExperiment(page, name);
      return { name, cleanup: () => deleteSafe(page, `/api/admin/experiments/${id}`) };
    },
  },
  {
    kind: "config",
    pagePath: `/dashboard/${PROJECT}/configs/values`,
    dialogHeading: /integrate this config/i,
    defaultSnippetContains: "flags.getConfig",
    altLang: { id: "curl", contains: "api.shipeasy.ai/sdk/config/" },
    seed: async (page) => {
      const name = `e2e_snip.cfg_${RUN}`;
      const id = await seedConfig(page, name);
      return { name, cleanup: () => deleteSafe(page, `/api/admin/configs/${id}`) };
    },
  },
  {
    kind: "killswitch",
    pagePath: `/dashboard/${PROJECT}/killswitches`,
    dialogHeading: /integrate this killswitch/i,
    defaultSnippetContains: "@shipeasy/sdk/client",
    altLang: { id: "python", contains: "get_killswitch" },
    seed: async (page) => {
      const name = `e2e_snip.ks_${RUN}`;
      const id = await seedKillswitch(page, name);
      return { name, cleanup: () => deleteSafe(page, `/api/admin/killswitches/${id}`) };
    },
  },
  {
    kind: "translation",
    pagePath: `/dashboard/${PROJECT}/i18n/keys`,
    dialogHeading: /use this translation key/i,
    defaultSnippetContains: "@shipeasy/sdk/client",
    altLang: { id: "curl", contains: "api.shipeasy.ai/sdk/i18n/" },
    seed: async (page) => {
      const profileName = `e2e_snip_i18n_${RUN}`;
      const key = `e2e_snip.greeting_${RUN}`;
      const profileId = await seedTranslationProfile(page, profileName, key);
      return {
        name: key,
        cleanup: () => deleteSafe(page, `/api/admin/i18n/profiles/${profileId}`),
      };
    },
    prepareRow: async (page, _name) => {
      // Tabs are profile-named — switch to the seeded profile so its keys show.
      const profileTab = page
        .getByRole("tab", { name: new RegExp(`e2e_snip_i18n_${RUN}`) })
        .first();
      if (await profileTab.count()) {
        await profileTab.click();
      }
      // Wait for the table header that appears once a profile loads.
      await expect(page.getByLabel("Select all visible keys")).toBeVisible();
    },
  },
];

for (const k of KINDS) {
  test.describe(`Integration snippet — ${k.kind}`, () => {
    test.describe.configure({ mode: "serial" });

    let entityName = "";
    let cleanup: (() => Promise<void>) | null = null;

    test.beforeAll(async ({ browser }) => {
      const ctx = await browser.newContext({ storageState: "e2e/.auth/user.json" });
      const page = await ctx.newPage();
      const seeded = await k.seed(page);
      entityName = seeded.name;
      cleanup = seeded.cleanup;
      await ctx.close();
    });

    test.afterAll(async () => {
      if (cleanup) await cleanup();
    });

    test(`opens the snippet dialog from the ${k.kind} list`, async ({ page }) => {
      await page.goto(k.pagePath);
      if (k.prepareRow) await k.prepareRow(page, entityName);

      // The trigger surfaces as `[data-integration-trigger="<kind>"]` on each
      // row. Hover-revealed buttons (configs, i18n) become visible/clickable
      // when the row is in view; force-click bypasses opacity-0 hover gating.
      const trigger = page
        .locator(`[data-integration-trigger="${k.kind}"]`)
        .filter({ hasText: "" })
        .first();
      await trigger.waitFor({ state: "attached" });
      await trigger.click({ force: true });

      const dialog = page.locator(`[data-integration-dialog="${k.kind}"]`);
      await expect(dialog).toBeVisible();
      await expect(dialog.getByRole("heading", { name: k.dialogHeading })).toBeVisible();
      await expect(dialog).toContainText(entityName);
      await expect(dialog.locator("pre")).toContainText(k.defaultSnippetContains);
    });

    test(`language switcher swaps the ${k.kind} snippet body`, async ({ page }) => {
      await page.goto(k.pagePath);
      if (k.prepareRow) await k.prepareRow(page, entityName);

      const trigger = page.locator(`[data-integration-trigger="${k.kind}"]`).first();
      await trigger.waitFor({ state: "attached" });
      await trigger.click({ force: true });

      const dialog = page.locator(`[data-integration-dialog="${k.kind}"]`);
      await dialog.locator(`[data-lang="${k.altLang.id}"]`).click();
      await expect(dialog.locator("pre")).toContainText(k.altLang.contains);
    });
  });
}
