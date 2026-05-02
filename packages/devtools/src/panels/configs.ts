import { DevtoolsApi } from "../api";
import { getConfigOverride, setConfigOverride } from "../overrides";
import type { ConfigRecord } from "../types";
import { emptyState } from "./empty";

function displayValue(v: unknown): string {
  const s = typeof v === "string" ? v : JSON.stringify(v);
  return s.length > 40 ? s.slice(0, 38) + "…" : s;
}

function overrideBadge(name: string): string {
  const ov = getConfigOverride(name);
  if (ov === undefined) return "";
  return `<span class="badge badge-run">overridden</span>`;
}

export async function renderConfigsPanel(container: Element, api: DevtoolsApi): Promise<void> {
  container.innerHTML = `<div class="loading">Loading configs…</div>`;

  let configs: ConfigRecord[];
  try {
    configs = await api.configs();
  } catch (err) {
    container.innerHTML = `<div class="err">Failed to load configs: ${String(err)}</div>`;
    return;
  }

  if (configs.length === 0) {
    container.innerHTML = emptyState({
      icon: "⚙",
      title: "No configs yet",
      message: "Remote config values you can tweak per-session without redeploying.",
      ctaLabel: "Create new config",
      ctaHref: `${api.adminUrl}/dashboard/configs/values/new`,
    });
    return;
  }

  // Track which configs are in edit mode
  const editing = new Set<string>();

  function render() {
    const rows = configs
      .map((c) => {
        const ov = getConfigOverride(c.name);
        const effective = ov !== undefined ? ov : c.valueJson;
        const isEditing = editing.has(c.name);

        if (isEditing) {
          return `
            <tr data-config="${c.name}">
              <td colspan="4">
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
                  <span class="col-name" style="flex:1">${c.name}</span>
                  ${overrideBadge(c.name)}
                  <button class="ibtn cancel-edit" data-name="${c.name}">cancel</button>
                </div>
                <textarea class="editor" data-name="${c.name}" rows="3">${JSON.stringify(effective, null, 2)}</textarea>
                <div class="edit-row" style="display:flex;gap:6px;margin-top:6px">
                  <button class="ibtn pri save-session" data-name="${c.name}">Save (session)</button>
                  <button class="ibtn save-local" data-name="${c.name}">Save (local)</button>
                  ${ov !== undefined ? `<button class="ibtn danger clear-ov" data-name="${c.name}">clear</button>` : ""}
                </div>
              </td>
            </tr>`;
        }
        return `
          <tr data-config="${c.name}">
            <td class="col-name">${c.name}</td>
            <td class="col-value">${displayValue(effective)}</td>
            <td class="col-badge">${overrideBadge(c.name)}</td>
            <td class="col-control"><button class="ibtn edit-btn" data-name="${c.name}">edit</button></td>
          </tr>`;
      })
      .join("");

    container.innerHTML = `
      <div class="dt-scroll">
        <table class="dt-table">
          <thead><tr>
            <th>Name</th><th>Value</th><th>Override</th><th></th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;

    // Wire edit buttons
    container.querySelectorAll<HTMLButtonElement>(".edit-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        editing.add(btn.dataset.name!);
        render();
      });
    });
    container.querySelectorAll<HTMLButtonElement>(".cancel-edit").forEach((btn) => {
      btn.addEventListener("click", () => {
        editing.delete(btn.dataset.name!);
        render();
      });
    });

    function saveFrom(btn: HTMLButtonElement, persistence: "session" | "local") {
      const name = btn.dataset.name!;
      const ta = container.querySelector<HTMLTextAreaElement>(`textarea[data-name="${name}"]`);
      if (!ta) return;
      try {
        const parsed: unknown = JSON.parse(ta.value);
        setConfigOverride(name, parsed, persistence);
        editing.delete(name);
        render();
      } catch {
        ta.style.borderColor = "#f87171";
      }
    }

    container.querySelectorAll<HTMLButtonElement>(".save-session").forEach((btn) => {
      btn.addEventListener("click", () => saveFrom(btn, "session"));
    });
    container.querySelectorAll<HTMLButtonElement>(".save-local").forEach((btn) => {
      btn.addEventListener("click", () => saveFrom(btn, "local"));
    });
    container.querySelectorAll<HTMLButtonElement>(".clear-ov").forEach((btn) => {
      btn.addEventListener("click", () => {
        setConfigOverride(btn.dataset.name!, null);
        editing.delete(btn.dataset.name!);
        render();
      });
    });
  }

  render();
}
