/**
 * Source-level kill switches for in-progress UI. Default to `false`; flip the
 * value in code (or wire to env / Shipeasy killswitches later) to enable.
 */
/**
 * Draft wizard fields (group + owner) and version-stack panel in the
 * create-config wizard. Hidden until the data model and version history
 * back-end ship.
 */
export const FEATURES: {
  configWizardDraftFields: boolean;
} = {
  configWizardDraftFields: false,
};
