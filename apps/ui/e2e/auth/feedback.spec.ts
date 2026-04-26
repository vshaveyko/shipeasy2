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

    await page.goto("/dashboard/bugs");
    await expect(page.getByRole("heading", { name: /^bug reports$/i })).toBeVisible();
    await expect(page.getByRole("link", { name: new RegExp(title) })).toBeVisible();
  });

  test("detail page renders fields and updates status", async ({ page, request }) => {
    test.skip(!bugId, "previous test failed");
    await page.goto(`/dashboard/bugs/${bugId}`);
    await expect(page.getByRole("heading", { name: title })).toBeVisible();
    await expect(page.getByText(/1\. visit \//)).toBeVisible();
    await expect(page.getByText("boom")).toBeVisible();

    // Update status via the form on the detail page.
    await page.getByLabel(/^status$/i).selectOption("in_progress");
    await page.getByRole("button", { name: /update status/i }).click();
    await expect(page).toHaveURL(new RegExp(`/dashboard/bugs/${bugId}$`));
    await page.reload();
    await expect(page.getByLabel(/^status$/i)).toHaveValue("in_progress");

    // Cleanup via API so we don't leave fixtures behind.
    const res = await request.delete(`/api/admin/bugs/${bugId}`);
    expect(res.ok()).toBeTruthy();
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

    await page.goto("/dashboard/feature-requests");
    await expect(page.getByRole("heading", { name: /^feature requests$/i })).toBeVisible();
    await expect(page.getByRole("link", { name: new RegExp(title) })).toBeVisible();
  });

  test("detail page renders + status update", async ({ page, request }) => {
    test.skip(!id, "previous test failed");
    await page.goto(`/dashboard/feature-requests/${id}`);
    await expect(page.getByRole("heading", { name: title })).toBeVisible();
    await expect(page.getByText(/would be cool/)).toBeVisible();

    await page.getByLabel(/^status$/i).selectOption("planned");
    await page.getByRole("button", { name: /^save$/i }).click();
    await page.reload();
    await expect(page.getByLabel(/^status$/i)).toHaveValue("planned");

    const res = await request.delete(`/api/admin/feature-requests/${id}`);
    expect(res.ok()).toBeTruthy();
  });
});
