/** Rendered empty state with an icon, short copy, and a "Create new X" CTA
 *  that deep-links into the admin UI (opens in a new tab). Used by every
 *  panel/tab when the corresponding list is empty. */
export function emptyState(opts: {
  icon: string;
  title: string;
  message: string;
  ctaLabel: string;
  ctaHref: string;
}): string {
  return `
    <div class="empty-state">
      <div class="empty-icon">${opts.icon}</div>
      <div class="empty-title">${escape(opts.title)}</div>
      <div class="empty-msg">${escape(opts.message)}</div>
      <a class="empty-cta" href="${opts.ctaHref}" target="_blank" rel="noopener">${escape(opts.ctaLabel)}</a>
    </div>`;
}

function escape(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]!,
  );
}
