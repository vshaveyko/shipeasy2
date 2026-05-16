import { expect, test } from "@playwright/test";

test.describe("Projects page", () => {
  test("renders the page header and project cards", async ({ page }) => {
    await page.goto("/dashboard/projects");

    await expect(page.getByRole("heading", { name: /^projects$/i })).toBeVisible();
    await expect(page.getByText(/one project per app/i)).toBeVisible();

    // Should show CURRENT badge for the active project
    const activeBadge = page.getByText("CURRENT", { exact: true });
    await expect(activeBadge.first()).toBeVisible();

    // Card button must use a pointer cursor so users get a click affordance
    // on hover. Heading shows the canonical "<name>:<domain>" label form.
    const card = page.locator("form button[type=submit]").first();
    await expect(card).toBeVisible();
    await expect(card).toHaveCSS("cursor", "pointer");
    await expect(card.getByRole("heading").first()).toHaveText(/^[^:]+(?::[^:]+)?$/);
  });

  test("New project button opens the create modal", async ({ page }) => {
    await page.goto("/dashboard/projects");
    await page
      .getByRole("button", { name: /^new project$/i })
      .first()
      .click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("heading", { name: /^new project$/i })).toBeVisible();
    await expect(dialog.getByPlaceholder(/my app/i)).toBeVisible();
    await expect(dialog.getByPlaceholder(/example\.com/i)).toBeVisible();
  });

  test("dashed New project tile opens the create modal", async ({ page }) => {
    await page.goto("/dashboard/projects");
    // The dashed empty-tile sits inside the cards grid. Both the header button
    // and the tile open the same modal — click the tile (last "New project"
    // button on the page) and assert the dialog is visible.
    await page
      .getByRole("button", { name: /^new project$/i })
      .last()
      .click();
    await expect(page.getByRole("dialog")).toBeVisible();
  });

  test("create modal: backdrop click closes without creating", async ({ page }) => {
    await page.goto("/dashboard/projects");
    await page
      .getByRole("button", { name: /^new project$/i })
      .first()
      .click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    // Click the backdrop (top-left corner is outside the 560px-wide modal).
    await dialog.click({ position: { x: 5, y: 5 } });
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });

  test("create modal: explicit Close + Cancel both dismiss", async ({ page }) => {
    await page.goto("/dashboard/projects");

    // Close (X) button
    await page
      .getByRole("button", { name: /^new project$/i })
      .first()
      .click();
    await page.getByRole("button", { name: /^close$/i }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);

    // Cancel footer button
    await page
      .getByRole("button", { name: /^new project$/i })
      .first()
      .click();
    await page.getByRole("button", { name: /^cancel$/i }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });

  test("create modal: submitting creates a project and redirects", async ({ page }) => {
    await page.goto("/dashboard/projects");
    await page
      .getByRole("button", { name: /^new project$/i })
      .first()
      .click();

    const dialog = page.getByRole("dialog");
    const unique = `e2e-modal-${Date.now()}`;
    await dialog.getByPlaceholder(/my app/i).fill(unique);
    await dialog.getByPlaceholder(/example\.com/i).fill(`https://${unique}.example.com`);
    await dialog.getByRole("button", { name: /create project/i }).click();

    // Same redirect contract as the /new page: lands on /dashboard/<projectId>.
    await expect(page).toHaveURL(/\/dashboard\/[^/]+$/);

    await page.goto("/dashboard/projects");
    await expect(page.getByText(`${unique}:${unique}.example.com`).first()).toBeVisible();
  });

  test("create modal: required fields block submit", async ({ page }) => {
    await page.goto("/dashboard/projects");
    await page
      .getByRole("button", { name: /^new project$/i })
      .first()
      .click();

    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: /create project/i }).click();
    // Native HTML5 required keeps the modal open and the URL unchanged.
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page).toHaveURL(/\/dashboard\/projects$/);
  });

  test("projects list: search filters cards by name", async ({ page }) => {
    // Create a uniquely-named project so the filter has a target row.
    const unique = `e2e-search-${Date.now()}`;
    await page.goto("/dashboard/projects/new");
    await page.getByLabel(/display name/i).fill(unique);
    await page.getByLabel(/domain/i).fill(`https://${unique}.example.com`);
    await page.getByRole("button", { name: /create project/i }).click();
    await expect(page).toHaveURL(/\/dashboard\/[^/]+$/);

    await page.goto("/dashboard/projects");
    const search = page.getByPlaceholder(/find a project/i);
    await expect(search).toBeVisible();

    // Filter to the unique name — its card stays, others disappear.
    await search.fill(unique);
    await expect(page.getByText(`${unique}:${unique}.example.com`).first()).toBeVisible();

    // Bogus query collapses the list to the dashed "New project" tile only.
    await search.fill("zzz-no-match-zzz");
    await expect(page.getByText(`${unique}:${unique}.example.com`)).toHaveCount(0);
  });

  test("new project form creates a project and redirects to dashboard", async ({ page }) => {
    await page.goto("/dashboard/projects/new");

    const unique = `e2e-proj-${Date.now()}`;
    await page.getByLabel(/display name/i).fill(unique);
    await page.getByLabel(/domain/i).fill(`https://${unique}.example.com`);
    await page.getByRole("button", { name: /create project/i }).click();

    // Should redirect to /dashboard after creation
    // Creating a project sends the user to /dashboard, which now resolves
    // into the new project's home (/dashboard/<projectId>).
    await expect(page).toHaveURL(/\/dashboard\/[^/]+$/);

    // The new project appears in the list with the canonical "<name>:<domain>"
    // label (the form normalises away the scheme).
    await page.goto("/dashboard/projects");
    await expect(page.getByText(`${unique}:${unique}.example.com`).first()).toBeVisible();
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

    // Creating a project sends the user to /dashboard, which now resolves
    // into the new project's home (/dashboard/<projectId>).
    await expect(page).toHaveURL(/\/dashboard\/[^/]+$/);
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
    // Creating a project sends the user to /dashboard, which now resolves
    // into the new project's home (/dashboard/<projectId>).
    await expect(page).toHaveURL(/\/dashboard\/[^/]+$/);

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
    // The hero empty state on a fresh workspace surfaces "just you so far"
    // and an "Invite people" CTA instead of an explicit member row.
    await expect(page.getByText(/just you so far/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /^invite people$/i }).first()).toBeVisible();
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

    await page
      .getByRole("button", { name: /^invite people$/i })
      .first()
      .click();

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
    // email text → div → min-w-0 → row container; <select> is a sibling of min-w-0.
    const row = page
      .getByText(invitee, { exact: true })
      .first()
      .locator("..")
      .locator("..")
      .locator("..");
    const select = row.locator("select").first();
    await select.selectOption("viewer");
    // The select stays at viewer after the action revalidates
    await page.reload();
    await expect(row.locator("select").first()).toHaveValue("viewer");
  });

  test("owner can remove the invited member", async ({ page }) => {
    await page.goto("/dashboard/team");
    await page.getByRole("button", { name: new RegExp(`remove ${invitee}`, "i") }).click();

    // The remove form may still flash the invitee name in a transient toast;
    // assert that the row's own member name is gone instead of the global text.
    await expect(page.locator("b").filter({ hasText: invitee })).toHaveCount(0);
  });

  test("invalid emails surface an error and do not close the modal", async ({ page }) => {
    await page.goto("/dashboard/team");
    await page
      .getByRole("button", { name: /^invite people$/i })
      .first()
      .click();
    const input = page.getByPlaceholder("email@company.com");
    await input.fill("not-an-email");
    await input.press("Enter");
    await page.getByRole("button", { name: /send 1 invite/i }).click();
    // Modal still open; an error appears
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByText(/Invalid email|Failed/)).toBeVisible();
  });
});
