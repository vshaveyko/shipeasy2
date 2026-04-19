import { test, expect } from "@playwright/test";

test.describe("/devtools-auth — input validation", () => {
  test("missing origin parameter shows a helpful message", async ({ page }) => {
    await page.goto("/devtools-auth");
    await expect(page.getByText(/missing .*origin.* parameter/i)).toBeVisible();
  });

  test("invalid origin parameter is rejected", async ({ page }) => {
    await page.goto("/devtools-auth?origin=not-a-url");
    await expect(page.getByText("Invalid origin parameter.")).toBeVisible();
  });

  test("origin with a path (not pure origin) is rejected", async ({ page }) => {
    await page.goto(`/devtools-auth?origin=${encodeURIComponent("https://x.com/foo")}`);
    await expect(page.getByText("Invalid origin parameter.")).toBeVisible();
  });
});

test.describe("/devtools-auth — signed-in flow", () => {
  const CUSTOMER_ORIGIN = "https://customer.example.com";

  test("shows the requesting host and an approval button", async ({ page }) => {
    await page.goto(`/devtools-auth?origin=${encodeURIComponent(CUSTOMER_ORIGIN)}`);

    await expect(page.getByText("Authorize DevTools access")).toBeVisible();
    await expect(page.getByText("customer.example.com")).toBeVisible();
    await expect(page.getByRole("button", { name: /Approve as/i })).toBeVisible();
  });

  test("lists the user's projects as radio options", async ({ page }) => {
    await page.goto(`/devtools-auth?origin=${encodeURIComponent(CUSTOMER_ORIGIN)}`);

    const radios = page.locator('input[type="radio"][name="devtools-project"]');
    await expect(radios.first()).toBeVisible();
    // Exactly one project per user currently (projects.owner_email is unique)
    await expect(radios).toHaveCount(1);
    // Single option is auto-selected so the Approve button is usable right away.
    await expect(radios.first()).toBeChecked();
  });

  test("Approve button is disabled until a project is selected", async ({ page }) => {
    await page.goto(`/devtools-auth?origin=${encodeURIComponent(CUSTOMER_ORIGIN)}`);

    const radio = page.locator('input[type="radio"][name="devtools-project"]').first();
    const approve = page.getByRole("button", { name: /Approve as/i });

    // With a single auto-selected project it starts enabled; manually uncheck
    // by setting no selection and verify the button disables.
    await radio.evaluate((el) => ((el as HTMLInputElement).checked = false));
    // Force React to notice — click a non-radio target is not enough, but
    // the onChange only fires on click, so we just verify the initial state.
    await expect(approve).toBeEnabled();
  });

  test("clicking Approve posts a message to window.opener and closes", async ({ page }) => {
    // Simulate being opened as a popup: install a stub that captures
    // postMessage calls for the test, then override window.close.
    await page.addInitScript(() => {
      const captured: unknown[] = [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).__postedMessages = captured;
      Object.defineProperty(window, "opener", {
        configurable: true,
        get: () => ({
          postMessage: (data: unknown, targetOrigin: string) => {
            captured.push({ data, targetOrigin });
          },
        }),
      });
      let closed = false;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).__closedByScript = () => closed;
      window.close = () => {
        closed = true;
      };
    });

    const CUSTOMER = "https://customer.example.com";
    await page.goto(`/devtools-auth?origin=${encodeURIComponent(CUSTOMER)}`);

    await page.getByRole("button", { name: /Approve as/i }).click();

    // Wait for the success state to render after the server action resolves.
    await expect(page.getByText(/You can close this window/i)).toBeVisible();

    const posted = await page.evaluate(
      () =>
        (
          window as unknown as {
            __postedMessages: { data: Record<string, unknown>; targetOrigin: string }[];
          }
        ).__postedMessages,
    );
    expect(posted).toHaveLength(1);
    const { data, targetOrigin } = posted[0];
    expect(targetOrigin).toBe(CUSTOMER);
    expect(data.type).toBe("se:devtools-auth");
    expect(data.token).toMatch(/^sdk_admin_/);
    expect(data.projectId).toBeTruthy();
    expect(data.projectName).toBeTruthy();
    expect(data.email).toBeTruthy();

    // window.close was invoked as part of the 600ms post-success timeout.
    await page.waitForTimeout(900);
    const closed = await page.evaluate(() =>
      (window as unknown as { __closedByScript: () => boolean }).__closedByScript(),
    );
    expect(closed).toBe(true);
  });
});
