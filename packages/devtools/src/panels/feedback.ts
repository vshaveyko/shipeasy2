import type { DevtoolsApi } from "../api";
import type { BugRecord, FeatureRequestRecord, FeatureRequestImportance } from "../types";
import { I } from "../icons";
import { captureScreenshot, startRecording, type RecordingHandle } from "./capture";
import { createAnnotator } from "./annotator";
import { escapeHtml, fmtBytes, timeAgo, emptyState, loadingState } from "./common";

interface FeedbackHook {
  sub: "bugs" | "features";
  setSub: (s: "bugs" | "features") => void;
  /** Optional one-shot signal from the rail's quick-actions hovercard. When
   * set, the panel opens directly into the matching form instead of the list.
   * Cleared via `consumePendingForm` so re-renders don't re-trigger. */
  pendingForm?: "bug" | "feature" | null;
  consumePendingForm?: () => void;
}

interface PendingAttachment {
  id: string;
  kind: "screenshot" | "recording" | "file";
  filename: string;
  blob: Blob;
  /** Object URL for screenshots/recordings, used both for the card thumb and
   * the lightbox preview. Created on attach, revoked when the user removes
   * the attachment or submits the form. */
  previewUrl?: string;
  duration?: number;
  progress?: number; // 0-100; undefined = uploaded
  error?: string;
}

const BUG_STATUS_CLS: Record<BugRecord["status"], string> = {
  open: "badge-run",
  triaged: "badge-run",
  in_progress: "badge-run",
  resolved: "badge-on",
  wont_fix: "badge-off",
};
const FR_STATUS_CLS: Record<FeatureRequestRecord["status"], string> = {
  open: "badge-run",
  considering: "badge-run",
  planned: "badge-draft",
  shipped: "badge-on",
  declined: "badge-off",
};
const FR_IMP_CLS: Record<FeatureRequestImportance, string> = {
  critical: "badge-warn",
  important: "badge-run",
  nice_to_have: "badge-draft",
};

function badge(label: string, cls: string): string {
  return `<span class="badge ${cls}">${escapeHtml(label.replace(/_/g, " "))}</span>`;
}

export async function renderFeedbackPanel(
  container: HTMLElement,
  api: DevtoolsApi,
  modalRoot: ParentNode & { appendChild: (n: Node) => Node },
  hook: FeedbackHook,
): Promise<void> {
  const shadow = container.getRootNode() as ShadowRoot;

  // Panel-local form mode: when a user clicks "+ File a bug" / "+ Request a
  // feature" we replace the list with the form inline (no modal).  `null`
  // = list view.  The Back / Cancel button on the form flips this back.
  let formMode: "bug" | "feature" | null = null;

  // Honour a one-shot pending form request from the rail hovercard. Clear it
  // so re-renders (e.g. after submit) drop back to the list view. The caller
  // is responsible for syncing `sub` to the matching form before render.
  if (hook.pendingForm) {
    formMode = hook.pendingForm;
    hook.consumePendingForm?.();
  }

  async function render(): Promise<void> {
    if (formMode === "bug") {
      mountBugForm(container, api, modalRoot, shadow, () => {
        formMode = null;
        void render();
      });
      return;
    }
    if (formMode === "feature") {
      mountFeatureForm(container, api, () => {
        formMode = null;
        void render();
      });
      return;
    }
    await refresh();
  }

  async function refresh(): Promise<void> {
    container.innerHTML = `
      <div class="se-fb-subtabs">
        <button class="${hook.sub === "bugs" ? "active" : ""}" data-sub="bugs">${I.bug} Bugs <span class="c">…</span></button>
        <button class="${hook.sub === "features" ? "active" : ""}" data-sub="features">${I.sparkles} Feature requests <span class="c">…</span></button>
      </div>
      <div class="se-feedback-head">
        <button class="ibtn pri" data-action="file">+ ${hook.sub === "bugs" ? "File a bug" : "Request a feature"}</button>
        <span class="grow"></span>
        ${
          api.hideAdminLinks
            ? ""
            : `<a class="ibtn" target="_blank" rel="noopener" href="${escapeHtml(api.adminUrl)}/dashboard/${hook.sub === "bugs" ? "bugs" : "feature-requests"}">${I.external} Open dashboard</a>`
        }
      </div>
      <div class="se-feedback-list" data-list></div>`;

    container.querySelectorAll<HTMLButtonElement>("[data-sub]").forEach((btn) => {
      btn.addEventListener("click", () => hook.setSub(btn.dataset.sub as "bugs" | "features"));
    });
    container.querySelector('[data-action="file"]')!.addEventListener("click", () => {
      formMode = hook.sub === "bugs" ? "bug" : "feature";
      void render();
    });

    const listEl = container.querySelector<HTMLElement>("[data-list]")!;
    listEl.innerHTML = loadingState();

    if (hook.sub === "bugs") {
      let items: BugRecord[];
      try {
        items = await api.bugs();
      } catch (err) {
        listEl.innerHTML = `<div class="se-empty" style="color:var(--danger)">Failed: ${escapeHtml(String(err))}</div>`;
        return;
      }
      // Update count badge
      const cBadge = container.querySelector<HTMLElement>('[data-sub="bugs"] .c')!;
      cBadge.textContent = String(items.length);
      const cBadgeOther = container.querySelector<HTMLElement>('[data-sub="features"] .c')!;
      try {
        const fr = await api.featureRequests();
        cBadgeOther.textContent = String(fr.length);
      } catch {
        cBadgeOther.textContent = "?";
      }
      renderBugs(listEl, items);
    } else {
      let items: FeatureRequestRecord[];
      try {
        items = await api.featureRequests();
      } catch (err) {
        listEl.innerHTML = `<div class="se-empty" style="color:var(--danger)">Failed: ${escapeHtml(String(err))}</div>`;
        return;
      }
      const cBadge = container.querySelector<HTMLElement>('[data-sub="features"] .c')!;
      cBadge.textContent = String(items.length);
      const cBadgeOther = container.querySelector<HTMLElement>('[data-sub="bugs"] .c')!;
      try {
        const bs = await api.bugs();
        cBadgeOther.textContent = String(bs.length);
      } catch {
        cBadgeOther.textContent = "?";
      }
      renderFeatures(listEl, items);
    }
  }

  function renderBugs(listEl: HTMLElement, items: BugRecord[]): void {
    if (items.length === 0) {
      const { html, wire } = emptyState({
        title: "No <em>bugs</em> filed yet",
        message: "Spotted something off on this page? File a bug with a screenshot or recording.",
        actions: [
          {
            icon: "+",
            label: "File a bug",
            onClick: () => {
              formMode = "bug";
              void render();
            },
          },
          ...(api.hideAdminLinks
            ? []
            : [
                {
                  label: "Open dashboard",
                  href: `${api.adminUrl}/dashboard/bugs`,
                },
              ]),
        ],
      });
      listEl.innerHTML = html;
      wire(listEl);
      return;
    }
    const expanded = new Set<string>();
    const paint = () => {
      listEl.innerHTML = items
        .map(
          (b) => `
          <div class="se-feedback-row${expanded.has(b.id) ? " expanded" : ""}" data-id="${escapeHtml(b.id)}">
            <span class="chev">▸</span>
            <div class="grow">
              <div class="row-name">${escapeHtml(b.title)}</div>
              <div class="row-sub">${escapeHtml(timeAgo(b.createdAt))}${b.reporterEmail ? " · " + escapeHtml(b.reporterEmail) : ""}</div>
            </div>
            ${badge(b.status, BUG_STATUS_CLS[b.status])}
          </div>
          <div class="se-feedback-detail${expanded.has(b.id) ? " open" : ""}">
            <div class="inner"><div class="pad">
              <div class="se-fb-meta">
                <span class="k">page</span><span>${escapeHtml(b.pageUrl ?? "—")}</span>
                <span class="k">filed</span><span>${escapeHtml(timeAgo(b.createdAt))}${b.reporterEmail ? " · " + escapeHtml(b.reporterEmail) : ""}</span>
              </div>
              <div class="se-fb-actions">
                ${
                  api.hideAdminLinks
                    ? ""
                    : `<a class="ibtn pri" target="_blank" rel="noopener" href="${escapeHtml(api.adminUrl)}/dashboard/bugs/${escapeHtml(b.id)}">${I.external} Open in dashboard</a>`
                }
              </div>
            </div></div>
          </div>`,
        )
        .join("");
      listEl.querySelectorAll<HTMLElement>("[data-id]").forEach((row) => {
        row.addEventListener("click", () => {
          const id = row.dataset.id!;
          if (expanded.has(id)) expanded.delete(id);
          else expanded.add(id);
          paint();
        });
      });
    };
    paint();
  }

  function renderFeatures(listEl: HTMLElement, items: FeatureRequestRecord[]): void {
    if (items.length === 0) {
      const { html, wire } = emptyState({
        title: "No <em>feature requests</em> yet",
        message: "Capture asks from the field with importance, status, and a clean trail.",
        actions: [
          {
            icon: "+",
            label: "Request a feature",
            onClick: () => {
              formMode = "feature";
              void render();
            },
          },
          ...(api.hideAdminLinks
            ? []
            : [
                {
                  label: "Open dashboard",
                  href: `${api.adminUrl}/dashboard/feature-requests`,
                },
              ]),
        ],
      });
      listEl.innerHTML = html;
      wire(listEl);
      return;
    }
    const expanded = new Set<string>();
    const paint = () => {
      listEl.innerHTML = items
        .map(
          (f) => `
          <div class="se-feedback-row${expanded.has(f.id) ? " expanded" : ""}" data-id="${escapeHtml(f.id)}">
            <span class="chev">▸</span>
            <div class="grow">
              <div class="row-name">${escapeHtml(f.title)}</div>
              <div class="row-sub">${escapeHtml(timeAgo(f.createdAt))}${f.reporterEmail ? " · " + escapeHtml(f.reporterEmail) : ""}</div>
            </div>
            ${badge(f.importance, FR_IMP_CLS[f.importance])}
            ${badge(f.status, FR_STATUS_CLS[f.status])}
          </div>
          <div class="se-feedback-detail${expanded.has(f.id) ? " open" : ""}">
            <div class="inner"><div class="pad">
              <div class="se-fb-meta">
                <span class="k">importance</span><span>${escapeHtml(f.importance.replace(/_/g, " "))}</span>
                <span class="k">filed</span><span>${escapeHtml(timeAgo(f.createdAt))}${f.reporterEmail ? " · " + escapeHtml(f.reporterEmail) : ""}</span>
              </div>
              <div class="se-fb-actions">
                ${
                  api.hideAdminLinks
                    ? ""
                    : `<a class="ibtn pri" target="_blank" rel="noopener" href="${escapeHtml(api.adminUrl)}/dashboard/feature-requests/${escapeHtml(f.id)}">${I.external} Open in dashboard</a>`
                }
              </div>
            </div></div>
          </div>`,
        )
        .join("");
      listEl.querySelectorAll<HTMLElement>("[data-id]").forEach((row) => {
        row.addEventListener("click", () => {
          const id = row.dataset.id!;
          if (expanded.has(id)) expanded.delete(id);
          else expanded.add(id);
          paint();
        });
      });
    };
    paint();
  }

  await render();
}

// ── Inline form scaffold ────────────────────────────────────────────────────
//
// Bug + feature forms render inline inside the feedback panel container,
// not as floating modals. The scaffold below lays out the same header /
// body / footer as the old modal but as a normal element tree, so the
// panel rail and footer stay visible while the user is filling out the
// form. `onCancel` is invoked when the user discards or hits Back.
function mountInlineForm(
  container: HTMLElement,
  opts: {
    title: string;
    bodyHtml: string;
    isDirty: () => boolean;
    onSubmit: () => Promise<void> | void;
    onCancel: () => void;
  },
): { host: HTMLElement; close: () => void } {
  container.innerHTML = `
    <div class="dtf-inline-form">
      <div class="hd">
        <button class="back" data-action="cancel">${I.arrowLeft} Back</button>
        <span class="k" style="margin-left:8px">${escapeHtml(opts.title)}</span>
      </div>
      <div class="bd">${opts.bodyHtml}</div>
      <div class="ft">
        <span class="sp"></span>
        <button data-action="cancel">Cancel</button>
        <button class="primary" data-action="submit">Submit</button>
      </div>
    </div>`;
  const host = container.querySelector<HTMLElement>(".dtf-inline-form")!;

  let askDiscard = false;
  const tryClose = () => {
    if (!opts.isDirty()) return doClose();
    if (askDiscard) return doClose();
    askDiscard = true;
    const banner = document.createElement("div");
    banner.className = "dtf-discard";
    banner.innerHTML = `${I.alert}<span>Discard your changes?</span><span style="flex:1"></span>
      <button class="ibtn" data-action="keep">Keep editing</button>
      <button class="ibtn danger" data-action="discard">Discard</button>`;
    host.querySelector(".hd")!.after(banner);
    banner.querySelector('[data-action="keep"]')!.addEventListener("click", () => {
      banner.remove();
      askDiscard = false;
    });
    banner.querySelector('[data-action="discard"]')!.addEventListener("click", () => doClose());
  };
  const doClose = () => {
    document.removeEventListener("keydown", onKey);
    opts.onCancel();
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") tryClose();
  };
  document.addEventListener("keydown", onKey);
  host.querySelectorAll('[data-action="cancel"]').forEach((b) => {
    b.addEventListener("click", () => tryClose());
  });
  host.querySelector('[data-action="submit"]')!.addEventListener("click", async () => {
    await opts.onSubmit();
  });
  return { host, close: doClose };
}

// ── Form modal infrastructure (annotator only) ──────────────────────────────

function openFormModal(
  modalRoot: ParentNode & { appendChild: (n: Node) => Node },
  opts: {
    title: string;
    bodyHtml: string;
    isDirty: () => boolean;
    onSubmit: () => Promise<void> | void;
  },
): { wrap: HTMLElement; modal: HTMLElement; close: () => void } {
  const wrap = document.createElement("div");
  wrap.className = "dtf-modal-bg";
  wrap.innerHTML = `
    <div class="dtf-modal lg">
      <div class="hd">
        <button class="back" data-action="close">${I.arrowLeft} Back</button>
        <span class="k" style="margin-left:8px">${escapeHtml(opts.title)}</span>
        <span style="flex:1"></span>
        <button class="x" data-action="close" title="Close (Esc)">${I.x}</button>
      </div>
      <div class="bd">${opts.bodyHtml}</div>
      <div class="ft">
        <span class="sp"></span>
        <button data-action="cancel">Cancel</button>
        <button class="primary" data-action="submit">Submit</button>
      </div>
    </div>`;
  modalRoot.appendChild(wrap);
  const modal = wrap.querySelector<HTMLElement>(".dtf-modal")!;

  let askDiscard = false;
  const tryClose = () => {
    if (!opts.isDirty()) return doClose();
    if (askDiscard) return doClose();
    askDiscard = true;
    const banner = document.createElement("div");
    banner.className = "dtf-discard";
    banner.innerHTML = `${I.alert}<span>Discard your changes?</span><span style="flex:1"></span>
      <button class="ibtn" data-action="keep">Keep editing</button>
      <button class="ibtn danger" data-action="discard">Discard</button>`;
    modal.querySelector(".hd")!.after(banner);
    banner.querySelector('[data-action="keep"]')!.addEventListener("click", () => {
      banner.remove();
      askDiscard = false;
    });
    banner.querySelector('[data-action="discard"]')!.addEventListener("click", () => doClose());
  };
  const doClose = () => {
    document.removeEventListener("keydown", onKey);
    wrap.remove();
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") tryClose();
  };
  document.addEventListener("keydown", onKey);
  modal.querySelectorAll('[data-action="close"], [data-action="cancel"]').forEach((b) => {
    b.addEventListener("click", () => tryClose());
  });
  modal.querySelector('[data-action="submit"]')!.addEventListener("click", async () => {
    await opts.onSubmit();
  });
  wrap.addEventListener("click", (e) => {
    if (e.target === wrap) tryClose();
  });
  return { wrap, modal, close: doClose };
}

function attachmentCardHtml(a: PendingAttachment): string {
  const bg = a.previewUrl ? ` style="background-image:url('${a.previewUrl}')"` : "";
  const hasImg = a.previewUrl && (a.kind === "screenshot" || a.kind === "recording");
  const clickable = a.kind === "screenshot" || a.kind === "recording";
  const previewHtml =
    a.kind === "screenshot"
      ? `<div class="preview screenshot${hasImg ? " has-image" : ""}" data-preview="${escapeHtml(a.id)}"${bg}>
           ${clickable ? `<span class="scrim">click to preview</span>` : ""}
         </div>`
      : a.kind === "recording"
        ? `<div class="preview recording${hasImg ? " has-image" : ""}" data-preview="${escapeHtml(a.id)}"${bg}>
             <div class="play">${I.playFilled}</div>
             ${a.duration ? `<span class="dur">${fmtDuration(a.duration)}</span>` : ""}
             ${clickable ? `<span class="scrim">click to play</span>` : ""}
           </div>`
        : `<div class="preview file">${I.file}<span class="ext">.${escapeHtml(fileExt(a.filename))}</span></div>`;
  const progress =
    a.progress != null && a.progress < 100
      ? `<div class="progress"><div class="fill" style="width:${a.progress}%"></div></div>`
      : "";
  const ic = a.kind === "screenshot" ? I.camera : a.kind === "recording" ? I.record : I.file;
  return `
    <div class="se-attach-card" data-attach="${escapeHtml(a.id)}">
      ${previewHtml}
      ${progress}
      <button class="rm" data-remove="${escapeHtml(a.id)}" title="Remove">${I.x}</button>
      <div class="meta">
        <span class="ic">${ic}</span>
        <span class="name" title="${escapeHtml(a.filename)}">${escapeHtml(a.filename)}</span>
        <span class="size">${escapeHtml(fmtBytes(a.blob.size))}</span>
      </div>
    </div>`;
}

function openLightbox(
  modalRoot: ParentNode & { appendChild: (n: Node) => Node },
  a: PendingAttachment,
): void {
  if (!a.previewUrl) return;
  const wrap = document.createElement("div");
  wrap.className = "dtf-lightbox";
  const isVideo = a.kind === "recording";
  wrap.innerHTML = `
    <div class="frame">
      <button class="x" data-action="close" title="Close (Esc)">${I.x}</button>
      ${
        isVideo
          ? `<video src="${a.previewUrl}" controls autoplay playsinline></video>`
          : `<img src="${a.previewUrl}" alt="${escapeHtml(a.filename)}" />`
      }
      <div class="cap">
        <span>${escapeHtml(a.filename)}</span>
        <span style="color:var(--fg-4)">·</span>
        <span style="color:var(--fg-4)">${escapeHtml(fmtBytes(a.blob.size))}</span>
      </div>
    </div>`;
  modalRoot.appendChild(wrap);
  const close = () => {
    document.removeEventListener("keydown", onKey, true);
    wrap.remove();
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      close();
    }
  };
  document.addEventListener("keydown", onKey, true);
  wrap.addEventListener("click", (e) => {
    if (e.target === wrap || (e.target as HTMLElement).closest('[data-action="close"]')) {
      close();
    }
  });
}

function fileExt(name: string): string {
  const i = name.lastIndexOf(".");
  return i > 0 ? name.slice(i + 1) : "file";
}
function fmtDuration(ms: number): string {
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

// ── Bug form (inline) ───────────────────────────────────────────────────────

function mountBugForm(
  container: HTMLElement,
  api: DevtoolsApi,
  modalRoot: ParentNode & { appendChild: (n: Node) => Node },
  shadow: ShadowRoot,
  onClose: () => void,
): void {
  const attachments: PendingAttachment[] = [];
  let recording: RecordingHandle | null = null;
  const revokeAllPreviews = () => {
    for (const a of attachments) {
      if (a.previewUrl) URL.revokeObjectURL(a.previewUrl);
    }
  };

  const bodyHtml = `
    <div class="se-form">
      <label class="se-field">
        <span class="se-label">Title</span>
        <input class="se-input" data-field="title" placeholder="Short summary of the bug" />
      </label>
      <label class="se-field">
        <span class="se-label">Steps to reproduce</span>
        <textarea class="se-input se-textarea" data-field="steps" rows="4"
          placeholder="1. Go to…&#10;2. Click…"></textarea>
      </label>
      <div class="se-field-row">
        <label class="se-field">
          <span class="se-label">Actual result</span>
          <textarea class="se-input se-textarea" data-field="actual" rows="3"></textarea>
        </label>
        <label class="se-field">
          <span class="se-label">Expected result</span>
          <textarea class="se-input se-textarea" data-field="expected" rows="3"></textarea>
        </label>
      </div>
      <div class="se-field">
        <span class="se-label">Attachments</span>
        <div class="se-actions">
          <button type="button" class="ibtn" data-action="screenshot">${I.camera} Screenshot</button>
          <button type="button" class="ibtn" data-action="record">${I.record} Record screen</button>
          <button type="button" class="ibtn" data-action="upload">${I.upload} Upload file</button>
          <input type="file" hidden data-action="file-input"/>
        </div>
        <div class="se-attach-grid" data-attach-grid></div>
        <div class="se-status" data-status></div>
      </div>
    </div>`;

  const formState = { title: "", steps: "", actual: "", expected: "" };

  const handle = mountInlineForm(container, {
    title: "File a bug",
    bodyHtml,
    isDirty: () =>
      !!(
        formState.title ||
        formState.steps ||
        formState.actual ||
        formState.expected ||
        attachments.length
      ),
    onSubmit: submit,
    onCancel: () => {
      revokeAllPreviews();
      onClose();
    },
  });

  const modal = handle.host;
  const status = modal.querySelector<HTMLElement>("[data-status]")!;
  const setStatus = (msg: string, err = false) => {
    status.textContent = msg;
    status.classList.toggle("err", err);
  };
  const grid = modal.querySelector<HTMLElement>("[data-attach-grid]")!;
  const repaintGrid = () => {
    grid.innerHTML = attachments.map(attachmentCardHtml).join("");
    grid.querySelectorAll<HTMLButtonElement>("[data-remove]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const i = attachments.findIndex((a) => a.id === btn.dataset.remove);
        if (i >= 0) {
          const [removed] = attachments.splice(i, 1);
          if (removed.previewUrl) URL.revokeObjectURL(removed.previewUrl);
        }
        repaintGrid();
      });
    });
    grid.querySelectorAll<HTMLElement>("[data-preview]").forEach((el) => {
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        const a = attachments.find((x) => x.id === el.dataset.preview);
        if (a) openLightbox(modalRoot, a);
      });
    });
  };
  const addAttachment = (a: PendingAttachment) => {
    if (!a.previewUrl && (a.kind === "screenshot" || a.kind === "recording")) {
      a.previewUrl = URL.createObjectURL(a.blob);
    }
    attachments.push(a);
    repaintGrid();
  };

  modal.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>("[data-field]").forEach((el) => {
    el.addEventListener("input", () => {
      (formState as Record<string, string>)[el.dataset.field!] = el.value;
    });
  });
  modal.querySelector('[data-action="screenshot"]')!.addEventListener("click", async () => {
    setStatus("Pick a screen/tab to capture…");
    try {
      const blob = await captureScreenshot(shadow.host as HTMLElement);
      setStatus("");
      openAnnotateModal(modalRoot, shadow, blob, (annotated) => {
        addAttachment({
          id: "at_" + Math.random().toString(36).slice(2, 7),
          kind: "screenshot",
          filename: `screenshot-${Date.now()}.png`,
          blob: annotated,
        });
      });
    } catch (err) {
      setStatus(err instanceof Error ? err.message : String(err), true);
    }
  });
  const recordBtn = modal.querySelector<HTMLButtonElement>('[data-action="record"]')!;
  recordBtn.addEventListener("click", async () => {
    if (recording) {
      try {
        recordBtn.disabled = true;
        setStatus("Finalizing recording…");
        const blob = await recording.stop();
        recording = null;
        recordBtn.classList.remove("recording");
        recordBtn.innerHTML = `${I.record} Record screen`;
        addAttachment({
          id: "at_" + Math.random().toString(36).slice(2, 7),
          kind: "recording",
          filename: `recording-${Date.now()}.webm`,
          blob,
        });
        setStatus("");
      } catch (err) {
        setStatus(err instanceof Error ? err.message : String(err), true);
      } finally {
        recordBtn.disabled = false;
      }
      return;
    }
    setStatus("Pick a screen/tab to record…");
    try {
      recording = await startRecording(shadow.host as HTMLElement);
      recordBtn.classList.add("recording");
      recordBtn.innerHTML = `${I.record} Stop recording`;
      setStatus("Recording…");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : String(err), true);
      recording = null;
    }
  });
  const fileInput = modal.querySelector<HTMLInputElement>('[data-action="file-input"]')!;
  modal.querySelector('[data-action="upload"]')!.addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", () => {
    const f = fileInput.files?.[0];
    if (!f) return;
    const isImage = f.type.startsWith("image/");
    const isVideo = f.type.startsWith("video/");
    addAttachment({
      id: "at_" + Math.random().toString(36).slice(2, 7),
      kind: isImage ? "screenshot" : isVideo ? "recording" : "file",
      filename: f.name,
      blob: f,
    });
    fileInput.value = "";
  });

  async function submit(): Promise<void> {
    if (!formState.title.trim()) {
      setStatus("Title is required", true);
      return;
    }
    setStatus("Submitting…");
    try {
      const created = await api.createBug({
        title: formState.title.trim(),
        stepsToReproduce: formState.steps,
        actualResult: formState.actual,
        expectedResult: formState.expected,
        pageUrl: window.location.href,
        userAgent: navigator.userAgent,
        viewport: `${window.innerWidth}x${window.innerHeight}`,
      });
      for (let i = 0; i < attachments.length; i++) {
        const a = attachments[i];
        setStatus(`Uploading ${i + 1}/${attachments.length}…`);
        await api.uploadAttachment({
          reportKind: "bug",
          reportId: created.id,
          kind: a.kind,
          filename: a.filename,
          blob: a.blob,
        });
      }
      revokeAllPreviews();
      handle.close();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : String(err), true);
    }
  }
}

function openAnnotateModal(
  modalRoot: ParentNode & { appendChild: (n: Node) => Node },
  shadow: ShadowRoot,
  source: Blob,
  onSave: (blob: Blob) => void,
): void {
  void shadow;
  const wrap = document.createElement("div");
  wrap.className = "dtf-modal-bg annotate";
  wrap.innerHTML = `
    <div class="dtf-modal lg annot-modal">
      <div class="hd">
        <span class="k">Annotate screenshot</span>
        <button class="x" data-action="close">${I.x}</button>
      </div>
      <div class="bd annot-bd" data-host>Preparing annotator…</div>
      <div class="ft">
        <span class="sp"></span>
        <button data-action="close">Cancel</button>
        <button class="primary" data-action="save">Use screenshot</button>
      </div>
    </div>`;
  modalRoot.appendChild(wrap);
  const close = () => wrap.remove();
  wrap.querySelectorAll('[data-action="close"]').forEach((b) => b.addEventListener("click", close));
  wrap.addEventListener("click", (e) => {
    if (e.target === wrap) close();
  });

  const host = wrap.querySelector<HTMLElement>("[data-host]")!;
  createAnnotator(source)
    .then((ann) => {
      host.innerHTML = "";
      host.appendChild(ann.root);
      wrap.querySelector('[data-action="save"]')!.addEventListener("click", async () => {
        const blob = await ann.export();
        close();
        onSave(blob);
      });
    })
    .catch((err) => {
      host.innerHTML = `<div class="err">${escapeHtml(String(err))}</div>`;
    });
}

// ── Feature request form (inline) ───────────────────────────────────────────

function mountFeatureForm(container: HTMLElement, api: DevtoolsApi, onClose: () => void): void {
  const formState = {
    title: "",
    description: "",
    useCase: "",
    importance: "nice_to_have" as FeatureRequestImportance,
  };
  const bodyHtml = `
    <div class="se-form">
      <label class="se-field">
        <span class="se-label">Title</span>
        <input class="se-input" data-field="title" placeholder="One-line summary of the feature" />
      </label>
      <label class="se-field">
        <span class="se-label">What would it do?</span>
        <textarea class="se-input se-textarea" data-field="description" rows="4"
          placeholder="Describe the feature you'd like to see."></textarea>
      </label>
      <label class="se-field">
        <span class="se-label">Use case / why does it matter?</span>
        <textarea class="se-input se-textarea" data-field="useCase" rows="3"
          placeholder="Who needs this? What does it unlock?"></textarea>
      </label>
      <label class="se-field">
        <span class="se-label">Importance</span>
        <select class="se-input" data-field="importance">
          <option value="nice_to_have">Nice to have</option>
          <option value="important">Important</option>
          <option value="critical">Critical</option>
        </select>
      </label>
      <div class="se-status" data-status></div>
    </div>`;

  const handle = mountInlineForm(container, {
    title: "Request a feature",
    bodyHtml,
    isDirty: () =>
      !!(
        formState.title ||
        formState.description ||
        formState.useCase ||
        formState.importance !== "nice_to_have"
      ),
    onSubmit: submit,
    onCancel: onClose,
  });

  const modal = handle.host;
  const status = modal.querySelector<HTMLElement>("[data-status]")!;
  const setStatus = (msg: string, err = false) => {
    status.textContent = msg;
    status.classList.toggle("err", err);
  };
  modal
    .querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>("[data-field]")
    .forEach((el) => {
      el.addEventListener("input", () => {
        (formState as Record<string, string>)[el.dataset.field!] = (el as HTMLInputElement).value;
      });
      el.addEventListener("change", () => {
        (formState as Record<string, string>)[el.dataset.field!] = (el as HTMLInputElement).value;
      });
    });

  async function submit(): Promise<void> {
    if (!formState.title.trim()) {
      setStatus("Title is required", true);
      return;
    }
    setStatus("Submitting…");
    try {
      await api.createFeatureRequest({
        title: formState.title.trim(),
        description: formState.description,
        useCase: formState.useCase,
        importance: formState.importance,
        pageUrl: window.location.href,
        userAgent: navigator.userAgent,
      });
      handle.close();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : String(err), true);
    }
  }
}
