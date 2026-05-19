/**
 * Full-field killswitch wizard run. Fills every input on every step, advances
 * through Details → Scope & fallback → Integrate, submits, then verifies the
 * row exists in the admin API with the exact fields submitted.
 */
import { expect, test } from "@playwright/test";
import { adminList } from "../admin-list";
import { setProjectPlan } from "../seed-fixtures";

const PROJECT = "e2e-project-id";
const RUN = Date.now();

type KsRow = {
  id: string;
  name: string;
  description: string | null;
  envs: Partial<
    Record<
      "dev" | "staging" | "prod",
      { value: boolean; switches?: Record<string, boolean>; version: number }
    >
  >;
};

test.beforeAll(() => setProjectPlan("paid"));
test.afterAll(() => setProjectPlan("free"));

test("Killswitch wizard — fill every field, submit, row appears with full state", async ({
  page,
}) => {
  const folder = "e2e_ks";
  const leaf = `full_${RUN}`;
  const fullName = `${folder}.${leaf}`;
  const description = "Full-fill spec — folder routing + 3 named switches";

  await page.goto(`/dashboard/${PROJECT}/killswitches?new=1`);
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();

  // Stem reflects kind + step 1 of 3.
  await expect(dialog.getByText(/Step 1 of 3 · killswitch/i)).toBeVisible();
  await expect(dialog.locator('[data-slot="dialog-title"]')).toHaveText("Identify the killswitch");

  // Step 1 — Details: folder, name, description.
  await dialog.getByLabel("Folder").fill(folder);
  await dialog.getByLabel("Name").fill(leaf);
  await dialog.getByLabel("Description").fill(description);

  // Aside shows the full key preview.
  await expect(dialog.getByText(fullName)).toBeVisible();

  await dialog.getByRole("button", { name: /^next/i }).click();

  // Step 2 — Scope & fallback.
  await expect(dialog.locator('[data-slot="dialog-title"]')).toHaveText("Scope & fallback");
  await expect(dialog.getByText(/Step 2 of 3 · killswitch/i)).toBeVisible();

  // Flip default ON — accessible name stays "Default value"; verify via aria-pressed.
  const defaultToggle = dialog.getByRole("button", { name: "Default value" });
  await defaultToggle.click();
  await expect(defaultToggle).toHaveAttribute("aria-pressed", "true");

  // Add 3 named switches — eu_only ON, internal OFF, vip ON.
  const switches: Array<{ key: string; on: boolean }> = [
    { key: "eu_only", on: true },
    { key: "internal", on: false },
    { key: "vip", on: true },
  ];
  for (let i = 0; i < switches.length; i += 1) {
    await dialog.getByRole("button", { name: /add switch/i }).click();
    const row = i + 1;
    await dialog.getByLabel(new RegExp(`^Switch key ${row}$`)).fill(switches[i].key);
    if (!switches[i].on) {
      // New switch defaults to ON — flip to OFF for `internal`.
      await dialog
        .getByRole("button", { name: new RegExp(`Switch value for ${switches[i].key}`, "i") })
        .click();
    }
  }

  await dialog.getByRole("button", { name: /^next/i }).click();

  // Step 3 — Integrate.
  await expect(dialog.locator('[data-slot="dialog-title"]')).toHaveText("Wire it up");
  await expect(dialog.getByText(/Step 3 of 3 · killswitch/i)).toBeVisible();

  // SDK tabs present, default TypeScript snippet contains the full key.
  await expect(dialog.getByRole("tab", { name: /typescript/i })).toBeVisible();
  await expect(dialog.getByRole("tab", { name: /python/i })).toBeVisible();
  await expect(dialog.getByRole("tab", { name: /^go$/i })).toBeVisible();
  await expect(dialog.getByRole("tab", { name: /curl/i })).toBeVisible();
  await expect(dialog.locator('pre[data-slot="code-block"]')).toContainText(fullName);

  // Canonical submit CTA.
  await dialog.getByRole("button", { name: /arm killswitch/i }).click();
  await expect(dialog).toHaveCount(0, { timeout: 5000 });

  // Verify in admin API.
  const list = await adminList<KsRow>(page.request, "/api/admin/killswitches");
  const row = list.find((r) => r.name === fullName);
  expect(row).toBeDefined();
  expect(row?.description).toBe(description);
  expect(row?.envs.prod?.value).toBe(true);
  expect(row?.envs.prod?.switches).toEqual({
    eu_only: true,
    internal: false,
    vip: true,
  });
});
