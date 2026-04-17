# Plan: ShipEasyI18n Nuxt Integration

**Goal**: Provide a Nuxt 3 module that automatically fetches labels server-side, injects inline label data into every SSR response, installs the `useShipEasyI18n()` composable globally, and prevents hydration mismatches across all Nuxt rendering modes (SSR, SSG, SPA).
**Package**: `@i18n/nuxt`
**Key challenge**: Nuxt 3's server rendering is request-per-page; label data must be injected into `useHead()` as a script before the client bundle loads, and the Nuxt plugin must initialize both server-side (for `t()` calls in server routes and composables) and client-side (for reactive updates from the editor).

---

## Install

```bash
npm install @i18n/nuxt
```

Then add to `nuxt.config.ts`:

```typescript
export default defineNuxtConfig({
  modules: ["@i18n/nuxt"],
  i18n: {
    key: "i18n_pk_abc123",
    profile: "en:prod",
    chunk: "index", // default chunk for SSR injection
    loaderUrl: "https://cdn.i18n.shipeasy.ai/loader.js",
  },
});
```

---

## Package Exports

```
@i18n/nuxt
  Module (default)        — Nuxt module registered in modules[]
  useShipEasyI18n()               — auto-imported composable (like useFetch, useI18n)
  ShipEasyI18nString              — auto-imported component
  $i18n                   — Nuxt plugin accessor (in Options API via useNuxtApp())
```

---

## Module Structure

```
@i18n/nuxt/
  module.ts              — Nuxt module definition
  runtime/
    plugin.ts            — Nuxt plugin (runs on server + client)
    composable.ts        — useShipEasyI18n() composable
    ShipEasyI18nString.vue        — component
    server-utils.ts      — server-side t() and fetchLabels()
```

---

## Full Source

### `module.ts`

```typescript
import { defineNuxtModule, addPlugin, addImports, addComponent, createResolver } from "@nuxt/kit";

export interface ModuleOptions {
  key: string;
  profile: string;
  chunk?: string;
  loaderUrl?: string;
}

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: "@i18n/nuxt",
    configKey: "i18n",
    compatibility: { nuxt: "^3.0.0" },
  },

  defaults: {
    key: "",
    profile: "en:prod",
    chunk: "index",
    loaderUrl: "https://cdn.i18n.shipeasy.ai/loader.js",
  },

  setup(options, nuxt) {
    const resolver = createResolver(import.meta.url);

    // Make options available to runtime via runtimeConfig
    nuxt.options.runtimeConfig.public.i18n = {
      key: options.key,
      profile: options.profile,
      chunk: options.chunk,
      loaderUrl: options.loaderUrl,
    };

    // Register the runtime plugin (runs on both server and client)
    addPlugin(resolver.resolve("./runtime/plugin"));

    // Auto-import useShipEasyI18n() composable
    addImports({
      name: "useShipEasyI18n",
      as: "useShipEasyI18n",
      from: resolver.resolve("./runtime/composable"),
    });

    // Auto-import server-side t()
    addImports({
      name: "useShipEasyI18nServer",
      as: "useShipEasyI18nServer",
      from: resolver.resolve("./runtime/server-utils"),
    });

    // Register ShipEasyI18nString component
    addComponent({
      name: "ShipEasyI18nString",
      filePath: resolver.resolve("./runtime/ShipEasyI18nString.vue"),
    });
  },
});
```

### `runtime/plugin.ts`

```typescript
import { defineNuxtPlugin, useRuntimeConfig, useHead } from "#app";
import { ref, readonly } from "vue";
import { fetchLabels } from "./server-utils";
import type { LabelFile } from "./server-utils";

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

export default defineNuxtPlugin(async (nuxtApp) => {
  const config = useRuntimeConfig().public.i18n as {
    key: string;
    profile: string;
    chunk: string;
    loaderUrl: string;
  };

  // --- Server-side: fetch labels and inject inline data ---
  let labelFile: LabelFile | null = null;

  if (import.meta.server) {
    try {
      labelFile = await fetchLabels({
        i18nKey: config.key,
        profile: config.profile,
        chunk: config.chunk,
      });
    } catch (err) {
      console.error("[ShipEasyI18n] Failed to fetch labels for SSR:", err);
    }

    // Inject inline label data into <head> so loader.js reads it synchronously
    if (labelFile) {
      useHead({
        script: [
          {
            id: "i18n-data",
            type: "application/json",
            innerHTML: JSON.stringify(labelFile),
            // Nuxt escapes innerHTML by default — we want raw JSON
            tagPriority: "critical",
          },
          {
            src: config.loaderUrl,
            "data-key": config.key,
            "data-profile": config.profile,
            tagPriority: "critical",
          },
        ],
      });
    }
  }

  // --- Reactive state (shared server + client, but subscriptions only on client) ---
  const ready = ref<boolean>(import.meta.client && Boolean(window.i18n?.locale));
  const locale = ref<string | null>(
    import.meta.client ? (window.i18n?.locale ?? config.profile) : config.profile,
  );

  function t(key: string, variables?: Record<string, string | number>): string {
    void locale.value; // reactive dependency for Vue tracking

    if (import.meta.client && window.i18n) {
      return window.i18n.t(key, variables);
    }

    // Server-side fallback — translate from the fetched labelFile
    if (labelFile) {
      let value = labelFile.strings[key] ?? key;
      if (variables) {
        value = Object.entries(variables).reduce(
          (s, [k, v]) => s.replace(new RegExp(`{{${k}}}`, "g"), String(v)),
          value,
        );
      }
      return value;
    }

    return key;
  }

  // Client-side: subscribe to window.i18n events
  if (import.meta.client) {
    window.i18n?.ready(() => {
      ready.value = true;
      locale.value = window.i18n!.locale;
    });

    window.i18n?.on("update", () => {
      locale.value = window.i18n!.locale;
    });
  }

  const i18nState = {
    ready: readonly(ready),
    locale: readonly(locale),
    t,
  };

  // Provide to all components and composables
  nuxtApp.provide("i18n", i18nState);
});
```

### `runtime/composable.ts`

```typescript
import { useNuxtApp } from "#app";

export interface ShipEasyI18nState {
  ready: Readonly<boolean>;
  locale: Readonly<string | null>;
  t: (key: string, variables?: Record<string, string | number>) => string;
}

/**
 * Auto-imported composable for ShipEasyI18n.
 *
 * Usage:
 *   const { t, ready } = useShipEasyI18n();
 */
export function useShipEasyI18n(): ShipEasyI18nState {
  const { $i18n } = useNuxtApp();
  return $i18n as ShipEasyI18nState;
}
```

### `runtime/server-utils.ts`

```typescript
export interface LabelFile {
  v: number;
  profile: string;
  chunk: string;
  strings: Record<string, string>;
}

const ShipEasyI18n_CDN = "https://cdn.i18n.shipeasy.ai";

export async function fetchLabels(opts: {
  i18nKey: string;
  profile: string;
  chunk?: string;
}): Promise<LabelFile> {
  const chunk = opts.chunk ?? "index";

  // Fetch manifest
  const manifestUrl = `${ShipEasyI18n_CDN}/labels/${opts.i18nKey}/${opts.profile}/manifest.json`;
  const manifest = await $fetch<Record<string, string>>(manifestUrl, {
    headers: { "cache-control": "max-age=60" },
  });

  const chunkUrl = manifest[chunk];
  if (!chunkUrl) throw new Error(`ShipEasyI18n: chunk "${chunk}" not in manifest`);

  return $fetch<LabelFile>(chunkUrl, {
    headers: { "cache-control": "max-age=31536000" },
  });
}

/**
 * Server-side t() for use in Nuxt server routes and useAsyncData.
 *
 * @example
 * // In a page (server-side only execution)
 * const { data } = await useAsyncData('labels', () =>
 *   useShipEasyI18nServer({ i18nKey: 'i18n_pk_abc123', profile: 'en:prod' })
 * );
 */
export async function useShipEasyI18nServer(opts: {
  i18nKey: string;
  profile: string;
  chunk?: string;
}) {
  const labelFile = await fetchLabels(opts);
  return {
    t: (key: string, variables?: Record<string, string | number>): string => {
      let value = labelFile.strings[key] ?? key;
      if (variables) {
        value = Object.entries(variables).reduce(
          (s, [k, v]) => s.replace(new RegExp(`{{${k}}}`, "g"), String(v)),
          value,
        );
      }
      return value;
    },
    labelFile,
  };
}
```

### `runtime/ShipEasyI18nString.vue`

```vue
<script setup lang="ts">
import { computed } from "vue";
import { useShipEasyI18n } from "./composable";

const props = defineProps<{
  labelKey: string;
  variables?: Record<string, string | number>;
  desc?: string;
  tag?: string;
}>();

const { t } = useShipEasyI18n();
const translated = computed(() => t(props.labelKey, props.variables));
</script>

<template>
  <component
    :is="tag ?? 'span'"
    :data-label="labelKey"
    :data-variables="variables ? JSON.stringify(variables) : undefined"
    :data-label-desc="desc"
    >{{ translated }}</component
  >
</template>
```

---

## Usage in Pages and Components

### Page (with SSR translation)

```vue
<!-- pages/dashboard.vue -->
<script setup lang="ts">
const { t, ready } = useShipEasyI18n(); // auto-imported

// Server-side: t() uses fetched labelFile
// Client-side: t() uses window.i18n
const title = computed(() => t("page.dashboard.title"));
</script>

<template>
  <div>
    <h1 data-label="page.dashboard.title">{{ title }}</h1>
    <ShipEasyI18nString label-key="nav.home" desc="Nav home link" />
  </div>
</template>
```

### Server Route

```typescript
// server/api/meta.ts
import { useShipEasyI18nServer } from "@i18n/nuxt/runtime/server-utils";

export default defineEventHandler(async () => {
  const { t } = await useShipEasyI18nServer({
    i18nKey: "i18n_pk_abc123",
    profile: "en:prod",
  });

  return {
    pageTitle: t("page.dashboard.title"),
  };
});
```

### useAsyncData with labels

```vue
<script setup lang="ts">
// Fetch a non-index chunk for this specific page
const { data: checkoutLabels } = await useAsyncData("checkout-labels", () =>
  $fetch("https://cdn.i18n.shipeasy.ai/labels/i18n_pk_abc123/en:prod/manifest.json").then(
    (manifest) => $fetch(manifest.checkout),
  ),
);

const { t } = useShipEasyI18n(); // still works — uses index labels
</script>
```

---

## Hydration Mismatch Fix

### Root Cause

Nuxt SSR renders the page on the server, then the client hydrates the Vue app. If the server renders translated strings but the client's first render uses untranslated keys (because `window.i18n` isn't ready yet), Vue/Nuxt will log hydration mismatch warnings and patch the DOM.

### Fix

The Nuxt plugin (runs server-side) does three things:

1. Fetches labels at request time using `$fetch` (Nuxt's isomorphic fetch).
2. Injects `<script id="i18n-data" type="application/json">` into `<head>` via `useHead()`.
3. Provides `t()` server-side that translates using the same fetched labels.

On the client:

- `loader.js` reads the `i18n-data` script tag synchronously on parse.
- `window.i18n` is populated before Vue hydration.
- The client plugin finds `window.i18n.locale` is set and initializes `ready = true`.
- Client `t()` returns the same strings the server rendered.
- No mismatch.

---

## Rendering Modes

### SSR (default)

Plugin runs server-side → fetches labels → injects inline data → client reads inline data.

### SSG (`nuxi generate`)

During `nuxi generate`, the Nuxt plugin runs for each pre-rendered route. Labels are fetched at build time and embedded in each static HTML file. CDN label updates after the build require a new `nuxi generate` run (or use the loader.js fetch without inline data for dynamic updates).

```typescript
// nuxt.config.ts for SSG
export default defineNuxtConfig({
  ssr: true,
  nitro: { prerender: { routes: ["/"] } },
  modules: ["@i18n/nuxt"],
  i18n: { key: "i18n_pk_abc123", profile: "en:prod" },
});
```

### SPA mode (`ssr: false`)

The plugin only runs client-side. No inline data injection. loader.js fetches labels from CDN normally. A brief flash on first uncached load is expected — sessionStorage cache eliminates it on subsequent visits.

---

## Edge Cases

### `useHead` script innerHTML escaping

Nuxt's `useHead` escapes `<` and `>` in `innerHTML` by default to prevent XSS. Since label values are developer-controlled strings (not user input), this escaping is safe to bypass:

```typescript
useHead({
  script: [
    {
      id: "i18n-data",
      type: "application/json",
      innerHTML: JSON.stringify(labelFile),
      // Nuxt uses @unhead/vue — set processTemplateParams: false if needed
    },
  ],
});
```

If labels contain `</script>`, JSON encoding will represent it as `\u003C\/script\u003E` automatically — safe.

### Per-page locale (i18n)

For multi-language Nuxt apps using `@nuxtjs/i18n`:

```typescript
// plugin.ts — detect locale from Nuxt i18n
import { useI18n } from "vue-i18n";

// Inside plugin setup:
const { locale: i18nLocale } = useI18n();
const profile = `${i18nLocale.value}:prod`;
// Use profile when calling fetchLabels
```

### Nuxt DevTools

The `$i18n` object provided by the plugin is visible in Vue DevTools under "Provided values". The `locale` ref updates in real time as the in-browser editor applies changes.

### `nitro` server routes

Server routes don't have access to the Nuxt plugin context. Use `useShipEasyI18nServer` directly:

```typescript
// server/api/page-meta.ts
import { useShipEasyI18nServer } from "@i18n/nuxt/runtime/server-utils";

export default defineEventHandler(async (event) => {
  const { t } = await useShipEasyI18nServer({
    i18nKey: process.env.ShipEasyI18n_KEY!,
    profile: "en:prod",
  });
  return { title: t("page.title") };
});
```

---

## nuxt.config.ts Options Reference

```typescript
interface ShipEasyI18nModuleOptions {
  /** Public key (i18n_pk_...) — required */
  key: string;
  /** Profile string e.g. "en:prod" — default: "en:prod" */
  profile: string;
  /** Chunk to preload in SSR head — default: "index" */
  chunk: string;
  /** loader.js URL — default: "https://cdn.i18n.shipeasy.ai/loader.js" */
  loaderUrl: string;
}
```

---

## Test Commands

```bash
npm test               # Vitest
npm run dev            # Start Nuxt dev server
npm run build          # Build + type check
npx nuxi typecheck     # Nuxt-aware TypeScript check
```

### Hydration Test

```typescript
// tests/hydration.spec.ts (Playwright)
test("no hydration mismatch", async ({ page }) => {
  const mismatches: string[] = [];
  page.on("console", (msg) => {
    if (msg.text().includes("[Vue warn]")) mismatches.push(msg.text());
  });
  await page.goto("http://localhost:3000/");
  await page.waitForLoadState("networkidle");
  expect(mismatches.filter((m) => m.includes("Hydration"))).toHaveLength(0);
});
```

---

## End-to-End Example

```
my-nuxt-app/
  nuxt.config.ts          ← modules: ['@i18n/nuxt'], i18n: { key, profile }
  pages/
    index.vue             ← useShipEasyI18n() (auto-imported)
    dashboard.vue         ← ShipEasyI18nString (auto-imported component)
  server/
    api/meta.ts           ← useShipEasyI18nServer()
```
