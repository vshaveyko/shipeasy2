import type { DevtoolsApi } from "../api";
import type {
  AttachmentRecord,
  BugDetail,
  BugRecord,
  FeatureRequestDetail,
  FeatureRequestImportance,
  FeatureRequestRecord,
} from "../types";
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
const BUG_PRI_CLS: Record<NonNullable<BugRecord["priority"]>, string> = {
  critical: "badge-warn",
  high: "badge-warn",
  medium: "badge-run",
  low: "badge-draft",
};

function fieldBlock(label: string, value: string | null | undefined): string {
  if (!value || !value.trim()) return "";
  return `<div class="se-fb-section">
    <div class="lbl">${escapeHtml(label)}</div>
    <div class="se-fb-block">${escapeHtml(value)}</div>
  </div>`;
}

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

  // Caches for the expanded-row attachment preview. paint() rebuilds the DOM
  // on every expand/collapse, so we keep state at panel scope so that:
  //  - the bug/feature detail (incl. attachment list) is fetched once per id
  //  - the attachment Blob is fetched once per attachment id, with the
  //    resulting object URL reused for thumbnails AND lightbox preview.
  // Object URLs intentionally aren't revoked here — they're cheap and the
  // panel is short-lived; revoking on row collapse would re-download on
  // re-expand which feels worse than a small leak.
  const detailCache = new Map<string, Promise<BugDetail | FeatureRequestDetail>>();
  const attachmentUrlCache = new Map<string, Promise<string>>();
  function ensureBugDetail(id: string): Promise<BugDetail> {
    let p = detailCache.get(id) as Promise<BugDetail> | undefined;
    if (!p) {
      p = api.bug(id);
      detailCache.set(id, p);
    }
    return p;
  }
  function ensureFeatureDetail(id: string): Promise<FeatureRequestDetail> {
    let p = detailCache.get(id) as Promise<FeatureRequestDetail> | undefined;
    if (!p) {
      p = api.featureRequest(id);
      detailCache.set(id, p);
    }
    return p;
  }
  function ensureAttachmentUrl(attachmentId: string): Promise<string> {
    let p = attachmentUrlCache.get(attachmentId);
    if (!p) {
      p = api.attachmentBlob(attachmentId).then((blob) => URL.createObjectURL(blob));
      attachmentUrlCache.set(attachmentId, p);
    }
    return p;
  }

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
                <span class="k">page</span>${
                  b.pageUrl
                    ? `<a class="ibtn" target="_blank" rel="noopener" href="${escapeHtml(b.pageUrl)}">${I.external} Open page</a>`
                    : `<span>—</span>`
                }
              </div>
              <div class="se-text-slot" data-text-slot="${escapeHtml(b.id)}"></div>
              <div class="se-attach-slot" data-attach-slot="${escapeHtml(b.id)}"></div>
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
      // Lazy-load attachments + text fields for any rows currently expanded.
      for (const id of expanded) {
        const bug = items.find((x) => x.id === id);
        const detail = ensureBugDetail(id);
        const tSlot = listEl.querySelector<HTMLElement>(`[data-text-slot="${id}"]`);
        if (tSlot) hydrateBugTextSlot(tSlot, detail, bug);
        const aSlot = listEl.querySelector<HTMLElement>(`[data-attach-slot="${id}"]`);
        if (aSlot) hydrateAttachmentSlot(aSlot, detail);
      }
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
                <span class="k">page</span>${
                  f.pageUrl
                    ? `<a class="ibtn" target="_blank" rel="noopener" href="${escapeHtml(f.pageUrl)}">${I.external} Open page</a>`
                    : `<span>—</span>`
                }
              </div>
              <div class="se-text-slot" data-text-slot="${escapeHtml(f.id)}"></div>
              <div class="se-attach-slot" data-attach-slot="${escapeHtml(f.id)}"></div>
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
      for (const id of expanded) {
        const detail = ensureFeatureDetail(id);
        const tSlot = listEl.querySelector<HTMLElement>(`[data-text-slot="${id}"]`);
        if (tSlot) hydrateFeatureTextSlot(tSlot, detail);
        const aSlot = listEl.querySelector<HTMLElement>(`[data-attach-slot="${id}"]`);
        if (aSlot) hydrateAttachmentSlot(aSlot, detail);
      }
    };
    paint();
  }

  function hydrateBugTextSlot(
    slot: HTMLElement,
    detailPromise: Promise<BugDetail>,
    summary: BugRecord | undefined,
  ): void {
    if (slot.dataset.hydrated === "1") return;
    slot.dataset.hydrated = "1";
    slot.innerHTML = `<div class="se-attach-slot-loading">Loading details…</div>`;
    detailPromise
      .then((d) => {
        if (!slot.isConnected) return;
        const priority = (d.priority ?? summary?.priority) || null;
        const parts: string[] = [];
        if (priority) {
          parts.push(`<div class="se-fb-section">
            <div class="lbl">Priority</div>
            <div>${badge(priority, BUG_PRI_CLS[priority])}</div>
          </div>`);
        }
        parts.push(fieldBlock("Steps to reproduce", d.stepsToReproduce));
        parts.push(fieldBlock("Actual result", d.actualResult));
        parts.push(fieldBlock("Expected result", d.expectedResult));
        const html = parts.filter(Boolean).join("");
        slot.innerHTML = html;
      })
      .catch((err) => {
        if (!slot.isConnected) return;
        slot.innerHTML = `<div class="se-attach-slot-loading err">Failed: ${escapeHtml(String(err))}</div>`;
      });
  }

  function hydrateFeatureTextSlot(
    slot: HTMLElement,
    detailPromise: Promise<FeatureRequestDetail>,
  ): void {
    if (slot.dataset.hydrated === "1") return;
    slot.dataset.hydrated = "1";
    slot.innerHTML = `<div class="se-attach-slot-loading">Loading details…</div>`;
    detailPromise
      .then((d) => {
        if (!slot.isConnected) return;
        const parts: string[] = [];
        parts.push(`<div class="se-fb-section">
          <div class="lbl">Importance</div>
          <div>${badge(d.importance, FR_IMP_CLS[d.importance])}</div>
        </div>`);
        parts.push(fieldBlock("What would it do?", d.description));
        parts.push(fieldBlock("Use case", d.useCase));
        slot.innerHTML = parts.filter(Boolean).join("");
      })
      .catch((err) => {
        if (!slot.isConnected) return;
        slot.innerHTML = `<div class="se-attach-slot-loading err">Failed: ${escapeHtml(String(err))}</div>`;
      });
  }

  // Renders the attachments grid into a row's expanded detail. The detail
  // promise is shared (panel-scoped cache); on resolve we paint thumbnails
  // and lazy-fetch each blob on demand so list view doesn't pay the cost
  // until a row is opened.
  function hydrateAttachmentSlot(
    slot: HTMLElement,
    detailPromise: Promise<{ attachments: AttachmentRecord[] }>,
  ): void {
    if (slot.dataset.hydrated === "1") return;
    slot.dataset.hydrated = "1";
    slot.innerHTML = `<div class="se-attach-slot-loading">Loading attachments…</div>`;
    detailPromise
      .then((d) => {
        if (!slot.isConnected) return;
        if (d.attachments.length === 0) {
          slot.innerHTML = "";
          return;
        }
        slot.innerHTML = `<div class="se-attach-grid">${d.attachments
          .map(serverAttachmentCardHtml)
          .join("")}</div>`;
        // Kick off thumbnail fetches for screenshots — recordings just show
        // a play icon, no auto-fetch (would download every video on open).
        slot.querySelectorAll<HTMLElement>("[data-thumb-fetch]").forEach((el) => {
          const aid = el.dataset.thumbFetch!;
          ensureAttachmentUrl(aid)
            .then((url) => {
              if (!el.isConnected) return;
              el.style.backgroundImage = `url('${url}')`;
              el.classList.add("has-image");
            })
            .catch(() => {
              /* keep placeholder */
            });
        });
        // Wire click → fetch blob (cached) → openLightbox
        slot.querySelectorAll<HTMLElement>("[data-preview-id]").forEach((el) => {
          el.addEventListener("click", async (e) => {
            e.stopPropagation();
            const aid = el.dataset.previewId!;
            const att = d.attachments.find((x) => x.id === aid);
            if (!att) return;
            try {
              const url = await ensureAttachmentUrl(aid);
              openLightbox(modalRoot, {
                kind: att.kind,
                filename: att.filename,
                url,
                sizeBytes: att.sizeBytes,
              });
            } catch (err) {
              console.error(err);
            }
          });
        });
      })
      .catch((err) => {
        if (!slot.isConnected) return;
        slot.innerHTML = `<div class="se-attach-slot-loading err">Failed: ${escapeHtml(String(err))}</div>`;
      });
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

// Read-only attachment card for an already-uploaded attachment shown in an
// expanded bug/feature row. Mirrors the layout of attachmentCardHtml minus
// the remove button and upload progress bar; the thumbnail's background
// image is filled in async after the blob fetches (see hydrateAttachmentSlot).
function serverAttachmentCardHtml(a: AttachmentRecord): string {
  const idAttr = escapeHtml(a.id);
  const previewable = a.kind === "screenshot" || a.kind === "recording";
  const previewHtml =
    a.kind === "screenshot"
      ? `<div class="preview screenshot" data-preview-id="${idAttr}" data-thumb-fetch="${idAttr}">
           <span class="scrim">click to preview</span>
         </div>`
      : a.kind === "recording"
        ? `<div class="preview recording" data-preview-id="${idAttr}">
             <div class="play">${I.playFilled}</div>
             <span class="scrim">click to play</span>
           </div>`
        : `<div class="preview file">${I.file}<span class="ext">.${escapeHtml(fileExt(a.filename))}</span></div>`;
  void previewable;
  const ic = a.kind === "screenshot" ? I.camera : a.kind === "recording" ? I.record : I.file;
  return `
    <div class="se-attach-card readonly">
      ${previewHtml}
      <div class="meta">
        <span class="ic">${ic}</span>
        <span class="name" title="${escapeHtml(a.filename)}">${escapeHtml(a.filename)}</span>
        <span class="size">${escapeHtml(fmtBytes(a.sizeBytes))}</span>
      </div>
    </div>`;
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
  a: {
    kind: "screenshot" | "recording" | "file";
    filename: string;
    url: string;
    sizeBytes: number;
  },
): void {
  if (!a.url) return;
  const wrap = document.createElement("div");
  wrap.className = "dtf-lightbox";
  const isVideo = a.kind === "recording";
  wrap.innerHTML = `
    <div class="frame">
      <button class="x" data-action="close" title="Close (Esc)">${I.x}</button>
      ${
        isVideo
          ? `<video src="${a.url}" controls autoplay playsinline></video>`
          : `<img src="${a.url}" alt="${escapeHtml(a.filename)}" />`
      }
      <div class="cap">
        <span>${escapeHtml(a.filename)}</span>
        <span style="color:var(--fg-4)">·</span>
        <span style="color:var(--fg-4)">${escapeHtml(fmtBytes(a.sizeBytes))}</span>
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
      <label class="se-field" data-field-wrap="title">
        <span class="se-label">Title <span class="se-req">*</span></span>
        <input class="se-input" data-field="title" placeholder="Short summary of the bug" />
      </label>
      <label class="se-field" data-field-wrap="steps">
        <span class="se-label">Steps to reproduce <span class="se-req">*</span></span>
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
      <label class="se-field">
        <span class="se-label">Priority</span>
        <select class="se-input" data-field="priority">
          <option value="">— optional —</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="critical">Critical</option>
        </select>
      </label>
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

  const formState: {
    title: string;
    steps: string;
    actual: string;
    expected: string;
    priority: "" | "low" | "medium" | "high" | "critical";
  } = { title: "", steps: "", actual: "", expected: "", priority: "" };

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
        if (a && a.previewUrl) {
          openLightbox(modalRoot, {
            kind: a.kind,
            filename: a.filename,
            url: a.previewUrl,
            sizeBytes: a.blob.size,
          });
        }
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

  modal
    .querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>("[data-field]")
    .forEach((el) => {
      const update = () => {
        (formState as Record<string, string>)[el.dataset.field!] = el.value;
        // Clear field-level invalid state as soon as the user types — they've
        // acknowledged the error, no point keeping it red while they fix it.
        const wrap = el.closest<HTMLElement>("[data-field-wrap]");
        if (wrap?.classList.contains("invalid") && el.value.trim()) {
          wrap.classList.remove("invalid");
        }
      };
      el.addEventListener("input", update);
      el.addEventListener("change", update);
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
  // Shared finalizer used by both the in-panel Stop button and the browser's
  // "Stop sharing" UI (which fires through startRecording's onEnded callback).
  // Guarded so concurrent triggers don't double-finalize.
  let finalizing = false;
  async function finalizeRecording() {
    if (!recording || finalizing) return;
    finalizing = true;
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
      finalizing = false;
    }
  }
  recordBtn.addEventListener("click", async () => {
    if (recording) {
      await finalizeRecording();
      return;
    }
    setStatus("Pick a screen/tab to record…");
    try {
      recording = await startRecording(shadow.host as HTMLElement, () => {
        void finalizeRecording();
      });
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
    // Highlight every empty required field at once, then focus + scroll the
    // first one into view so the user immediately sees what's missing even
    // if the form has been scrolled past it.
    const requiredFields: Array<"title" | "steps"> = ["title", "steps"];
    let firstInvalid: HTMLElement | null = null;
    for (const f of requiredFields) {
      const wrap = modal.querySelector<HTMLElement>(`[data-field-wrap="${f}"]`);
      const input = modal.querySelector<HTMLInputElement | HTMLTextAreaElement>(
        `[data-field="${f}"]`,
      );
      const empty = !formState[f].trim();
      wrap?.classList.toggle("invalid", empty);
      if (empty && !firstInvalid) firstInvalid = input;
    }
    if (firstInvalid) {
      setStatus("");
      firstInvalid.scrollIntoView({ block: "center", behavior: "smooth" });
      firstInvalid.focus({ preventScroll: true });
      return;
    }
    setStatus("Submitting…");
    try {
      const created = await api.createBug({
        title: formState.title.trim(),
        stepsToReproduce: formState.steps,
        actualResult: formState.actual,
        expectedResult: formState.expected,
        priority: formState.priority || undefined,
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
  // Inset the scrim so the docked devtools panel stays fully visible — the
  // panel's z-index is higher than the modal's, so without this it covers the
  // modal's right edge (incl. the Save button).
  reserveSpaceForPanel(wrap, shadow);
  modalRoot.appendChild(wrap);
  const onResize = () => {
    reserveSpaceForPanel(wrap, shadow);
    fitAnnotatorCanvas(wrap);
  };
  window.addEventListener("resize", onResize);
  const close = () => {
    window.removeEventListener("resize", onResize);
    wrap.remove();
  };
  wrap.querySelectorAll('[data-action="close"]').forEach((b) => b.addEventListener("click", close));
  wrap.addEventListener("click", (e) => {
    if (e.target === wrap) close();
  });

  const host = wrap.querySelector<HTMLElement>("[data-host]")!;
  createAnnotator(source)
    .then((ann) => {
      host.innerHTML = "";
      host.appendChild(ann.root);
      // Size canvas to fit the available area so the modal shrinks to the
      // screenshot's aspect ratio instead of stretching the scrim.
      fitAnnotatorCanvas(wrap);
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

function reserveSpaceForPanel(wrap: HTMLElement, shadow: ShadowRoot): void {
  const panel = shadow.querySelector<HTMLElement>(".dtf-panel");
  wrap.style.left = wrap.style.right = wrap.style.top = wrap.style.bottom = "";
  if (!panel) return;
  const r = panel.getBoundingClientRect();
  if (r.width === 0 || r.height === 0) return;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const fromRight = vw - r.right;
  const fromLeft = r.left;
  const fromTop = r.top;
  const fromBottom = vh - r.bottom;
  const min = Math.min(fromRight, fromLeft, fromTop, fromBottom);
  const gap = 12;
  if (min === fromRight) wrap.style.right = `${Math.max(0, vw - r.left + gap)}px`;
  else if (min === fromLeft) wrap.style.left = `${r.right + gap}px`;
  else if (min === fromTop) wrap.style.top = `${r.bottom + gap}px`;
  else wrap.style.bottom = `${Math.max(0, vh - r.top + gap)}px`;
}

function fitAnnotatorCanvas(wrap: HTMLElement): void {
  const canvas = wrap.querySelector<HTMLCanvasElement>(".se-annot-canvas");
  if (!canvas || !canvas.width || !canvas.height) return;
  const wrapRect = wrap.getBoundingClientRect();
  const cs = getComputedStyle(wrap);
  const padX = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
  const padY = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
  // Reserve room for header (~38px), footer (~50px), modal border (4px),
  // stage padding (24px), and stage canvas border (2px).
  const chromeH = 38 + 50 + 4 + 24 + 2;
  const chromeW = 4 + 24 + 2;
  const availW = Math.max(120, wrapRect.width - padX - chromeW);
  const availH = Math.max(120, wrapRect.height - padY - chromeH);
  const ratio = canvas.width / canvas.height;
  let cw = availW;
  let ch = cw / ratio;
  if (ch > availH) {
    ch = availH;
    cw = ch * ratio;
  }
  canvas.style.width = `${Math.floor(cw)}px`;
  canvas.style.height = `${Math.floor(ch)}px`;
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
