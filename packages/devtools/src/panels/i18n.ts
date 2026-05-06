import { LABEL_MARKER_RE, LABEL_MARKER_START } from "@shipeasy/sdk/client";
import { DevtoolsApi } from "../api";
import {
  getI18nDraftOverride,
  getI18nLabelOverride,
  getI18nProfileOverride,
  isEditLabelsModeActive,
  setEditLabelsMode,
  setI18nDraftOverride,
  setI18nLabelOverride,
  setI18nProfileOverride,
} from "../overrides";
import type { DraftRecord, KeyRecord, ProfileRecord } from "../types";
import { emptyState } from "./empty";

// ── Tree model ────────────────────────────────────────────────────────────────

interface TreeNode {
  segment: string;
  fullKey?: string;
  value?: string;
  children: TreeNode[];
}

function buildChunks(keys: KeyRecord[]): Map<string, TreeNode> {
  const chunks = new Map<string, TreeNode>();
  for (const k of keys) {
    const parts = k.key.split(".");
    const head = parts.length > 1 ? parts[0] : "(root)";
    const rest = parts.length > 1 ? parts.slice(1) : parts;
    if (!chunks.has(head)) chunks.set(head, { segment: head, children: [] });
    let node = chunks.get(head)!;
    for (let i = 0; i < rest.length; i++) {
      const seg = rest[i];
      let child = node.children.find((c) => c.segment === seg);
      if (!child) {
        child = { segment: seg, children: [] };
        node.children.push(child);
      }
      node = child;
    }
    node.value = k.value;
    node.fullKey = k.key;
  }
  for (const node of chunks.values()) sortTree(node);
  return chunks;
}

function sortTree(node: TreeNode): void {
  // Branches before leaves, alphabetical within each group.
  node.children.sort((a, b) => {
    const aLeaf = a.value !== undefined;
    const bLeaf = b.value !== undefined;
    if (aLeaf !== bLeaf) return aLeaf ? 1 : -1;
    return a.segment.localeCompare(b.segment);
  });
  for (const c of node.children) sortTree(c);
}

function escapeHtml(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]!,
  );
}

function renderTreeNode(node: TreeNode, depth: number): string {
  const pad = depth * 14 + 6;
  if (node.value !== undefined) {
    const override = node.fullKey ? getI18nLabelOverride(node.fullKey) : null;
    const shown = override ?? node.value;
    return `
      <div class="tree-row leaf" style="padding-left:${pad}px" data-key="${escapeHtml(node.fullKey ?? "")}">
        <span class="tree-seg">${escapeHtml(node.segment)}</span>
        <span class="tree-val${override !== null ? " overridden" : ""}" title="${escapeHtml(shown)}">${escapeHtml(shown)}</span>
      </div>`;
  }
  const kids = node.children.map((c) => renderTreeNode(c, depth + 1)).join("");
  return `
    <div class="tree-branch">
      <div class="tree-row branch" role="button" tabindex="0" style="padding-left:${pad}px" data-branch>
        <span class="tree-caret">▾</span>
        <span class="tree-seg">${escapeHtml(node.segment)}</span>
      </div>
      <div class="tree-children">${kids}</div>
    </div>`;
}

// ── Edit-labels mode ──────────────────────────────────────────────────────────

const LABEL_CLASS = "__se_label_target";
const LABEL_STYLE_ID = "__se_label_target_style";
let editLabelsActive = false;
let cleanupEditLabels: (() => void) | null = null;
let activePopper: HTMLElement | null = null;

// Set once when renderI18nPanel loads; used by openLabelPopper for API saves.
let panelApi: DevtoolsApi | null = null;
let panelKeys: KeyRecord[] = [];

/**
 * Inject the label highlight rules into the *page's* document.head — our
 * main shadow-root stylesheet is scoped to the shadow tree and can't reach
 * customer DOM, so without this nothing visible happens when edit mode is
 * on. Keeping the rules out of the global stylesheet means we don't leak
 * accent colors to pages that haven't opened the panel.
 */
function installLabelHighlightStyles(): void {
  if (document.getElementById(LABEL_STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = LABEL_STYLE_ID;
  style.textContent = `
    .${LABEL_CLASS} {
      outline: 2px solid #4ade80 !important;
      outline-offset: 2px !important;
      cursor: pointer !important;
      background-color: color-mix(in oklab, #4ade80 14%, transparent) !important;
      border-radius: 3px !important;
      box-shadow: 0 0 0 1px color-mix(in oklab, #4ade80 25%, transparent) !important;
      transition:
        background-color 0.12s,
        box-shadow 0.12s,
        outline-color 0.12s !important;
      position: relative;
    }
    .${LABEL_CLASS}:hover,
    .${LABEL_CLASS}.__se_label_active {
      background-color: color-mix(in oklab, #4ade80 28%, transparent) !important;
      box-shadow:
        0 0 0 4px color-mix(in oklab, #4ade80 35%, transparent),
        0 4px 14px color-mix(in oklab, #4ade80 30%, transparent) !important;
      outline-color: #6ee7a0 !important;
      z-index: 1;
    }
  `;
  document.head.appendChild(style);
}

function removeLabelHighlightStyles(): void {
  document.getElementById(LABEL_STYLE_ID)?.remove();
}

/**
 * Walk all text nodes under `root`, find label markers emitted by the patched
 * `window.i18n.t()`, and replace each one with a `<span data-label="key">`
 * element so the normal highlight/popper flow can take over.  Returns the
 * number of spans created.
 *
 * This is safe to call multiple times — already-replaced nodes have no
 * markers left, so a second pass is a no-op.
 */
export function scanAndReplaceMarkers(root: Node = document.body): number {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const replacements: Array<[Text, DocumentFragment]> = [];

  const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE"]);

  let node: Text | null;
  while ((node = walker.nextNode() as Text | null)) {
    const text = node.nodeValue ?? "";
    if (!text.includes(LABEL_MARKER_START)) continue;
    // Skip raw source nodes — the interceptor <script> in <head> contains the
    // literal Unicode marker characters in its source text, which would be
    // mistakenly parsed as label markers.
    if (SKIP_TAGS.has(node.parentElement?.tagName ?? "")) continue;
    // Skip text nodes already inside a [data-label] span — t() / ShipEasyI18nString
    // wraps t() output in a span with data-label already set; the inner text node
    // would otherwise produce a nested span with the same key (double-wrap).
    if ((node.parentElement as Element)?.closest?.("[data-label]")) continue;

    const frag = document.createDocumentFragment();
    let lastIdx = 0;
    LABEL_MARKER_RE.lastIndex = 0;
    let m: RegExpExecArray | null;

    while ((m = LABEL_MARKER_RE.exec(text)) !== null) {
      if (m.index > lastIdx) {
        frag.appendChild(document.createTextNode(text.slice(lastIdx, m.index)));
      }
      const key = m[1];
      const varsJson = m[2];
      const value = m[3];
      const span = document.createElement("span");
      span.setAttribute("data-label", key);
      if (varsJson) span.setAttribute("data-variables", varsJson);
      const override = getI18nLabelOverride(key);
      // The override is a template (with `{{var}}` placeholders preserved by
      // the popper validator). Interpolate it with the call-site's vars so the
      // displayed text matches what the SDK would have rendered.
      let parsedVars: Record<string, unknown> | null = null;
      if (varsJson) {
        try {
          parsedVars = JSON.parse(varsJson);
        } catch {
          parsedVars = null;
        }
      }
      span.textContent = override !== null ? interpolate(override, parsedVars) : value;
      frag.appendChild(span);
      lastIdx = m.index + m[0].length;
    }

    if (lastIdx < text.length) {
      frag.appendChild(document.createTextNode(text.slice(lastIdx)));
    }

    replacements.push([node, frag]);
  }

  for (const [n, frag] of replacements) n.parentNode?.replaceChild(frag, n);

  // t() / ShipEasyI18nString spans already carry data-label. Their text may be:
  //   A) A marker string — SDK's t() was also patched (unlikely but handled).
  //   B) The raw key — SDK's internal store has no translations yet.
  //   C) The clean translated text — SDK already has translations loaded.
  //
  // For cases A and B we look up the translation via the patched window.i18n.t(),
  // which always returns a marker-wrapped string once the CDN loader has run.
  // The scanner skipped these text nodes above to avoid double-wrapping, so we
  // handle them here after the text-node pass.
  // window._sei18n_t is the original (unpatched) CDN loader t() stashed by the
  // interceptor. Using it instead of the patched window.i18n.t() avoids emitting
  // markers (and any side-effects like CDN loader "update" events) on each call.
  const origT = (
    window as Window & { _sei18n_t?: (k: string, x?: Record<string, string | number>) => string }
  )._sei18n_t;
  for (const el of Array.from(document.querySelectorAll<HTMLElement>("[data-label]"))) {
    const text = el.textContent ?? "";
    const key = el.getAttribute("data-label")!;
    const override = getI18nLabelOverride(key);

    if (text.includes(LABEL_MARKER_START)) {
      // Span text is a marker string — extract the translated value (m[3] in
      // the 3-section format) and stash the vars JSON onto the span.
      LABEL_MARKER_RE.lastIndex = 0;
      const m = LABEL_MARKER_RE.exec(text);
      if (m) {
        if (m[2]) el.setAttribute("data-variables", m[2]);
        const parsedVars = m[2] ? safeParseJSON(m[2]) : null;
        el.textContent = override !== null ? interpolate(override, parsedVars) : m[3];
      }
    } else if (origT) {
      // Span text is the raw key or already-translated text from the SDK's own t().
      // Look up the real translation via the stashed original CDN t(), no side-effects.
      try {
        const variables = el.dataset.variables
          ? (JSON.parse(el.dataset.variables) as Record<string, string | number>)
          : undefined;
        const translated = origT(key, variables);
        if (override !== null) el.textContent = interpolate(override, variables ?? null);
        else if (translated && translated !== key) el.textContent = translated;
      } catch {
        // JSON.parse failure — leave textContent unchanged
      }
    }
  }

  // Marker strings can also land in HTML attributes (placeholder, alt, aria-label,
  // title, value, …) where text nodes never exist. Strip the markers so screen
  // readers and browser tooltips render the clean translated value, and record
  // each (attr, key) pair as JSON on the host element so the edit popper can
  // surface a tab for every translatable attribute.
  for (const el of Array.from(document.querySelectorAll<HTMLElement>("*"))) {
    const existing = readLabelAttrs(el);
    const byAttr = new Map<string, LabelAttrEntry>();
    for (const e of existing) byAttr.set(e.attr, e);

    let changed = false;
    for (const attribute of Array.from(el.attributes)) {
      const v = attribute.value;
      if (!v.includes(LABEL_MARKER_START)) continue;
      LABEL_MARKER_RE.lastIndex = 0;
      const m = LABEL_MARKER_RE.exec(v);
      if (!m) continue;
      const key = m[1];
      const original = m[3];
      const override = getI18nLabelOverride(key);
      el.setAttribute(attribute.name, override ?? original);
      byAttr.set(attribute.name, { attr: attribute.name, key, original });
      changed = true;
    }
    if (changed) writeLabelAttrs(el, Array.from(byAttr.values()));
  }

  return replacements.length;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function listPlaceholders(template: string): string[] {
  const out: string[] = [];
  const re = /\{\{(\w+)\}\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(template)) !== null) out.push(m[1]);
  return out;
}

function interpolate(template: string, vars: Record<string, unknown> | null | undefined): string {
  if (!vars) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (_, p) => {
    const v = vars[p];
    return v != null ? String(v) : `{{${p}}}`;
  });
}

function safeParseJSON(s: string): Record<string, unknown> | null {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

function getDictTemplate(key: string): string | null {
  const bs = (
    window as Window & { __SE_BOOTSTRAP?: { i18n?: { strings?: Record<string, string> } } }
  ).__SE_BOOTSTRAP;
  const t = bs?.i18n?.strings?.[key];
  return typeof t === "string" ? t : null;
}

interface LabelAttrEntry {
  attr: string;
  key: string;
  original: string;
}

function readLabelAttrs(el: HTMLElement): LabelAttrEntry[] {
  const raw = el.getAttribute("data-label-attrs");
  if (!raw) return [];
  try {
    const v = JSON.parse(raw) as unknown;
    if (Array.isArray(v)) return v as LabelAttrEntry[];
  } catch {
    /* malformed — discard */
  }
  return [];
}

function writeLabelAttrs(el: HTMLElement, entries: LabelAttrEntry[]): void {
  if (entries.length === 0) {
    el.removeAttribute("data-label-attrs");
    return;
  }
  el.setAttribute("data-label-attrs", JSON.stringify(entries));
}

const LABEL_SELECTOR = "[data-label], [data-label-attrs]";

function qualifyingLabels(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>(LABEL_SELECTOR));
}

function closePopper() {
  activePopper?.remove();
  activePopper = null;
  document.querySelectorAll(`.${LABEL_CLASS}.__se_label_active`).forEach((el) => {
    el.classList.remove("__se_label_active");
  });
}

// A single editable surface in the popper — either an element's text node
// (existing case, target is the [data-label] span) or one translated HTML
// attribute on the target element (new case).
interface Surface {
  kind: "text" | "attr";
  key: string;
  target: HTMLElement;
  attr?: string;
  variables?: Record<string, string | number> | null;
  desc?: string;
}

function applySurface(surface: Surface, value: string): void {
  if (surface.kind === "text") {
    surface.target.textContent = value;
  } else if (surface.attr) {
    surface.target.setAttribute(surface.attr, value);
    const entries = readLabelAttrs(surface.target);
    const idx = entries.findIndex((e) => e.attr === surface.attr);
    if (idx >= 0) {
      entries[idx] = { ...entries[idx], original: value };
      writeLabelAttrs(surface.target, entries);
    }
  }
}

/**
 * Persist a label value to the active draft or profile via the admin API.
 * Falls back to URL-param override-only when no API is available or when
 * neither a draft nor a non-default profile is selected.
 */
async function saveLabel(surface: Surface, template: string, popper: HTMLElement): Promise<void> {
  const errEl = popper.querySelector<HTMLElement>(".lp-err");
  const saveBtn = popper.querySelector<HTMLButtonElement>('[data-action="save"]')!;

  // Validate that no `{{var}}` placeholder was renamed or removed. The original
  // template comes from the dict (or the override if one already exists); the
  // edited value is `template` (textarea contents).
  const overrideTemplate = getI18nLabelOverride(surface.key);
  const dictTemplate = getDictTemplate(surface.key);
  const expected = listPlaceholders(overrideTemplate ?? dictTemplate ?? "");
  const provided = listPlaceholders(template);
  const missing = expected.filter((p) => !provided.includes(p));
  const added = provided.filter((p) => !expected.includes(p));
  if (missing.length || added.length) {
    if (errEl) {
      const parts: string[] = [];
      if (missing.length) parts.push(`missing {{${missing.join("}}, {{")}}}`);
      if (added.length) parts.push(`unknown {{${added.join("}}, {{")}}}`);
      errEl.textContent = `Placeholders must match exactly — ${parts.join("; ")}.`;
    }
    return;
  }

  // The DOM shows the *interpolated* form so the page reflects the edit
  // immediately. Backend persists the template (with placeholders).
  const vars = surface.variables ?? {};
  const interpolated = interpolate(template, vars);
  applySurface(surface, interpolated);
  setI18nLabelOverride(surface.key, template);
  window.dispatchEvent(
    new CustomEvent("se:i18n:edit", { detail: { key: surface.key, value: template } }),
  );

  const draftId = getI18nDraftOverride();
  const profileId = getI18nProfileOverride();
  const api = panelApi;

  if (!api || (!draftId && !profileId)) {
    closePopper();
    return;
  }

  saveBtn.disabled = true;
  saveBtn.textContent = "Saving…";
  if (errEl) errEl.textContent = "";

  try {
    if (draftId) {
      await api.upsertDraftKey(draftId, surface.key, template);
    } else if (profileId) {
      const match = panelKeys.find((k) => k.key === surface.key && k.profileId === profileId);
      if (match) {
        await api.updateKeyById(match.id, template);
      }
    }
    closePopper();
  } catch (err) {
    saveBtn.disabled = false;
    saveBtn.textContent = "Save";
    if (errEl) errEl.textContent = err instanceof Error ? err.message : String(err);
  }
}

function parseVariables(el: HTMLElement): Record<string, string | number> | null {
  const raw = el.dataset.variables;
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Record<string, string | number>;
  } catch {
    return null;
  }
}

/**
 * Collect all editable surfaces reachable from a label-bearing target. If the
 * target is a [data-label] text span, that span is the single surface (existing
 * single-textarea UX). If the target carries [data-label-attrs] (e.g. an
 * <input> whose placeholder was translated), we surface every recorded
 * attribute — and any [data-label] descendants too, so a single click on a
 * button-like element exposes both its visible text and its aria-label.
 */
function collectSurfaces(target: HTMLElement): Surface[] {
  const out: Surface[] = [];

  if (target.hasAttribute("data-label")) {
    out.push({
      kind: "text",
      key: target.dataset.label ?? "",
      target,
      variables: parseVariables(target),
      desc: target.dataset.labelDesc ?? "",
    });
  }

  if (target.hasAttribute("data-label-attrs")) {
    // Descendant text spans first — they'll appear before attribute tabs.
    if (!target.hasAttribute("data-label")) {
      const inner = Array.from(target.querySelectorAll<HTMLElement>("[data-label]"));
      for (const el of inner) {
        out.push({
          kind: "text",
          key: el.dataset.label ?? "",
          target: el,
          variables: parseVariables(el),
          desc: el.dataset.labelDesc ?? "",
        });
      }
    }
    for (const entry of readLabelAttrs(target)) {
      out.push({
        kind: "attr",
        key: entry.key,
        target,
        attr: entry.attr,
      });
    }
  }

  return out;
}

function surfaceCurrentValue(s: Surface): string {
  if (s.kind === "text") return s.target.textContent ?? "";
  return s.attr ? (s.target.getAttribute(s.attr) ?? "") : "";
}

function surfaceTabLabel(s: Surface, allSurfaces: Surface[]): string {
  if (s.kind === "attr") return s.attr ?? "attr";
  // For text surfaces, prefer the last `.`-segment of the key; if multiple text
  // tabs collide on the same segment, fall back to the full key.
  const seg = s.key.split(".").pop() || s.key;
  const dupes = allSurfaces.filter(
    (o) => o.kind === "text" && (o.key.split(".").pop() || o.key) === seg,
  ).length;
  return dupes > 1 ? s.key : "Text";
}

function openLabelPopper(target: HTMLElement, shadow: ShadowRoot): void {
  closePopper();
  target.classList.add("__se_label_active");

  const surfaces = collectSurfaces(target);
  if (surfaces.length === 0) return;

  const profileOverride = getI18nProfileOverride();
  const profileLabel = profileOverride ?? "default";

  // Per-surface original values, captured on first activation so Reset can
  // restore even after several edits across tabs.
  const originals = new Map<number, string>();
  let activeIdx = 0;

  const popper = document.createElement("div");
  popper.className = "label-popper";

  const tabsHtml =
    surfaces.length > 1
      ? `<div class="lp-tabs">${surfaces
          .map((s, i) => {
            const label = surfaceTabLabel(s, surfaces);
            const attrChip =
              s.kind === "attr"
                ? `<span class="lp-tab-attr">${escapeHtml(s.attr ?? "")}</span>`
                : "";
            const cls = i === 0 ? "lp-tab active" : "lp-tab";
            return `<button class="${cls}" data-surface-idx="${i}">${escapeHtml(s.kind === "attr" ? "@" : label)}${s.kind === "attr" ? attrChip : ""}</button>`;
          })
          .join("")}</div>`
      : "";

  popper.innerHTML = `
    <div class="lp-head">
      <span class="lp-key mono"></span>
      <button class="lp-close" aria-label="Close">✕</button>
    </div>
    ${tabsHtml}
    <div class="lp-body"></div>
    <div class="lp-actions">
      <button class="ibtn" data-action="reset">Reset</button>
      <button class="ibtn pri" data-action="save">Save</button>
    </div>
    <div class="lp-err"></div>`;

  shadow.appendChild(popper);

  const keyEl = popper.querySelector<HTMLElement>(".lp-key")!;
  const bodyEl = popper.querySelector<HTMLElement>(".lp-body")!;
  const errEl = popper.querySelector<HTMLElement>(".lp-err")!;
  const saveBtn = popper.querySelector<HTMLButtonElement>('[data-action="save"]')!;
  const resetBtn = popper.querySelector<HTMLButtonElement>('[data-action="reset"]')!;

  function activeSurface(): Surface {
    return surfaces[activeIdx];
  }

  function renderActive() {
    const s = activeSurface();
    if (!originals.has(activeIdx)) originals.set(activeIdx, surfaceCurrentValue(s));

    keyEl.textContent = s.key;

    // Editable value is the TEMPLATE (with `{{var}}` placeholders intact),
    // sourced from the dict. Falls back to the rendered value when the dict
    // doesn't have the key (older bundle, draft-only, etc).
    const dictTemplate = getDictTemplate(s.key);
    const overrideTemplate = getI18nLabelOverride(s.key);
    const editable = overrideTemplate ?? dictTemplate ?? surfaceCurrentValue(s);

    // Variables now arrive as JSON in `data-variables` (set by the scanner
    // from the marker's varsJson section). For attribute surfaces we don't
    // currently propagate vars — that's fine; attributes rarely use them.
    const vars = s.variables ?? {};
    const variableEntries = Object.entries(vars);
    const variablesHtml = variableEntries.length
      ? `<div class="lp-field">
          <label>Variables (read-only)</label>
          <div class="lp-vars">${variableEntries
            .map(
              ([k, v]) =>
                `<div class="lp-var"><span class="lp-var-k mono">${escapeHtml(`{{${k}}}`)}</span><span class="lp-var-v">${escapeHtml(String(v))}</span></div>`,
            )
            .join("")}</div>
        </div>`
      : "";

    const desc = s.desc ?? "";
    const surfaceLabel =
      s.kind === "attr" ? `attribute · ${escapeHtml(s.attr ?? "")}` : "text content";

    bodyEl.innerHTML = `
      <div class="lp-field">
        <label>Current profile</label>
        <span>${escapeHtml(profileLabel)}</span>
      </div>
      <div class="lp-field">
        <label>Surface</label>
        <span class="mono">${surfaceLabel}</span>
      </div>
      <div class="lp-field">
        <label>Description</label>
        <span class="${desc ? "" : "empty"}">${desc ? escapeHtml(desc) : "No description"}</span>
      </div>
      ${variablesHtml}
      <div class="lp-field">
        <label>Template</label>
        <textarea class="lp-input" spellcheck="false">${escapeHtml(editable)}</textarea>
      </div>`;

    errEl.textContent = "";
    saveBtn.disabled = false;
    saveBtn.textContent = "Save";

    const input = bodyEl.querySelector<HTMLTextAreaElement>(".lp-input")!;
    input.focus();
    input.select();
  }

  // Tab clicks
  popper.querySelectorAll<HTMLButtonElement>(".lp-tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      const idx = Number(btn.dataset.surfaceIdx);
      if (idx === activeIdx) return;
      activeIdx = idx;
      popper.querySelectorAll(".lp-tab").forEach((el, i) => {
        el.classList.toggle("active", i === activeIdx);
      });
      renderActive();
    });
  });

  renderActive();

  // Position: default below target, flip above if bottom overflows viewport.
  const rect = target.getBoundingClientRect();
  const popH = popper.offsetHeight;
  const popW = popper.offsetWidth;
  const margin = 8;
  let top = rect.bottom + margin;
  if (top + popH > window.innerHeight - 8) {
    top = Math.max(8, rect.top - popH - margin);
  }
  let left = rect.left;
  if (left + popW > window.innerWidth - 8) {
    left = Math.max(8, window.innerWidth - popW - 8);
  }
  popper.style.top = `${top}px`;
  popper.style.left = `${left}px`;

  popper.querySelector(".lp-close")!.addEventListener("click", closePopper);
  saveBtn.addEventListener("click", () => {
    const input = bodyEl.querySelector<HTMLTextAreaElement>(".lp-input")!;
    void saveLabel(activeSurface(), input.value, popper);
  });
  resetBtn.addEventListener("click", () => {
    const s = activeSurface();
    const original = originals.get(activeIdx) ?? "";
    applySurface(s, original);
    setI18nLabelOverride(s.key, null);
    window.dispatchEvent(new CustomEvent("se:i18n:edit", { detail: { key: s.key, value: null } }));
    closePopper();
  });

  popper.addEventListener("click", (e) => e.stopPropagation());
  popper.addEventListener("mousedown", (e) => e.stopPropagation());

  activePopper = popper;
}

export function toggleEditLabels(
  enable: boolean,
  shadow: ShadowRoot,
  onAfterEdit: () => void,
): void {
  editLabelsActive = enable;
  cleanupEditLabels?.();
  cleanupEditLabels = null;
  if (!enable) {
    closePopper();
    for (const el of qualifyingLabels()) el.classList.remove(LABEL_CLASS);
    removeLabelHighlightStyles();
    return;
  }

  installLabelHighlightStyles();
  for (const el of qualifyingLabels()) el.classList.add(LABEL_CLASS);

  // We use composedPath() so shadow-DOM events are correctly inspected —
  // e.target on document-level handlers gets retargeted to the shadow host
  // (e.g. #shipeasy-devtools), which would otherwise mask clicks that truly
  // originated inside the popper.
  function pathHasPopper(e: Event): boolean {
    return activePopper !== null && e.composedPath().includes(activePopper);
  }

  function pathLabelTarget(e: Event): HTMLElement | null {
    for (const node of e.composedPath()) {
      if (
        node instanceof HTMLElement &&
        (node.hasAttribute("data-label") || node.hasAttribute("data-label-attrs"))
      ) {
        return node;
      }
    }
    return null;
  }

  // Swallow every event type that could trigger the underlying widget's
  // behaviour (button clicks, link navigation, drag selection, focus rings,
  // form submits, etc.). Without this, apps that wire onMouseDown / onPointer
  // handlers — common in button libraries — still fire even though we
  // preventDefault on `click`.
  const SWALLOW_EVENTS = [
    "mousedown",
    "mouseup",
    "pointerdown",
    "pointerup",
    "touchstart",
    "touchend",
    "dblclick",
    "contextmenu",
    "submit",
    "auxclick",
  ] as const;

  function suppress(e: Event) {
    if (pathHasPopper(e)) return;
    if (!pathLabelTarget(e)) return;
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
  }

  function onClick(e: MouseEvent) {
    if (pathHasPopper(e)) return;
    const el = pathLabelTarget(e);
    if (!el) return;
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    openLabelPopper(el, shadow);
  }

  function onOutsideMouseDown(e: MouseEvent) {
    if (!activePopper) return;
    if (pathHasPopper(e)) return;
    if (pathLabelTarget(e)) return;
    closePopper();
  }

  function onKey(e: KeyboardEvent) {
    if (e.key === "Escape") closePopper();
  }

  // Scan document again when new labels are added/removed.
  const observer = new MutationObserver(() => {
    if (!editLabelsActive) return;
    for (const el of qualifyingLabels()) el.classList.add(LABEL_CLASS);
    onAfterEdit();
  });
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributeFilter: ["data-label", "data-label-attrs"],
  });

  for (const type of SWALLOW_EVENTS) {
    document.addEventListener(type, suppress, true);
  }
  document.addEventListener("click", onClick, true);
  document.addEventListener("mousedown", onOutsideMouseDown, true);
  document.addEventListener("keydown", onKey);

  cleanupEditLabels = () => {
    for (const type of SWALLOW_EVENTS) {
      document.removeEventListener(type, suppress, true);
    }
    document.removeEventListener("click", onClick, true);
    document.removeEventListener("mousedown", onOutsideMouseDown, true);
    document.removeEventListener("keydown", onKey);
    observer.disconnect();
    for (const el of qualifyingLabels()) el.classList.remove(LABEL_CLASS);
    removeLabelHighlightStyles();
  };
}

// ── Panel renderer ───────────────────────────────────────────────────────────

export async function renderI18nPanel(
  container: Element,
  api: DevtoolsApi,
  subfoot: HTMLElement,
  shadow: ShadowRoot,
): Promise<void> {
  container.innerHTML = `<div class="loading">Loading i18n data…</div>`;
  subfoot.innerHTML = "";

  panelApi = api;

  let profiles: ProfileRecord[];
  let drafts: DraftRecord[];
  let keys: KeyRecord[];
  try {
    const activeProfileId = getI18nProfileOverride() ?? undefined;
    [profiles, drafts, keys] = await Promise.all([
      api.profiles(),
      api.drafts(),
      api.keys(activeProfileId),
    ]);
  } catch (err) {
    container.innerHTML = `<div class="err">Failed to load i18n data: ${String(err)}</div>`;
    return;
  }

  panelKeys = keys;
  const chunks = buildChunks(keys);
  const chunkNames = Array.from(chunks.keys());
  const state = { activeChunk: chunkNames[0] ?? null };

  function renderBody() {
    if (chunkNames.length === 0) {
      container.innerHTML = emptyState({
        icon: "🌐",
        title: "No translation keys yet",
        message: "Add keys in the admin and group them by namespace (e.g. checkout.title).",
        ctaLabel: "Create new key",
        ctaHref: `${api.adminUrl}/dashboard/i18n/keys`,
      });
      return;
    }
    const tabs = chunkNames
      .map(
        (n) =>
          `<button class="tab${n === state.activeChunk ? " active" : ""}" data-chunk="${escapeHtml(n)}">${escapeHtml(n)}</button>`,
      )
      .join("");
    const active = state.activeChunk ? chunks.get(state.activeChunk) : null;
    const tree = active ? active.children.map((c) => renderTreeNode(c, 0)).join("") : "";

    container.innerHTML = `
      <div class="tabs scroll" id="chunk-tabs">${tabs}</div>
      <div class="tree-body" style="flex:1;overflow-y:auto;padding:6px 4px">${tree}</div>`;

    container.querySelectorAll<HTMLButtonElement>(".tab[data-chunk]").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.activeChunk = btn.dataset.chunk!;
        renderBody();
      });
    });

    container.querySelectorAll<HTMLElement>(".tree-row.branch[data-branch]").forEach((row) => {
      const toggle = () => {
        const branch = row.parentElement;
        if (!branch) return;
        const collapsed = branch.classList.toggle("collapsed");
        const caret = row.querySelector<HTMLElement>(".tree-caret");
        if (caret) caret.textContent = collapsed ? "▸" : "▾";
      };
      row.addEventListener("click", toggle);
      row.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          toggle();
        }
      });
    });
  }

  function renderSubfoot() {
    const activeProfile = getI18nProfileOverride() ?? "";
    const activeDraft = getI18nDraftOverride() ?? "";
    // Scan first so t()/ShipEasyI18nString spans that are already in the DOM are counted.
    scanAndReplaceMarkers();
    const labelCount = qualifyingLabels().length;
    const editLabel = editLabelsActive
      ? `Editing ${labelCount} label${labelCount === 1 ? "" : "s"}`
      : labelCount > 0
        ? `Edit labels (${labelCount})`
        : "Edit labels";
    const editTitle = editLabelsActive
      ? "Disable in-page label editing"
      : labelCount === 0
        ? "Enable in-page label editing — reloads page with ?se_edit_labels=1 to scan all translation strings"
        : "Toggle in-page label editing (reloads page)";
    const profileOpts = [
      `<option value="">Default</option>`,
      ...profiles.map(
        (p) =>
          `<option value="${escapeHtml(p.id)}" ${activeProfile === p.id ? "selected" : ""}>${escapeHtml(p.name)}</option>`,
      ),
    ].join("");
    const draftOpts = [
      `<option value="">No draft</option>`,
      ...drafts.map(
        (d) =>
          `<option value="${escapeHtml(d.id)}" ${activeDraft === d.id ? "selected" : ""}>${escapeHtml(d.name)}</option>`,
      ),
    ].join("");

    subfoot.innerHTML = `
      <button class="subfoot-btn${editLabelsActive ? " on" : ""}" id="se-edit-toggle" title="${escapeHtml(editTitle)}">
        <span class="dot"></span>
        ${escapeHtml(editLabel)}
      </button>
      <select class="subfoot-sel" id="se-profile-sel" title="Active profile">${profileOpts}</select>
      <select class="subfoot-sel" id="se-draft-sel" title="Active draft">${draftOpts}</select>`;

    subfoot.querySelector<HTMLButtonElement>("#se-edit-toggle")!.addEventListener("click", () => {
      if (isEditLabelsModeActive()) {
        // Turning off: remove the URL param and reload — markers disappear.
        setEditLabelsMode(false);
      } else if (editLabelsActive) {
        // In-page labels (from ShipEasyI18nString / t()) are already in DOM:
        // just toggle the highlight off without a reload.
        toggleEditLabels(false, shadow, () => renderSubfoot());
        renderSubfoot();
      } else {
        // Full marker mode: add ?se_edit_labels=1 and reload so the head
        // script can patch window.i18n.t before the first render.
        setEditLabelsMode(true);
      }
    });
    subfoot.querySelector<HTMLSelectElement>("#se-profile-sel")!.addEventListener("change", (e) => {
      const val = (e.target as HTMLSelectElement).value || null;
      setI18nProfileOverride(val);
    });
    subfoot.querySelector<HTMLSelectElement>("#se-draft-sel")!.addEventListener("change", (e) => {
      const val = (e.target as HTMLSelectElement).value || null;
      setI18nDraftOverride(val);
    });
  }

  // When the page was loaded with ?se_edit_labels=1, window.i18n.t emitted
  // markers into the DOM.  Replace them now so qualifyingLabels() finds them
  // and the edit-labels UI activates automatically.
  if (isEditLabelsModeActive()) {
    scanAndReplaceMarkers();
    if (!editLabelsActive) {
      toggleEditLabels(true, shadow, () => renderSubfoot());
    }
  }

  renderBody();
  renderSubfoot();

  // When the CDN loader fetches a new locale after the panel has already
  // rendered, the landing-page components re-render and add [data-label] spans.
  // Subscribe so the subfoot label count stays accurate.
  const w = window as Window & { i18n?: { on?: (ev: string, cb: () => void) => () => void } };
  w.i18n?.on?.("update", () => {
    scanAndReplaceMarkers();
    renderSubfoot();
  });
}
