import { expect, test } from "@playwright/test";

test.describe("Projects page", () => {
  test("renders the page header and project cards", async ({ page }) => {
    await page.goto("/dashboard/projects");

    await expect(page.getByRole("heading", { name: /^projects$/i })).toBeVisible();
    await expect(page.getByText(/one project per app/i)).toBeVisible();

    // Should show ACTIVE badge for the current project
    const activeBadge = page.getByText("ACTIVE", { exact: true });
    await expect(activeBadge.first()).toBeVisible();

    // Each card carries a domain line (or "no domain" placeholder) in
    // addition to the display name. The card button must use a pointer
    // cursor so users get a click affordance on hover.
    const card = page.locator("form button[type=submit]").first();
    await expect(card).toBeVisible();
    await expect(card).toHaveCSS("cursor", "pointer");
    await expect(card.locator("text=/no domain|^[a-z0-9.-]+\\.[a-z]+/i").first()).toBeVisible();
  });

  test("New project link navigates to the create form", async ({ page }) => {
    await page.goto("/dashboard/projects");
    await page
      .getByRole("link", { name: /^new project$/i })
      .first()
      .click();
    await expect(page).toHaveURL(/\/dashboard\/projects\/new$/);
    await expect(page.getByRole("heading", { name: /^new project$/i })).toBeVisible();
    await expect(page.getByLabel(/display name/i)).toBeVisible();
    await expect(page.getByLabel(/domain/i)).toBeVisible();
  });

  test("new project form creates a project and redirects to dashboard", async ({ page }) => {
    await page.goto("/dashboard/projects/new");

    const unique = `e2e-proj-${Date.now()}`;
    await page.getByLabel(/display name/i).fill(unique);
    await page.getByLabel(/domain/i).fill(`https://${unique}.example.com`);
    await page.getByRole("button", { name: /create project/i }).click();

    // Should redirect to /dashboard after creation
    await expect(page).toHaveURL(/\/dashboard$/);

    // The new project should appear in the projects list, with the bare
    // hostname under the display name (the form normalises away the scheme).
    await page.goto("/dashboard/projects");
    await expect(page.getByText(unique).first()).toBeVisible();
    await expect(page.getByText(`${unique}.example.com`).first()).toBeVisible();
  });

  test("new project rejects bare hostnames without scheme", async ({ page }) => {
    await page.goto("/dashboard/projects/new");
    await page.getByLabel(/display name/i).fill(`e2e-bare-${Date.now()}`);
    await page.getByLabel(/domain/i).fill("app.example.com");
    await page.getByRole("button", { name: /create project/i }).click();

    // Stays on the form; surfaces the validation error.
    await expect(page).toHaveURL(/\/dashboard\/projects\/new$/);
    await expect(page.getByText(/http:\/\/ or https:\/\//i)).toBeVisible();
  });

  test("new project accepts '*' as a wildcard domain", async ({ page }) => {
    await page.goto("/dashboard/projects/new");
    const unique = `e2e-wild-${Date.now()}`;
    await page.getByLabel(/display name/i).fill(unique);
    await page.getByLabel(/domain/i).fill("*");
    await page.getByRole("button", { name: /create project/i }).click();

    await expect(page).toHaveURL(/\/dashboard$/);
    await page.goto("/dashboard/projects");
    await expect(page.getByText(unique).first()).toBeVisible();
  });

  test("new project rejects duplicate domain for the same owner", async ({ page }) => {
    const dupDomain = `e2e-dup-${Date.now()}.example.com`;
    const unique = `e2e-dup-${Date.now()}`;

    // First create succeeds.
    await page.goto("/dashboard/projects/new");
    await page.getByLabel(/display name/i).fill(unique);
    await page.getByLabel(/domain/i).fill(`https://${dupDomain}`);
    await page.getByRole("button", { name: /create project/i }).click();
    await expect(page).toHaveURL(/\/dashboard$/);

    // Second create with the same domain is blocked.
    await page.goto("/dashboard/projects/new");
    await page.getByLabel(/display name/i).fill(`${unique}-again`);
    await page.getByLabel(/domain/i).fill(`https://${dupDomain}`);
    await page.getByRole("button", { name: /create project/i }).click();
    await expect(page).toHaveURL(/\/dashboard\/projects\/new$/);
    await expect(page.getByText(/already exists/i)).toBeVisible();
  });

  test("sidebar Projects link navigates here", async ({ page }) => {
    await page.goto("/dashboard");
    await page
      .getByRole("link", { name: /^projects$/i })
      .first()
      .click();
    await expect(page).toHaveURL(/\/dashboard\/projects$/);
  });

  test("sidebar shows project switcher with project list", async ({ page }) => {
    await page.goto("/dashboard");
    // The sidebar project switcher button should be visible
    const aside = page.locator("aside");
    await expect(aside).toBeVisible();
    // At minimum one project entry visible in sidebar switcher trigger
    const switcherBtn = aside.locator("button").first();
    await expect(switcherBtn).toBeVisible();
    // Click to open dropdown
    await switcherBtn.click();
    // "New project" option should appear
    await expect(page.getByRole("link", { name: /^new project$/i }).first()).toBeVisible();
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
