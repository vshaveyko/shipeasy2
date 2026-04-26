import { DevtoolsApi } from "../api";
import type { FeatureRequestRecord, FeatureRequestImportance } from "../types";
import { openModal } from "./modal";

function escapeHtml(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]!,
  );
}

function statusBadge(status: FeatureRequestRecord["status"]): string {
  const cls =
    status === "open"
      ? "badge-run"
      : status === "shipped"
        ? "badge-on"
        : status === "declined"
          ? "badge-off"
          : "badge-draft";
  return `<span class="badge ${cls}">${status.replace("_", " ")}</span>`;
}

function importanceBadge(importance: FeatureRequestImportance): string {
  const label = importance.replace("_", " ");
  const cls =
    importance === "critical"
      ? "badge-off"
      : importance === "important"
        ? "badge-run"
        : "badge-draft";
  return `<span class="badge ${cls}">${label}</span>`;
}

function timeAgo(iso: string): string {
  const d = Date.now() - Date.parse(iso);
  const m = Math.floor(d / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export async function renderFeatureRequestsPanel(
  container: Element,
  api: DevtoolsApi,
  shadow: ShadowRoot,
): Promise<void> {
  async function refresh() {
    container.innerHTML = `<div class="loading">Loading feature requests…</div>`;
    let items: FeatureRequestRecord[];
    try {
      items = await api.featureRequests();
    } catch (err) {
      container.innerHTML = `<div class="err">Failed to load feature requests: ${escapeHtml(String(err))}</div>`;
      return;
    }
    container.innerHTML = `
      <div class="se-feedback-head">
        <button class="ibtn pri" id="se-file-fr">+ Request a feature</button>
        <a class="ibtn" target="_blank" rel="noopener" href="${api.adminUrl}/dashboard/feature-requests">Open dashboard ↗</a>
      </div>
      <div class="se-feedback-list" id="se-fr-list"></div>
    `;
    const list = container.querySelector("#se-fr-list")!;
    if (items.length === 0) {
      list.innerHTML = `<div class="empty">No feature requests yet.</div>`;
    } else {
      list.innerHTML = items
        .map(
          (r) => `
            <a class="row se-feedback-row" target="_blank" rel="noopener"
               href="${api.adminUrl}/dashboard/feature-requests/${r.id}">
              <div style="flex:1;min-width:0">
                <div class="row-name">${escapeHtml(r.title)}</div>
                <div class="row-sub">${timeAgo(r.createdAt)}${r.reporterEmail ? ` · ${escapeHtml(r.reporterEmail)}` : ""}</div>
              </div>
              ${importanceBadge(r.importance)}
              ${statusBadge(r.status)}
            </a>`,
        )
        .join("");
    }
    container
      .querySelector<HTMLButtonElement>("#se-file-fr")!
      .addEventListener("click", () => openFeatureModal(api, shadow, refresh));
  }

  await refresh();
}

function openFeatureModal(api: DevtoolsApi, shadow: ShadowRoot, onSubmitted: () => void) {
  const modal = openModal(shadow, { title: "Request a feature", size: "lg" });
  modal.body.innerHTML = `
    <div class="se-form">
      <label class="se-field">
        <span class="se-label">Title</span>
        <input class="se-input" id="se-f-title" placeholder="One-line summary of the feature" />
      </label>
      <label class="se-field">
        <span class="se-label">What would it do?</span>
        <textarea class="se-input se-textarea" id="se-f-desc" rows="4" placeholder="Describe the feature you'd like to see."></textarea>
      </label>
      <label class="se-field">
        <span class="se-label">Use case / why does it matter?</span>
        <textarea class="se-input se-textarea" id="se-f-use" rows="3" placeholder="Who needs this? What does it unlock?"></textarea>
      </label>
      <label class="se-field">
        <span class="se-label">Importance</span>
        <select class="se-input" id="se-f-imp">
          <option value="nice_to_have">Nice to have</option>
          <option value="important">Important</option>
          <option value="critical">Critical</option>
        </select>
      </label>
      <div class="se-status" id="se-f-status"></div>
    </div>
    <div class="se-modal-footer">
      <button type="button" class="ibtn" id="se-f-cancel">Cancel</button>
      <button type="button" class="ibtn pri" id="se-f-submit">Submit</button>
    </div>
  `;
  const titleEl = modal.body.querySelector<HTMLInputElement>("#se-f-title")!;
  const descEl = modal.body.querySelector<HTMLTextAreaElement>("#se-f-desc")!;
  const useEl = modal.body.querySelector<HTMLTextAreaElement>("#se-f-use")!;
  const impEl = modal.body.querySelector<HTMLSelectElement>("#se-f-imp")!;
  const statusEl = modal.body.querySelector<HTMLElement>("#se-f-status")!;

  modal.body.querySelector("#se-f-cancel")!.addEventListener("click", () => modal.close());
  modal.body.querySelector("#se-f-submit")!.addEventListener("click", async () => {
    const title = titleEl.value.trim();
    if (!title) {
      statusEl.textContent = "Title is required";
      statusEl.style.color = "var(--se-danger)";
      titleEl.focus();
      return;
    }
    const submitBtn = modal.body.querySelector<HTMLButtonElement>("#se-f-submit")!;
    submitBtn.disabled = true;
    statusEl.textContent = "Submitting…";
    statusEl.style.color = "var(--se-fg-3)";
    try {
      await api.createFeatureRequest({
        title,
        description: descEl.value,
        useCase: useEl.value,
        importance: impEl.value as FeatureRequestImportance,
        pageUrl: window.location.href,
        userAgent: navigator.userAgent,
      });
      modal.close();
      onSubmitted();
    } catch (err) {
      statusEl.textContent = String(err instanceof Error ? err.message : err);
      statusEl.style.color = "var(--se-danger)";
      submitBtn.disabled = false;
    }
  });
}
