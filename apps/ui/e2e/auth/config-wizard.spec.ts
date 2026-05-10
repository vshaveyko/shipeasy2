/**
 * Create-config wizard end-to-end coverage.
 *
 * The new-config UI is a 4-step wizard (Details → Schema → Values → Review).
 * These tests exercise:
 *   - stepper navigation (Continue / Back / clickable steps)
 *   - Schema step: Add field opens EditField modal, type-pill picker, required
 *     toggle, description, enum option list, array item type, remove
 *   - Schema step: row click reopens the modal (editing from the table)
 *   - Schema step: JSON Schema view toggle reflects edits
 *   - Schema step: Import JSON populates fields with inferred types
 *   - Values step: row click opens type-specific value editor; numeric input,
 *     boolean toggle, enum radio
 *   - Values step: Paste JSON applies values to existing fields
 *   - Review step: metadata + values JSON appear; SDK snippet modal opens
 *     with language tabs
 *   - Publish flow: Create config submits and redirects with the row visible
 *     in the configs list
 */
import { expect, test, type Page } from "@playwright/test";

const RUN = Date.now();
const BASE = "/dashboard/e2e-project-id/configs/values/new";

// ── Helpers ───────────────────────────────────────────────────────────────────

async function gotoWizard(page: Page) {
  await page.goto(BASE);
  await expect(page.getByTestId("config-key-input")).toBeVisible();
}

async function continueTo(page: Page, label: "Schema" | "Default values" | "Review & integrate") {
  // Stepper steps are buttons with the visible label; Continue advances one.
  await page.getByRole("button", { name: /^continue$/i }).click();
  // Each step has a single h2 with the title — wait for it.
  if (label === "Schema") {
    await expect(page.getByRole("heading", { name: /define the schema/i })).toBeVisible();
  } else if (label === "Default values") {
    await expect(page.getByRole("heading", { name: /set default values/i })).toBeVisible();
  } else {
    await expect(page.getByRole("heading", { name: /review & integrate/i })).toBeVisible();
  }
}

function dialog(page: Page, title: RegExp) {
  return page.getByRole("dialog").filter({ has: page.getByText(title) });
}

async function addFieldAndSave(
  page: Page,
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
) {
  // Two "Add field" buttons coexist when no fields exist (toolbar + empty-state).
  // The toolbar button is always present; pick the first.
  await page
    .getByRole("button", { name: /^add field$/i })
    .first()
    .click();
  const d = dialog(page, /edit field/i);
  await expect(d).toBeVisible();

  // Field name
  const nameInput = d.getByRole("textbox", { name: /field name/i });
  await nameInput.fill(opts.name);

  // Type
  await d.getByRole("button", { name: new RegExp(`field type ${opts.type}`, "i") }).click();

  if (opts.required) {
    await d.getByRole("switch", { name: /required/i }).click();
  }

  if (opts.description) {
    // Description textarea is identified by its placeholder.
    await d.getByPlaceholder(/what this field controls/i).fill(opts.description);
  }

  if (opts.type === "enum" && opts.enumValues) {
    // Default has 2 placeholder options — top up to the requested count, then fill.
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
  test("stepper renders, Continue advances, Back returns", async ({ page }) => {
    await gotoWizard(page);
    await expect(
      page.getByRole("heading", { name: /name and describe this config/i }),
    ).toBeVisible();

    await continueTo(page, "Schema");
    await continueTo(page, "Default values");
    await continueTo(page, "Review & integrate");

    await expect(page.getByRole("button", { name: /^create config$/i })).toBeVisible();

    await page.getByRole("button", { name: /^back$/i }).click();
    await expect(page.getByRole("heading", { name: /set default values/i })).toBeVisible();
  });

  test("Cancel link returns to the configs list", async ({ page }) => {
    await gotoWizard(page);
    await page
      .getByRole("link", { name: /^cancel$/i })
      .first()
      .click();
    await expect(page).toHaveURL(/\/dashboard\/e2e-project-id\/configs\/values\/?$/);
  });

  test("clicking a stepper step jumps directly to it", async ({ page }) => {
    await gotoWizard(page);
    await page.getByRole("tab", { name: /review & integrate/i }).click();
    await expect(page.getByRole("heading", { name: /review & integrate/i })).toBeVisible();
  });
});

// ── Schema step ───────────────────────────────────────────────────────────────

test.describe("Create-config wizard — Schema step", () => {
  test("Add field opens the EditField modal and saved fields appear in the table", async ({
    page,
  }) => {
    await gotoWizard(page);
    await page.locator("#config-key").fill(`e2e_wiz_schema_${RUN}`);
    await continueTo(page, "Schema");

    await addFieldAndSave(page, {
      name: "feature_flag",
      type: "boolean",
      description: "Toggles the redesigned flow",
      required: true,
    });

    // Row visible in the schema table with the type pill.
    await expect(page.getByRole("button", { name: /feature_flag/ }).first()).toBeVisible();
    await expect(page.getByText("Toggles the redesigned flow", { exact: false })).toBeVisible();
  });

  test("clicking an existing row reopens the modal for editing", async ({ page }) => {
    await gotoWizard(page);
    await page.locator("#config-key").fill(`e2e_wiz_edit_${RUN}`);
    await continueTo(page, "Schema");

    await addFieldAndSave(page, { name: "rollout_pct", type: "number" });

    // Click the row — table cells are role=button containers wrapping the field.
    await page
      .getByRole("button", { name: /rollout_pct/ })
      .first()
      .click();
    const d = dialog(page, /edit field/i);
    await expect(d).toBeVisible();
    await expect(d.getByRole("textbox", { name: /field name/i })).toHaveValue("rollout_pct");

    // Switch type to string and rename.
    await d.getByRole("textbox", { name: /field name/i }).fill("rollout_label");
    await d.getByRole("button", { name: /field type string/i }).click();
    await d.getByRole("button", { name: /^save changes$/i }).click();

    await expect(page.getByRole("button", { name: /rollout_label/ }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /rollout_pct/ })).toHaveCount(0);
  });

  test("required toggle and description persist across modal re-open", async ({ page }) => {
    await gotoWizard(page);
    await page.locator("#config-key").fill(`e2e_wiz_required_${RUN}`);
    await continueTo(page, "Schema");

    await addFieldAndSave(page, {
      name: "support_email",
      type: "email",
      required: true,
      description: "Help desk address",
    });

    await page
      .getByRole("button", { name: /support_email/ })
      .first()
      .click();
    const d = dialog(page, /edit field/i);
    await expect(d.getByRole("switch", { name: /required/i })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    await expect(d.getByPlaceholder(/what this field controls/i)).toHaveValue("Help desk address");
    await d.getByRole("button", { name: /^cancel$/i }).click();
  });

  test("enum field exposes an options list with add/remove", async ({ page }) => {
    await gotoWizard(page);
    await page.locator("#config-key").fill(`e2e_wiz_enum_${RUN}`);
    await continueTo(page, "Schema");

    await addFieldAndSave(page, {
      name: "plan_tier",
      type: "enum",
      enumValues: ["free", "pro", "team"],
    });

    await page
      .getByRole("button", { name: /plan_tier/ })
      .first()
      .click();
    const d = dialog(page, /edit field/i);
    await expect(d.getByRole("textbox", { name: "Option 0" })).toHaveValue("free");
    await expect(d.getByRole("textbox", { name: "Option 1" })).toHaveValue("pro");
    await expect(d.getByRole("textbox", { name: "Option 2" })).toHaveValue("team");

    // Remove the middle option.
    await d.getByRole("button", { name: /remove option 1/i }).click();
    await expect(d.getByRole("textbox", { name: "Option 1" })).toHaveValue("team");

    // Add another.
    await d.getByRole("button", { name: /add option/i }).click();
    await d.getByRole("textbox", { name: "Option 2" }).fill("enterprise");
    await d.getByRole("button", { name: /^save changes$/i }).click();
  });

  test("array field lets you pick an item type", async ({ page }) => {
    await gotoWizard(page);
    await page.locator("#config-key").fill(`e2e_wiz_array_${RUN}`);
    await continueTo(page, "Schema");

    await addFieldAndSave(page, {
      name: "allowlist",
      type: "array",
      itemType: "string",
    });

    // Type pill includes <items> annotation.
    await expect(page.getByText(/array<string>/).first()).toBeVisible();
  });

  test("Remove field deletes the row from the table", async ({ page }) => {
    await gotoWizard(page);
    await page.locator("#config-key").fill(`e2e_wiz_remove_${RUN}`);
    await continueTo(page, "Schema");

    await addFieldAndSave(page, { name: "tmp_field", type: "string" });
    await expect(page.getByRole("button", { name: /tmp_field/ }).first()).toBeVisible();

    await page.getByRole("button", { name: "Remove field tmp_field", exact: true }).click();
    await expect(page.getByRole("button", { name: /tmp_field/ })).toHaveCount(0);
  });

  test("JSON Schema toggle reflects current fields", async ({ page }) => {
    await gotoWizard(page);
    await page.locator("#config-key").fill(`e2e_wiz_json_${RUN}`);
    await continueTo(page, "Schema");

    await addFieldAndSave(page, { name: "page_size", type: "number", required: true });
    await page.getByRole("button", { name: /jsonschema/i }).click();
    const pre = page.locator("pre").first();
    await expect(pre).toContainText('"type": "object"');
    await expect(pre).toContainText('"page_size"');
    await expect(pre).toContainText('"type": "number"');
    await expect(pre).toContainText('"required"');
  });

  test("Import JSON infers fields from a pasted object", async ({ page }) => {
    await gotoWizard(page);
    await page.locator("#config-key").fill(`e2e_wiz_import_${RUN}`);
    await continueTo(page, "Schema");

    await page.getByRole("button", { name: /import json/i }).click();
    const d = dialog(page, /import json/i);
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

    await expect(page.getByRole("button", { name: /page_size/ }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /feature_enabled/ }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /support_email/ }).first()).toBeVisible();
    // Email format inferred from the value shape (type pill renders "@email").
    await expect(page.getByText(/email/).first()).toBeVisible();
  });
});

// ── Values step ───────────────────────────────────────────────────────────────

test.describe("Create-config wizard — Values step", () => {
  test("number value editor accepts input and reflects it back in the row", async ({ page }) => {
    await gotoWizard(page);
    await page.locator("#config-key").fill(`e2e_wiz_num_${RUN}`);
    await continueTo(page, "Schema");
    await addFieldAndSave(page, { name: "rollout_pct", type: "number" });

    await continueTo(page, "Default values");
    await page
      .getByRole("button", { name: /rollout_pct/ })
      .first()
      .click();

    const d = dialog(page, /set value for/i);
    await expect(d).toBeVisible();
    await d.getByRole("spinbutton", { name: /numeric value/i }).fill("42");
    await d.getByRole("button", { name: /^save value$/i }).click();
    await expect(d).not.toBeVisible();

    // Value cell shows the new number.
    await expect(page.getByText("42").first()).toBeVisible();
  });

  test("boolean editor toggles between true and false", async ({ page }) => {
    await gotoWizard(page);
    await page.locator("#config-key").fill(`e2e_wiz_bool_${RUN}`);
    await continueTo(page, "Schema");
    await addFieldAndSave(page, { name: "feature_enabled", type: "boolean" });

    await continueTo(page, "Default values");
    await page
      .getByRole("button", { name: /feature_enabled/ })
      .first()
      .click();

    const d = dialog(page, /set value for/i);
    await d.getByRole("button", { name: /set value to true/i }).click();
    await d.getByRole("button", { name: /^save value$/i }).click();

    await expect(page.getByText("true", { exact: true }).first()).toBeVisible();
  });

  test("enum editor picks from the declared options", async ({ page }) => {
    await gotoWizard(page);
    await page.locator("#config-key").fill(`e2e_wiz_enumval_${RUN}`);
    await continueTo(page, "Schema");
    await addFieldAndSave(page, {
      name: "plan_tier",
      type: "enum",
      enumValues: ["free", "pro", "team"],
    });

    await continueTo(page, "Default values");
    await page
      .getByRole("button", { name: /plan_tier/ })
      .first()
      .click();

    const d = dialog(page, /set value for/i);
    await d.getByRole("button", { name: /^pro$/ }).click();
    await d.getByRole("button", { name: /^save value$/i }).click();

    await expect(page.getByText("pro", { exact: true }).first()).toBeVisible();
  });

  test("Paste JSON fills matching field defaults", async ({ page }) => {
    await gotoWizard(page);
    await page.locator("#config-key").fill(`e2e_wiz_paste_${RUN}`);
    await continueTo(page, "Schema");
    await addFieldAndSave(page, { name: "page_size", type: "number" });
    await addFieldAndSave(page, { name: "feature_enabled", type: "boolean" });

    await continueTo(page, "Default values");
    await page.getByRole("button", { name: /paste json/i }).click();
    const d = dialog(page, /paste json values/i);
    await d
      .getByRole("textbox", { name: /json values to apply/i })
      .fill('{"page_size": 100, "feature_enabled": true, "ignored_key": "x"}');
    await expect(d.getByText(/2\s+fields match the schema/i)).toBeVisible();
    await d.getByRole("button", { name: /apply values/i }).click();
    await expect(d).not.toBeVisible();

    await expect(page.getByText("100").first()).toBeVisible();
    await expect(page.getByText("true", { exact: true }).first()).toBeVisible();
  });
});

// ── Review + publish ──────────────────────────────────────────────────────────

test.describe("Create-config wizard — Review & publish", () => {
  test("Review step shows metadata, JSON, and the SDK snippet modal", async ({ page }) => {
    const key = `e2e_wiz_review_${RUN}`;
    await gotoWizard(page);
    await page.locator("#config-key").fill(key);
    await page
      .getByRole("textbox", { name: /^description$/i })
      .first()
      .fill("E2E review check");

    await continueTo(page, "Schema");
    await addFieldAndSave(page, { name: "page_size", type: "number" });

    await continueTo(page, "Default values");
    await continueTo(page, "Review & integrate");

    // Metadata reflected.
    await expect(page.getByText(key, { exact: true })).toBeVisible();
    await expect(page.getByText(/E2E review check/)).toBeVisible();
    // JSON preview includes the field key.
    await expect(page.getByText(/"page_size"/)).toBeVisible();

    // SDK snippet modal.
    await page.getByRole("button", { name: /view sdk snippet/i }).click();
    const d = dialog(page, /integrate this config/i);
    await expect(d).toBeVisible();
    // Default tab is TypeScript.
    await expect(d.locator("pre")).toContainText("@shipeasy/sdk/server");
    // Switch to Python tab.
    await d.getByRole("button", { name: /^python$/i }).click();
    await expect(d.locator("pre")).toContainText("from shipeasy import Shipeasy");
    // Close via Escape — the dialog has both a footer "Close" button and an
    // X icon-button with aria-label="Close", which is ambiguous by name.
    await page.keyboard.press("Escape");
    await expect(d).not.toBeVisible();
  });

  test("Create config submits and the new key appears in the list", async ({ page }) => {
    const key = `e2e_wiz_create_${RUN}`;
    await gotoWizard(page);
    await page.locator("#config-key").fill(key);
    await continueTo(page, "Schema");
    await addFieldAndSave(page, { name: "feature_enabled", type: "boolean" });
    await continueTo(page, "Default values");
    await continueTo(page, "Review & integrate");

    await page.getByRole("button", { name: /^create config$/i }).click();
    // createConfigAction redirects to /values/<id> (the editor for the new config).
    await expect(page).toHaveURL(/\/dashboard\/e2e-project-id\/configs\/values\/[^/]+$/);
    // The editor's left-rail tree (rendered by the values layout) lists the
    // freshly-created config — verify the key shows up there.
    await expect(page.getByText(key, { exact: true }).first()).toBeVisible();
  });
});
