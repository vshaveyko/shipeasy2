/**
 * Full-field gate wizard run. Fills the key, walks Details → Targeting →
 * Preview → Integrate, picks a stack template, submits, asserts redirect to
 * the editor and row in admin API.
 */
import { expect, test } from "@playwright/test";
import { adminList } from "../admin-list";

const PROJECT = "e2e-project-id";
const RUN = Date.now();

type GateRow = { id: string; name: string };

test("Gate wizard — fill every field, submit, redirect to editor", async ({ page }) => {
  const key = `e2e_gate_full_${RUN}`;

  await page.goto(`/dashboard/${PROJECT}/gates?new=1`);
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();

  // Stem.
  await expect(dialog.getByText(/Step 1 of 4 · gate/i)).toBeVisible();
  await expect(dialog.locator('[data-slot="dialog-title"]')).toHaveText("Identify the gate");

  // Step 1 — Details (only `key` is editable in the wizard; description /
  // owner / folder are set in the editor after create).
  await dialog.locator("#new-gate-key").fill(key);
  await dialog.getByRole("button", { name: /^next/i }).click();

  // Step 2 — Targeting (gate stack editor). Skip with default empty stack +
  // public floor at 0%.
  await expect(dialog.locator('[data-slot="dialog-title"]')).toHaveText("Compose the gate stack");
  await expect(dialog.getByText(/Step 2 of 4 · gate/i)).toBeVisible();
  // Public floor row is rendered + locked.
  await expect(dialog.getByText(/locked floor/i).first()).toBeVisible();
  await dialog.getByRole("button", { name: /^next/i }).click();

  // Step 3 — Preview.
  await expect(dialog.locator('[data-slot="dialog-title"]')).toHaveText("Test against a fixture");
  await expect(dialog.getByText(/Step 3 of 4 · gate/i)).toBeVisible();
  // Key echoed verbatim.
  await expect(dialog.getByText(key, { exact: false }).first()).toBeVisible();
  // Aside SDK snippet uses the chosen key.
  await expect(dialog.locator("pre").filter({ hasText: "shipeasy.gate" }).first()).toContainText(
    key,
  );
  await dialog.getByRole("button", { name: /^next/i }).click();

  // Step 4 — Integrate.
  await expect(dialog.locator('[data-slot="dialog-title"]')).toHaveText("Wire it up");
  await expect(dialog.getByText(/Step 4 of 4 · gate/i)).toBeVisible();
  await expect(dialog.getByRole("tab", { name: /typescript/i })).toBeVisible();
  await expect(dialog.getByRole("tab", { name: /python/i })).toBeVisible();
  await expect(dialog.getByRole("tab", { name: /^go$/i })).toBeVisible();
  await expect(dialog.getByRole("tab", { name: /curl/i })).toBeVisible();

  // Submit — canonical CTA "Create gate".
  await dialog.getByRole("button", { name: /create gate/i }).click();

  // Server action redirects to the gate detail editor.
  await expect(page).toHaveURL(new RegExp(`/dashboard/${PROJECT}/gates/[0-9a-f-]+(\\?|$)`));

  // Verify row exists in admin API.
  const list = await adminList<GateRow>(page.request, "/api/admin/gates");
  expect(list.some((g) => g.name === key)).toBe(true);
});
