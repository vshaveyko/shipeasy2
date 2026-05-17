/**
 * Create-config wizard end-to-end coverage.
 *
 * The new-config UI now lives inside `<BigModalWizard kind="configs">`, opened
 * by visiting `/configs/values?new=1`. Steps:
 *   1. Details — key + description
 *   2. Schema — field builder + JSON view toggle + Import JSON
 *   3. Defaults — per-field default value editor + Paste JSON
 *   4. Review — metadata + JSON preview + inline SDK snippets (Tabs + CodeBlock)
 *
 * These tests exercise:
 *   - dialog open / Next + Back navigation
 *   - Stepper backward jump
 *   - Schema step: Add field opens EditField, type pill, required toggle,
 *     description, enum options, array item type, remove
 *   - Schema step: row click reopens modal; JSON view toggle reflects edits;
 *     Import JSON populates fields
 *   - Defaults step: row click opens value editor; number / boolean / enum
 *   - Defaults step: Paste JSON applies values
 *   - Review step: metadata + JSON preview + Tabs/CodeBlock SDK snippets
 *   - Publish flow: Create config submits and redirects to `/values/<id>`
 */
import { expect, test, type Page, type Locator } from "@playwright/test";
import { setProjectPlan } from "../seed-fixtures";

const RUN = Date.now();
const BASE = "/dashboard/e2e-project-id/configs/values?new=1";

// Free plan caps configs at 1 — each wizard test creates a fresh config, so
// bump to paid for the whole spec to avoid 429s after the first create.
test.beforeAll(() => setProjectPlan("paid"));
test.afterAll(() => setProjectPlan("free"));

// ── Helpers ───────────────────────────────────────────────────────────────────

async function gotoWizard(page: Page): Promise<Locator> {
  await page.goto(BASE);
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByTestId("config-key-input")).toBeVisible();
  return dialog;
}

async function nextTo(dialog: Locator, label: "Schema" | "Defaults" | "Review"): Promise<void> {
  await dialog.getByRole("button", { name: /next/i }).click();
  // Step title is rendered as `<DialogTitle>` (Base UI renders an <h2>).
  // Scope assertion to the wizard dialog to avoid bumping into any nested
  // confirm dialogs that may also expose a title.
  await expect(dialog.locator('[data-slot="dialog-title"]')).toHaveText(label);
}

function innerDialog(page: Page, title: RegExp): Locator {
  // EditField / EditValue / Import-JSON / Paste-JSON each open as a separate
  // Dialog stacked over the wizard. Match by accessible name (DialogTitle) so
  // we don't collide with the wizard dialog when it incidentally contains the
  // same text (e.g. an "Import JSON" trigger button).
  return page.getByRole("dialog", { name: title });
}

async function addFieldAndSave(
  page: Page,
  wizard: Locator,
  opts: {
    name: string;
    type:
      | "string"
      | "number"
      | "boolean"
      | "date"
      | "datetime"
      | "email"
      | "url"
      | "uuid"
      | "enum"
      | "object"
      | "array";
    description?: string;
    required?: boolean;
    enumValues?: string[];
    itemType?: string;
  },
): Promise<void> {
  await wizard
    .getByRole("button", { name: /^add field$/i })
    .first()
    .click();
  const d = innerDialog(page, /edit field/i);
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
      const count = await d.getByRole("textbox", { name: `Option ${i}` }).count();
      if (count === 0) {
        await d.getByRole("button", { name: /add option/i }).click();
      }
      await d.getByRole("textbox", { name: `Option ${i}` }).fill(opts.enumValues[i]);
    }
  }

  if (opts.type === "array" && opts.itemType) {
    await d.getByRole("button", { name: new RegExp(`item type ${opts.itemType}`, "i") }).click();
  }

  await d.getByRole("button", { name: /^save changes$/i }).click();
  await expect(d).not.toBeVisible();
}

// ── Step navigation ───────────────────────────────────────────────────────────

test.describe("Create-config wizard — navigation", () => {
  test("Next advances and Back returns", async ({ page }) => {
    const dialog = await gotoWizard(page);
    await dialog.getByTestId("config-key-input").fill(`e2.wiz_nav_${RUN}`);
    await nextTo(dialog, "Schema");
    await nextTo(dialog, "Defaults");
    await nextTo(dialog, "Review");

    await expect(dialog.getByRole("button", { name: /create config/i })).toBeVisible();

    await dialog.getByRole("button", { name: /^back$/i }).click();
    await expect(dialog.locator('[data-slot="dialog-title"]')).toHaveText("Defaults");
  });

  test("close button strips ?new=1 and dialog hides", async ({ page }) => {
    const dialog = await gotoWizard(page);
    await dialog.getByRole("button", { name: /^close$/i }).click();
    await expect(page).toHaveURL(/\/dashboard\/e2e-project-id\/configs\/values\/?$/);
  });

  test("clicking a past stepper step jumps back", async ({ page }) => {
    const dialog = await gotoWizard(page);
    await dialog.getByTestId("config-key-input").fill(`e2.wiz_jump_${RUN}`);
    await nextTo(dialog, "Schema");
    await nextTo(dialog, "Defaults");

    // Stepper buttons render a CheckIcon (no text) once done, so target the
    // first `data-state="done"` button instead of matching by name.
    await dialog.locator('[data-slot="stepper"] button[data-state="done"]').first().click();
    await expect(dialog.locator('[data-slot="dialog-title"]')).toHaveText("Details");
  });
});

// ── Schema step ───────────────────────────────────────────────────────────────

test.describe("Create-config wizard — Schema step", () => {
  test("Add field opens the EditField modal and saved fields appear in the table", async ({
    page,
  }) => {
    const dialog = await gotoWizard(page);
    await dialog.getByTestId("config-key-input").fill(`e2.wiz_schema_${RUN}`);
    await nextTo(dialog, "Schema");

    await addFieldAndSave(page, dialog, {
      name: "feature_flag",
      type: "boolean",
      description: "Toggles the redesigned flow",
      required: true,
    });

    await expect(dialog.getByRole("button", { name: /feature_flag/ }).first()).toBeVisible();
    await expect(dialog.getByText("Toggles the redesigned flow", { exact: false })).toBeVisible();
  });

  test("clicking an existing row reopens the modal for editing", async ({ page }) => {
    const dialog = await gotoWizard(page);
    await dialog.getByTestId("config-key-input").fill(`e2.wiz_edit_${RUN}`);
    await nextTo(dialog, "Schema");

    await addFieldAndSave(page, dialog, { name: "rollout_pct", type: "number" });

    await dialog
      .getByRole("button", { name: /rollout_pct/ })
      .first()
      .click();
    const d = innerDialog(page, /edit field/i);
    await expect(d).toBeVisible();
    await expect(d.getByRole("textbox", { name: /field name/i })).toHaveValue("rollout_pct");

    await d.getByRole("textbox", { name: /field name/i }).fill("rollout_label");
    await d.getByRole("button", { name: /field type string/i }).click();
    await d.getByRole("button", { name: /^save changes$/i }).click();

    await expect(dialog.getByRole("button", { name: /rollout_label/ }).first()).toBeVisible();
    await expect(dialog.getByRole("button", { name: /rollout_pct/ })).toHaveCount(0);
  });

  test("required toggle and description persist across modal re-open", async ({ page }) => {
    const dialog = await gotoWizard(page);
    await dialog.getByTestId("config-key-input").fill(`e2.wiz_required_${RUN}`);
    await nextTo(dialog, "Schema");

    await addFieldAndSave(page, dialog, {
      name: "support_email",
      type: "email",
      required: true,
      description: "Help desk address",
    });

    await dialog
      .getByRole("button", { name: /support_email/ })
      .first()
      .click();
    const d = innerDialog(page, /edit field/i);
    await expect(d.getByRole("switch", { name: /required/i })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    await expect(d.getByPlaceholder(/what this field controls/i)).toHaveValue("Help desk address");
    await d.getByRole("button", { name: /^cancel$/i }).click();
  });

  test("enum field exposes an options list with add/remove", async ({ page }) => {
    const dialog = await gotoWizard(page);
    await dialog.getByTestId("config-key-input").fill(`e2.wiz_enum_${RUN}`);
    await nextTo(dialog, "Schema");

    await addFieldAndSave(page, dialog, {
      name: "plan_tier",
      type: "enum",
      enumValues: ["free", "pro", "team"],
    });

    await dialog
      .getByRole("button", { name: /plan_tier/ })
      .first()
      .click();
    const d = innerDialog(page, /edit field/i);
    await expect(d.getByRole("textbox", { name: "Option 0" })).toHaveValue("free");
    await expect(d.getByRole("textbox", { name: "Option 1" })).toHaveValue("pro");
    await expect(d.getByRole("textbox", { name: "Option 2" })).toHaveValue("team");

    await d.getByRole("button", { name: /remove option 1/i }).click();
    await expect(d.getByRole("textbox", { name: "Option 1" })).toHaveValue("team");

    await d.getByRole("button", { name: /add option/i }).click();
    await d.getByRole("textbox", { name: "Option 2" }).fill("enterprise");
    await d.getByRole("button", { name: /^save changes$/i }).click();
  });

  test("array field lets you pick an item type", async ({ page }) => {
    const dialog = await gotoWizard(page);
    await dialog.getByTestId("config-key-input").fill(`e2.wiz_array_${RUN}`);
    await nextTo(dialog, "Schema");

    await addFieldAndSave(page, dialog, {
      name: "allowlist",
      type: "array",
      itemType: "string",
    });

    await expect(dialog.getByText(/array<string>/).first()).toBeVisible();
  });

  test("Remove field deletes the row from the table", async ({ page }) => {
    const dialog = await gotoWizard(page);
    await dialog.getByTestId("config-key-input").fill(`e2.wiz_remove_${RUN}`);
    await nextTo(dialog, "Schema");

    await addFieldAndSave(page, dialog, { name: "tmp_field", type: "string" });
    await expect(dialog.getByRole("button", { name: /tmp_field/ }).first()).toBeVisible();

    await dialog.getByRole("button", { name: "Remove field tmp_field", exact: true }).click();
    await expect(dialog.getByRole("button", { name: /tmp_field/ })).toHaveCount(0);
  });

  test("JSON Schema toggle reflects current fields", async ({ page }) => {
    const dialog = await gotoWizard(page);
    await dialog.getByTestId("config-key-input").fill(`e2.wiz_json_${RUN}`);
    await nextTo(dialog, "Schema");

    await addFieldAndSave(page, dialog, {
      name: "page_size",
      type: "number",
      required: true,
    });
    await dialog.getByRole("button", { name: /jsonschema/i }).click();
    const pre = dialog.locator("pre").first();
    await expect(pre).toContainText('"type": "object"');
    await expect(pre).toContainText('"page_size"');
    await expect(pre).toContainText('"type": "number"');
    await expect(pre).toContainText('"required"');
  });

  test("Import JSON infers fields from a pasted object", async ({ page }) => {
    const dialog = await gotoWizard(page);
    await dialog.getByTestId("config-key-input").fill(`e2.wiz_import_${RUN}`);
    await nextTo(dialog, "Schema");

    await dialog.getByRole("button", { name: /import json/i }).click();
    const d = innerDialog(page, /import json/i);
    await d.getByRole("textbox", { name: /json to import/i }).fill(
      JSON.stringify({
        page_size: 25,
        feature_enabled: true,
        support_email: "help@shipeasy.dev",
      }),
    );
    await expect(d.getByText(/will import\s+3\s+root fields/i)).toBeVisible();
    await d.getByRole("button", { name: /^import$/i }).click();
    await expect(d).not.toBeVisible();

    await expect(dialog.getByRole("button", { name: /page_size/ }).first()).toBeVisible();
    await expect(dialog.getByRole("button", { name: /feature_enabled/ }).first()).toBeVisible();
    await expect(dialog.getByRole("button", { name: /support_email/ }).first()).toBeVisible();
    await expect(dialog.getByText(/email/).first()).toBeVisible();
  });
});

// ── Defaults step ─────────────────────────────────────────────────────────────

test.describe("Create-config wizard — Defaults step", () => {
  test("number value editor accepts input and reflects it back in the row", async ({ page }) => {
    const dialog = await gotoWizard(page);
    await dialog.getByTestId("config-key-input").fill(`e2.wiz_num_${RUN}`);
    await nextTo(dialog, "Schema");
    await addFieldAndSave(page, dialog, { name: "rollout_pct", type: "number" });

    await nextTo(dialog, "Defaults");
    await dialog
      .getByRole("button", { name: /rollout_pct/ })
      .first()
      .click();

    const d = innerDialog(page, /set value for/i);
    await expect(d).toBeVisible();
    await d.getByRole("spinbutton", { name: /numeric value/i }).fill("42");
    await d.getByRole("button", { name: /^save value$/i }).click();
    await expect(d).not.toBeVisible();

    await expect(dialog.getByText("42").first()).toBeVisible();
  });

  test("boolean editor toggles between true and false", async ({ page }) => {
    const dialog = await gotoWizard(page);
    await dialog.getByTestId("config-key-input").fill(`e2.wiz_bool_${RUN}`);
    await nextTo(dialog, "Schema");
    await addFieldAndSave(page, dialog, { name: "feature_enabled", type: "boolean" });

    await nextTo(dialog, "Defaults");
    await dialog
      .getByRole("button", { name: /feature_enabled/ })
      .first()
      .click();

    const d = innerDialog(page, /set value for/i);
    await d.getByRole("button", { name: /set value to true/i }).click();
    await d.getByRole("button", { name: /^save value$/i }).click();

    await expect(dialog.getByText("true", { exact: true }).first()).toBeVisible();
  });

  test("enum editor picks from the declared options", async ({ page }) => {
    const dialog = await gotoWizard(page);
    await dialog.getByTestId("config-key-input").fill(`e2.wiz_enumval_${RUN}`);
    await nextTo(dialog, "Schema");
    await addFieldAndSave(page, dialog, {
      name: "plan_tier",
      type: "enum",
      enumValues: ["free", "pro", "team"],
    });

    await nextTo(dialog, "Defaults");
    await dialog
      .getByRole("button", { name: /plan_tier/ })
      .first()
      .click();

    const d = innerDialog(page, /set value for/i);
    await d.getByRole("button", { name: /^pro$/ }).click();
    await d.getByRole("button", { name: /^save value$/i }).click();

    await expect(dialog.getByText("pro", { exact: true }).first()).toBeVisible();
  });

  test("Paste JSON fills matching field defaults", async ({ page }) => {
    const dialog = await gotoWizard(page);
    await dialog.getByTestId("config-key-input").fill(`e2.wiz_paste_${RUN}`);
    await nextTo(dialog, "Schema");
    await addFieldAndSave(page, dialog, { name: "page_size", type: "number" });
    await addFieldAndSave(page, dialog, { name: "feature_enabled", type: "boolean" });

    await nextTo(dialog, "Defaults");
    await dialog.getByRole("button", { name: /paste json/i }).click();
    const d = innerDialog(page, /paste json values/i);
    await d
      .getByRole("textbox", { name: /json values to apply/i })
      .fill('{"page_size": 100, "feature_enabled": true, "ignored_key": "x"}');
    await expect(d.getByText(/2\s+fields match the schema/i)).toBeVisible();
    await d.getByRole("button", { name: /apply values/i }).click();
    await expect(d).not.toBeVisible();

    await expect(dialog.getByText("100").first()).toBeVisible();
    await expect(dialog.getByText("true", { exact: true }).first()).toBeVisible();
  });
});

// ── Review + publish ──────────────────────────────────────────────────────────

test.describe("Create-config wizard — Review & publish", () => {
  test("Review step shows metadata, JSON preview, and Tabs/CodeBlock SDK snippets", async ({
    page,
  }) => {
    const key = `e2.wiz_review_${RUN}`;
    const dialog = await gotoWizard(page);
    await dialog.getByTestId("config-key-input").fill(key);
    await dialog
      .getByRole("textbox", { name: /^description$/i })
      .first()
      .fill("E2E review check");

    await nextTo(dialog, "Schema");
    await addFieldAndSave(page, dialog, { name: "page_size", type: "number" });

    await nextTo(dialog, "Defaults");
    await nextTo(dialog, "Review");

    await expect(dialog.getByText(key, { exact: false }).first()).toBeVisible();
    await expect(dialog.getByText(/E2E review check/)).toBeVisible();
    await expect(dialog.getByText(/"page_size"/)).toBeVisible();

    // Inline SDK snippets — Tabs default to TypeScript.
    await expect(dialog.getByRole("tab", { name: /typescript/i })).toBeVisible();
    await expect(dialog.locator("pre").filter({ hasText: "@shipeasy/sdk" }).first()).toBeVisible();
    await dialog.getByRole("tab", { name: /^python$/i }).click();
    await expect(
      dialog.locator("pre").filter({ hasText: "from shipeasy import client" }).first(),
    ).toBeVisible();
  });

  test("Create config submits and the wizard redirects to the editor page", async ({ page }) => {
    const key = `e2.wiz_create_${RUN}`;
    const dialog = await gotoWizard(page);
    await dialog.getByTestId("config-key-input").fill(key);
    await nextTo(dialog, "Schema");
    await addFieldAndSave(page, dialog, { name: "feature_enabled", type: "boolean" });
    await nextTo(dialog, "Defaults");
    await nextTo(dialog, "Review");

    await dialog.getByRole("button", { name: /create config/i }).click();
    // createConfigAction redirects to /values/<id> after persisting.
    await expect(page).toHaveURL(/\/dashboard\/e2e-project-id\/configs\/values\/[^/?]+$/);
  });
});
