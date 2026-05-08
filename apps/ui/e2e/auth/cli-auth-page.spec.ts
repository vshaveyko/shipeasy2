import { test, expect } from "@playwright/test";

const STATE = "cli-state-abc123";
const CHALLENGE = "cli-challenge-xyz789";

const cliAuthUrl = (qs: Partial<{ state: string; code_challenge: string }> = {}) => {
  const params = new URLSearchParams();
  if ("state" in qs) {
    if (qs.state !== undefined) params.set("state", qs.state);
  } else {
    params.set("state", STATE);
  }
  if ("code_challenge" in qs) {
    if (qs.code_challenge !== undefined) params.set("code_challenge", qs.code_challenge);
  } else {
    params.set("code_challenge", CHALLENGE);
  }
  return `/cli-auth?${params.toString()}`;
};

test.describe("/cli-auth — input validation", () => {
  test("missing state parameter shows a fallback message", async ({ page }) => {
    await page.goto("/cli-auth");
    await expect(page.getByText(/Invalid link/i)).toBeVisible();
  });

  test("missing code_challenge shows the same fallback", async ({ page }) => {
    await page.goto(`/cli-auth?state=${STATE}`);
    await expect(page.getByText(/Invalid link/i)).toBeVisible();
  });
});

test.describe("/cli-auth — signed-in flow", () => {
  test("renders the authorize card and a project picker", async ({ page }) => {
    await page.goto(cliAuthUrl());

    await expect(page.getByText("Authorize CLI access")).toBeVisible();
    await expect(page.getByRole("button", { name: /Approve access/i })).toBeVisible();

    const radios = page.locator('input[type="radio"][name="project_id"]');
    await expect(radios.first()).toBeVisible();
    // Default e2e fixture creates one owned project per user.
    await expect(radios).toHaveCount(1);
    await expect(radios.first()).toBeChecked();
  });

  test("lists each project's domain alongside the name", async ({ page }) => {
    await page.goto(cliAuthUrl());

    const labels = page.locator("fieldset label");
    await expect(labels.first()).toBeVisible();
    // Each entry shows two text rows: the name (font-medium) and the domain
    // (text-muted-foreground); when domain is null the second row reads
    // "no domain" rather than being omitted, so a sub-label always exists.
    const subLabel = labels.first().locator("span.text-muted-foreground");
    await expect(subLabel).toHaveCount(1);
    await expect(subLabel).not.toBeEmpty();
  });
});
