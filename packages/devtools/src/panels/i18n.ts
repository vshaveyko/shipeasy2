import { DevtoolsApi } from "../api";
import {
  getI18nDraftOverride,
  getI18nLabelOverride,
  getI18nProfileOverride,
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
    <div class="tree-row branch" style="padding-left:${pad}px">
      <span class="tree-caret">▾</span>
      <span class="tree-seg">${escapeHtml(node.segment)}</span>
    </div>
    ${kids}`;
}

// ── Edit-labels mode ──────────────────────────────────────────────────────────

const LABEL_CLASS = "__se_label_target";
let editLabelsActive = false;
let cleanupEditLabels: (() => void) | null = null;
let activePopper: HTMLElement | null = null;

function qualifyingLabels(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>("[data-label]"));
}

function closePopper() {
  activePopper?.remove();
  activePopper = null;
  document.querySelectorAll(`.${LABEL_CLASS}.__se_label_active`).forEach((el) => {
    el.classList.remove("__se_label_active");
  });
}

function openLabelPopper(target: HTMLElement, shadow: ShadowRoot): void {
  closePopper();
  target.classList.add("__se_label_active");

  const key = target.dataset.label ?? "";
  const desc = target.dataset.labelDesc ?? "";
  const profileOverride = getI18nProfileOverride();
  const profileLabel = profileOverride ?? "default";

  // Capture the pre-edit value exactly once so Reset can restore it.
  if (target.dataset.__seOriginal === undefined) {
    target.dataset.__seOriginal = target.textContent ?? "";
  }
  const currentValue = target.textContent ?? "";

  const popper = document.createElement("div");
  popper.className = "label-popper";
  popper.innerHTML = `
    <div class="lp-head">
      <span class="lp-key mono">${escapeHtml(key)}</span>
      <button class="lp-close" aria-label="Close">✕</button>
    </div>
    <div class="lp-body">
      <div class="lp-field">
        <label>Current profile</label>
        <span>${escapeHtml(profileLabel)}</span>
      </div>
      <div class="lp-field">
        <label>Description</label>
        <span class="${desc ? "" : "empty"}">${desc ? escapeHtml(desc) : "No description"}</span>
      </div>
      <div class="lp-field">
        <label>Value</label>
        <textarea class="lp-input" spellcheck="false">${escapeHtml(currentValue)}</textarea>
      </div>
    </div>
    <div class="lp-actions">
      <button class="ibtn" data-action="reset">Reset</button>
      <button class="ibtn pri" data-action="save">Save</button>
    </div>`;

  shadow.appendChild(popper);

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

  const input = popper.querySelector<HTMLTextAreaElement>(".lp-input")!;
  input.focus();
  input.select();

  popper.querySelector(".lp-close")!.addEventListener("click", closePopper);
  popper.querySelector('[data-action="save"]')!.addEventListener("click", () => {
    const value = input.value;
    target.textContent = value;
    setI18nLabelOverride(key, value);
    window.dispatchEvent(new CustomEvent("se:i18n:edit", { detail: { key, value } }));
    closePopper();
  });
  popper.querySelector('[data-action="reset"]')!.addEventListener("click", () => {
    const original = target.dataset.__seOriginal ?? "";
    target.textContent = original;
    setI18nLabelOverride(key, null);
    window.dispatchEvent(new CustomEvent("se:i18n:edit", { detail: { key, value: null } }));
    closePopper();
  });

  // Keep typed changes isolated to the popper — stop bubbling events that
  // could re-trigger the click handler on the underlying target.
  popper.addEventListener("click", (e) => e.stopPropagation());
  popper.addEventListener("mousedown", (e) => e.stopPropagation());

  activePopper = popper;
}

function toggleEditLabels(enable: boolean, shadow: ShadowRoot, onAfterEdit: () => void): void {
  editLabelsActive = enable;
  cleanupEditLabels?.();
  cleanupEditLabels = null;
  if (!enable) {
    closePopper();
    for (const el of qualifyingLabels()) el.classList.remove(LABEL_CLASS);
    return;
  }

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
      if (node instanceof HTMLElement && node.hasAttribute("data-label")) return node;
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
  observer.observe(document.body, { childList: true, subtree: true });

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

  let profiles: ProfileRecord[];
  let drafts: DraftRecord[];
  let keys: KeyRecord[];
  try {
    [profiles, drafts, keys] = await Promise.all([api.profiles(), api.drafts(), api.keys()]);
  } catch (err) {
    container.innerHTML = `<div class="err">Failed to load i18n data: ${String(err)}</div>`;
    return;
  }

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
  }

  function renderSubfoot() {
    const activeProfile = getI18nProfileOverride() ?? "";
    const activeDraft = getI18nDraftOverride() ?? "";
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
      <button class="subfoot-btn${editLabelsActive ? " on" : ""}" id="se-edit-toggle" title="Toggle in-page label editing">
        <span class="dot"></span>
        Edit labels
      </button>
      <select class="subfoot-sel" id="se-profile-sel" title="Active profile">${profileOpts}</select>
      <select class="subfoot-sel" id="se-draft-sel" title="Active draft">${draftOpts}</select>`;

    subfoot.querySelector<HTMLButtonElement>("#se-edit-toggle")!.addEventListener("click", () => {
      toggleEditLabels(!editLabelsActive, shadow, () => {});
      renderSubfoot();
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

  renderBody();
  renderSubfoot();
}
