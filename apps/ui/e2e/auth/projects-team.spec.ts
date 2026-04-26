import { expect, test } from "@playwright/test";

test.describe("Projects page", () => {
  test("renders the page header and a project card for the current workspace", async ({ page }) => {
    await page.goto("/dashboard/projects");

    await expect(page.getByRole("heading", { name: /^projects$/i })).toBeVisible();
    await expect(page.getByText(/one project per app/i)).toBeVisible();

    // Either at least one card with the CURRENT badge, or the hero empty state CTA.
    const currentBadge = page.getByText("CURRENT", { exact: true });
    const heroCta = page.getByRole("link", { name: /set up your first project/i });
    const visible = (await currentBadge.count()) > 0 || (await heroCta.count()) > 0;
    expect(visible).toBe(true);
  });

  test("New project button is disabled (multi-project coming soon)", async ({ page }) => {
    await page.goto("/dashboard/projects");
    const newBtn = page.getByRole("button", { name: /^new project$/i }).first();
    await expect(newBtn).toBeDisabled();
  });

  test("sidebar Projects link navigates here", async ({ page }) => {
    await page.goto("/dashboard");
    await page
      .getByRole("link", { name: /^projects$/i })
      .first()
      .click();
    await expect(page).toHaveURL(/\/dashboard\/projects$/);
  });
});

test.describe("Team page", () => {
  test("renders header and the current user as the workspace owner", async ({ page }) => {
    await page.goto("/dashboard/team");

    await expect(page.getByRole("heading", { name: /^team$/i })).toBeVisible();
    await expect(page.getByText("you", { exact: true })).toBeVisible();
    await expect(page.getByText("owner", { exact: true })).toBeVisible();
  });

  test("sidebar Team link navigates here", async ({ page }) => {
    await page.goto("/dashboard");
    await page
      .getByRole("link", { name: /^team$/i })
      .first()
      .click();
    await expect(page).toHaveURL(/\/dashboard\/team$/);
  });
});

test.describe("Team invite + remove", () => {
  test.describe.configure({ mode: "serial" });
  const invitee = `e2e_invite_${Date.now()}@example.test`;

  test("owner can invite a teammate via the modal", async ({ page }) => {
    await page.goto("/dashboard/team");

    await page.getByRole("button", { name: /^invite people$/i }).click();

    // Modal opens with an email input
    await expect(page.getByRole("dialog")).toBeVisible();
    const input = page.getByPlaceholder("email@company.com");
    await input.fill(invitee);
    await input.press("Enter");

    // Chip should appear
    await expect(page.getByText(invitee, { exact: true }).first()).toBeVisible();

    await page.getByRole("button", { name: /send 1 invite/i }).click();

    // Modal closes; pending row appears
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.getByText(invitee).first()).toBeVisible();
    await expect(page.getByText("PENDING", { exact: true })).toBeVisible();

    // Role-permission card is still on the page (not the hero anymore)
    await expect(page.getByText("What each role can do")).toBeVisible();
  });

  test("changing the role of an invited member works", async ({ page }) => {
    await page.goto("/dashboard/team");
    const row = page.getByText(invitee, { exact: true }).first().locator("..").locator("..");
    const select = row.locator("select").first();
    await select.selectOption("viewer");
    // The select stays at viewer after the action revalidates
    await page.reload();
    await expect(row.locator("select").first()).toHaveValue("viewer");
  });

  test("owner can remove the invited member", async ({ page }) => {
    await page.goto("/dashboard/team");
    await page.getByRole("button", { name: new RegExp(`remove ${invitee}`, "i") }).click();

    await expect(page.getByText(invitee, { exact: true })).not.toBeVisible();
  });

  test("invalid emails surface an error and do not close the modal", async ({ page }) => {
    await page.goto("/dashboard/team");
    await page.getByRole("button", { name: /^invite people$/i }).click();
    const input = page.getByPlaceholder("email@company.com");
    await input.fill("not-an-email");
    await input.press("Enter");
    await page.getByRole("button", { name: /send 1 invite/i }).click();
    // Modal still open; an error appears
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByText(/Invalid email|Failed/)).toBeVisible();
  });
});
