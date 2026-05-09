import { expect, test } from "@playwright/test";

const RUN = Date.now();

// Fetch through the admin API rather than the UI form because the in-page
// "File a bug" / "Request a feature" flow lives inside the devtools shadow
// DOM and is wired to getDisplayMedia / MediaRecorder, both of which are
// awkward to mock in headless Chromium. Posting through the admin API (which
// the devtools nub itself calls under the hood) covers the same code path.

async function postJson(
  request: import("@playwright/test").APIRequestContext,
  url: string,
  body: unknown,
) {
  const res = await request.post(url, { data: body });
  if (!res.ok()) throw new Error(`${url} → ${res.status()} ${await res.text()}`);
  return res.json() as Promise<{ id: string }>;
}

test.describe("Bugs dashboard", () => {
  test.describe.configure({ mode: "serial" });

  const title = `e2e-bug-${RUN}`;
  let bugId = "";

  test("create bug via admin API → appears in list", async ({ page, request }) => {
    const created = await postJson(request, "/api/admin/bugs", {
      title,
      stepsToReproduce: "1. visit /\n2. click",
      actualResult: "boom",
      expectedResult: "no boom",
    });
    bugId = created.id;

    // Old route still works — it redirects into the combined feedback page.
    await page.goto("/dashboard/e2e-project-id/bugs");
    await expect(page).toHaveURL(/\/dashboard\/e2e-project-id\/feedback/);
    await expect(page.getByRole("heading", { name: /^feedback$/i })).toBeVisible();
    await expect(page.getByRole("link", { name: new RegExp(title) })).toBeVisible();
  });

  test("detail page renders fields and updates status", async ({ page }) => {
    test.skip(!bugId, "previous test failed");
    await page.goto(`/dashboard/e2e-project-id/bugs/${bugId}`);
    await expect(page.getByRole("heading", { name: title })).toBeVisible();
    await expect(page.getByText(/1\. visit \//)).toBeVisible();
    await expect(page.getByText("boom")).toBeVisible();

    // Update status via the form on the detail page.
    await page.getByLabel(/^status$/i).selectOption("in_progress");
    await page.getByRole("button", { name: /update status/i }).click();
    await expect(page).toHaveURL(new RegExp(`/dashboard/e2e-project-id/bugs/${bugId}$`));
    await page.reload();
    await expect(page.getByLabel(/^status$/i)).toHaveValue("in_progress");
  });

  test("list row supports inline status/priority edit and delete", async ({ page, request }) => {
    test.skip(!bugId, "previous test failed");
    await page.goto("/dashboard/e2e-project-id/feedback?tab=bugs");

    const statusSelect = page.getByLabel(`Status for ${title}`);
    const prioritySelect = page.getByLabel(`Priority for ${title}`);

    await statusSelect.selectOption("triaged");
    await expect(statusSelect).toHaveValue("triaged");

    await prioritySelect.selectOption("high");
    await expect(prioritySelect).toHaveValue("high");

    // Verify persistence via the admin API
    const res = await request.get(`/api/admin/bugs/${bugId}`);
    expect(res.ok()).toBeTruthy();
    const body = (await res.json()) as { status: string; priority: string | null };
    expect(body.status).toBe("triaged");
    expect(body.priority).toBe("high");

    // Delete via the row action.
    await page.getByRole("button", { name: `Delete bug report` }).click();
    await page.getByRole("button", { name: /^delete$/i }).click();
    await expect(page.getByRole("link", { name: new RegExp(title) })).toHaveCount(0);

    const after = await request.get(`/api/admin/bugs/${bugId}`);
    expect(after.status()).toBe(404);
  });
});

test.describe("Feature requests dashboard", () => {
  test.describe.configure({ mode: "serial" });

  const title = `e2e-fr-${RUN}`;
  let id = "";

  test("create feature request → appears in list", async ({ page, request }) => {
    const created = await postJson(request, "/api/admin/feature-requests", {
      title,
      description: "would be cool to have X",
      useCase: "for users who Y",
      importance: "important",
    });
    id = created.id;

    await page.goto("/dashboard/e2e-project-id/feedback?tab=requests");
    await expect(page.getByRole("heading", { name: /^feedback$/i })).toBeVisible();
    await expect(page.getByRole("link", { name: new RegExp(title) })).toBeVisible();
  });

  test("detail page renders + status update", async ({ page }) => {
    test.skip(!id, "previous test failed");
    await page.goto(`/dashboard/e2e-project-id/feature-requests/${id}`);
    await expect(page.getByRole("heading", { name: title })).toBeVisible();
    await expect(page.getByText(/would be cool/)).toBeVisible();

    await page.getByLabel(/^status$/i).selectOption("planned");
    await page.getByRole("button", { name: /^save$/i }).click();
    await page.reload();
    await expect(page.getByLabel(/^status$/i)).toHaveValue("planned");
  });

  test("list row supports inline status/importance edit and delete", async ({ page, request }) => {
    test.skip(!id, "previous test failed");
    await page.goto("/dashboard/e2e-project-id/feedback?tab=requests");

    const statusSelect = page.getByLabel(`Status for ${title}`);
    const importanceSelect = page.getByLabel(`Importance for ${title}`);

    await statusSelect.selectOption("considering");
    await expect(statusSelect).toHaveValue("considering");

    await importanceSelect.selectOption("critical");
    await expect(importanceSelect).toHaveValue("critical");

    const res = await request.get(`/api/admin/feature-requests/${id}`);
    expect(res.ok()).toBeTruthy();
    const body = (await res.json()) as { status: string; importance: string };
    expect(body.status).toBe("considering");
    expect(body.importance).toBe("critical");

    await page.getByRole("button", { name: `Delete feature request` }).click();
    await page.getByRole("button", { name: /^delete$/i }).click();
    await expect(page.getByRole("link", { name: new RegExp(title) })).toHaveCount(0);

    const after = await request.get(`/api/admin/feature-requests/${id}`);
    expect(after.status()).toBe(404);
  });
});
