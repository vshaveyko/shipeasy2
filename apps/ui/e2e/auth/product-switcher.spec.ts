import { test } from "@playwright/test";

// The standalone "Switch product" dropdown was removed in favour of a
// project-scoped sidebar where product tabs are surfaced inline (Gates,
// Configs, Experiments, …) under the active project. The dashboard home
// no longer renders "Open <product>" CTAs either — it shows product cards
// that link to the product root by name.
//
// These tests are kept skipped to document the design change. Re-enable
// only if a top-level product switcher is reintroduced.
test.describe.skip("Product switcher (removed — see file header)", () => {
  test("placeholder", () => {});
});
