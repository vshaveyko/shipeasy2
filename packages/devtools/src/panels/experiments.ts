import { DevtoolsApi } from "../api";
import { getExpOverride, setExpOverride } from "../overrides";
import type { ExperimentRecord, ShipeasySdkBridge } from "../types";

function bridge(): ShipeasySdkBridge | null {
  return (window as unknown as { __shipeasy?: ShipeasySdkBridge }).__shipeasy ?? null;
}

function statusBadge(status: ExperimentRecord["status"]): string {
  const map: Record<ExperimentRecord["status"], string> = {
    running: "badge-run",
    draft: "badge-draft",
    stopped: "badge-stop",
    archived: "badge-stop",
  };
  return `<span class="badge ${map[status]}">${status}</span>`;
}

function variantSelect(exp: ExperimentRecord): string {
  const current = getExpOverride(exp.name);
  const groups = ["control", ...exp.groups.map((g) => g.name)];
  const opts = [
    `<option value="" ${current === null ? "selected" : ""}>default</option>`,
    ...groups.map((g) => `<option value="${g}" ${current === g ? "selected" : ""}>${g}</option>`),
  ].join("");
  return `<select class="sel-input exp-sel" data-name="${exp.name}">${opts}</select>`;
}

function liveVariant(name: string): string {
  const exp = bridge()?.getExperiment(name);
  if (!exp) return "";
  return exp.inExperiment
    ? `<span class="badge badge-run">${exp.group}</span>`
    : `<span class="badge badge-draft">not enrolled</span>`;
}

export async function renderExperimentsPanel(container: Element, api: DevtoolsApi): Promise<void> {
  container.innerHTML = `<div class="loading">Loading experiments…</div>`;

  let experiments: ExperimentRecord[];
  try {
    experiments = await api.experiments();
  } catch (err) {
    container.innerHTML = `<div class="err">Failed to load experiments: ${String(err)}</div>`;
    return;
  }

  if (experiments.length === 0) {
    container.innerHTML = `<div class="empty">No experiments found.</div>`;
    return;
  }

  const running = experiments.filter((e) => e.status === "running");
  const other = experiments.filter((e) => e.status !== "running");

  function renderSection(items: ExperimentRecord[], label: string): string {
    if (items.length === 0) return "";
    return `
      <div class="sec-head">${label}</div>
      ${items
        .map(
          (e) => `
          <div class="row">
            <div>
              <div class="row-name">${e.name}</div>
            </div>
            ${statusBadge(e.status)}
            ${e.status === "running" ? liveVariant(e.name) : ""}
            ${e.status === "running" ? variantSelect(e) : ""}
          </div>`,
        )
        .join("")}`;
  }

  function render() {
    container.innerHTML = renderSection(running, "Running") + renderSection(other, "Other");

    container.querySelectorAll<HTMLSelectElement>(".exp-sel").forEach((sel) => {
      sel.addEventListener("change", () => {
        const name = sel.dataset.name!;
        setExpOverride(name, sel.value || null);
      });
    });
  }

  render();
  window.addEventListener("se:state:update", () => render());
}
