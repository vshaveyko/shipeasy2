import { DevtoolsApi } from "../api";
import { getGateOverride, setGateOverride, clearAllOverrides } from "../overrides";
import type { GateRecord, ShipeasySdkBridge } from "../types";
import { emptyState } from "./empty";

function bridge(): ShipeasySdkBridge | null {
  return (window as unknown as { __shipeasy?: ShipeasySdkBridge }).__shipeasy ?? null;
}

function badge(gate: GateRecord): string {
  const override = getGateOverride(gate.name);
  const live = bridge()?.getFlag(gate.name);
  const effective = override !== null ? override : (live ?? gate.enabled);
  return effective
    ? `<span class="badge badge-on">ON</span>`
    : `<span class="badge badge-off">OFF</span>`;
}

function togGroup(name: string, current: boolean | null): string {
  const sel = (v: string) =>
    current === (v === "on" ? true : v === "off" ? false : null) ? " sel" : "";
  return `
    <div class="tog" data-gate="${name}">
      <button class="tog-btn${sel("default")}" data-v="default">default</button>
      <button class="tog-btn${sel("on")}" data-v="on">ON</button>
      <button class="tog-btn${sel("off")}" data-v="off">OFF</button>
    </div>`;
}

export async function renderGatesPanel(container: Element, api: DevtoolsApi): Promise<void> {
  container.innerHTML = `<div class="loading">Loading gates…</div>`;

  let gates: GateRecord[];
  try {
    gates = await api.gates();
  } catch (err) {
    container.innerHTML = `<div class="err">Failed to load gates: ${String(err)}</div>`;
    return;
  }

  if (gates.length === 0) {
    container.innerHTML = emptyState({
      icon: "⛳",
      title: "No gates yet",
      message: "Feature flags let you gate releases and ramp rollouts safely.",
      ctaLabel: "Create new gate",
      ctaHref: `${api.adminUrl}/dashboard/gates/new`,
    });
    return;
  }

  function render() {
    container.innerHTML = gates
      .map(
        (g) => `
        <div class="row">
          <div>
            <div class="row-name">${g.name}</div>
            <div class="row-sub">${g.rolloutPct}% rollout</div>
          </div>
          ${badge(g)}
          ${togGroup(g.name, getGateOverride(g.name))}
        </div>`,
      )
      .join("");

    container.querySelectorAll<HTMLButtonElement>(".tog-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const gateName = (btn.closest("[data-gate]") as HTMLElement).dataset.gate!;
        const v = btn.dataset.v!;
        setGateOverride(gateName, v === "default" ? null : v === "on");
        render();
      });
    });
  }

  render();

  // Re-render when SDK state updates
  const handler = () => render();
  window.addEventListener("se:state:update", handler);
  // Cleanup is handled by panel replacement — acceptable for devtools
}
