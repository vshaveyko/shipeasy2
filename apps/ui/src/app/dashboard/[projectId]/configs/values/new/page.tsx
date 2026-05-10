import { flags } from "@shipeasy/sdk/server";

import { FEATURES } from "@/lib/feature-flags";
import { NewConfigWizard } from "./wizard";

/**
 * Killswitch name read from Shipeasy itself. Payload shape: `{ value: boolean }`.
 * `value === true` enables draft wizard fields (group/owner/version stack).
 * Missing or `value: false` keeps them hidden — matching the `FEATURES` fallback.
 */
const DRAFT_FIELDS_KILLSWITCH = "ui.config_wizard_draft_fields";

type KillswitchPayload = { value?: boolean };

export default async function NewConfigPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  // Server-side read against the locally-cached blob populated by shipeasy()
  // in apps/ui/src/app/layout.tsx. Returns undefined when the killswitch
  // doesn't exist yet — fall back to the source-level FEATURES default.
  let draftFields = FEATURES.configWizardDraftFields;
  try {
    const ks = flags.getConfig<KillswitchPayload>(DRAFT_FIELDS_KILLSWITCH);
    if (ks && typeof ks.value === "boolean") draftFields = ks.value;
  } catch {
    // SDK not configured (e.g. local dev without keys) — keep the fallback.
  }

  return <NewConfigWizard projectId={projectId} draftFields={draftFields} />;
}
