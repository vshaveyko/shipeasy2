# Plan: ShipEasyI18n Solid.js Integration

**Goal**: Expose ShipEasyI18n labels as Solid.js signals so only the specific DOM nodes that render a given label key re-render when that key changes — no component-level re-renders, no unnecessary diffing.
**Package**: `@i18n/solid`
**Key challenge**: Solid's reactivity is fine-grained — signals update the exact DOM text node, not the whole component. The ShipEasyI18n integration must expose a reactive signal that Solid's runtime can track, while remaining safe for SSR (SolidStart) where signals are synchronous and `window` does not exist.

---

## Install

```bash
npm install @i18n/solid
```

Peer dependency: `solid-js >= 1.6`.

---

## Package Exports

```
@i18n/solid
  createShipEasyI18n          — creates { t, ready, locale } backed by signals
  useShipEasyI18n             — composable that reads from the nearest ShipEasyI18nContext
  ShipEasyI18nProvider        — context provider component
  ShipEasyI18nString          — declarative component
  [SolidStart]
  loadShipEasyI18nLabels      — SolidStart server loader helper
```

---

## Full Source

### `src/core.ts`

```typescript
import { createSignal, createEffect, onCleanup, type Accessor } from "solid-js";

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

export interface ShipEasyI18nInstance {
  /**
   * Translates a key. Reading this inside a Solid reactive context
   * (JSX, createEffect, createMemo) creates a fine-grained dependency
   * on the current label version.
   */
  t: (key: string, variables?: Record<string, string | number>) => string;
  /** Signal accessor: true when labels are loaded */
  ready: Accessor<boolean>;
  /** Signal accessor: current locale/profile string */
  locale: Accessor<string | null>;
}

export interface ShipEasyI18nOptions {
  /** Profile/locale to use on server (SSR) before window.i18n is available */
  ssrLocale?: string;
  /**
   * Initial label strings for SSR — pass from SolidStart server loader.
   * When set, t() translates immediately with no network wait.
   */
  initialLabels?: Record<string, string>;
}

/**
 * Creates an ShipEasyI18n instance backed by Solid signals.
 *
 * Call this at the top level of your app (outside components) for a
 * module-scoped singleton, or inside a component for a scoped instance.
 *
 * In SolidStart, call inside a component so SSR/client contexts are separate.
 */
export function createShipEasyI18n(opts: ShipEasyI18nOptions = {}): ShipEasyI18nInstance {
  const [ready, setReady] = createSignal<boolean>(
    typeof window !== "undefined" ? Boolean(window.i18n?.locale) : Boolean(opts.initialLabels),
  );

  const [locale, setLocale] = createSignal<string | null>(
    typeof window !== "undefined"
      ? (window.i18n?.locale ?? opts.ssrLocale ?? null)
      : (opts.ssrLocale ?? null),
  );

  // version signal: increments on every label update
  // Reading it inside t() creates a reactive dependency so Solid re-runs
  // any computation that called t() when labels change.
  const [version, setVersion] = createSignal(0);

  // Set up subscriptions — only in the browser
  if (typeof window !== "undefined") {
    // If already ready (inline data was parsed by loader.js)
    if (window.i18n?.locale) {
      setReady(true);
      setLocale(window.i18n.locale);
    }

    window.i18n?.ready(() => {
      setReady(true);
      setLocale(window.i18n!.locale);
      setVersion((v) => v + 1);
    });

    const unsub = window.i18n?.on("update", () => {
      setLocale(window.i18n!.locale);
      setVersion((v) => v + 1);
    });

    // If createShipEasyI18n is called inside a component, clean up on unmount
    // onCleanup is a no-op if called outside reactive root
    try {
      onCleanup(() => unsub?.());
    } catch {
      // Called outside reactive root — manual cleanup not possible;
      // the subscription lives as long as window.i18n does (entire page lifetime)
    }
  }

  function t(key: string, variables?: Record<string, string | number>): string {
    // Read version to register reactive dependency.
    // Solid tracks this signal read and re-runs the caller when version changes.
    version(); // eslint-disable-line @typescript-eslint/no-unused-expressions

    if (typeof window !== "undefined" && window.i18n) {
      return window.i18n.t(key, variables);
    }

    // SSR / pre-hydration fallback
    if (opts.initialLabels) {
      let value = opts.initialLabels[key] ?? key;
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

  return { t, ready, locale };
}
```

### `src/context.tsx`

```typescript
import { createContext, useContext, type JSX } from 'solid-js';
import { createShipEasyI18n, type ShipEasyI18nInstance, type ShipEasyI18nOptions } from './core';

const ShipEasyI18nContext = createContext<ShipEasyI18nInstance>();

interface ShipEasyI18nProviderProps extends ShipEasyI18nOptions {
  children: JSX.Element;
}

/**
 * Provides ShipEasyI18n context to all child components.
 * Place at the root of your app.
 */
export function ShipEasyI18nProvider(props: ShipEasyI18nProviderProps) {
  const instance = createShipEasyI18n({
    ssrLocale: props.ssrLocale,
    initialLabels: props.initialLabels,
  });

  return (
    <ShipEasyI18nContext.Provider value={instance}>
      {props.children}
    </ShipEasyI18nContext.Provider>
  );
}

/**
 * Reads the nearest ShipEasyI18n instance from context.
 * Must be called inside an ShipEasyI18nProvider.
 */
export function useShipEasyI18n(): ShipEasyI18nInstance {
  const ctx = useContext(ShipEasyI18nContext);
  if (!ctx) {
    throw new Error('[ShipEasyI18n] useShipEasyI18n() must be called inside <ShipEasyI18nProvider>');
  }
  return ctx;
}
```

### `src/ShipEasyI18nString.tsx`

```typescript
import { type JSX } from 'solid-js';
import { Dynamic } from 'solid-js/web';
import { useShipEasyI18n } from './context';

interface ShipEasyI18nStringProps {
  /** The label key */
  labelKey: string;
  /** Interpolation variables */
  variables?: Record<string, string | number>;
  /** Description for translators */
  desc?: string;
  /** HTML tag (default: span) */
  tag?: string;
  /** Additional element props */
  [key: string]: unknown;
}

/**
 * Renders a translated string in a span (or custom tag).
 *
 * Because t() reads the version signal, only this text node updates
 * when the label changes — not the parent component.
 */
export function ShipEasyI18nString(props: ShipEasyI18nStringProps) {
  const { t } = useShipEasyI18n();
  const { labelKey, variables, desc, tag = 'span', ...rest } = props;

  return (
    <Dynamic
      component={tag}
      data-label={labelKey}
      data-variables={variables ? JSON.stringify(variables) : undefined}
      data-label-desc={desc}
      {...rest}
    >
      {t(labelKey, variables)}
    </Dynamic>
  );
}
```

### `src/solidstart.ts` (SolidStart server helper)

```typescript
import type { APIEvent } from "@solidjs/start/server";

export interface LabelFile {
  v: number;
  profile: string;
  chunk: string;
  strings: Record<string, string>;
}

/**
 * SolidStart server function helper.
 * Call inside a createAsync() or "use server" function.
 */
export async function loadShipEasyI18nLabels(opts: {
  i18nKey: string;
  profile: string;
  chunk?: string;
}): Promise<LabelFile | null> {
  const chunk = opts.chunk ?? "index";
  try {
    const manifestUrl = `https://cdn.i18n.shipeasy.ai/labels/${opts.i18nKey}/${opts.profile}/manifest.json`;
    const manifest = await fetch(manifestUrl).then(
      (r) => r.json() as Promise<Record<string, string>>,
    );
    const fileUrl = manifest[chunk];
    if (!fileUrl) return null;
    return fetch(fileUrl).then((r) => r.json() as Promise<LabelFile>);
  } catch {
    return null;
  }
}
```

### `src/index.ts`

```typescript
export { createShipEasyI18n } from "./core";
export type { ShipEasyI18nInstance, ShipEasyI18nOptions } from "./core";
export { ShipEasyI18nProvider, useShipEasyI18n } from "./context";
export { ShipEasyI18nString } from "./ShipEasyI18nString";
export { loadShipEasyI18nLabels } from "./solidstart";
export type { LabelFile } from "./solidstart";
```

---

## Script Tag Setup

### Vite + Solid

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

### SolidStart (entry-server.tsx)

Inject inline label data in the HTML stream. SolidStart uses `@solidjs/start`'s file-based routing and Vinxi under the hood:

```tsx
// src/entry-server.tsx
import { createHandler, StartServer } from "@solidjs/start/server";

export default createHandler(() => (
  <StartServer
    document={({ assets, children, scripts }) => (
      <html lang="en">
        <head>
          {assets}
          {/* Inline ShipEasyI18n data — injected by the root layout data fetcher */}
        </head>
        <body>
          <div id="app">{children}</div>
          {scripts}
        </body>
      </html>
    )}
  />
));
```

Inject inline data via the root route's `createAsync`:

```tsx
// src/routes/index.tsx (or _layout.tsx)
import { createAsync } from "@solidjs/router";
import { loadShipEasyI18nLabels } from "@i18n/solid";

export const route = {
  load: () => loadShipEasyI18nLabels({ i18nKey: "i18n_pk_abc123", profile: "en:prod" }),
};
```

---

## App Root Setup

```tsx
// src/app.tsx (or src/root.tsx for SolidStart)
import { ShipEasyI18nProvider } from "@i18n/solid";
import { Router } from "@solidjs/router";
import routes from "./routes";

export default function App() {
  return (
    <ShipEasyI18nProvider ssrLocale="en:prod">
      <Router>{routes}</Router>
    </ShipEasyI18nProvider>
  );
}
```

---

## Usage Examples

### Hook in a component

```tsx
import { useShipEasyI18n } from "@i18n/solid";

function WelcomeBanner(props: { name: string }) {
  const { t, ready } = useShipEasyI18n();

  return (
    <div>
      {/* Fine-grained: only this text node re-renders when labels update */}
      <h1 data-label="user.greeting" data-variables={JSON.stringify({ name: props.name })}>
        {t("user.greeting", { name: props.name })}
      </h1>
      {/* ready() signal — only the Show re-evaluates */}
      <Show when={!ready()}>
        <span class="loading">Loading labels...</span>
      </Show>
    </div>
  );
}
```

### Declarative component

```tsx
import { ShipEasyI18nString } from "@i18n/solid";

function NavBar() {
  return (
    <nav>
      <ShipEasyI18nString labelKey="nav.home" desc="Home link" tag="a" href="/" />
      <ShipEasyI18nString labelKey="nav.patients" desc="Patients section" />
    </nav>
  );
}
```

### Module-level singleton (outside components)

```typescript
// i18n.ts — singleton, not SSR-safe (use ShipEasyI18nProvider for SolidStart)
import { createShipEasyI18n } from "@i18n/solid";

export const i18n = createShipEasyI18n();
export const t = i18n.t;
```

```tsx
import { t } from "./i18n";

function MyComponent() {
  return <span>{t("some.key")}</span>;
}
```

---

## Fine-Grained Reactivity Explanation

Solid's runtime tracks signal reads at the time of execution. When `t('key')` is called inside JSX:

```tsx
<span>{t("user.greeting", { name: props.name })}</span>
```

Solid records that this text node depends on:

1. `version` signal (read inside `t()`)
2. `props.name` (reactive prop)

When `version` increments (label update), Solid re-runs only the function that produced this text node — not the parent component, not sibling nodes. This is maximally efficient.

Compare to React, where a `useContext` update re-renders all consumers. In Solid, only the exact text nodes that called `t()` update.

---

## SSR / SolidStart Hydration

### Root Cause

SolidStart SSR renders components synchronously. `createShipEasyI18n()` runs on the server where `window` is undefined. Without `initialLabels`, `t()` returns keys. The client hydrates and calls `t()` again — now `window.i18n` is populated from inline data and returns real strings. Mismatch.

### Fix

1. Server: `loadShipEasyI18nLabels()` fetches labels.
2. Server: pass `initialLabels` to `<ShipEasyI18nProvider>` or `createShipEasyI18n()`.
3. Server: render `<script id="i18n-data" type="application/json">` in the HTML.
4. Client: `loader.js` reads inline data, sets `window.i18n`.
5. Client: `createShipEasyI18n()` initializes with `window.i18n.locale` set → `t()` returns same strings.
6. Hydration succeeds.

```tsx
// src/routes/index.tsx (SolidStart)
import { createAsync, RouteDefinition } from "@solidjs/router";
import { loadShipEasyI18nLabels, ShipEasyI18nProvider } from "@i18n/solid";
import { Show } from "solid-js";

export const route: RouteDefinition = {
  load: () => loadShipEasyI18nLabels({ i18nKey: "i18n_pk_abc123", profile: "en:prod" }),
};

export default function IndexPage() {
  const labels = createAsync(() =>
    loadShipEasyI18nLabels({ i18nKey: "i18n_pk_abc123", profile: "en:prod" }),
  );

  return (
    <Show when={labels()}>
      {(l) => (
        <>
          {/* Inject inline data */}
          <script
            id="i18n-data"
            type="application/json"
            // eslint-disable-next-line solid/no-innerhtml
            innerHTML={JSON.stringify(l())}
          />
          <ShipEasyI18nProvider initialLabels={l()?.strings} ssrLocale={l()?.profile}>
            <PageContent />
          </ShipEasyI18nProvider>
        </>
      )}
    </Show>
  );
}
```

---

## Edge Cases

### `createShipEasyI18n()` called multiple times

Each call creates an independent set of signals. This is fine for isolated contexts but means multiple subscriptions to `window.i18n`. For apps without SolidStart SSR, use the module-level singleton pattern (`export const i18n = createShipEasyI18n()`).

### SolidStart streaming

SolidStart streams HTML via Suspense boundaries. The inline `<script>` tag must be in the outer shell (non-suspended) so loader.js can read it before the suspended content hydrates.

### Signals in non-reactive context

If `t()` is called outside a reactive context (e.g., in a setTimeout), the `version()` signal read has no effect — no reactive tracking. The function still returns the correct current value, just without auto-update behavior. For auto-update outside reactive contexts, use `createEffect`:

```typescript
createEffect(() => {
  const text = t("some.key"); // reactive — re-runs when labels update
  console.log(text);
});
```

---

## Test Commands

```bash
npm test               # Vitest + @solidjs/testing-library
npm run build          # Vite build
npx tsc --noEmit       # Type check
```

### Unit Test

```typescript
import { render } from '@solidjs/testing-library';
import { ShipEasyI18nProvider, ShipEasyI18nString } from '@i18n/solid';

test('renders key as fallback', () => {
  const { getByText } = render(() => (
    <ShipEasyI18nProvider>
      <ShipEasyI18nString labelKey="nav.home" />
    </ShipEasyI18nProvider>
  ));
  expect(getByText('nav.home')).toBeTruthy();
});

test('translates from initialLabels', () => {
  const { getByText } = render(() => (
    <ShipEasyI18nProvider initialLabels={{ 'nav.home': 'Home' }} ssrLocale="en:prod">
      <ShipEasyI18nString labelKey="nav.home" />
    </ShipEasyI18nProvider>
  ));
  expect(getByText('Home')).toBeTruthy();
});
```

---

## End-to-End Example

```
my-solid-app/
  index.html               ← loader.js script tag
  src/
    app.tsx                ← <ShipEasyI18nProvider> + <Router>
    routes/
      index.tsx            ← useShipEasyI18n(), <ShipEasyI18nString>
    components/
      NavBar.tsx           ← import { ShipEasyI18nString } from '@i18n/solid'
```
