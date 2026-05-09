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
    await expect(page.getByText("boom", { exact: true })).toBeVisible();

    // Update status via the form on the detail page.
    await page.getByLabel(/^status$/i).selectOption("in_progress");
    await Promise.all([
      page.waitForResponse(
        (r) => r.request().method() === "POST" && r.url().includes(`/bugs/${bugId}`),
      ),
      page.getByRole("button", { name: /update status/i }).click(),
    ]);
    await expect(page).toHaveURL(new RegExp(`/dashboard/e2e-project-id/bugs/${bugId}$`));
    await page.reload();
    await expect(page.getByLabel(/^status$/i)).toHaveValue("in_progress");
  });

  test("list row picker updates status and priority", async ({ page, request }) => {
    test.skip(!bugId, "previous test failed");
    await page.goto("/dashboard/e2e-project-id/feedback?tab=bugs");

    const statusTrigger = page.getByLabel(`Status for ${title}`);
    const priorityTrigger = page.getByLabel(`Priority for ${title}`);

    await statusTrigger.click();
    await page.getByRole("menuitem", { name: "Triaged" }).click();
    await expect(statusTrigger).toContainText("Triaged");

    await priorityTrigger.click();
    await page.getByRole("menuitem", { name: "High" }).click();
    await expect(priorityTrigger).toContainText("High");

    await expect
      .poll(async () => {
        const res = await request.get(`/api/admin/bugs/${bugId}`);
        const body = (await res.json()) as { status: string; priority: string | null };
        return { status: body.status, priority: body.priority };
      })
      .toEqual({ status: "triaged", priority: "high" });
  });

  test("inline picker values persist after reload", async ({ page }) => {
    test.skip(!bugId, "previous test failed");
    await page.goto("/dashboard/e2e-project-id/feedback?tab=bugs");
    await expect(page.getByLabel(`Status for ${title}`)).toContainText("Triaged");
    await expect(page.getByLabel(`Priority for ${title}`)).toContainText("High");
  });

  test("priority can be cleared via the picker", async ({ page, request }) => {
    test.skip(!bugId, "previous test failed");
    await page.goto("/dashboard/e2e-project-id/feedback?tab=bugs");
    const priorityTrigger = page.getByLabel(`Priority for ${title}`);
    await priorityTrigger.click();
    await page.getByRole("menuitem", { name: "No priority" }).click();
    await expect(priorityTrigger).toContainText("No priority");

    await expect
      .poll(async () => {
        const res = await request.get(`/api/admin/bugs/${bugId}`);
        const body = (await res.json()) as { priority: string | null };
        return body.priority;
      })
      .toBeNull();
  });

  test("edit pencil navigates to the detail page", async ({ page }) => {
    test.skip(!bugId, "previous test failed");
    await page.goto("/dashboard/e2e-project-id/feedback?tab=bugs");
    await page
      .getByRole("listitem")
      .filter({ hasText: title })
      .getByRole("link", { name: "Edit bug report" })
      .click();
    await expect(page).toHaveURL(new RegExp(`/dashboard/e2e-project-id/bugs/${bugId}$`));
    await expect(page.getByRole("heading", { name: title })).toBeVisible();
  });

  test("delete dialog can be cancelled without deleting", async ({ page, request }) => {
    test.skip(!bugId, "previous test failed");
    await page.goto("/dashboard/e2e-project-id/feedback?tab=bugs");
    await page
      .getByRole("listitem")
      .filter({ hasText: title })
      .getByRole("button", { name: "Delete bug report" })
      .click();
    await expect(page.getByRole("heading", { name: /delete bug report\?/i })).toBeVisible();
    await page.getByRole("button", { name: /^cancel$/i }).click();
    await expect(page.getByRole("heading", { name: /delete bug report\?/i })).toHaveCount(0);
    await expect(page.getByRole("link", { name: new RegExp(title) })).toBeVisible();

    const res = await request.get(`/api/admin/bugs/${bugId}`);
    expect(res.ok()).toBeTruthy();
  });

  test("delete confirms, removes the row, and returns 404", async ({ page, request }) => {
    test.skip(!bugId, "previous test failed");
    await page.goto("/dashboard/e2e-project-id/feedback?tab=bugs");
    await page
      .getByRole("listitem")
      .filter({ hasText: title })
      .getByRole("button", { name: "Delete bug report" })
      .click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: /^delete$/i }).click();
    await expect(page.getByRole("link", { name: new RegExp(title) })).toHaveCount(0);

    await expect
      .poll(async () => (await request.get(`/api/admin/bugs/${bugId}`)).status())
      .toBe(404);
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
    await Promise.all([
      page.waitForResponse(
        (r) => r.request().method() === "POST" && r.url().includes(`/feature-requests/${id}`),
      ),
      page.getByRole("button", { name: /^save$/i }).click(),
    ]);
    await page.reload();
    await expect(page.getByLabel(/^status$/i)).toHaveValue("planned");
  });

  test("list row picker updates status and importance", async ({ page, request }) => {
    test.skip(!id, "previous test failed");
    await page.goto("/dashboard/e2e-project-id/feedback?tab=requests");

    const statusTrigger = page.getByLabel(`Status for ${title}`);
    const importanceTrigger = page.getByLabel(`Importance for ${title}`);

    await statusTrigger.click();
    await page.getByRole("menuitem", { name: "Considering" }).click();
    await expect(statusTrigger).toContainText("Considering");

    await importanceTrigger.click();
    await page.getByRole("menuitem", { name: "Critical" }).click();
    await expect(importanceTrigger).toContainText("Critical");

    await expect
      .poll(async () => {
        const res = await request.get(`/api/admin/feature-requests/${id}`);
        const body = (await res.json()) as { status: string; importance: string };
        return { status: body.status, importance: body.importance };
      })
      .toEqual({ status: "considering", importance: "critical" });
  });

  test("inline picker values persist after reload", async ({ page }) => {
    test.skip(!id, "previous test failed");
    await page.goto("/dashboard/e2e-project-id/feedback?tab=requests");
    await expect(page.getByLabel(`Status for ${title}`)).toContainText("Considering");
    await expect(page.getByLabel(`Importance for ${title}`)).toContainText("Critical");
  });

  test("edit pencil navigates to the detail page", async ({ page }) => {
    test.skip(!id, "previous test failed");
    await page.goto("/dashboard/e2e-project-id/feedback?tab=requests");
    await page
      .getByRole("listitem")
      .filter({ hasText: title })
      .getByRole("link", { name: "Edit feature request" })
      .click();
    await expect(page).toHaveURL(new RegExp(`/dashboard/e2e-project-id/feature-requests/${id}$`));
    await expect(page.getByRole("heading", { name: title })).toBeVisible();
  });

  test("delete dialog can be cancelled without deleting", async ({ page, request }) => {
    test.skip(!id, "previous test failed");
    await page.goto("/dashboard/e2e-project-id/feedback?tab=requests");
    await page
      .getByRole("listitem")
      .filter({ hasText: title })
      .getByRole("button", { name: "Delete feature request" })
      .click();
    await expect(page.getByRole("heading", { name: /delete feature request\?/i })).toBeVisible();
    await page.getByRole("button", { name: /^cancel$/i }).click();
    await expect(page.getByRole("heading", { name: /delete feature request\?/i })).toHaveCount(0);
    await expect(page.getByRole("link", { name: new RegExp(title) })).toBeVisible();

    const res = await request.get(`/api/admin/feature-requests/${id}`);
    expect(res.ok()).toBeTruthy();
  });

  test("delete confirms, removes the row, and returns 404", async ({ page, request }) => {
    test.skip(!id, "previous test failed");
    await page.goto("/dashboard/e2e-project-id/feedback?tab=requests");
    await page
      .getByRole("listitem")
      .filter({ hasText: title })
      .getByRole("button", { name: "Delete feature request" })
      .click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: /^delete$/i }).click();
    await expect(page.getByRole("link", { name: new RegExp(title) })).toHaveCount(0);

    await expect
      .poll(async () => (await request.get(`/api/admin/feature-requests/${id}`)).status())
      .toBe(404);
  });
});

test.describe("Feedback tabs", () => {
  test.describe.configure({ mode: "serial" });

  const bugTitle = `e2e-tabs-bug-${RUN}`;
  const frTitle = `e2e-tabs-fr-${RUN}`;
  let bugId = "";
  let frId = "";

  test.beforeAll(async ({ request }) => {
    const b = await postJson(request, "/api/admin/bugs", {
      title: bugTitle,
      stepsToReproduce: "x",
      actualResult: "x",
      expectedResult: "y",
    });
    bugId = b.id;
    const f = await postJson(request, "/api/admin/feature-requests", {
      title: frTitle,
      description: "x",
      useCase: "y",
      importance: "nice_to_have",
    });
    frId = f.id;
  });

  test.afterAll(async ({ request }) => {
    if (bugId) await request.delete(`/api/admin/bugs/${bugId}`);
    if (frId) await request.delete(`/api/admin/feature-requests/${frId}`);
  });

  test("tabs route between bugs and feature requests", async ({ page }) => {
    await page.goto("/dashboard/e2e-project-id/feedback?tab=bugs");
    await expect(page.getByRole("link", { name: new RegExp(bugTitle) })).toBeVisible();
    await expect(page.getByRole("link", { name: new RegExp(frTitle) })).toHaveCount(0);

    await page.getByRole("link", { name: /feature requests/i }).click();
    await expect(page).toHaveURL(/tab=requests/);
    await expect(page.getByRole("link", { name: new RegExp(frTitle) })).toBeVisible();
    await expect(page.getByRole("link", { name: new RegExp(bugTitle) })).toHaveCount(0);

    await page.getByRole("link", { name: /^bugs/i }).first().click();
    await expect(page).toHaveURL(/tab=bugs/);
    await expect(page.getByRole("link", { name: new RegExp(bugTitle) })).toBeVisible();
  });
});
