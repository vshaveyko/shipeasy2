import { execSync } from "node:child_process";
import { readdirSync } from "node:fs";
import path from "node:path";

import { expect, test } from "@playwright/test";

const PROJECT = "e2e-project-id";

function locateD1(): string | null {
  const dir = path.join(
    __dirname,
    "../../.wrangler/state/v3/d1/miniflare-D1DatabaseObject",
  );
  let files: string[];
  try {
    files = readdirSync(dir).filter((f) => f.endsWith(".sqlite") && !f.includes("metadata"));
  } catch {
    return null;
  }
  if (files.length === 0) return null;
  return path.join(dir, files[0]);
}

function sql(stmt: string) {
  const db = locateD1();
  if (!db) return;
  try {
    execSync(`sqlite3 "${db}" "${stmt.replace(/"/g, '""')}"`);
  } catch {
    // ignore — table may be missing
  }
}

function resetSettings() {
  // Reset every column the settings page can mutate so each spec starts from
  // the same baseline regardless of execution order.
  sql(
    `UPDATE projects SET name='Default project', slug=NULL, domain=NULL, default_env='staging', timezone='UTC', stat_method='sequential', sig_threshold='0.05', auto_rollback=1, min_sample_days=14, deleted_at=NULL, status='active' WHERE id='${PROJECT}'`,
  );
  sql(`DELETE FROM notification_prefs WHERE project_id='${PROJECT}'`);
  sql(`DELETE FROM integration_settings WHERE project_id='${PROJECT}'`);
}

test.describe("Settings — persistence", () => {
  test.beforeEach(() => resetSettings());
  test.afterAll(() => resetSettings());

  test("General: editing slug + timezone + default env round-trips through reload", async ({
    page,
  }) => {
    await page.goto(`/dashboard/${PROJECT}/settings`);

    const slug = `e2e-${Date.now().toString(36)}`;
    await page.getByLabel(/^project slug$/i).fill(slug);
    await page.getByLabel(/^time zone$/i).selectOption("Europe/London");
    await page.getByLabel(/^default environment$/i).selectOption("prod");
    await page.getByRole("button", { name: /save changes/i }).click();

    await expect(page.getByText(/settings saved/i).first()).toBeVisible();
    await page.reload();

    await expect(page.getByLabel(/^project slug$/i)).toHaveValue(slug);
    await expect(page.getByLabel(/^time zone$/i)).toHaveValue("Europe/London");
    await expect(page.getByLabel(/^default environment$/i)).toHaveValue("prod");
  });

  test("General: invalid slug surfaces a server-side error and does not persist", async ({
    page,
  }) => {
    await page.goto(`/dashboard/${PROJECT}/settings`);

    // Slug regex rejects uppercase / spaces.
    await page.getByLabel(/^project slug$/i).fill("Bad Slug!");
    await page.getByRole("button", { name: /save changes/i }).click();

    // Action returns fail(); page stays mounted with the rejected value still
    // visible in the field.
    await expect(page.getByLabel(/^project slug$/i)).toHaveValue("Bad Slug!");
    await page.reload();
    await expect(page.getByLabel(/^project slug$/i)).toHaveValue("");
  });

  test("Experiment defaults: switching method + threshold + toggling auto-rollback persists", async ({
    page,
  }) => {
    await page.goto(`/dashboard/${PROJECT}/settings?tab=experiments`);

    await page.getByLabel(/statistical method/i).selectOption("bayesian");
    await page.getByLabel(/significance threshold/i).selectOption("0.01");
    await page.getByLabel(/min sample size/i).fill("21");

    const rollback = page.getByRole("switch", { name: /auto-rollback/i });
    await expect(rollback).toHaveAttribute("aria-checked", "true");
    await rollback.click();
    await expect(rollback).toHaveAttribute("aria-checked", "false");

    await page.getByRole("button", { name: /^save$/i }).click();
    await expect(page.getByText(/settings saved/i).first()).toBeVisible();

    await page.reload();
    await expect(page.getByLabel(/statistical method/i)).toHaveValue("bayesian");
    await expect(page.getByLabel(/significance threshold/i)).toHaveValue("0.01");
    await expect(page.getByLabel(/min sample size/i)).toHaveValue("21");
    await expect(page.getByRole("switch", { name: /auto-rollback/i })).toHaveAttribute(
      "aria-checked",
      "false",
    );
  });

  test("Notifications: toggling a channel persists across reload", async ({ page }) => {
    await page.goto(`/dashboard/${PROJECT}/settings?tab=notifications`);

    // Default for "Killswitch flipped" / Email is OFF; flip it on.
    const target = page.getByRole("switch", {
      name: /killswitch flipped — email/i,
    });
    await expect(target).toHaveAttribute("aria-checked", "false");
    await target.click();
    await expect(target).toHaveAttribute("aria-checked", "true");

    // Wait for the optimistic update to land server-side.
    await page.waitForTimeout(400);
    await page.reload();

    await expect(
      page.getByRole("switch", { name: /killswitch flipped — email/i }),
    ).toHaveAttribute("aria-checked", "true");
  });

  test("Notifications: reset-to-defaults wipes overrides", async ({ page }) => {
    await page.goto(`/dashboard/${PROJECT}/settings?tab=notifications`);

    // Flip "Weekly digest / Slack" on (default OFF), then reset.
    const slackDigest = page.getByRole("switch", {
      name: /weekly experimentation digest — slack/i,
    });
    await slackDigest.click();
    await expect(slackDigest).toHaveAttribute("aria-checked", "true");
    await page.waitForTimeout(400);

    await page.getByRole("button", { name: /reset to defaults/i }).click();
    await page.waitForTimeout(400);
    await page.reload();

    // Default for that row is OFF — should be back to false.
    await expect(
      page.getByRole("switch", { name: /weekly experimentation digest — slack/i }),
    ).toHaveAttribute("aria-checked", "false");
  });

  test("Integrations: connect then disconnect round-trip", async ({ page }) => {
    await page.goto(`/dashboard/${PROJECT}/settings?tab=integrations`);

    const slackRow = page.locator(".integration").filter({ hasText: "Slack" }).first();

    // Initially "Connect" only.
    await expect(slackRow.getByRole("button", { name: /^connect$/i })).toBeVisible();

    await slackRow.getByRole("button", { name: /^connect$/i }).click();
    const dialog = page.getByRole("dialog");
    await dialog
      .getByLabel(/config \(json\)/i)
      .fill('{"channel":"#experiments"}');
    await dialog.getByRole("button", { name: /^connect$/i }).click();
    await expect(dialog).toBeHidden();
    // Reload to bypass client-cache flake; backend persistence is the contract
    // we actually care about for an e2e spec.
    await page.reload();

    const slackRowAfter = page
      .locator(".integration")
      .filter({ hasText: "Slack" })
      .first();
    await expect(slackRowAfter.getByText("CONNECTED")).toBeVisible();
    await expect(slackRowAfter.getByRole("button", { name: /configure/i })).toBeVisible();

    await slackRowAfter.getByRole("button", { name: /^disconnect$/i }).click();
    await page.reload();
    const slackRowFinal = page
      .locator(".integration")
      .filter({ hasText: "Slack" })
      .first();
    await expect(slackRowFinal.getByRole("button", { name: /^connect$/i })).toBeVisible();
    await expect(slackRowFinal.getByText("CONNECTED")).toHaveCount(0);
  });

  test("Integrations: invalid JSON config surfaces an error", async ({ page }) => {
    await page.goto(`/dashboard/${PROJECT}/settings?tab=integrations`);

    const githubRow = page.locator(".integration").filter({ hasText: "GitHub" }).first();
    await githubRow.getByRole("button", { name: /^connect$/i }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel(/config \(json\)/i).fill("not json");
    await dialog.getByRole("button", { name: /^connect$/i }).click();

    // Dialog stays open; row is still not connected.
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: /cancel/i }).click();
    await expect(githubRow.getByText("CONNECTED")).toHaveCount(0);
  });
});

test.describe("Settings — navigation", () => {
  test("clicking each nav link updates ?tab= and the active marker", async ({ page }) => {
    await page.goto(`/dashboard/${PROJECT}/settings`);

    const nav = page.getByRole("navigation", { name: /settings sections/i });
    const cases = [
      { name: /experiment defaults/i, tab: "experiments", heading: /experiment defaults/i },
      { name: /^notifications$/i, tab: "notifications", heading: /^notifications$/i },
      { name: /^integrations$/i, tab: "integrations", heading: /^integrations$/i },
      { name: /billing & usage/i, tab: "billing", heading: /billing & usage/i },
      { name: /^danger zone$/i, tab: "danger", heading: /danger zone/i },
    ];

    for (const c of cases) {
      await nav.getByRole("link", { name: c.name }).click();
      await expect(page).toHaveURL(new RegExp(`tab=${c.tab}`));
      await expect(page.getByRole("heading", { name: c.heading })).toBeVisible();
      await expect(nav.getByRole("link", { name: c.name })).toHaveAttribute(
        "aria-current",
        "page",
      );
    }

    // Returning to General drops the query param.
    await nav.getByRole("link", { name: /^general$/i }).click();
    await expect(page).toHaveURL(/\/settings$/);
  });

  test("unknown ?tab= value falls back to General", async ({ page }) => {
    await page.goto(`/dashboard/${PROJECT}/settings?tab=does-not-exist`);
    await expect(page.getByLabel(/^project slug$/i)).toBeVisible();
  });

  test("deep-linking ?tab=billing renders the billing card directly", async ({ page }) => {
    await page.goto(`/dashboard/${PROJECT}/settings?tab=billing`);
    await expect(page.getByRole("heading", { name: /billing & usage/i })).toBeVisible();
    await expect(page.getByText(/billed monthly/i)).toBeVisible();
  });
});
