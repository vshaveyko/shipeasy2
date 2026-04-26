import { DevtoolsApi } from "../api";
import type { BugRecord } from "../types";
import { openModal } from "./modal";
import { captureScreenshot, startRecording, type RecordingHandle } from "./capture";
import { createAnnotator } from "./annotator";

interface PendingAttachment {
  kind: "screenshot" | "recording" | "file";
  filename: string;
  blob: Blob;
}

function escapeHtml(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]!,
  );
}

function statusBadge(status: BugRecord["status"]): string {
  const cls =
    status === "open"
      ? "badge-run"
      : status === "resolved"
        ? "badge-on"
        : status === "wont_fix"
          ? "badge-off"
          : "badge-draft";
  return `<span class="badge ${cls}">${status.replace("_", " ")}</span>`;
}

function timeAgo(iso: string): string {
  const d = Date.now() - Date.parse(iso);
  const m = Math.floor(d / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  return `${days}d ago`;
}

export async function renderBugsPanel(
  container: Element,
  api: DevtoolsApi,
  shadow: ShadowRoot,
): Promise<void> {
  async function refresh() {
    container.innerHTML = `<div class="loading">Loading bugs…</div>`;
    let bugs: BugRecord[];
    try {
      bugs = await api.bugs();
    } catch (err) {
      container.innerHTML = `<div class="err">Failed to load bugs: ${escapeHtml(String(err))}</div>`;
      wireFileButton();
      return;
    }
    container.innerHTML = `
      <div class="se-feedback-head">
        <button class="ibtn pri" id="se-file-bug">+ File a bug</button>
        <a class="ibtn" target="_blank" rel="noopener" href="${api.adminUrl}/dashboard/bugs">Open dashboard ↗</a>
      </div>
      <div class="se-feedback-list" id="se-bugs-list"></div>
    `;
    const list = container.querySelector("#se-bugs-list")!;
    if (bugs.length === 0) {
      list.innerHTML = `<div class="empty">No bugs filed yet. Spotted one? Hit “File a bug”.</div>`;
    } else {
      list.innerHTML = bugs
        .map(
          (b) => `
            <a class="row se-feedback-row" target="_blank" rel="noopener"
               href="${api.adminUrl}/dashboard/bugs/${b.id}">
              <div style="flex:1;min-width:0">
                <div class="row-name">${escapeHtml(b.title)}</div>
                <div class="row-sub">${timeAgo(b.createdAt)}${b.reporterEmail ? ` · ${escapeHtml(b.reporterEmail)}` : ""}</div>
              </div>
              ${statusBadge(b.status)}
            </a>`,
        )
        .join("");
    }
    wireFileButton();
  }

  function wireFileButton() {
    const btn = container.querySelector<HTMLButtonElement>("#se-file-bug");
    btn?.addEventListener("click", () => openBugModal(api, shadow, refresh));
  }

  await refresh();
}

function openBugModal(api: DevtoolsApi, shadow: ShadowRoot, onSubmitted: () => void) {
  const modal = openModal(shadow, { title: "File a bug", size: "lg" });
  const attachments: PendingAttachment[] = [];
  let recording: RecordingHandle | null = null;

  modal.body.innerHTML = `
    <div class="se-form">
      <label class="se-field">
        <span class="se-label">Title</span>
        <input class="se-input" id="se-b-title" placeholder="Short summary of the bug" />
      </label>
      <label class="se-field">
        <span class="se-label">Steps to reproduce</span>
        <textarea class="se-input se-textarea" id="se-b-steps" rows="4" placeholder="1. Go to…&#10;2. Click…"></textarea>
      </label>
      <div class="se-field-row">
        <label class="se-field">
          <span class="se-label">Actual result</span>
          <textarea class="se-input se-textarea" id="se-b-actual" rows="3"></textarea>
        </label>
        <label class="se-field">
          <span class="se-label">Expected result</span>
          <textarea class="se-input se-textarea" id="se-b-expected" rows="3"></textarea>
        </label>
      </div>
      <div class="se-field">
        <span class="se-label">Attachments</span>
        <div class="se-actions">
          <button type="button" class="ibtn" id="se-b-screenshot">📷 Screenshot</button>
          <button type="button" class="ibtn" id="se-b-record">⏺ Record screen</button>
          <button type="button" class="ibtn" id="se-b-upload">📎 Upload file</button>
          <input type="file" id="se-b-file" hidden />
        </div>
        <div class="se-attach-list" id="se-b-attach"></div>
        <div class="se-status" id="se-b-status"></div>
      </div>
    </div>
    <div class="se-modal-footer">
      <button type="button" class="ibtn" id="se-b-cancel">Cancel</button>
      <button type="button" class="ibtn pri" id="se-b-submit">Submit</button>
    </div>
  `;

  const titleEl = modal.body.querySelector<HTMLInputElement>("#se-b-title")!;
  const stepsEl = modal.body.querySelector<HTMLTextAreaElement>("#se-b-steps")!;
  const actualEl = modal.body.querySelector<HTMLTextAreaElement>("#se-b-actual")!;
  const expectedEl = modal.body.querySelector<HTMLTextAreaElement>("#se-b-expected")!;
  const attachListEl = modal.body.querySelector<HTMLElement>("#se-b-attach")!;
  const statusEl = modal.body.querySelector<HTMLElement>("#se-b-status")!;
  const fileInputEl = modal.body.querySelector<HTMLInputElement>("#se-b-file")!;
  const recordBtn = modal.body.querySelector<HTMLButtonElement>("#se-b-record")!;

  function renderAttachments() {
    if (attachments.length === 0) {
      attachListEl.innerHTML = "";
      return;
    }
    attachListEl.innerHTML = attachments
      .map(
        (a, i) => `
          <div class="se-attach-item">
            <span>${escapeHtml(a.filename)} <span class="dim">(${(a.blob.size / 1024).toFixed(0)} KB)</span></span>
            <button type="button" class="ibtn danger" data-idx="${i}">remove</button>
          </div>`,
      )
      .join("");
    attachListEl.querySelectorAll<HTMLButtonElement>("button[data-idx]").forEach((btn) => {
      btn.addEventListener("click", () => {
        attachments.splice(Number(btn.dataset.idx), 1);
        renderAttachments();
      });
    });
  }

  function setStatus(msg: string, isErr = false) {
    statusEl.textContent = msg;
    statusEl.style.color = isErr ? "var(--se-danger)" : "var(--se-fg-3)";
  }

  modal.body.querySelector("#se-b-screenshot")!.addEventListener("click", async () => {
    setStatus("Pick a screen/tab to capture…");
    try {
      const blob = await captureScreenshot();
      setStatus("");
      openAnnotateModal(shadow, blob, (annotated) => {
        attachments.push({
          kind: "screenshot",
          filename: `screenshot-${Date.now()}.png`,
          blob: annotated,
        });
        renderAttachments();
      });
    } catch (err) {
      setStatus(String(err instanceof Error ? err.message : err), true);
    }
  });

  recordBtn.addEventListener("click", async () => {
    if (recording) {
      try {
        recordBtn.disabled = true;
        setStatus("Finalizing recording…");
        const blob = await recording.stop();
        recording = null;
        recordBtn.textContent = "⏺ Record screen";
        recordBtn.classList.remove("danger");
        attachments.push({
          kind: "recording",
          filename: `recording-${Date.now()}.webm`,
          blob,
        });
        renderAttachments();
        setStatus("");
      } catch (err) {
        setStatus(String(err instanceof Error ? err.message : err), true);
      } finally {
        recordBtn.disabled = false;
      }
      return;
    }
    setStatus("Pick a screen/tab to record…");
    try {
      recording = await startRecording();
      recordBtn.textContent = "■ Stop recording";
      recordBtn.classList.add("danger");
      setStatus("Recording… click stop when done.");
    } catch (err) {
      setStatus(String(err instanceof Error ? err.message : err), true);
      recording = null;
    }
  });

  modal.body.querySelector("#se-b-upload")!.addEventListener("click", () => fileInputEl.click());
  fileInputEl.addEventListener("change", () => {
    const file = fileInputEl.files?.[0];
    if (!file) return;
    attachments.push({ kind: "file", filename: file.name, blob: file });
    fileInputEl.value = "";
    renderAttachments();
  });

  modal.body.querySelector("#se-b-cancel")!.addEventListener("click", () => {
    if (recording) recording.cancel();
    modal.close();
  });

  modal.body.querySelector("#se-b-submit")!.addEventListener("click", async () => {
    const submitBtn = modal.body.querySelector<HTMLButtonElement>("#se-b-submit")!;
    const title = titleEl.value.trim();
    if (!title) {
      setStatus("Title is required", true);
      titleEl.focus();
      return;
    }
    submitBtn.disabled = true;
    setStatus("Submitting…");
    try {
      const created = await api.createBug({
        title,
        stepsToReproduce: stepsEl.value,
        actualResult: actualEl.value,
        expectedResult: expectedEl.value,
        pageUrl: window.location.href,
        userAgent: navigator.userAgent,
        viewport: `${window.innerWidth}x${window.innerHeight}`,
      });
      for (let i = 0; i < attachments.length; i++) {
        const a = attachments[i];
        setStatus(`Uploading attachment ${i + 1}/${attachments.length}…`);
        await api.uploadAttachment({
          reportKind: "bug",
          reportId: created.id,
          kind: a.kind,
          filename: a.filename,
          blob: a.blob,
        });
      }
      modal.close();
      onSubmitted();
    } catch (err) {
      setStatus(String(err instanceof Error ? err.message : err), true);
      submitBtn.disabled = false;
    }
  });
}

function openAnnotateModal(shadow: ShadowRoot, source: Blob, onSave: (blob: Blob) => void) {
  const modal = openModal(shadow, { title: "Annotate screenshot", size: "lg" });
  modal.body.innerHTML = `<div class="se-annot-host" id="se-annot-host"></div>
    <div class="se-modal-footer">
      <button type="button" class="ibtn" id="se-a-cancel">Cancel</button>
      <button type="button" class="ibtn pri" id="se-a-save">Use screenshot</button>
    </div>`;
  const host = modal.body.querySelector<HTMLElement>("#se-annot-host")!;
  host.innerHTML = `<div class="loading">Preparing annotator…</div>`;
  createAnnotator(source)
    .then((ann) => {
      host.innerHTML = "";
      host.appendChild(ann.root);
      modal.body.querySelector("#se-a-cancel")!.addEventListener("click", () => modal.close());
      modal.body.querySelector("#se-a-save")!.addEventListener("click", async () => {
        const blob = await ann.export();
        modal.close();
        onSave(blob);
      });
    })
    .catch((err) => {
      host.innerHTML = `<div class="err">${escapeHtml(String(err))}</div>`;
    });
}
