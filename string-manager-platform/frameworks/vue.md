# Plan: ShipEasyI18n Vue Integration

**Goal**: Provide a Vue 3 composition-API-native integration for ShipEasyI18n with a plugin, composable, and reactive translation function that automatically re-renders components when labels update.
**Package**: `@i18n/vue`
**Key challenge**: Vue's reactivity system is separate from React's — label updates from `window.i18n.on('update')` must be connected to Vue's reactive graph so affected template bindings re-evaluate without requiring manual `watch` or `forceUpdate` calls.

---

## Install

```bash
npm install @i18n/vue
```

No additional peer dependencies beyond Vue 3 itself.

---

## Package Exports

```
@i18n/vue
  ShipEasyI18nPlugin          — Vue plugin: install with app.use(ShipEasyI18nPlugin, options)
  useShipEasyI18n             — composable: { t, ready, locale }
  ShipEasyI18nString          — component: <ShipEasyI18nString label-key="..." />
  provideShipEasyI18n         — lower-level injection helper for custom providers
```

---

## Full Source

### `src/types.ts`

```typescript
export interface ShipEasyI18nOptions {
  /** The ShipEasyI18n public key embedded in the script tag */
  i18nKey: string;
  /** Profile string, e.g. "en:prod" */
  profile: string;
  /**
   * Locale to use before window.i18n is available (SSR / Nuxt).
   * Optional — defaults to profile.
   */
  ssrLocale?: string;
}

export interface ShipEasyI18nState {
  ready: boolean;
  locale: string | null;
  /** Reactive translation function — call inside templates */
  t: (key: string, variables?: Record<string, string | number>) => string;
}

export const ShipEasyI18n_INJECTION_KEY = Symbol("i18n") as InjectionKey<ShipEasyI18nState>;

import type { InjectionKey } from "vue";
```

### `src/plugin.ts`

```typescript
import type { App } from "vue";
import { ref, readonly, provide } from "vue";
import type { ShipEasyI18nOptions, ShipEasyI18nState } from "./types";
import { ShipEasyI18n_INJECTION_KEY } from "./types";

// Extend global window type
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

/**
 * Creates an ShipEasyI18n state object backed by Vue reactive refs.
 * This is the shared state installed by ShipEasyI18nPlugin and returned by useShipEasyI18n().
 */
function createShipEasyI18nState(opts: ShipEasyI18nOptions): ShipEasyI18nState {
  const ready = ref<boolean>(typeof window !== "undefined" && Boolean(window.i18n?.locale));
  const locale = ref<string | null>(
    typeof window !== "undefined"
      ? (window.i18n?.locale ?? opts.ssrLocale ?? null)
      : (opts.ssrLocale ?? null),
  );

  // t() is a plain function — reads from window.i18n which is already reactive
  // at the DOM level. To make Vue templates reactive, we read `locale.value`
  // so that Vue's dependency tracker records the dependency and re-runs the
  // expression when locale changes.
  function t(key: string, variables?: Record<string, string | number>): string {
    // Reading locale.value makes this expression a reactive dependency.
    // When locale changes (label update), any template calling t() re-evaluates.
    void locale.value; // eslint-disable-line @typescript-eslint/no-unused-expressions

    if (typeof window !== "undefined" && window.i18n) {
      return window.i18n.t(key, variables);
    }
    return key;
  }

  // Set up subscriptions only in the browser
  if (typeof window !== "undefined") {
    if (window.i18n?.locale) {
      ready.value = true;
      locale.value = window.i18n.locale;
    }

    window.i18n?.ready(() => {
      ready.value = true;
      locale.value = window.i18n!.locale;
    });

    window.i18n?.on("update", () => {
      locale.value = window.i18n!.locale;
    });
  }

  return {
    ready: readonly(ready) as unknown as boolean,
    locale: readonly(locale) as unknown as string | null,
    t,
  };
}

// Module-level singleton so all useShipEasyI18n() calls share the same reactive state
let globalState: ShipEasyI18nState | null = null;

export const ShipEasyI18nPlugin = {
  install(app: App, opts: ShipEasyI18nOptions) {
    globalState = createShipEasyI18nState(opts);
    app.provide(ShipEasyI18n_INJECTION_KEY, globalState);
    // Also make available as app-level property for Options API
    app.config.globalProperties.$i18n = globalState;
  },
};

export function getOrCreateState(opts?: Partial<ShipEasyI18nOptions>): ShipEasyI18nState {
  if (!globalState) {
    // Called outside of a plugin context — create with defaults
    globalState = createShipEasyI18nState({
      i18nKey: "",
      profile: "en:prod",
      ...opts,
    });
  }
  return globalState;
}
```

### `src/composable.ts`

```typescript
import { inject } from "vue";
import { ShipEasyI18n_INJECTION_KEY } from "./types";
import { getOrCreateState } from "./plugin";
import type { ShipEasyI18nState } from "./types";

/**
 * Composable for use inside Vue 3 setup() functions.
 *
 * @example
 * const { t, ready } = useShipEasyI18n();
 * // In template: {{ t('user.greeting', { name }) }}
 */
export function useShipEasyI18n(): ShipEasyI18nState {
  const injected = inject(ShipEasyI18n_INJECTION_KEY);
  if (injected) return injected;

  // Fallback for components that aren't inside an ShipEasyI18nPlugin app
  // (e.g., tests, micro-frontend contexts)
  return getOrCreateState();
}
```

### `src/ShipEasyI18nString.vue`

```vue
<script setup lang="ts">
import { computed } from "vue";
import { useShipEasyI18n } from "./composable";

const props = defineProps<{
  /** The label key, e.g. "user.greeting" */
  labelKey: string;
  /** Variables for interpolation */
  variables?: Record<string, string | number>;
  /** Description shown to translators */
  desc?: string;
  /** HTML tag to render (default: span) */
  tag?: string;
}>();

const { t } = useShipEasyI18n();

const translated = computed(() => t(props.labelKey, props.variables));

const dataAttributes = computed(() => ({
  "data-label": props.labelKey,
  "data-variables": props.variables ? JSON.stringify(props.variables) : undefined,
  "data-label-desc": props.desc,
}));
</script>

<template>
  <component :is="tag ?? 'span'" v-bind="dataAttributes">{{ translated }}</component>
</template>
```

### `src/index.ts`

```typescript
export { ShipEasyI18nPlugin } from "./plugin";
export { useShipEasyI18n } from "./composable";
export { ShipEasyI18n_INJECTION_KEY } from "./types";
export type { ShipEasyI18nOptions, ShipEasyI18nState } from "./types";
// ShipEasyI18nString is a .vue SFC — imported directly by the user
// export { default as ShipEasyI18nString } from './ShipEasyI18nString.vue';
// (Included in package.json "exports" field pointing to the compiled component)
```

---

## Plugin Installation

```typescript
// main.ts
import { createApp } from "vue";
import { ShipEasyI18nPlugin } from "@i18n/vue";
import App from "./App.vue";

const app = createApp(App);

app.use(ShipEasyI18nPlugin, {
  i18nKey: "i18n_pk_abc123",
  profile: "en:prod",
});

app.mount("#app");
```

---

## Script Tag

Add loader.js to `index.html` before your Vue bundle:

```html
<!-- index.html -->
<!DOCTYPE html>
<html>
  <head>
    <script
      src="https://cdn.i18n.shipeasy.ai/loader.js"
      data-key="i18n_pk_abc123"
      data-profile="en:prod"
      async
    ></script>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

For Vite projects, `index.html` is the entry point. For Vue CLI projects, use `public/index.html`.

---

## Usage Examples

### Composition API

```vue
<script setup lang="ts">
import { useShipEasyI18n } from "@i18n/vue";

const props = defineProps<{ name: string }>();
const { t, ready, locale } = useShipEasyI18n();
</script>

<template>
  <div>
    <span v-if="!ready">Loading...</span>
    <h1 v-else data-label="user.greeting" :data-variables="JSON.stringify({ name })">
      {{ t("user.greeting", { name }) }}
    </h1>
    <p>{{ t("nav.home") }}</p>
  </div>
</template>
```

### `<ShipEasyI18nString>` Component

```vue
<script setup lang="ts">
import ShipEasyI18nString from "@i18n/vue/ShipEasyI18nString.vue";
</script>

<template>
  <nav>
    <ShipEasyI18nString label-key="nav.home" desc="Home link" tag="a" />
    <ShipEasyI18nString label-key="nav.patients" desc="Patients section" />
  </nav>
</template>
```

### Options API (via `$i18n`)

```typescript
// MyComponent.vue (Options API)
export default {
  computed: {
    greeting(): string {
      return this.$i18n.t("user.greeting", { name: this.name });
    },
  },
};
```

### Accessing outside of components (router guards, stores)

```typescript
// store/uiStore.ts (Pinia)
import { defineStore } from "pinia";
import { getOrCreateState } from "@i18n/vue";

export const useUIStore = defineStore("ui", {
  actions: {
    getLabel(key: string) {
      return getOrCreateState().t(key);
    },
  },
});
```

---

## Reactivity Deep Dive

Vue's reactivity system tracks which reactive values were read during a computed/watch evaluation. The key trick in `t()`:

```typescript
void locale.value; // read locale.value inside t()
```

When `locale.value` changes (on `window.i18n.on('update')`), Vue marks any computed or template expression that called `t()` as dirty and schedules a re-render. This means:

- `{{ t('some.key') }}` in a template auto-updates when labels change.
- `computed(() => t('some.key'))` auto-invalidates.
- No manual `watchEffect`, no `forceUpdate`, no event bus needed.

The pattern is identical to how Vue's i18n library (vue-i18n) achieves reactivity.

---

## SSR Notes

For SSR (Nuxt 3 or custom Vue SSR setup), see `@i18n/nuxt` for the Nuxt-specific integration. For custom Vue SSR:

1. On the server, populate `window.i18n` equivalent before `renderToString`.
2. Inject inline label data into the HTML string before sending.
3. On the client, `createShipEasyI18nState()` reads from `window.i18n` (already set by loader.js which reads the inline script).

```typescript
// server.ts (custom Vue SSR)
import { renderToString } from "@vue/server-renderer";
import { createApp } from "vue";
import { ShipEasyI18nPlugin } from "@i18n/vue";
import { fetchLabels } from "./i18n-fetch"; // your fetch helper

async function renderPage(url: string) {
  const labels = await fetchLabels({ i18nKey: "i18n_pk_abc123", profile: "en:prod" });
  const inlineScript = `<script id="i18n-data" type="application/json">${JSON.stringify(labels)}<\/script>`;

  const app = createApp(App);
  app.use(ShipEasyI18nPlugin, {
    i18nKey: "i18n_pk_abc123",
    profile: "en:prod",
    ssrLocale: "en:prod",
  });

  const html = await renderToString(app);
  return `<!DOCTYPE html>
<html>
<head>${inlineScript}</head>
<body><div id="app">${html}</div></body>
</html>`;
}
```

**Hydration caveat**: In custom Vue SSR, `createShipEasyI18nState` runs on the server where `window` is undefined. The `ssrLocale` option ensures `locale.value` is set correctly on the server so `t()` returns the right locale string (even if it can't translate — you handle that with inline data + loader.js on the client).

---

## Edge Cases

### Vue Router integration

For lazy-loaded route components, labels are applied by MutationObserver automatically when the new DOM nodes mount. No special handling needed.

To prefetch a chunk on route hover:

```typescript
// router/index.ts
router.beforeEach((to) => {
  const chunkName = to.meta.i18nChunk as string | undefined;
  if (chunkName) {
    window.i18n?.prefetch(chunkName);
  }
});
```

### Pinia store translations

Avoid storing translated strings in Pinia state — they become stale when labels update. Instead, call `t()` in computed properties or templates which Vue will invalidate automatically.

### Vue DevTools

The reactive `locale` ref will appear in Vue DevTools as part of the injected state. You can observe label updates in real time while using the in-browser editor.

### Multiple Vue apps on the same page

Each app gets its own plugin installation, but they share the same `window.i18n` global. The module-level `globalState` singleton means all apps react to the same label updates. This is correct behavior.

### TypeScript `$i18n` options API augmentation

```typescript
// shims-i18n.d.ts
import type { ShipEasyI18nState } from "@i18n/vue";

declare module "@vue/runtime-core" {
  interface ComponentCustomProperties {
    $i18n: ShipEasyI18nState;
  }
}
```

---

## Test Commands

```bash
npm test               # Vitest
npm run build          # Vite build + tsc
npx vue-tsc --noEmit   # Vue TypeScript check
```

### Unit Test

```typescript
import { mount } from "@vue/test-utils";
import { createApp } from "vue";
import { ShipEasyI18nPlugin, useShipEasyI18n } from "@i18n/vue";

describe("useShipEasyI18n", () => {
  it("returns key as fallback when not ready", () => {
    const TestComponent = {
      setup() {
        const { t } = useShipEasyI18n();
        return { label: t("nav.home") };
      },
      template: "<div>{{ label }}</div>",
    };

    const wrapper = mount(TestComponent, {
      global: {
        plugins: [[ShipEasyI18nPlugin, { i18nKey: "test", profile: "en:prod" }]],
      },
    });

    expect(wrapper.text()).toBe("nav.home");
  });

  it("returns translated text when window.i18n is set", async () => {
    window.i18n = {
      t: (key) => (key === "nav.home" ? "Home" : key),
      ready: (cb) => cb(),
      on: () => () => {},
      locale: "en:prod",
    };

    // ... mount and check
    expect(wrapper.text()).toBe("Home");
  });
});
```

---

## End-to-End Example

```
my-vue-app/
  index.html              ← script tag (loader.js + inline data if SSR)
  src/
    main.ts               ← createApp + app.use(ShipEasyI18nPlugin)
    App.vue               ← uses <ShipEasyI18nString> and useShipEasyI18n()
    components/
      NavBar.vue          ← const { t } = useShipEasyI18n()
```
