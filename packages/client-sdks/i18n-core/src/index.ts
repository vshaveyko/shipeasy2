// Re-export shared types — server helpers are in @shipeasy/i18n-core/server
export type { LabelFile, FetchLabelsOptions } from "./types";

// ── Edit-labels marker encoding ───────────────────────────────────────────────
//
// When the devtools "Edit labels" mode is active (?se_edit_labels=1 in URL),
// the page's `window.i18n.t()` is patched (by an inline <head> script) to
// emit invisible Unicode marker strings instead of the translated value.
// The devtools script then scans the rendered DOM, finds those markers in
// text nodes, and replaces them with <span data-label="key"> elements — at
// which point the normal highlight/popper flow takes over.
//
// Markers use Unicode Interlinear Annotation characters (U+FFF9–U+FFFB).
// They are invisible in almost all rendering contexts and cannot appear in
// real user-facing copy.

/** Interlinear Annotation Anchor — marks the start of a label marker. */
export const LABEL_MARKER_START = "￹";
/** Interlinear Annotation Separator — separates key from translated value. */
export const LABEL_MARKER_SEP = "￺";
/** Interlinear Annotation Terminator — marks the end of a label marker. */
export const LABEL_MARKER_END = "￻";

/** Regex that matches a single label marker. Always reset lastIndex before use. */
export const LABEL_MARKER_RE =
  /￹([^￺￻]+)￺([^￻]*)￻/g;

/**
 * Encode a translation key + its rendered value into an invisible marker
 * string.  Call this from a patched `window.i18n.t` when edit-labels mode
 * is active.
 */
export function encodeLabelMarker(key: string, value: string): string {
  return `${LABEL_MARKER_START}${key}${LABEL_MARKER_SEP}${value}${LABEL_MARKER_END}`;
}

// ── data-label attribute helpers ──────────────────────────────────────────────

/**
 * Attribute object that every framework adapter spreads onto the element
 * wrapping a translated string. Kept here so the attribute names stay in
 * sync with the devtools overlay in a single place.
 */
export interface LabelAttrs {
  "data-label": string;
  "data-variables"?: string;
  "data-label-desc"?: string;
}

/**
 * Returns the `data-*` attributes that mark an element as an editable
 * translation label for the ShipEasy devtools "Edit labels" overlay.
 *
 * Framework-agnostic — spread the result onto any element:
 *
 * ```html
 * <!-- Vue -->
 * <span v-bind="labelAttrs('nav.cta')">{{ t('nav.cta') }}</span>
 *
 * <!-- Svelte -->
 * <span {...labelAttrs('nav.cta')}>{$i18n.t('nav.cta')}</span>
 *
 * <!-- Vanilla -->
 * Object.assign(el, labelAttrs('nav.cta'));
 * ```
 */
export function labelAttrs(
  key: string,
  variables?: Record<string, string | number>,
  desc?: string,
): LabelAttrs {
  const attrs: LabelAttrs = { "data-label": key };
  if (variables) attrs["data-variables"] = JSON.stringify(variables);
  if (desc) attrs["data-label-desc"] = desc;
  return attrs;
}
