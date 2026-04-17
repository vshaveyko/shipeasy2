import type { FetchLabelsOptions, LabelFile } from "./types";

export type { FetchLabelsOptions, LabelFile };

const DEFAULT_CDN = "https://cdn.i18n.shipeasy.ai";

async function fetchJson<T>(url: string, timeoutMs = 2000): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      next: { revalidate: 60 },
    } as RequestInit);
    if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
    return res.json() as Promise<T>;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Fetch a manifest then the label file for a given profile + chunk.
 * Returns null on any error (network, 404, timeout) so callers can degrade gracefully.
 */
export async function fetchLabelsForSSR(opts: FetchLabelsOptions): Promise<LabelFile | null> {
  const cdn = opts.cdnBaseUrl ?? DEFAULT_CDN;
  const chunk = opts.chunk ?? "index";
  try {
    const manifest = await fetchJson<Record<string, string>>(
      `${cdn}/labels/${opts.key}/${opts.profile}/manifest.json`,
      opts.timeoutMs,
    );
    const fileUrl = manifest[chunk];
    if (!fileUrl) return null;
    return await fetchJson<LabelFile>(fileUrl, opts.timeoutMs);
  } catch {
    return null;
  }
}

/**
 * Serialize a LabelFile to a <script id="i18n-data" type="application/json"> tag.
 * Inject this into <head> before loader.js so labels are available synchronously.
 */
export function serializeLabelsToScript(labels: LabelFile | null): string {
  if (!labels) return "";
  const json = JSON.stringify(labels).replace(/</g, "\\u003C").replace(/>/g, "\\u003E");
  return `<script id="i18n-data" type="application/json">${json}</script>`;
}

/**
 * Interpolate {{variable}} placeholders in a string.
 */
export function interpolate(template: string, vars: Record<string, string | number> = {}): string {
  return Object.entries(vars).reduce((s, [k, v]) => s.replaceAll(`{{${k}}}`, String(v)), template);
}

/**
 * Translate a key from a LabelFile (server-side, no window.i18n).
 * Returns the key itself as fallback.
 */
export function translateSSR(
  labels: LabelFile | null,
  key: string,
  vars?: Record<string, string | number>,
): string {
  const raw = labels?.strings[key];
  if (!raw) return key;
  return vars ? interpolate(raw, vars) : raw;
}
