# Plan: ShipEasyI18n Qwik Integration

**Goal**: Integrate ShipEasyI18n with Qwik's resumability model by serializing label data into Qwik's state at SSR time so the client resumes with translations already available — no re-fetching, no hydration gap, and no `window.i18n` reference in serialized state (which would break resumability).
**Package**: `@i18n/qwik`
**Key challenge**: Qwik serializes component state (signals, stores) into the HTML so the client can resume without re-running component code. `window.i18n` is not serializable — it's a browser global. The integration must serialize the label strings themselves into Qwik state and wire up `window.i18n` subscriptions separately in browser-only `useVisibleTask$`.

---

## Install

```bash
npm install @i18n/qwik
```

Peer dependency: `@builder.io/qwik >= 1.2`, `@builder.io/qwik-city >= 1.2`.

---

## Package Exports

```
@i18n/qwik
  useTranslate$      — composable: returns reactive t() backed by Qwik signals
  ShipEasyI18nProvider$       — context provider component
  ShipEasyI18nString          — declarative component
  i18nLoader$         — QwikCity loader helper for root layout
  useShipEasyI18n             — alias for useTranslate$
```

---

## Full Source

### `src/types.ts`

```typescript
export interface LabelFile {
  v: number;
  profile: string;
  chunk: string;
  strings: Record<string, string>;
}

export interface ShipEasyI18nContextState {
  strings: Record<string, string>;
  profile: string;
  ready: boolean;
}
```

### `src/context.ts`

```typescript
import { createContextId } from "@builder.io/qwik";
import type { ShipEasyI18nContextState } from "./types";

/**
 * Qwik context ID for ShipEasyI18n state.
 * Qwik serializes context values into HTML during SSR — the state
 * must be plain objects (no functions, no class instances, no DOM refs).
 */
export const ShipEasyI18nContext = createContextId<ShipEasyI18nContextState>("i18n.context");
```

### `src/provider.tsx`

```typescript
import {
  component$,
  useStore,
  useContextProvider,
  useVisibleTask$,
  Slot,
} from '@builder.io/qwik';
import { ShipEasyI18nContext } from './context';
import type { LabelFile } from './types';

// Extend global window type
declare global {
  interface Window {
    i18n?: {
      t: (key: string, vars?: Record<string, string | number>) => string;
      ready: (cb: () => void) => void;
      on: (event: 'update', cb: () => void) => () => void;
      locale: string | null;
    };
  }
}

interface ShipEasyI18nProviderProps {
  /** Label file fetched server-side — passed from i18nLoader$ */
  initialLabels?: LabelFile | null;
  /** Profile string, e.g. "en:prod" */
  profile: string;
}

/**
 * Qwik context provider for ShipEasyI18n.
 *
 * - Serializes label strings into Qwik's resumable state (plain object)
 * - Subscribes to window.i18n updates in the browser via useVisibleTask$
 *   so live editor preview works after resumption
 *
 * Place at the root of your app in root.tsx or layout.tsx.
 */
export const ShipEasyI18nProvider$ = component$<ShipEasyI18nProviderProps>((props) => {
  // useStore creates a reactive Qwik store — values are serialized into HTML
  // during SSR and deserialized on client without re-running this component.
  const state = useStore({
    strings: props.initialLabels?.strings ?? {},
    profile: props.initialLabels?.profile ?? props.profile,
    ready: Boolean(props.initialLabels?.strings),
  });

  useContextProvider(ShipEasyI18nContext, state);

  // useVisibleTask$ runs ONLY in the browser, after the component is visible.
  // It is NOT serialized — safe to reference window.i18n here.
  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(({ cleanup }) => {
    if (!window.i18n) return;

    // If loader.js already read the inline data and is ready
    if (window.i18n.locale) {
      state.ready = true;
      state.profile = window.i18n.locale;
    }

    window.i18n.ready(() => {
      state.ready = true;
      state.profile = window.i18n!.locale ?? state.profile;
    });

    const unsubscribe = window.i18n.on('update', () => {
      // On label update, re-fetch strings from window.i18n
      // window.i18n.t() accesses the updated strings; we mark state dirty
      // by incrementing a version (Qwik tracks signal reads)
      state.ready = true;
      state.profile = window.i18n!.locale ?? state.profile;
      // Force Qwik to see a state change so subscribers re-render
      // We do this by toggling ready off/on (Qwik batches synchronously)
      state.ready = false;
      state.ready = true;
    });

    cleanup(() => unsubscribe());
  });

  return <Slot />;
});
```

### `src/composable.ts`

```typescript
import { useContext } from "@builder.io/qwik";
import { ShipEasyI18nContext } from "./context";
import type { ShipEasyI18nContextState } from "./types";

export interface ShipEasyI18nInstance {
  /**
   * Translates a key using the current label state.
   * Reading this in a Qwik template creates a reactive dependency.
   */
  t: (key: string, variables?: Record<string, string | number>) => string;
  /** True when labels are loaded */
  get ready(): boolean;
  /** Current profile string */
  get profile(): string;
}

/**
 * Returns an ShipEasyI18n translation helper backed by Qwik context.
 *
 * Must be called inside a Qwik component (component$).
 */
export function useShipEasyI18n(): ShipEasyI18nInstance {
  const state = useContext(ShipEasyI18nContext);

  function t(key: string, variables?: Record<string, string | number>): string {
    // In the browser after resumption, prefer window.i18n for live preview
    if (typeof window !== "undefined" && window.i18n) {
      return window.i18n.t(key, variables);
    }

    // SSR / initial render from serialized state
    let value = state.strings[key] ?? key;
    if (variables) {
      value = Object.entries(variables).reduce(
        (s, [k, v]) => s.replace(new RegExp(`{{${k}}}`, "g"), String(v)),
        value,
      );
    }
    return value;
  }

  return {
    t,
    get ready() {
      return state.ready;
    },
    get profile() {
      return state.profile;
    },
  };
}

/** Alias */
export const useTranslate$ = useShipEasyI18n;
```

### `src/ShipEasyI18nString.tsx`

```typescript
import { component$ } from '@builder.io/qwik';
import { useShipEasyI18n } from './composable';

interface ShipEasyI18nStringProps {
  labelKey: string;
  variables?: Record<string, string | number>;
  desc?: string;
  tag?: string;
}

export const ShipEasyI18nString = component$<ShipEasyI18nStringProps>((props) => {
  const { t } = useShipEasyI18n();
  const translated = t(props.labelKey, props.variables);

  return (
    <span
      data-label={props.labelKey}
      data-variables={props.variables ? JSON.stringify(props.variables) : undefined}
      data-label-desc={props.desc}
    >
      {translated}
    </span>
  );
});
```

### `src/loader.ts` (QwikCity routeLoader$ helper)

```typescript
import { routeLoader$ } from "@builder.io/qwik-city";
import type { LabelFile } from "./types";

const ShipEasyI18n_CDN = "https://cdn.i18n.shipeasy.ai";

async function fetchLabelFile(opts: {
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
    if (!url) return null;

    return fetch(url).then((r) => r.json() as Promise<LabelFile>);
  } catch {
    return null;
  }
}

/**
 * QwikCity routeLoader$ for fetching ShipEasyI18n labels.
 *
 * Usage in layout.tsx:
 *   export const useShipEasyI18nLoader = i18nLoader$({ i18nKey: 'i18n_pk_abc123', profile: 'en:prod' });
 *
 * Then in the component:
 *   const labels = useShipEasyI18nLoader();
 */
export function i18nLoader$(opts: { i18nKey: string; profile: string; chunk?: string }) {
  return routeLoader$(async () => {
    return fetchLabelFile(opts);
  });
}
```

### `src/index.ts`

```typescript
export { ShipEasyI18nProvider$ } from "./provider";
export { useShipEasyI18n, useTranslate$ } from "./composable";
export type { ShipEasyI18nInstance } from "./composable";
export { ShipEasyI18nString } from "./ShipEasyI18nString";
export { i18nLoader$ } from "./loader";
export { ShipEasyI18nContext } from "./context";
export type { LabelFile, ShipEasyI18nContextState } from "./types";
```

---

## Script Tag Setup

Add to `src/root.tsx` in the `<head>`:

```tsx
// src/root.tsx
import { component$ } from "@builder.io/qwik";
import { QwikCity, RouterOutlet, ServiceWorkerRegister } from "@builder.io/qwik-city";
import { RouterHead } from "./components/router-head/router-head";

export default component$(() => {
  return (
    <QwikCity>
      <head>
        <meta charset="utf-8" />
        <RouterHead />
        {/* ShipEasyI18n loader — reads inline data injected by ShipEasyI18nProvider$ */}
        <script
          src="https://cdn.i18n.shipeasy.ai/loader.js"
          data-key="i18n_pk_abc123"
          data-profile="en:prod"
          async
        />
      </head>
      <body lang="en">
        <RouterOutlet />
        <ServiceWorkerRegister />
      </body>
    </QwikCity>
  );
});
```

---

## QwikCity Layout Integration

### `src/routes/layout.tsx`

```tsx
import { component$, Slot } from "@builder.io/qwik";
import { ShipEasyI18nProvider$, i18nLoader$ } from "@i18n/qwik";

// routeLoader$ runs on the server for every request to this layout
export const useShipEasyI18nData = i18nLoader$({
  i18nKey: "i18n_pk_abc123",
  profile: "en:prod",
  chunk: "index",
});

export default component$(() => {
  const i18nData = useShipEasyI18nData();

  return (
    <>
      {/* Inject inline label data so loader.js reads it synchronously */}
      {i18nData.value && (
        <script
          id="i18n-data"
          type="application/json"
          dangerouslySetInnerHTML={JSON.stringify(i18nData.value)}
        />
      )}
      <ShipEasyI18nProvider$ initialLabels={i18nData.value} profile="en:prod">
        <Slot />
      </ShipEasyI18nProvider$>
    </>
  );
});
```

---

## Usage in Components

### Hook usage

```tsx
import { component$ } from "@builder.io/qwik";
import { useShipEasyI18n } from "@i18n/qwik";

interface Props {
  name: string;
}

export const WelcomeBanner = component$<Props>((props) => {
  const { t, ready } = useShipEasyI18n();

  return (
    <div>
      <h1 data-label="user.greeting" data-variables={JSON.stringify({ name: props.name })}>
        {t("user.greeting", { name: props.name })}
      </h1>
      {!ready && <span class="loading">…</span>}
    </div>
  );
});
```

### Declarative component

```tsx
import { component$ } from "@builder.io/qwik";
import { ShipEasyI18nString } from "@i18n/qwik";

export const NavBar = component$(() => {
  return (
    <nav>
      <ShipEasyI18nString labelKey="nav.home" desc="Home navigation link" />
      <ShipEasyI18nString labelKey="nav.patients" />
    </nav>
  );
});
```

---

## Resumability Deep Dive

### Why `window.i18n` cannot be serialized

Qwik serializes component state into `<script type="qwik/json">` tags in the HTML. When the client resumes, it deserializes this state to restore components without re-running their setup code. `window.i18n` is a browser global with function references — not serializable.

### Solution

The `ShipEasyI18nProvider$` stores only plain data in `useStore`:

```typescript
const state = useStore({
  strings: { "nav.home": "Home", "user.greeting": "Hello, {{name}}!" },
  profile: "en:prod",
  ready: true,
});
```

This plain object is fully serializable. Qwik embeds it in `<script type="qwik/json">`. On resume, the state is immediately available — no re-fetch, no CDN request.

`useVisibleTask$` runs after resumption in the browser — subscribes to `window.i18n.on('update')` for live editor preview. This subscription is never serialized (it's a `useVisibleTask$` not a `useTask$`).

### Serialization of `t()`

`t()` is a regular function in `useShipEasyI18n()` — not stored in Qwik state. Components that call `useShipEasyI18n().t()` access it via `useContext()` which Qwik handles as a lazy reference. The function is re-created on the client from the context value — no serialization needed.

---

## Hydration Mismatch Fix

Qwik doesn't hydrate — it resumes. There's no React-style "hydration" phase where the client re-renders to compare with server output. Instead, Qwik incrementally attaches event handlers.

However, if a component's rendered output depends on runtime state that differs between server and client, Qwik will re-render that component. The fix is the same: provide `initialLabels` from the server so the rendered strings match what the server produced.

With `ShipEasyI18nProvider$` + `i18nLoader$`:

- Server: `t()` uses `state.strings` (from `i18nLoader$`) → renders `"Home"`
- Serialized state: `{ strings: { "nav.home": "Home" }, ... }`
- Client: resumes with `state.strings` → `t()` returns `"Home"` immediately
- No re-render needed.

---

## Edge Cases

### `useVisibleTask$` ESLint warning

Qwik's ESLint plugin warns about `useVisibleTask$` because it runs eagerly after resumption, which can impact performance. Use `{ strategy: 'document-ready' }` or `{ strategy: 'intersection-observer' }` to defer:

```typescript
useVisibleTask$(
  ({ cleanup }) => {
    // subscription code
  },
  { strategy: "document-ready" },
);
```

### Multiple chunks

Add a second `i18nLoader$` for route-specific chunks:

```typescript
export const useCheckoutShipEasyI18nData = i18nLoader$({
  i18nKey: "i18n_pk_abc123",
  profile: "en:prod",
  chunk: "checkout",
});
```

Merge the strings before passing to `ShipEasyI18nProvider$`:

```typescript
const combined = {
  ...i18nData.value?.strings,
  ...checkoutData.value?.strings,
};
```

### CSP and `dangerouslySetInnerHTML`

The inline `<script type="application/json">` is not executable JavaScript — it's just data. Strict CSP policies that block all inline scripts will not block `type="application/json"` tags. Safe to use without a nonce.

---

## Test Commands

```bash
npm test               # Vitest
npm run build          # Qwik + Vite build
npx qwik build         # Full production build
npm run preview        # Preview production build
```

### Unit Test

```typescript
import { createDOM } from '@builder.io/qwik/testing';
import { ShipEasyI18nProvider$, ShipEasyI18nString } from '@i18n/qwik';

test('renders key as fallback', async () => {
  const { screen, render } = await createDOM();
  await render(
    <ShipEasyI18nProvider$ profile="en:prod" initialLabels={null}>
      <ShipEasyI18nString labelKey="nav.home" />
    </ShipEasyI18nProvider$>
  );
  expect(screen.querySelector('[data-label="nav.home"]')?.textContent).toBe('nav.home');
});

test('translates from initialLabels', async () => {
  const { screen, render } = await createDOM();
  await render(
    <ShipEasyI18nProvider$
      profile="en:prod"
      initialLabels={{ v: 1, profile: 'en:prod', chunk: 'index', strings: { 'nav.home': 'Home' } }}
    >
      <ShipEasyI18nString labelKey="nav.home" />
    </ShipEasyI18nProvider$>
  );
  expect(screen.querySelector('[data-label="nav.home"]')?.textContent).toBe('Home');
});
```

---

## End-to-End Example

```
my-qwik-app/
  src/
    root.tsx              ← loader.js script tag in <head>
    routes/
      layout.tsx          ← useShipEasyI18nData = i18nLoader$(...), ShipEasyI18nProvider$
      index.tsx           ← useShipEasyI18n(), ShipEasyI18nString
    components/
      NavBar/
        index.tsx         ← import { ShipEasyI18nString } from '@i18n/qwik'
```
