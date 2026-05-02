import { DevtoolsApi } from "../api";
import { getExpOverride, setExpOverride } from "../overrides";
import type { ExperimentRecord, UniverseRecord, ShipeasySdkBridge } from "../types";
import { emptyState } from "./empty";

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

function renderExperimentRow(e: ExperimentRecord): string {
  const isRunning = e.status === "running";
  return `
    <tr>
      <td class="col-name">${e.name}</td>
      <td class="col-badge">${statusBadge(e.status)}</td>
      <td class="col-badge">${isRunning ? liveVariant(e.name) : ""}</td>
      <td class="col-control">${isRunning ? variantSelect(e) : ""}</td>
    </tr>`;
}

function renderExperimentTable(items: ExperimentRecord[], label: string): string {
  if (items.length === 0) return "";
  return `
    <div class="sec-head">${label}</div>
    <div class="dt-scroll">
      <table class="dt-table">
        <thead><tr>
          <th>Name</th><th>Status</th><th>Live</th><th style="text-align:right">Override</th>
        </tr></thead>
        <tbody>${items.map(renderExperimentRow).join("")}</tbody>
      </table>
    </div>`;
}

function renderUniverseTab(
  container: HTMLElement,
  universe: UniverseRecord,
  experiments: ExperimentRecord[],
  adminUrl: string,
): void {
  // Experiments bound to this universe (matched by name, since that's the FK).
  const bucket = experiments.filter((e) => e.universe === universe.name);

  if (bucket.length === 0) {
    container.innerHTML = emptyState({
      icon: "🧪",
      title: `No experiments in “${universe.name}” yet`,
      message: "Launch an experiment in this universe to start measuring impact.",
      ctaLabel: "Create new experiment",
      ctaHref: `${adminUrl}/dashboard/experiments/new`,
    });
    return;
  }

  const running = bucket.filter((e) => e.status === "running");
  const other = bucket.filter((e) => e.status !== "running");

  container.innerHTML =
    renderExperimentTable(running, "Running") + renderExperimentTable(other, "Other");

  container.querySelectorAll<HTMLSelectElement>(".exp-sel").forEach((sel) => {
    sel.addEventListener("change", () => {
      const name = sel.dataset.name!;
      setExpOverride(name, sel.value || null);
    });
  });
}

export async function renderExperimentsPanel(container: Element, api: DevtoolsApi): Promise<void> {
  container.innerHTML = `<div class="loading">Loading…</div>`;

  let experiments: ExperimentRecord[];
  let universes: UniverseRecord[];
  try {
    [experiments, universes] = await Promise.all([api.experiments(), api.universes()]);
  } catch (err) {
    container.innerHTML = `<div class="err">Failed to load: ${String(err)}</div>`;
    return;
  }

  // No universes = nothing to bucket experiments under. Prompt the user to
  // create one (experiments cannot exist without a universe).
  if (universes.length === 0) {
    container.innerHTML = emptyState({
      icon: "🌌",
      title: "No universes yet",
      message:
        "Experiments live inside a universe — a named traffic segment with holdout control. Create one to get started.",
      ctaLabel: "Create a universe",
      ctaHref: `${api.adminUrl}/dashboard/experiments/universes`,
    });
    return;
  }

  const state = { activeUniverse: universes[0].name };

  function renderTabs() {
    const tabs = universes
      .map(
        (u) => `
          <button class="tab${u.name === state.activeUniverse ? " active" : ""}"
                  data-universe="${u.name}">${u.name}</button>`,
      )
      .join("");
    container.innerHTML = `
      <div class="tabs scroll">${tabs}</div>
      <div class="tab-body" style="overflow-y:auto;flex:1"></div>`;

    container.querySelectorAll<HTMLButtonElement>(".tab[data-universe]").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.activeUniverse = btn.dataset.universe!;
        renderTabs();
      });
    });

    const body = container.querySelector<HTMLElement>(".tab-body")!;
    const activeUniverse = universes.find((u) => u.name === state.activeUniverse)!;
    renderUniverseTab(body, activeUniverse, experiments, api.adminUrl);
  }

  renderTabs();

  // React provider re-publishes bridge state on identify/overrides — rerender
  // the active tab so live-variant badges stay correct.
  window.addEventListener("se:state:update", () => {
    const body = container.querySelector<HTMLElement>(".tab-body");
    const active = universes.find((u) => u.name === state.activeUniverse);
    if (body && active) renderUniverseTab(body, active, experiments, api.adminUrl);
  });
}
