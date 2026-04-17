# Plan: ShipEasyI18n Svelte / SvelteKit Integration

**Goal**: Provide ShipEasyI18n as a Svelte-native readable store so templates auto-update when labels change, with a SvelteKit load-function helper for SSR label injection and hydration safety.
**Package**: `@i18n/svelte`
**Key challenge**: Svelte stores are synchronous pull-based (subscribers get the current value immediately on subscribe), but labels load asynchronously. The store must start with a working `t()` (key-passthrough) and upgrade to translated strings once the CDN fetch completes, without causing SvelteKit hydration warnings.

---

## Install

```bash
npm install @i18n/svelte
```

No additional peer dependencies beyond Svelte/SvelteKit itself.

---

## Package Exports

```
@i18n/svelte
  i18nStore           — Svelte readable store: { t, ready, locale }
  createShipEasyI18nStore     — factory for creating a store with custom config
  ShipEasyI18nString.svelte   — declarative component
  loadShipEasyI18nLabels      — SvelteKit load() helper (server + client)
```

---

## Full Source

### `src/store.ts`

```typescript
import { readable, type Readable } from "svelte/store";

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
  /** Translate a key. Returns key if labels not loaded. */
  t: (key: string, variables?: Record<string, string | number>) => string;
  /** True once the label file has been applied */
  ready: boolean;
  /** Current profile/locale string */
  locale: string | null;
}

export interface ShipEasyI18nStoreOptions {
  /**
   * Initial labels for SSR — pass from SvelteKit load() data.
   * When provided, t() is available immediately with no flash.
   */
  initialLabels?: Record<string, string>;
  /** Locale string, e.g. "en:prod" — used on server before window.i18n is available */
  ssrLocale?: string;
}

/**
 * Creates a Svelte readable store backed by window.i18n.
 *
 * The store emits a new value whenever:
 * - Labels first load (ready: false → true)
 * - Labels update (editor live preview)
 *
 * Usage:
 *   import { i18nStore } from '@i18n/svelte';
 *   $: greeting = $i18nStore.t('user.greeting', { name });
 */
export function createShipEasyI18nStore(
  opts: ShipEasyI18nStoreOptions = {},
): Readable<ShipEasyI18nStoreValue> {
  // Build a t() from initialLabels (SSR-provided) or fallback to key
  function makeT(strings?: Record<string, string>) {
    return (key: string, variables?: Record<string, string | number>): string => {
      // Always prefer window.i18n if available (client-side, post-hydration)
      if (typeof window !== "undefined" && window.i18n) {
        return window.i18n.t(key, variables);
      }
      // SSR fallback: use initialLabels
      if (strings) {
        let value = strings[key] ?? key;
        if (variables) {
          value = Object.entries(variables).reduce(
            (s, [k, v]) => s.replace(new RegExp(`{{${k}}}`, "g"), String(v)),
            value,
          );
        }
        return value;
      }
      return key;
    };
  }

  const initialReady =
    typeof window !== "undefined" ? Boolean(window.i18n?.locale) : Boolean(opts.initialLabels);

  const initialLocale =
    typeof window !== "undefined"
      ? (window.i18n?.locale ?? opts.ssrLocale ?? null)
      : (opts.ssrLocale ?? null);

  const initialValue: ShipEasyI18nStoreValue = {
    t: makeT(opts.initialLabels),
    ready: initialReady,
    locale: initialLocale,
  };

  return readable<ShipEasyI18nStoreValue>(initialValue, (set) => {
    // Guard: SSR or no i18n loader
    if (typeof window === "undefined") return;

    // Already ready (inline data was injected)
    if (window.i18n?.locale) {
      set({ t: makeT(), ready: true, locale: window.i18n.locale });
    }

    // Subscribe to ready event
    window.i18n?.ready(() => {
      set({ t: makeT(), ready: true, locale: window.i18n!.locale });
    });

    // Subscribe to live updates
    const unsubscribe = window.i18n?.on("update", () => {
      // Re-create t() so reactive expressions re-evaluate
      set({ t: makeT(), ready: true, locale: window.i18n!.locale });
    });

    // Cleanup function (called when all subscribers unsubscribe)
    return () => {
      unsubscribe?.();
    };
  });
}

/** Pre-built singleton store — use this in most apps */
export const i18nStore = createShipEasyI18nStore();
```

### `src/sveltekit.ts`

```typescript
/**
 * SvelteKit load() helper.
 *
 * Call this in your root +layout.server.ts load function to fetch labels
 * server-side and pass them to the layout. The layout injects them into
 * the page as inline data (read by loader.js) and seeds the store.
 */
export interface LabelFile {
  v: number;
  profile: string;
  chunk: string;
  strings: Record<string, string>;
}

export async function loadShipEasyI18nLabels(opts: {
  i18nKey: string;
  profile: string;
  chunk?: string;
  fetch: typeof globalThis.fetch; // SvelteKit provides fetch in load()
}): Promise<LabelFile | null> {
  const chunk = opts.chunk ?? "index";
  try {
    const manifestUrl = `https://cdn.i18n.shipeasy.ai/labels/${opts.i18nKey}/${opts.profile}/manifest.json`;
    const manifest = await opts
      .fetch(manifestUrl)
      .then((r) => r.json() as Promise<Record<string, string>>);

    const fileUrl = manifest[chunk];
    if (!fileUrl) {
      console.error(`[ShipEasyI18n] Chunk "${chunk}" not found in manifest`);
      return null;
    }

    return opts.fetch(fileUrl).then((r) => r.json() as Promise<LabelFile>);
  } catch (err) {
    console.error("[ShipEasyI18n] Failed to fetch labels:", err);
    return null;
  }
}

/**
 * Generates the inline script HTML string to inject into <svelte:head>.
 * Call with the labelFile returned by loadShipEasyI18nLabels().
 */
export function i18nInlineScript(labelFile: LabelFile | null): string {
  if (!labelFile) return "";
  // JSON.stringify is XSS-safe here — label values are developer-controlled strings
  return `<script id="i18n-data" type="application/json">${JSON.stringify(labelFile)}</script>`;
}
```

### `src/ShipEasyI18nString.svelte`

```svelte
<script lang="ts">
  import { i18nStore } from './store';

  export let labelKey: string;
  export let variables: Record<string, string | number> | undefined = undefined;
  export let desc: string | undefined = undefined;
  export let tag: string = 'span';

  $: translated = $i18nStore.t(labelKey, variables);
</script>

<svelte:element
  this={tag}
  data-label={labelKey}
  data-variables={variables ? JSON.stringify(variables) : undefined}
  data-label-desc={desc}
>
  {translated}
</svelte:element>
```

### `src/index.ts`

```typescript
export { i18nStore, createShipEasyI18nStore } from "./store";
export type { ShipEasyI18nStoreValue, ShipEasyI18nStoreOptions } from "./store";
export { loadShipEasyI18nLabels, i18nInlineScript } from "./sveltekit";
export type { LabelFile } from "./sveltekit";
// ShipEasyI18nString.svelte is exported from package.json exports field
```

---

## Script Tag Setup

### Vanilla Svelte (Vite)

Add to `index.html`:

```html
<!-- index.html -->
<head>
  <script
    src="https://cdn.i18n.shipeasy.ai/loader.js"
    data-key="i18n_pk_abc123"
    data-profile="en:prod"
    async
  ></script>
</head>
```

### SvelteKit

Add to `src/app.html`:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    %sveltekit.head%
    <!-- ShipEasyI18n loader — reads inline data injected by +layout.svelte's <svelte:head> -->
    <script
      src="https://cdn.i18n.shipeasy.ai/loader.js"
      data-key="i18n_pk_abc123"
      data-profile="en:prod"
    ></script>
  </head>
  <body>
    <div style="display: contents">%sveltekit.body%</div>
  </body>
</html>
```

---

## SvelteKit Integration

### `src/routes/+layout.server.ts`

```typescript
import type { LayoutServerLoad } from "./$types";
import { loadShipEasyI18nLabels } from "@i18n/svelte";

export const load: LayoutServerLoad = async ({ fetch }) => {
  const i18nLabels = await loadShipEasyI18nLabels({
    i18nKey: "i18n_pk_abc123",
    profile: "en:prod",
    chunk: "index",
    fetch, // SvelteKit's server fetch — respects cache headers
  });

  return { i18nLabels };
};
```

### `src/routes/+layout.svelte`

```svelte
<script lang="ts">
  import { i18nInlineScript, createShipEasyI18nStore } from '@i18n/svelte';
  import type { LayoutData } from './$types';

  export let data: LayoutData;

  // Create a store seeded with SSR labels — no flash, no hydration mismatch
  const i18n = createShipEasyI18nStore({
    initialLabels: data.i18nLabels?.strings,
    ssrLocale: data.i18nLabels?.profile ?? 'en:prod',
  });

  // Inject inline label data into <head>
  const inlineScript = i18nInlineScript(data.i18nLabels);
</script>

<svelte:head>
  <!-- eslint-disable-next-line svelte/no-at-html-tags -->
  {@html inlineScript}
</svelte:head>

<slot />
```

### Using the store in a page

```svelte
<!-- src/routes/dashboard/+page.svelte -->
<script lang="ts">
  import { i18nStore } from '@i18n/svelte';
  export let data; // from +page.server.ts

  $: greeting = $i18nStore.t('user.greeting', { name: data.userName });
</script>

<h1 data-label="user.greeting" data-variables={JSON.stringify({ name: data.userName })}>
  {greeting}
</h1>
```

---

## Hydration Mismatch Fix

### Root Cause

SvelteKit SSR renders the page with Svelte's `renderToString`. If the server renders `"nav.home"` (key fallback) but the client hydrates with `"Home"` (after window.i18n loads), Svelte throws a hydration mismatch warning and re-renders.

### Fix

1. `+layout.server.ts` fetches labels.
2. `+layout.svelte` injects `{@html inlineScript}` — the `<script id="i18n-data">` tag.
3. `loader.js` in `app.html` runs before any Svelte hydration and reads the inline script.
4. `createShipEasyI18nStore({ initialLabels })` seeds the store with the same labels the server used.
5. Client first render: `$i18nStore.t('key')` returns the translated string (from initialLabels → window.i18n).
6. Server render: `$i18nStore.t('key')` returns the translated string (from initialLabels).
7. Both sides agree. Svelte hydration succeeds.

The `{@html inlineScript}` usage is safe because `i18nInlineScript()` produces `<script type="application/json">` content — a JSON blob, not executable JavaScript. Svelte's `@html` in `<svelte:head>` is equivalent to `innerHTML` and doesn't escape HTML entities.

---

## Reactive Patterns

### Reactive statement (`$:`)

```svelte
<script>
  import { i18nStore } from '@i18n/svelte';
  let userName = 'Alice';
  $: greeting = $i18nStore.t('user.greeting', { name: userName });
</script>

<h1>{greeting}</h1>
```

The `$:` reactive statement re-runs whenever `$i18nStore` changes (label update) or `userName` changes.

### Derived store

For expensive computed translations, use a Svelte derived store:

```typescript
import { derived } from "svelte/store";
import { i18nStore } from "@i18n/svelte";
import { userName } from "./userStore";

export const greeting = derived([i18nStore, userName], ([$i18n, $name]) =>
  $i18n.t("user.greeting", { name: $name }),
);
```

### Prefetching chunks

```svelte
<script>
  import { onMount } from 'svelte';
  onMount(() => {
    window.i18n?.prefetch('checkout');
  });
</script>
```

---

## Edge Cases

### `{@html inlineScript}` in `<svelte:head>`

SvelteKit does not allow arbitrary HTML in `<svelte:head>` in all versions. If you encounter restrictions, use the `%sveltekit.head%` hook in `app.html` with a server hook instead:

```typescript
// src/hooks.server.ts
import type { Handle } from "@sveltejs/kit";
import { loadShipEasyI18nLabels, i18nInlineScript } from "@i18n/svelte";

export const handle: Handle = async ({ event, resolve }) => {
  const i18nLabels = await loadShipEasyI18nLabels({
    i18nKey: "i18n_pk_abc123",
    profile: "en:prod",
    chunk: "index",
    fetch: event.fetch,
  });

  return resolve(event, {
    transformPageChunk: ({ html }) =>
      html.replace("%sveltekit.head%", `%sveltekit.head%\n${i18nInlineScript(i18nLabels)}`),
  });
};
```

This approach injects the inline script at the server hook level — available to all routes without any layout changes.

### SvelteKit adapter-static (SSG)

In `adapter-static`, pages are pre-rendered at build time. `+layout.server.ts` runs at build time with the full SvelteKit `fetch`. Labels are embedded in each pre-rendered HTML file. CDN updates require a new build.

For dynamic label updates on static sites, rely on loader.js fetching from CDN (no SSR injection). Accept the brief flash on cold cache.

### Multiple chunks

For route-specific chunks:

```typescript
// src/routes/checkout/+page.server.ts
import { loadShipEasyI18nLabels } from "@i18n/svelte";

export const load = async ({ fetch }) => {
  const checkoutLabels = await loadShipEasyI18nLabels({
    i18nKey: "i18n_pk_abc123",
    profile: "en:prod",
    chunk: "checkout",
    fetch,
  });
  return { checkoutLabels };
};
```

Then inject the additional inline script in `+page.svelte`:

```svelte
<svelte:head>
  {@html i18nInlineScript(data.checkoutLabels)}
</svelte:head>
```

---

## Test Commands

```bash
npm test               # Vitest
npm run check          # svelte-check (TypeScript + template types)
npm run build          # SvelteKit build
npx playwright test    # E2E
```

### Unit Test

```typescript
import { get } from "svelte/store";
import { createShipEasyI18nStore } from "@i18n/svelte";

describe("i18nStore", () => {
  it("returns key as fallback when no labels", () => {
    const store = createShipEasyI18nStore();
    const { t } = get(store);
    expect(t("nav.home")).toBe("nav.home");
  });

  it("translates from initialLabels", () => {
    const store = createShipEasyI18nStore({
      initialLabels: { "nav.home": "Home" },
      ssrLocale: "en:prod",
    });
    const { t } = get(store);
    expect(t("nav.home")).toBe("Home");
  });

  it("interpolates variables", () => {
    const store = createShipEasyI18nStore({
      initialLabels: { "user.greeting": "Hello, {{name}}!" },
    });
    const { t } = get(store);
    expect(t("user.greeting", { name: "Alice" })).toBe("Hello, Alice!");
  });
});
```

---

## End-to-End Example

```
my-sveltekit-app/
  src/
    app.html                    ← loader.js script tag
    hooks.server.ts             ← (optional) inject inline data for all routes
    routes/
      +layout.server.ts         ← loadShipEasyI18nLabels()
      +layout.svelte            ← inject inline data, createShipEasyI18nStore
      dashboard/
        +page.svelte            ← $i18nStore.t('key')
        +page.server.ts         ← loadShipEasyI18nLabels for chunk-specific labels
    lib/
      components/
        NavBar.svelte           ← import ShipEasyI18nString from '@i18n/svelte/ShipEasyI18nString.svelte'
```
