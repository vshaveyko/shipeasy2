import type { DevtoolsApi } from "../api";
import { getConfigOverride, setConfigOverride } from "../overrides";
import type { ConfigRecord, ShipeasySdkBridge } from "../types";
import { I } from "../icons";
import {
  emptyState,
  escapeHtml,
  loadingState,
  searchEmptyState,
  copyButton,
  wireCopyButtons,
  timeAgo,
} from "./common";

interface ViewOpts {
  view: "page" | "all";
  search: string;
}

function bridge(): ShipeasySdkBridge | null {
  return (window as unknown as { __shipeasy?: ShipeasySdkBridge }).__shipeasy ?? null;
}

function jsonType(
  v: unknown,
): "null" | "array" | "object" | "string" | "number" | "boolean" | "undefined" {
  if (v === null) return "null";
  if (Array.isArray(v)) return "array";
  return typeof v as "string" | "number" | "boolean" | "object" | "undefined";
}

function valEqual(a: unknown, b: unknown): boolean {
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return a === b;
  }
}

function summarizeVal(v: unknown): string {
  const t = jsonType(v);
  if (t === "object") return `{${Object.keys(v as object).length} keys}`;
  if (t === "array") return `[${(v as unknown[]).length}]`;
  if (t === "string") {
    const s = v as string;
    return `"${s.length > 22 ? s.slice(0, 22) + "…" : s}"`;
  }
  if (t === "null") return "null";
  return String(v);
}

interface RenderRow {
  name: string;
  real: unknown;
  override: unknown; // undefined = no override
  effective: unknown;
  live: unknown;
  updatedAt: string;
}

function buildRow(c: ConfigRecord): RenderRow {
  const ov = getConfigOverride(c.name);
  const live = bridge()?.getConfig(c.name);
  const effective = ov !== undefined ? ov : live !== undefined ? live : c.valueJson;
  return {
    name: c.name,
    real: c.valueJson,
    override: ov,
    live,
    effective,
    updatedAt: c.updatedAt,
  };
}

function renderRow(r: RenderRow, expandedKey: string | null): string {
  const isOpen = expandedKey === r.name;
  const overridden = r.override !== undefined;
  const t = jsonType(r.effective);

  const desc = `config · ${t} · updated ${timeAgo(r.updatedAt)}`;
  const val = `<span class="val${overridden ? " over" : ""}" style="grid-column:3 / span 2; justify-self:end">${escapeHtml(summarizeVal(r.effective))}</span>`;

  const detail = `
    <div class="crumbs">
      <div><span class="pass">●</span> ${escapeHtml(r.name)}
        <span style="color:var(--fg-4)">=</span>
        <span style="color:var(--fg-2)">${escapeHtml(summarizeVal(r.effective))}</span>
        <span style="color:var(--fg-4)">· ${t}</span>
      </div>
    </div>
    <div class="mini">
      <span class="lbl">override</span><span class="v">${overridden ? "yes" : "none"}</span>
      <span class="lbl">updated</span><span class="v">${timeAgo(r.updatedAt)}</span>
    </div>
    <div class="actions">
      <button class="primary" data-edit="${escapeAttr(r.name)}">⤢ ${overridden ? "Edit override" : "Override value"}</button>
      ${overridden ? `<button data-clear="${escapeAttr(r.name)}">↺ Reset</button>` : ""}
    </div>`;

  return `
    <div class="dtf-row${isOpen ? " expanded" : ""}" data-row="${escapeAttr(r.name)}">
      <div class="ic"><span style="color:var(--accent)">${I.sliders}</span></div>
      <div class="meta">
        <div class="k">
          <span class="name">${escapeHtml(r.name)}</span>
          ${copyButton("c:" + r.name, "Copy config name")}
          ${overridden ? `<span class="override-tag">forced</span>` : ""}
        </div>
        <div class="v">${escapeHtml(desc)}</div>
      </div>
      ${val}
    </div>
    <div class="dtf-detail${isOpen ? " open" : ""}">
      <div class="inner"><div class="pad">${detail}</div></div>
    </div>`;
}

export async function renderConfigsPanel(
  container: HTMLElement,
  api: DevtoolsApi,
  view: ViewOpts,
  setOverrideCount: (n: number) => void,
  modalRoot: ParentNode & { appendChild: (n: Node) => Node },
): Promise<void> {
  container.innerHTML = loadingState();
  let configs: ConfigRecord[];
  try {
    configs = await api.configs();
  } catch (err) {
    container.innerHTML = `<div class="se-empty" style="color:var(--danger)">Failed to load configs: ${escapeHtml(String(err))}</div>`;
    return;
  }
  if (configs.length === 0) {
    const { html, wire } = emptyState({
      title: "No <em>configs</em> yet",
      message: "Remote config values you can tweak per-session without redeploying.",
      actions: api.hideAdminLinks
        ? []
        : [
            {
              icon: "+",
              label: "Create new config",
              href: `${api.adminUrl}/dashboard/configs/values/new`,
            },
          ],
    });
    container.innerHTML = html;
    wire(container);
    setOverrideCount(0);
    return;
  }

  let expanded: string | null = null;

  function paint(): void {
    const q = view.search.trim().toLowerCase();
    const filtered = q ? configs.filter((c) => c.name.toLowerCase().includes(q)) : configs;
    const rows = filtered.map(buildRow);
    setOverrideCount(rows.filter((r) => r.override !== undefined).length);

    if (rows.length === 0) {
      container.innerHTML = searchEmptyState(view.search);
      return;
    }

    if (view.view === "page") {
      // Without a way to detect "read on this page" we treat overridden +
      // bridge-known configs as active.
      const active = rows.filter((r) => r.override !== undefined || r.live !== undefined);
      const inactive = rows.filter((r) => !active.includes(r));
      container.innerHTML =
        `<div class="dtf-group">Active on this page<span class="pulse"><span class="d"></span>${active.length} loaded</span></div>` +
        (active.length
          ? active.map((r) => renderRow(r, expanded)).join("")
          : `<div class="se-empty">No configs read on this page yet.</div>`) +
        (inactive.length
          ? `<div class="dtf-group">Other<span class="c">${inactive.length}</span></div>` +
            inactive.map((r) => renderRow(r, expanded)).join("")
          : "");
    } else {
      container.innerHTML =
        `<div class="dtf-group">All configs<span class="c">${rows.length}</span></div>` +
        rows.map((r) => renderRow(r, expanded)).join("");
    }

    container.querySelectorAll<HTMLElement>(".dtf-row").forEach((rowEl) => {
      rowEl.addEventListener("click", (e) => {
        const target = e.target as HTMLElement;
        if (target.closest(".dtf-copy")) return;
        const name = rowEl.dataset.row!;
        expanded = expanded === name ? null : name;
        paint();
      });
    });

    container.querySelectorAll<HTMLElement>("[data-edit]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const name = btn.getAttribute("data-edit")!;
        const r = rows.find((x) => x.name === name)!;
        openOverrideModal(modalRoot, r);
      });
    });
    container.querySelectorAll<HTMLElement>("[data-clear]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        setConfigOverride(btn.getAttribute("data-clear")!, null);
      });
    });

    wireCopyButtons(container, Object.fromEntries(rows.map((r) => ["c:" + r.name, () => r.name])));
  }

  paint();
}

// ── Override modal ──────────────────────────────────────────────────────────

function clone<T>(v: T): T {
  return v == null || typeof v !== "object" ? v : (JSON.parse(JSON.stringify(v)) as T);
}

function setAt(obj: unknown, path: Array<string | number>, value: unknown): unknown {
  if (path.length === 0) return value;
  const [head, ...rest] = path;
  const parent = obj as Record<string | number, unknown> | unknown[];
  if (Array.isArray(parent)) {
    const next = parent.slice();
    next[head as number] = setAt(parent[head as number], rest, value);
    return next;
  }
  const next = { ...(parent as Record<string, unknown>) };
  next[String(head)] = setAt((parent as Record<string, unknown>)[String(head)], rest, value);
  return next;
}

function openOverrideModal(
  modalRoot: ParentNode & { appendChild: (n: Node) => Node },
  row: { name: string; real: unknown; override: unknown },
): void {
  const initial = row.override !== undefined ? row.override : row.real;
  let draft: unknown = clone(initial);

  const wrap = document.createElement("div");
  wrap.className = "dtf-modal-bg";
  wrap.innerHTML = `<div class="dtf-modal" data-role="modal"></div>`;
  const modal = wrap.querySelector<HTMLElement>(".dtf-modal")!;
  modalRoot.appendChild(wrap);

  function close(): void {
    wrap.remove();
    document.removeEventListener("keydown", onKey);
  }
  function onKey(e: KeyboardEvent) {
    if (e.key === "Escape") close();
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) save();
  }
  function save(): void {
    setConfigOverride(row.name, draft);
    close();
  }
  function paint(): void {
    const dirty = !valEqual(draft, row.real);
    const t = jsonType(draft);
    modal.innerHTML = `
      <div class="hd">
        <span class="k">${escapeHtml(row.name)}</span>
        <span class="type-tag t-${t}">${t}</span>
        <button class="x" data-action="close" title="Close (Esc)">${I.x}</button>
      </div>
      <div class="bd">
        ${
          t === "object" || t === "array"
            ? `<div class="json-tree" id="tree"></div>`
            : `<div class="row"><span class="lbl">${t}</span><span data-leaf></span></div>`
        }
      </div>
      <div class="ft">
        <button class="ghost" data-action="reset" ${dirty ? "" : "disabled"} style="${dirty ? "" : "opacity:.4"}">↺ Reset all</button>
        <span class="sp"></span>
        <button data-action="cancel">Cancel <span style="opacity:.6;margin-left:4px">Esc</span></button>
        <button class="primary" data-action="save">Save override <span style="opacity:.6;margin-left:4px">⌘⏎</span></button>
      </div>`;

    const treeEl = modal.querySelector<HTMLElement>("#tree");
    if (treeEl)
      renderJsonChildren(treeEl, draft, row.real, (next) => {
        draft = next;
        paint();
      });
    const leafEl = modal.querySelector<HTMLElement>("[data-leaf]");
    if (leafEl) {
      leafEl.innerHTML = renderLeafEditor(draft, row.real);
      wireLeafEditor(leafEl, draft, row.real, (next) => {
        draft = next;
        paint();
      });
    }
    modal.querySelector('[data-action="close"]')!.addEventListener("click", close);
    modal.querySelector('[data-action="cancel"]')!.addEventListener("click", close);
    modal.querySelector('[data-action="save"]')!.addEventListener("click", save);
    modal.querySelector('[data-action="reset"]')?.addEventListener("click", () => {
      draft = clone(row.real);
      paint();
    });
  }

  wrap.addEventListener("click", (e) => {
    if (e.target === wrap) close();
  });
  document.addEventListener("keydown", onKey);
  paint();
}

function renderJsonChildren(
  container: HTMLElement,
  value: unknown,
  realValue: unknown,
  onChange: (next: unknown) => void,
): void {
  const t = jsonType(value);
  const entries: Array<[string | number, unknown]> =
    t === "array"
      ? (value as unknown[]).map((v, i) => [i, v])
      : Object.entries(value as Record<string, unknown>);
  container.innerHTML = `<div class="json-children"></div>`;
  const children = container.querySelector<HTMLElement>(".json-children")!;
  for (const [k, v] of entries) {
    const childT = jsonType(v);
    const childReal = (realValue as Record<string | number, unknown> | null)?.[k as never];
    if (childT === "object" || childT === "array") {
      const branch = document.createElement("div");
      const dirty = !valEqual(v, childReal);
      branch.innerHTML = `
        <div class="json-row branch${dirty ? " dirty" : ""}">
          <span class="caret">▾</span>
          <span class="key branch-key">${escapeHtml(String(k))}</span>
          <span class="type t-${childT}">${childT}</span>
          <span class="summary">${escapeHtml(summarizeVal(v))}</span>
          ${dirty ? `<button class="reset" title="reset subtree">↺</button>` : ""}
        </div>
        <div class="json-children-host"></div>`;
      children.appendChild(branch);
      const sub = branch.querySelector<HTMLElement>(".json-children-host")!;
      const branchRow = branch.querySelector<HTMLElement>(".json-row")!;
      let open = true;
      const repaintBranch = () => {
        sub.innerHTML = "";
        if (open) {
          renderJsonChildren(sub, v, childReal, (nv) => {
            onChange(setAt(value, [k], nv));
          });
        }
      };
      repaintBranch();
      branchRow.addEventListener("click", () => {
        open = !open;
        branchRow.querySelector(".caret")!.textContent = open ? "▾" : "▸";
        repaintBranch();
      });
      branch.querySelector(".reset")?.addEventListener("click", (e) => {
        e.stopPropagation();
        onChange(setAt(value, [k], clone(childReal)));
      });
    } else {
      const dirty = !valEqual(v, childReal);
      const row = document.createElement("div");
      row.className = `json-row leaf${dirty ? " dirty" : ""}`;
      row.innerHTML = `
        <span class="caret"></span>
        <span class="key">${escapeHtml(String(k))}</span>
        <span class="type t-${childT}">${childT}</span>
        ${renderLeafEditor(v, childReal)}`;
      children.appendChild(row);
      wireLeafEditor(row, v, childReal, (nv) => onChange(setAt(value, [k], nv)));
    }
  }
}

function renderLeafEditor(value: unknown, real: unknown): string {
  const t = jsonType(value);
  const dirty = !valEqual(value, real);
  if (t === "boolean") {
    return `<span class="ctl${dirty ? " changed" : ""}">
      <span class="bool">
        <button class="t${value === true ? " on" : ""}" data-bool="true">true</button>
        <button class="f${value === false ? " on" : ""}" data-bool="false">false</button>
      </span>
      <button class="reset" title="reset to ${escapeAttr(String(real))}">↺</button>
    </span>`;
  }
  if (t === "number") {
    return `<span class="ctl${dirty ? " changed" : ""}">
      <input type="number" value="${escapeAttr(String(value))}"/>
      <button class="reset" title="reset to ${escapeAttr(String(real))}">↺</button>
    </span>`;
  }
  if (t === "string") {
    return `<span class="ctl${dirty ? " changed" : ""}">
      <input type="text" value="${escapeAttr(String(value))}"/>
      <button class="reset" title="reset to ${escapeAttr(String(real))}">↺</button>
    </span>`;
  }
  return `<span class="summary">${escapeHtml(String(value))}</span>`;
}

function wireLeafEditor(
  row: HTMLElement,
  value: unknown,
  real: unknown,
  onChange: (next: unknown) => void,
): void {
  const t = jsonType(value);
  if (t === "boolean") {
    row.querySelectorAll<HTMLButtonElement>("[data-bool]").forEach((b) => {
      b.addEventListener("click", () => onChange(b.dataset.bool === "true"));
    });
  } else if (t === "number") {
    const input = row.querySelector<HTMLInputElement>("input")!;
    input.addEventListener("input", () => {
      const n = input.value === "" ? value : Number(input.value);
      if (!Number.isNaN(n)) onChange(n);
    });
  } else if (t === "string") {
    const input = row.querySelector<HTMLInputElement>("input")!;
    input.addEventListener("input", () => onChange(input.value));
  }
  row.querySelector(".reset")?.addEventListener("click", (e) => {
    e.stopPropagation();
    onChange(clone(real));
  });
}

function escapeAttr(s: string): string {
  return escapeHtml(s);
}
