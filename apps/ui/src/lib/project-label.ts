/**
 * Canonical "label" string for a project — `<Display name>:<domain>` when a
 * domain is configured, falling back to the bare display name when it isn't
 * (legacy null-domain rows). Use this everywhere a project is referenced in
 * UI copy so the label stays consistent across the projects list, sidebar
 * switcher, and detail page header.
 */
export function projectLabel(name: string, domain: string | null | undefined): string {
  return domain ? `${name}:${domain}` : name;
}
