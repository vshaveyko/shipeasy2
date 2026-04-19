import { test, expect } from "@playwright/test";

/**
 * Hits the real /api/admin/* endpoints with no route mocking so sync-vs-async
 * Cloudflare-context issues, missing KV/D1 bindings, and similar "500 in prod,
 * green in unit tests" bugs surface in CI. The [auth] project's storageState
 * supplies a valid Auth.js session cookie.
 */

type JsonBody = unknown;

async function adminGet(
  page: import("@playwright/test").Page,
  path: string,
): Promise<{ status: number; body: JsonBody }> {
  const res = await page.request.get(path);
  let body: JsonBody = null;
  try {
    body = await res.json();
  } catch {
    body = await res.text();
  }
  return { status: res.status(), body };
}

test.describe("admin API — session-cookie auth (no mocks)", () => {
  test("GET /api/admin/gates returns 200 with an array", async ({ page }) => {
    const { status, body } = await adminGet(page, "/api/admin/gates");
    expect(status).toBe(200);
    expect(Array.isArray(body)).toBe(true);
  });

  test("GET /api/admin/configs returns 200 with an array", async ({ page }) => {
    const { status, body } = await adminGet(page, "/api/admin/configs");
    expect(status).toBe(200);
    expect(Array.isArray(body)).toBe(true);
  });

  test("GET /api/admin/experiments returns 200 with an array", async ({ page }) => {
    const { status, body } = await adminGet(page, "/api/admin/experiments");
    expect(status).toBe(200);
    expect(Array.isArray(body)).toBe(true);
  });

  test("GET /api/admin/universes returns 200 with an array", async ({ page }) => {
    const { status, body } = await adminGet(page, "/api/admin/universes");
    expect(status).toBe(200);
    expect(Array.isArray(body)).toBe(true);
  });

  test("GET /api/admin/i18n/profiles returns 200 with an array", async ({ page }) => {
    const { status, body } = await adminGet(page, "/api/admin/i18n/profiles");
    expect(status).toBe(200);
    expect(Array.isArray(body)).toBe(true);
  });

  test("GET /api/admin/i18n/drafts returns 200 with an array", async ({ page }) => {
    const { status, body } = await adminGet(page, "/api/admin/i18n/drafts");
    expect(status).toBe(200);
    expect(Array.isArray(body)).toBe(true);
  });

  test("GET /api/admin/i18n/keys returns 200 with an array", async ({ page }) => {
    const { status, body } = await adminGet(page, "/api/admin/i18n/keys");
    expect(status).toBe(200);
    expect(Array.isArray(body)).toBe(true);
  });
});

test.describe("admin API — Bearer-token auth (no mocks)", () => {
  /**
   * End-to-end: mint an admin SDK key via the /devtools-auth server action,
   * then call /api/admin/gates with Authorization: Bearer <token>. Proves
   * the same path the devtools overlay takes actually works against real
   * D1/KV, not just the mocked route interceptor in devtools.spec.ts.
   */
  test("GET /api/admin/gates with freshly-minted bearer token returns 200", async ({
    page,
    context,
  }) => {
    // 1) Drive the popup flow inline to obtain a token. Reuse the same
    //    devtools-auth page the overlay uses; stub window.opener so the
    //    posted message lands somewhere we can read.
    await page.addInitScript(() => {
      const captured: { data: Record<string, unknown>; targetOrigin: string }[] = [];
      (window as unknown as { __posted: typeof captured }).__posted = captured;
      Object.defineProperty(window, "opener", {
        configurable: true,
        get: () => ({
          postMessage: (data: Record<string, unknown>, targetOrigin: string) =>
            captured.push({ data, targetOrigin }),
        }),
      });
      // Prevent the 600ms auto-close from ending the test page.
      window.close = () => {};
    });

    await page.goto(`/devtools-auth?origin=${encodeURIComponent("https://e2e.example.com")}`);
    await page.getByRole("button", { name: /Approve as/i }).click();
    await expect(page.getByText(/You can close this window/i)).toBeVisible();

    const token = await page.evaluate(() => {
      const posted = (
        window as unknown as {
          __posted: { data: { token?: string } }[];
        }
      ).__posted;
      return posted[0]?.data.token ?? null;
    });
    expect(token).toMatch(/^sdk_admin_/);

    // 2) Issue the admin call in a clean context (no cookies) so only the
    //    bearer token authenticates, exactly like a cross-origin customer embed.
    const clean = await context.browser()!.newContext();
    const res = await clean.request.get("/api/admin/gates", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = (await res.json()) as unknown;
    await clean.close();

    expect(res.status()).toBe(200);
    expect(Array.isArray(body)).toBe(true);
  });
});
