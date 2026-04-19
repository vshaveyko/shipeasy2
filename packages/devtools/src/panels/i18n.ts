import { DevtoolsApi } from "../api";
import { getI18nProfileOverride, setI18nProfileOverride } from "../overrides";
import type { DraftRecord, ProfileRecord } from "../types";

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
      // Optimistic UI update — actual persistence requires a draft/key API call
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

export async function renderI18nPanel(container: Element, api: DevtoolsApi): Promise<void> {
  container.innerHTML = `<div class="loading">Loading i18n data…</div>`;

  let profiles: ProfileRecord[];
  let drafts: DraftRecord[];
  try {
    [profiles, drafts] = await Promise.all([api.profiles(), api.drafts()]);
  } catch (err) {
    container.innerHTML = `<div class="err">Failed to load i18n data: ${String(err)}</div>`;
    return;
  }

  const activeProfile = getI18nProfileOverride();

  function render() {
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
      render();
    });

    container
      .querySelector<HTMLSelectElement>("#se-profile-sel")
      ?.addEventListener("change", (e) => {
        const val = (e.target as HTMLSelectElement).value || null;
        setI18nProfileOverride(val);
      });
  }

  render();
}
