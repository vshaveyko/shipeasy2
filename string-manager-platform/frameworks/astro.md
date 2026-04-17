# Plan: ShipEasyI18n Astro Integration

**Goal**: Integrate ShipEasyI18n with Astro's island architecture so static/SSR pages ship inline label data in the initial HTML, each island (React, Vue, Svelte, etc.) uses its own framework's ShipEasyI18n package, and the Astro SSR adapter handles per-request label fetching.
**Package**: `@i18n/astro`
**Key challenge**: Astro is multi-framework — different islands may use React, Vue, or Svelte. The ShipEasyI18n integration must be framework-agnostic at the Astro level (via a shared inline data script and `window.i18n`), while each island uses its own framework-specific `@i18n/*` package. The Astro integration layer coordinates fetching and injection.

---

## Install

```bash
npm install @i18n/astro
# Also install the integration for each island framework you use:
npm install @i18n/react    # if you have React islands
npm install @i18n/vue      # if you have Vue islands
npm install @i18n/svelte   # if you have Svelte islands
```

---

## Package Exports

```
@i18n/astro
  integration()       — Astro integration (add to integrations[] in astro.config.mjs)
  fetchShipEasyI18nLabels      — server helper for .astro files
  ShipEasyI18nInlineScript     — Astro component: <ShipEasyI18nInlineScript labelFile={...} />
  ShipEasyI18nLoaderScript     — Astro component: <ShipEasyI18nLoaderScript key="..." profile="..." />
```

---

## Astro Config Integration

```javascript
// astro.config.mjs
import { defineConfig } from "astro/config";
import { i18nIntegration } from "@i18n/astro";
import react from "@astrojs/react";
import vue from "@astrojs/vue";

export default defineConfig({
  integrations: [
    react(),
    vue(),
    i18nIntegration({
      i18nKey: "i18n_pk_abc123",
      profile: "en:prod",
      chunk: "index",
    }),
  ],
  output: "server", // or 'hybrid' — 'static' also works (SSG)
});
```

The integration:

1. Injects `<script src="https://cdn.i18n.shipeasy.ai/loader.js">` into every page's `<head>` automatically (no manual script tag needed).
2. Provides `fetchShipEasyI18nLabels` as a virtual import available in `.astro` files.
3. In SSR mode (`output: 'server'`), fetches labels per-request in a middleware-like layer.

---

## Full Source

### `src/integration.ts`

```typescript
import type { AstroIntegration } from "astro";

export interface ShipEasyI18nIntegrationOptions {
  i18nKey: string;
  profile: string;
  chunk?: string;
  loaderUrl?: string;
}

export function i18nIntegration(opts: ShipEasyI18nIntegrationOptions): AstroIntegration {
  return {
    name: "@i18n/astro",
    hooks: {
      "astro:config:setup": ({ injectScript, updateConfig }) => {
        // Inject loader.js into every page head
        injectScript(
          "head-inline",
          `
            (function() {
              var s = document.createElement('script');
              s.src = '${opts.loaderUrl ?? "https://cdn.i18n.shipeasy.ai/loader.js"}';
              s.setAttribute('data-key', '${opts.i18nKey}');
              s.setAttribute('data-profile', '${opts.profile}');
              s.async = true;
              document.head.appendChild(s);
            })();
          `,
        );

        // Expose config as a virtual module
        updateConfig({
          vite: {
            plugins: [
              {
                name: "vite-plugin-i18n-astro",
                resolveId(id) {
                  if (id === "virtual:i18n-config") return "\0virtual:i18n-config";
                },
                load(id) {
                  if (id === "\0virtual:i18n-config") {
                    return `export const i18nConfig = ${JSON.stringify(opts)};`;
                  }
                },
              },
            ],
          },
        });
      },
    },
  };
}
```

### `src/server.ts`

```typescript
export interface LabelFile {
  v: number;
  profile: string;
  chunk: string;
  strings: Record<string, string>;
}

const ShipEasyI18n_CDN = "https://cdn.i18n.shipeasy.ai";

/**
 * Fetch ShipEasyI18n labels in an Astro `.astro` file's frontmatter or SSR middleware.
 *
 * @example
 * // pages/index.astro
 * ---
 * import { fetchShipEasyI18nLabels } from '@i18n/astro';
 * const labels = await fetchShipEasyI18nLabels({ i18nKey: 'i18n_pk_abc123', profile: 'en:prod' });
 * ---
 */
export async function fetchShipEasyI18nLabels(opts: {
  i18nKey: string;
  profile: string;
  chunk?: string;
}): Promise<LabelFile | null> {
  const chunk = opts.chunk ?? "index";
  try {
    const manifest = await fetch(
      `${ShipEasyI18n_CDN}/labels/${opts.i18nKey}/${opts.profile}/manifest.json`,
    ).then((r) => r.json() as Promise<Record<string, string>>);

    const url = manifest[chunk];
    if (!url) {
      console.error(`[ShipEasyI18n] Chunk "${chunk}" not found in manifest`);
      return null;
    }

    return fetch(url).then((r) => r.json() as Promise<LabelFile>);
  } catch (err) {
    console.error("[ShipEasyI18n] Failed to fetch labels:", err);
    return null;
  }
}

/**
 * Server-side t() — translates a key from a fetched LabelFile.
 * Use in Astro frontmatter for inline translated strings.
 */
export function createServerT(labelFile: LabelFile | null) {
  return function t(key: string, variables?: Record<string, string | number>): string {
    if (!labelFile) return key;
    let value = labelFile.strings[key] ?? key;
    if (variables) {
      value = Object.entries(variables).reduce(
        (s, [k, v]) => s.replace(new RegExp(`{{${k}}}`, "g"), String(v)),
        value,
      );
    }
    return value;
  };
}
```

### `src/components/ShipEasyI18nInlineScript.astro`

```astro
---
import type { LabelFile } from '../server';

interface Props {
  labelFile: LabelFile | null;
}

const { labelFile } = Astro.props;
---

{labelFile && (
  <script
    id="i18n-data"
    type="application/json"
    set:html={JSON.stringify(labelFile)}
  />
)}
```

### `src/components/ShipEasyI18nLoaderScript.astro`

```astro
---
interface Props {
  i18nKey: string;
  profile: string;
  chunk?: string;
  hideUntilReady?: boolean;
}

const { i18nKey, profile, chunk, hideUntilReady } = Astro.props;
---

<script
  is:inline
  src="https://cdn.i18n.shipeasy.ai/loader.js"
  data-key={i18nKey}
  data-profile={profile}
  data-chunk={chunk}
  data-hide-until-ready={hideUntilReady ? 'true' : undefined}
></script>
```

### `src/index.ts`

```typescript
export { i18nIntegration } from "./integration";
export { fetchShipEasyI18nLabels, createServerT } from "./server";
export type { LabelFile } from "./server";
// Astro components are imported directly as .astro files from the package
```

---

## Usage: Static Astro Pages

### `src/pages/index.astro`

```astro
---
import { fetchShipEasyI18nLabels, createServerT } from '@i18n/astro';
import ShipEasyI18nInlineScript from '@i18n/astro/components/ShipEasyI18nInlineScript.astro';
// Import framework-specific components for islands
import NavBar from '../components/NavBar.tsx';        // React island
import Footer from '../components/Footer.vue';        // Vue island

const labels = await fetchShipEasyI18nLabels({
  i18nKey: 'i18n_pk_abc123',
  profile: 'en:prod',
  chunk: 'index',
});
const t = createServerT(labels);
---

<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>{t('page.index.title')}</title>
    <!-- Inline label data — loader.js reads this synchronously -->
    <ShipEasyI18nInlineScript labelFile={labels} />
    <!-- loader.js is injected by the integration automatically -->
  </head>
  <body>
    <header>
      <!-- Static Astro HTML — server-translated -->
      <h1 data-label="page.index.title">{t('page.index.title')}</h1>
    </header>

    <!-- React island — hydrates with @i18n/react -->
    <NavBar client:load />

    <!-- Vue island — hydrates with @i18n/vue -->
    <Footer client:visible />
  </body>
</html>
```

---

## Usage: SSR Astro Pages

With `output: 'server'`, every request goes through the server. Labels can be fetched per-request:

```astro
---
// src/pages/dashboard.astro
import { fetchShipEasyI18nLabels, createServerT } from '@i18n/astro';
import ShipEasyI18nInlineScript from '@i18n/astro/components/ShipEasyI18nInlineScript.astro';
import DashboardWidget from '../components/DashboardWidget.tsx'; // React island

// Per-request label fetch (cached by CDN — no D1 hit)
const labels = await fetchShipEasyI18nLabels({
  i18nKey: 'i18n_pk_abc123',
  profile: Astro.cookies.get('locale')?.value ?? 'en:prod',
  chunk: 'index',
});
const t = createServerT(labels);

// Astro.props from getStaticPaths or dynamic routes
const { userId } = Astro.params;
---

<html>
  <head>
    <ShipEasyI18nInlineScript labelFile={labels} />
  </head>
  <body>
    <h1 data-label="page.dashboard.title">
      {t('page.dashboard.title')}
    </h1>
    <DashboardWidget client:load userId={userId} />
  </body>
</html>
```

---

## Island Framework Usage

### React island

```tsx
// src/components/NavBar.tsx
import { ShipEasyI18nProvider, useShipEasyI18n } from "@i18n/react";

function NavInner() {
  const { t } = useShipEasyI18n();
  return (
    <nav>
      <a href="/" data-label="nav.home">
        {t("nav.home")}
      </a>
    </nav>
  );
}

// Wrap in ShipEasyI18nProvider — reads from window.i18n (populated by loader.js + inline data)
export default function NavBar() {
  return (
    <ShipEasyI18nProvider ssrLocale="en:prod">
      <NavInner />
    </ShipEasyI18nProvider>
  );
}
```

### Vue island

```vue
<!-- src/components/Footer.vue -->
<script setup lang="ts">
import { ShipEasyI18nPlugin, useShipEasyI18n } from "@i18n/vue";
import { getCurrentInstance, onMounted } from "vue";

// Install plugin on the island's app instance
onMounted(() => {
  const app = getCurrentInstance()?.appContext.app;
  app?.use(ShipEasyI18nPlugin, { i18nKey: "i18n_pk_abc123", profile: "en:prod" });
});

const { t } = useShipEasyI18n();
</script>

<template>
  <footer>
    <span data-label="nav.home">{{ t("nav.home") }}</span>
  </footer>
</template>
```

**Note**: Vue islands in Astro share the same `window.i18n` global — no coordination needed between islands. Each island installs its own framework-specific plugin, but they all read from the same global label store.

### Svelte island

```svelte
<!-- src/components/Sidebar.svelte -->
<script lang="ts">
  import { i18nStore } from '@i18n/svelte';
  $: homeLabel = $i18nStore.t('nav.home');
</script>

<aside>
  <a href="/" data-label="nav.home">{homeLabel}</a>
</aside>
```

---

## Astro Middleware (SSR label pre-fetch)

For SSR builds, use Astro middleware to pre-fetch labels and attach to `locals`:

```typescript
// src/middleware.ts
import type { MiddlewareHandler } from "astro";
import { fetchShipEasyI18nLabels, createServerT } from "@i18n/astro";

export const onRequest: MiddlewareHandler = async (context, next) => {
  const locale = context.cookies.get("locale")?.value ?? "en:prod";

  const labels = await fetchShipEasyI18nLabels({
    i18nKey: import.meta.env.ShipEasyI18n_KEY,
    profile: locale,
    chunk: "index",
  });

  // Attach to locals — available in all .astro files via Astro.locals.i18n
  context.locals.i18n = {
    labels,
    t: createServerT(labels),
    profile: locale,
  };

  return next();
};
```

Declare the types:

```typescript
// src/env.d.ts
import type { LabelFile } from "@i18n/astro";

declare namespace App {
  interface Locals {
    i18n: {
      labels: LabelFile | null;
      t: (key: string, vars?: Record<string, string | number>) => string;
      profile: string;
    };
  }
}
```

Use in `.astro` files:

```astro
---
const { t, labels } = Astro.locals.i18n;
---
<h1>{t('page.title')}</h1>
<ShipEasyI18nInlineScript labelFile={labels} />
```

---

## Static Site Generation (SSG)

For `output: 'static'`, labels are fetched at build time:

1. Astro runs `.astro` frontmatter during `astro build`.
2. `fetchShipEasyI18nLabels()` fetches from CDN at build time.
3. Translated strings are embedded in the static HTML.
4. The inline `<script id="i18n-data">` is also embedded.
5. At runtime, loader.js reads the inline data — no CDN fetch needed.

**Caveat**: If you publish label changes after building the static site, the static HTML will be stale. Options:

- Trigger a new `astro build` after each ShipEasyI18n publish (via webhook or CI/CD).
- Rely on loader.js to fetch updated labels from CDN (accept brief flash on cold cache).
- Use hybrid rendering (`output: 'hybrid'`) with `export const prerender = false` on dynamic pages.

---

## Edge Cases

### `is:inline` on loader.js

In Astro, `<script>` tags are processed and bundled by default. Use `is:inline` to prevent Astro from processing the loader script:

```astro
<script is:inline src="https://cdn.i18n.shipeasy.ai/loader.js" data-key={i18nKey} data-profile={profile}></script>
```

Without `is:inline`, Astro may try to resolve the `src` as a local module.

### Content Collections

For Astro Content Collections with i18n, fetch labels per locale:

```typescript
// src/content/config.ts
// (no ShipEasyI18n-specific config needed — fetching happens in frontmatter)
```

```astro
---
// pages/[lang]/index.astro
const { lang } = Astro.params;
const profile = `${lang}:prod`;
const labels = await fetchShipEasyI18nLabels({ i18nKey: 'i18n_pk_abc123', profile });
---
```

### Multiple islands of the same framework

Multiple React islands on the same page each get their own `ShipEasyI18nProvider`. They all read from the same `window.i18n` — consistent behavior.

### `client:only`

Islands with `client:only="react"` (or other frameworks) are not server-rendered. They don't receive SSR-translated strings. They rely on `window.i18n` after loader.js runs. The inline data script in `<head>` ensures labels are available immediately.

### `set:html` XSS safety

`set:html={JSON.stringify(labelFile)}` is safe:

- `JSON.stringify` produces a JSON string.
- Label values are developer-controlled strings, not user input.
- `<script type="application/json">` is not executable — browsers ignore it as a script.
- Astro's `set:html` is equivalent to `innerHTML` and is appropriate here.

---

## Test Commands

```bash
npm run dev            # Start Astro dev server
npm run build          # Production build
npm run preview        # Preview production build
npx astro check        # TypeScript + template type check
npx playwright test    # E2E tests
```

### E2E Test

```typescript
// tests/i18n.spec.ts
import { test, expect } from "@playwright/test";

test("labels are applied before LCP", async ({ page }) => {
  await page.goto("http://localhost:4321/");
  const heading = page.locator('[data-label="page.index.title"]');
  // Should already have translated text — inline data + loader.js
  await expect(heading).not.toHaveText("page.index.title");
  await expect(heading).toHaveText(/Home|Welcome/);
});

test("React island renders translated text", async ({ page }) => {
  await page.goto("http://localhost:4321/");
  const navHome = page.locator('[data-label="nav.home"]');
  await expect(navHome).toHaveText("Home");
});
```

---

## End-to-End Example

```
my-astro-app/
  astro.config.mjs          ← integrations: [i18nIntegration({ key, profile })]
  src/
    middleware.ts             ← pre-fetch labels into Astro.locals
    pages/
      index.astro             ← ShipEasyI18nInlineScript + server t()
      dashboard.astro         ← uses Astro.locals.i18n
    components/
      NavBar.tsx              ← React island with ShipEasyI18nProvider + useShipEasyI18n
      Footer.vue              ← Vue island with ShipEasyI18nPlugin + useShipEasyI18n
      Sidebar.svelte          ← Svelte island with i18nStore
```
