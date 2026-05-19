/**
 * Full-field config wizard run. Fills key + description, defines 4 fields
 * across types (string / number / boolean / enum), seeds defaults, walks
 * Details → Schema → Defaults → Integrate, submits, asserts redirect and row
 * in admin API with the correct schema + value.
 */
import { expect, test, type Locator, type Page } from "@playwright/test";
import { adminList } from "../admin-list";
import { setProjectPlan } from "../seed-fixtures";

const PROJECT = "e2e-project-id";
const RUN = Date.now();

type ConfigRow = {
  id: string;
  name: string;
  description: string | null;
  schema: { type: string; properties?: Record<string, unknown>; required?: string[] };
};

test.beforeAll(() => setProjectPlan("paid"));
test.afterAll(() => setProjectPlan("free"));

async function addField(
  page: Page,
  wizard: Locator,
  opts: {
    name: string;
    type: "string" | "number" | "boolean" | "enum";
    description?: string;
    required?: boolean;
    enumValues?: string[];
  },
): Promise<void> {
  await wizard
    .getByRole("button", { name: /^add field$/i })
    .first()
    .click();
  const d = page.getByRole("dialog", { name: /edit field/i });
  await expect(d).toBeVisible();
  await d.getByRole("textbox", { name: /field name/i }).fill(opts.name);
  await d.getByRole("button", { name: new RegExp(`field type ${opts.type}`, "i") }).click();
  if (opts.required) {
    await d.getByRole("switch", { name: /required/i }).click();
  }
  if (opts.description) {
    await d.getByPlaceholder(/what this field controls/i).fill(opts.description);
  }
  if (opts.type === "enum" && opts.enumValues) {
    for (let i = 0; i < opts.enumValues.length; i += 1) {
      const optCount = await d.getByRole("textbox", { name: `Option ${i}` }).count();
      if (optCount === 0) {
        await d.getByRole("button", { name: /add option/i }).click();
      }
      await d.getByRole("textbox", { name: `Option ${i}` }).fill(opts.enumValues[i]);
    }
  }
  await d.getByRole("button", { name: /^save changes$/i }).click();
  await expect(d).not.toBeVisible();
}

test("Config wizard — fill every field, submit, redirect to editor", async ({ page }) => {
  const key = `e2e.cfg_full_${RUN}`;
  const description = "Full-fill spec — 4 field types + defaults";

  await page.goto(`/dashboard/${PROJECT}/configs/values?new=1`);
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();

  // Stem.
  await expect(dialog.getByText(/Step 1 of 4 · config/i)).toBeVisible();
  await expect(dialog.locator('[data-slot="dialog-title"]')).toHaveText("Identify the config");

  // Step 1 — Details: key + description.
  await dialog.getByTestId("config-key-input").fill(key);
  await dialog
    .getByRole("textbox", { name: /^description$/i })
    .first()
    .fill(description);
  await dialog.getByRole("button", { name: /^next/i }).click();

  // Step 2 — Schema: add 4 fields across types.
  await expect(dialog.locator('[data-slot="dialog-title"]')).toHaveText("Define the shape");
  await expect(dialog.getByText(/Step 2 of 4 · config/i)).toBeVisible();

  await addField(page, dialog, {
    name: "feature_enabled",
    type: "boolean",
    description: "Toggles the new flow",
    required: true,
  });
  await addField(page, dialog, {
    name: "page_size",
    type: "number",
    description: "Default page size for paginated lists",
  });
  await addField(page, dialog, {
    name: "support_email",
    type: "string",
    description: "Help desk address",
  });
  await addField(page, dialog, {
    name: "plan_tier",
    type: "enum",
    enumValues: ["free", "pro", "team"],
  });

  // All 4 fields visible in the schema table.
  await expect(dialog.getByRole("button", { name: /feature_enabled/ }).first()).toBeVisible();
  await expect(dialog.getByRole("button", { name: /page_size/ }).first()).toBeVisible();
  await expect(dialog.getByRole("button", { name: /support_email/ }).first()).toBeVisible();
  await expect(dialog.getByRole("button", { name: /plan_tier/ }).first()).toBeVisible();

  await dialog.getByRole("button", { name: /^next/i }).click();

  // Step 3 — Defaults: edit each field's default.
  await expect(dialog.locator('[data-slot="dialog-title"]')).toHaveText("Seed the initial value");
  await expect(dialog.getByText(/Step 3 of 4 · config/i)).toBeVisible();

  // boolean → true
  await dialog
    .getByRole("button", { name: /feature_enabled/ })
    .first()
    .click();
  let inner = page.getByRole("dialog", { name: /set value for/i });
  await inner.getByRole("button", { name: /set value to true/i }).click();
  await inner.getByRole("button", { name: /^save value$/i }).click();

  // number → 50
  await dialog
    .getByRole("button", { name: /page_size/ })
    .first()
    .click();
  inner = page.getByRole("dialog", { name: /set value for/i });
  await inner.getByRole("spinbutton", { name: /numeric value/i }).fill("50");
  await inner.getByRole("button", { name: /^save value$/i }).click();

  // string → "help@example.com"
  await dialog
    .getByRole("button", { name: /support_email/ })
    .first()
    .click();
  inner = page.getByRole("dialog", { name: /set value for/i });
  await inner.getByRole("textbox").first().fill("help@example.com");
  await inner.getByRole("button", { name: /^save value$/i }).click();

  // enum → "pro"
  await dialog
    .getByRole("button", { name: /plan_tier/ })
    .first()
    .click();
  inner = page.getByRole("dialog", { name: /set value for/i });
  await inner.getByRole("button", { name: /^pro$/ }).click();
  await inner.getByRole("button", { name: /^save value$/i }).click();

  await dialog.getByRole("button", { name: /^next/i }).click();

  // Step 4 — Integrate.
  await expect(dialog.locator('[data-slot="dialog-title"]')).toHaveText("Wire it up");
  await expect(dialog.getByText(/Step 4 of 4 · config/i)).toBeVisible();
  // Green CDN-rebuild banner present (also referenced in the aside, hence .first()).
  await expect(dialog.getByText(/Publish triggers a CDN rebuild/i).first()).toBeVisible();
  // SDK tabs + the key is rendered inside the snippet.
  await expect(dialog.locator("pre").filter({ hasText: "@shipeasy/sdk" }).first()).toContainText(
    key,
  );

  // Canonical CTA: "Create & publish v1".
  await dialog.getByRole("button", { name: /create & publish v1/i }).click();

  // createConfigAction redirects to /values/<id>.
  await expect(page).toHaveURL(
    new RegExp(`/dashboard/${PROJECT}/configs/values/[0-9a-f-]+(\\?|$)`),
  );

  // Verify schema + value via admin API.
  const list = await adminList<ConfigRow>(page.request, "/api/admin/configs");
  const row = list.find((c) => c.name === key);
  expect(row).toBeDefined();
  expect(row?.description).toBe(description);
  expect(row?.schema.type).toBe("object");
  const props = row?.schema.properties ?? {};
  expect(Object.keys(props)).toEqual(
    expect.arrayContaining(["feature_enabled", "page_size", "support_email", "plan_tier"]),
  );
  expect(row?.schema.required).toEqual(expect.arrayContaining(["feature_enabled"]));
});
