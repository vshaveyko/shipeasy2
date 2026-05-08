import { escapeHtml, emptyState } from "./common";

interface EventEntry {
  ts: number;
  level: "log" | "warn" | "err" | "evt";
  message: string;
}

const RING_SIZE = 200;
const ring: EventEntry[] = [];

// Capture SDK state-update events so the panel can replay them when opened.
// The Provider in @shipeasy/react fires `se:state:update` after every
// identify / override / poll, with `detail` containing the changed flag.
function pushEvent(level: EventEntry["level"], message: string): void {
  ring.push({ ts: Date.now(), level, message });
  if (ring.length > RING_SIZE) ring.shift();
}

if (typeof window !== "undefined") {
  window.addEventListener("se:state:update", (e) => {
    const detail = (e as CustomEvent<unknown>).detail;
    let msg = "state update";
    if (detail && typeof detail === "object") {
      try {
        msg = JSON.stringify(detail).slice(0, 200);
      } catch {
        /* ignore */
      }
    }
    pushEvent("log", msg);
  });
}

function relTs(now: number, ts: number): string {
  const ms = now - ts;
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60_000)}m`;
}

export function renderEventsPanel(container: HTMLElement): void {
  if (ring.length === 0) {
    const { html, wire } = emptyState({
      title: "No <em>events</em> yet",
      message:
        "SDK evaluations and overrides will stream here as the page interacts with ShipEasy.",
    });
    container.innerHTML = html;
    wire(container);
    return;
  }
  const now = Date.now();
  const reversed = ring.slice().reverse();
  container.innerHTML =
    `<div class="dtf-group">Live event stream<span class="pulse"><span class="d"></span>${reversed.length}/buf</span></div>` +
    reversed
      .map(
        (e) => `
      <div class="dtf-event">
        <span class="ts">${relTs(now, e.ts)} ago</span>
        <span class="lvl${e.level === "warn" ? " warn" : e.level === "err" ? " err" : ""}">${
          e.level === "warn" ? "!" : e.level === "err" ? "×" : "›"
        }</span>
        <span class="msg">${escapeHtml(e.message)}</span>
        <span class="ms"></span>
      </div>`,
      )
      .join("");
}
