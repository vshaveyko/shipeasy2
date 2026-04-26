// Lightweight modal that mounts inside the devtools shadow root so it inherits
// our styles and sits above the panel. The caller fills `body` with content
// and wires events; we take care of the chrome, escape-to-close, and removal.

export interface ModalHandle {
  body: HTMLElement;
  root: HTMLElement;
  close(): void;
}

export function openModal(
  shadow: ShadowRoot,
  opts: { title: string; onClose?: () => void; size?: "md" | "lg" },
): ModalHandle {
  const overlay = document.createElement("div");
  overlay.className = "se-modal-overlay";
  const root = document.createElement("div");
  root.className = `se-modal se-modal-${opts.size ?? "md"}`;
  overlay.appendChild(root);

  const head = document.createElement("div");
  head.className = "se-modal-head";
  const titleEl = document.createElement("div");
  titleEl.className = "se-modal-title";
  titleEl.textContent = opts.title;
  const closeBtn = document.createElement("button");
  closeBtn.className = "se-modal-close";
  closeBtn.type = "button";
  closeBtn.setAttribute("aria-label", "Close");
  closeBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg>`;
  head.appendChild(titleEl);
  head.appendChild(closeBtn);
  root.appendChild(head);

  const body = document.createElement("div");
  body.className = "se-modal-body";
  root.appendChild(body);

  function close() {
    overlay.removeEventListener("click", onOverlayClick);
    document.removeEventListener("keydown", onKeyDown);
    overlay.remove();
    opts.onClose?.();
  }
  function onOverlayClick(e: MouseEvent) {
    if (e.target === overlay) close();
  }
  function onKeyDown(e: KeyboardEvent) {
    if (e.key === "Escape") close();
  }
  overlay.addEventListener("click", onOverlayClick);
  document.addEventListener("keydown", onKeyDown);
  closeBtn.addEventListener("click", close);

  shadow.appendChild(overlay);
  return { body, root, close };
}
