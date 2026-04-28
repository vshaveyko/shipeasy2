import { readable, derived, type Readable } from "svelte/store";
export { labelAttrs } from "@shipeasy/i18n-core";
export type { LabelAttrs } from "@shipeasy/i18n-core";

declare global {
  interface Window {
    i18n?: {
      t: (key: string, vars?: Record<string, string | number>) => string;
      ready: (cb: () => void) => void;
      on: (event: "update", cb: () => void) => () => void;
      locale: string | null;
    };
  }
}

export interface ShipEasyI18nStoreValue {
  /** Translate a key — returns key if labels not loaded yet */
  t: (key: string, variables?: Record<string, string | number>) => string;
  ready: boolean;
  locale: string | null;
}

export interface ShipEasyI18nStoreOptions {
  /** Initial locale for SSR — pass from SvelteKit load() data */
  ssrLocale?: string;
  /** Pre-loaded strings from server for SSR hydration safety */
  initialStrings?: Record<string, string>;
}

function makeT(strings?: Record<string, string>) {
  return (key: string, variables?: Record<string, string | number>): string => {
    const raw =
      (typeof window !== "undefined" && window.i18n ? window.i18n.t(key, variables) : undefined) ??
      strings?.[key] ??
      key;
    return raw;
  };
}

/**
 * Creates a Svelte readable store that tracks window.i18n state.
 * The store emits a new value whenever labels first load or update.
 *
 * @example
 * const i18n = createShipEasyI18nStore()
 * $: greeting = $i18n.t('user.greeting', { name })
 */
export function createShipEasyI18nStore(
  opts: ShipEasyI18nStoreOptions = {},
): Readable<ShipEasyI18nStoreValue> {
  const isAlreadyReady = typeof window !== "undefined" ? Boolean(window.i18n?.locale) : false;

  return readable<ShipEasyI18nStoreValue>(
    {
      t: makeT(opts.initialStrings),
      ready: isAlreadyReady || Boolean(opts.initialStrings),
      locale:
        (typeof window !== "undefined" ? window.i18n?.locale : null) ?? opts.ssrLocale ?? null,
    },
    (set) => {
      if (typeof window === "undefined" || !window.i18n) return;

      if (window.i18n.locale) {
        set({ t: makeT(), ready: true, locale: window.i18n.locale });
      }

      window.i18n.ready(() => {
        set({ t: makeT(), ready: true, locale: window.i18n!.locale });
      });

      return window.i18n.on("update", () => {
        set({ t: makeT(), ready: true, locale: window.i18n!.locale });
      });
    },
  );
}

/**
 * Module-level default store — suitable for single-locale apps.
 * Import this directly or use createShipEasyI18nStore() for custom config.
 */
export const i18nStore = createShipEasyI18nStore();

/**
 * Derive a single-key translated string store from any i18n store.
 *
 * @example
 * const homeLabel = i18nStringStore(i18nStore, 'nav.home')
 * $: console.log($homeLabel) // 'Home'
 */
export function i18nStringStore(
  store: Readable<ShipEasyI18nStoreValue>,
  key: string,
  variables?: Record<string, string | number>,
): Readable<string> {
  return derived(store, ($i18n) => $i18n.t(key, variables));
}

/**
 * SvelteKit load() helper — fetches labels server-side and returns them
 * for use as initialStrings in createShipEasyI18nStore().
 *
 * @example
 * // +layout.ts
 * export async function load({ fetch }) {
 *   const labels = await loadShipEasyI18nLabels({ fetch, i18nKey: 'i18n_pk_abc123', profile: 'en:prod' })
 *   return { labels }
 * }
 *
 * // +layout.svelte
 * const i18n = createShipEasyI18nStore({ initialStrings: data.labels })
 */
export async function loadShipEasyI18nLabels(opts: {
  fetch: typeof globalThis.fetch;
  i18nKey: string;
  profile: string;
  chunk?: string;
  cdnBaseUrl?: string;
}): Promise<Record<string, string> | null> {
  const cdn = opts.cdnBaseUrl ?? "https://cdn.i18n.shipeasy.ai";
  const chunk = opts.chunk ?? "index";
  try {
    const manifest = await opts
      .fetch(`${cdn}/labels/${opts.i18nKey}/${opts.profile}/manifest.json`)
      .then((r) => r.json() as Promise<Record<string, string>>);
    const fileUrl = manifest[chunk];
    if (!fileUrl) return null;
    const file = await opts
      .fetch(fileUrl)
      .then((r) => r.json() as Promise<{ strings: Record<string, string> }>);
    return file.strings ?? null;
  } catch {
    return null;
  }
}
