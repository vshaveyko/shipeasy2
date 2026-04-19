import { DevtoolsApi } from "../api";
import { getI18nProfileOverride, setI18nProfileOverride } from "../overrides";
import type { DraftRecord, KeyRecord, ProfileRecord } from "../types";

let inPlaceActive = false;
let cleanupInPlace: (() => void) | null = null;

function toggleInPlace(enable: boolean): void {
  inPlaceActive = enable;
  if (cleanupInPlace) {
    cleanupInPlace();
    cleanupInPlace = null;
  }
  if (!enable) return;

  const style = document.createElement("style");
  style.id = "__se_inplace_style";
  style.textContent = `[data-label] { outline: 2px dashed #7c3aed !important; outline-offset: 2px !important; cursor: pointer !important; }`;
  document.head.appendChild(style);

  function handleClick(e: MouseEvent) {
    const el = (e.target as Element).closest("[data-label]") as HTMLElement | null;
    if (!el) return;
    e.preventDefault();
    e.stopPropagation();
    const key = el.dataset.label ?? "";
    const desc = el.dataset.labelDesc ?? "";
    const current = el.textContent ?? "";
    const newVal = prompt(
      `Edit label "${key}"${desc ? `\n${desc}` : ""}\nCurrent: ${current}\n\nNew value:`,
      current,
    );
    if (newVal !== null && newVal !== current) {
      el.textContent = newVal;
      window.dispatchEvent(new CustomEvent("se:i18n:edit", { detail: { key, value: newVal } }));
    }
  }

  document.addEventListener("click", handleClick, true);

  cleanupInPlace = () => {
    document.removeEventListener("click", handleClick, true);
    document.getElementById("__se_inplace_style")?.remove();
    inPlaceActive = false;
  };
}

function renderLabelsTab(container: Element, profiles: ProfileRecord[], drafts: DraftRecord[]) {
  const activeProfile = getI18nProfileOverride();
  const profileOpts = [
    `<option value="">Default</option>`,
    ...profiles.map(
      (p) =>
        `<option value="${p.id}" ${activeProfile === p.id ? "selected" : ""}>${p.name}</option>`,
    ),
  ].join("");

  container.innerHTML = `
    <div class="sec-head">In-place editing</div>
    <div class="row">
      <div class="row-name">Edit labels in page</div>
      <div class="sw" id="se-inplace-sw">
        <div class="sw-track${inPlaceActive ? " on" : ""}">
          <div class="sw-thumb"></div>
        </div>
        <span class="sw-label">${inPlaceActive ? "On" : "Off"}</span>
      </div>
    </div>

    <div class="sec-head">Profile</div>
    <div class="row">
      <div class="row-name">Active profile</div>
      <select class="sel-input" id="se-profile-sel">${profileOpts}</select>
    </div>

    <div class="sec-head">Drafts</div>
    ${
      drafts.length === 0
        ? `<div class="empty" style="padding:12px">No drafts</div>`
        : drafts
            .map(
              (d) => `
              <div class="row">
                <div>
                  <div class="row-name">${d.name}</div>
                  <div class="row-sub">${d.status}</div>
                </div>
              </div>`,
            )
            .join("")
    }
  `;

  container.querySelector("#se-inplace-sw")?.addEventListener("click", () => {
    toggleInPlace(!inPlaceActive);
    renderLabelsTab(container, profiles, drafts);
  });

  container.querySelector<HTMLSelectElement>("#se-profile-sel")?.addEventListener("change", (e) => {
    const val = (e.target as HTMLSelectElement).value || null;
    setI18nProfileOverride(val);
  });
}

function renderChunksTab(container: Element, keys: KeyRecord[]) {
  if (keys.length === 0) {
    container.innerHTML = `<div class="empty">No translation keys found.</div>`;
    return;
  }

  // Group by namespace prefix (before first ".")
  const groups = new Map<string, KeyRecord[]>();
  for (const k of keys) {
    const ns = k.key.includes(".") ? k.key.split(".")[0] : "(root)";
    if (!groups.has(ns)) groups.set(ns, []);
    groups.get(ns)!.push(k);
  }

  container.innerHTML = Array.from(groups.entries())
    .map(
      ([ns, items]) => `
      <div class="sec-head">${ns} <span style="color:#334155;font-weight:400">(${items.length})</span></div>
      ${items
        .map(
          (k) => `
        <div class="row">
          <div style="flex:1;min-width:0">
            <div class="row-name mono">${k.key}</div>
            <div class="row-sub" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:220px">${String(k.value)}</div>
          </div>
        </div>`,
        )
        .join("")}`,
    )
    .join("");
}

type Tab = "labels" | "chunks";

export async function renderI18nPanel(container: Element, api: DevtoolsApi): Promise<void> {
  container.innerHTML = `<div class="loading">Loading i18n data…</div>`;

  let profiles: ProfileRecord[];
  let drafts: DraftRecord[];
  let keys: KeyRecord[];
  try {
    [profiles, drafts, keys] = await Promise.all([api.profiles(), api.drafts(), api.keys()]);
  } catch (err) {
    container.innerHTML = `<div class="err">Failed to load i18n data: ${String(err)}</div>`;
    return;
  }

  const state = { activeTab: "labels" as Tab };

  function renderTabs() {
    const tabBar = container.querySelector<HTMLDivElement>(".tabs")!;
    tabBar.querySelectorAll<HTMLButtonElement>(".tab").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.tab === state.activeTab);
    });
    const body = container.querySelector<HTMLDivElement>(".tab-body")!;
    if (state.activeTab === "labels") {
      renderLabelsTab(body, profiles, drafts);
    } else {
      renderChunksTab(body, keys);
    }
  }

  container.innerHTML = `
    <div class="tabs">
      <button class="tab active" data-tab="labels">Labels</button>
      <button class="tab" data-tab="chunks">Chunks</button>
    </div>
    <div class="tab-body" style="overflow-y:auto;flex:1"></div>`;

  container.querySelectorAll<HTMLButtonElement>(".tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.activeTab = btn.dataset.tab as Tab;
      renderTabs();
    });
  });

  renderTabs();
}
