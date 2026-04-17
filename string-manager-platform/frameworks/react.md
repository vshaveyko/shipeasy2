# Plan: ShipEasyI18n React Integration

**Goal**: Provide a React-idiomatic API for ShipEasyI18n with a context-based hook, provider component, and string component that work correctly under React 18 concurrent mode and SSR hydration.
**Package**: `@i18n/react`
**Key challenge**: `t()` must be synchronous and pure (concurrent mode may re-render multiple times before committing), and labels must be available before hydration to avoid React hydration mismatches.

---

## Install

```bash
npm install @i18n/react
# peer deps (already in your project)
# react >= 17.0.0, react-dom >= 17.0.0
```

---

## Script Tag Setup

Add the ShipEasyI18n loader to `<head>` before your React bundle. For Next.js / Remix / Vite SSR this goes in the root HTML template:

```html
<!-- index.html / _document.tsx / root.tsx -->
<script
  src="https://cdn.i18n.shipeasy.ai/loader.js"
  data-key="i18n_pk_abc123"
  data-profile="en:prod"
  async
></script>
```

For SSR hydration safety, also inject an inline data block (see SSR section below). `@i18n/react` can generate this block server-side or you can use the standalone `@i18n/next` / `@i18n/remix` packages for that.

---

## Package Exports

```
@i18n/react
  ShipEasyI18nProvider        — context provider, manages ready state and update subscriptions
  useShipEasyI18n             — hook: { t, ready, locale }
  ShipEasyI18nString          — declarative component wrapping a span with data-label
  withShipEasyI18n            — HOC for class components
```

---

## Full TypeScript Source

### `src/context.ts`

```typescript
import { createContext, useContext } from "react";

export interface ShipEasyI18nContextValue {
  /** Synchronously translate a key. Returns key name if labels not yet loaded. */
  t: (key: string, variables?: Record<string, string | number>) => string;
  /** True once the label file has been applied to the DOM. */
  ready: boolean;
  /** Current locale/profile string, e.g. "en:prod". */
  locale: string | null;
}

export const ShipEasyI18nContext = createContext<ShipEasyI18nContextValue>({
  t: (key) => key,
  ready: false,
  locale: null,
});

export function useShipEasyI18n(): ShipEasyI18nContextValue {
  return useContext(ShipEasyI18nContext);
}
```

### `src/ShipEasyI18nProvider.tsx`

```typescript
'use client'; // Next.js App Router — this component uses hooks

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  type ReactNode,
} from 'react';
import { ShipEasyI18nContext, type ShipEasyI18nContextValue } from './context';

// Extend window to declare the i18n global injected by loader.js
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
  children: ReactNode;
  /**
   * Optional locale override for SSR — pass the profile string that was used
   * to render the page (e.g. "en:prod"). Used only on the server / before
   * window.i18n is available.
   */
  ssrLocale?: string;
}

export function ShipEasyI18nProvider({ children, ssrLocale }: ShipEasyI18nProviderProps) {
  const [ready, setReady] = useState<boolean>(() => {
    // On the server or before loader.js runs, not ready.
    if (typeof window === 'undefined') return false;
    // If loader.js already ran synchronously (e.g. inline data), start ready.
    return Boolean(window.i18n?.locale);
  });

  const [locale, setLocale] = useState<string | null>(() => {
    if (typeof window !== 'undefined' && window.i18n?.locale) {
      return window.i18n.locale;
    }
    return ssrLocale ?? null;
  });

  // Stable ref to avoid re-creating t() on every render
  const tRef = useRef<ShipEasyI18nContextValue['t']>((key, vars) => {
    if (typeof window !== 'undefined' && window.i18n) {
      return window.i18n.t(key, vars);
    }
    return key;
  });

  const t = useCallback<ShipEasyI18nContextValue['t']>(
    (key, vars) => tRef.current(key, vars),
    []
  );

  useEffect(() => {
    // Guard: loader.js may not have been added yet in test environments.
    if (typeof window === 'undefined' || !window.i18n) return;

    // If already ready, just sync state.
    if (window.i18n.locale) {
      setReady(true);
      setLocale(window.i18n.locale);
    }

    // Wait for labels to load the first time.
    window.i18n.ready(() => {
      setReady(true);
      setLocale(window.i18n!.locale);
    });

    // Re-render on label updates (e.g. editor live preview).
    const unsubscribe = window.i18n.on('update', () => {
      setLocale(window.i18n!.locale);
      // Force a re-render so t() picks up new values.
      setReady((r) => r); // noop toggle avoids stale closure — React batches this
    });

    return unsubscribe;
  }, []);

  const value = useMemo<ShipEasyI18nContextValue>(
    () => ({ t, ready, locale }),
    [t, ready, locale]
  );

  return <ShipEasyI18nContext.Provider value={value}>{children}</ShipEasyI18nContext.Provider>;
}
```

### `src/ShipEasyI18nString.tsx`

```typescript
import React, { type HTMLAttributes } from 'react';
import { useShipEasyI18n } from './context';

interface ShipEasyI18nStringProps extends HTMLAttributes<HTMLSpanElement> {
  /** The label key, e.g. "user.greeting" */
  labelKey: string;
  /** Variables for interpolation: { name: "John" } */
  variables?: Record<string, string | number>;
  /** Brief description for translators — rendered as data-label-desc */
  desc?: string;
  /** Override rendered element (default: span) */
  as?: keyof JSX.IntrinsicElements;
}

/**
 * Renders a translated string inside a span with data-label attribute so the
 * in-browser editor can identify and edit it visually.
 *
 * Falls back to the imperative useShipEasyI18n().t() value when window.i18n is present,
 * so React state and the DOM always stay in sync.
 */
export function ShipEasyI18nString({
  labelKey,
  variables,
  desc,
  as: Tag = 'span',
  ...rest
}: ShipEasyI18nStringProps) {
  const { t } = useShipEasyI18n();
  const translated = t(labelKey, variables);

  return (
    <Tag
      data-label={labelKey}
      data-variables={variables ? JSON.stringify(variables) : undefined}
      data-label-desc={desc}
      {...rest}
    >
      {translated}
    </Tag>
  );
}
```

### `src/withShipEasyI18n.tsx` (class component HOC)

```typescript
import React, { Component, type ComponentType } from 'react';
import { ShipEasyI18nContext, type ShipEasyI18nContextValue } from './context';

export function withShipEasyI18n<P extends object>(
  WrappedComponent: ComponentType<P & { i18n: ShipEasyI18nContextValue }>
) {
  return class WithShipEasyI18n extends Component<P> {
    static contextType = ShipEasyI18nContext;
    declare context: ShipEasyI18nContextValue;

    render() {
      return <WrappedComponent {...this.props} i18n={this.context} />;
    }
  };
}
```

### `src/index.ts`

```typescript
export { ShipEasyI18nProvider } from "./ShipEasyI18nProvider";
export { ShipEasyI18nString } from "./ShipEasyI18nString";
export { useShipEasyI18n } from "./context";
export type { ShipEasyI18nContextValue } from "./context";
export { withShipEasyI18n } from "./withShipEasyI18n";
```

---

## SSR / Hydration

### The Problem

React compares server-rendered HTML with the first client render. If the server renders the key name (`"user.greeting"`) but the client hydrates with the translated value (`"Hello, John!"`), React throws a hydration mismatch warning and re-renders the entire tree.

### The Fix: Inline Label Data

Before your React bundle runs, inject labels as JSON so `window.i18n` is populated synchronously:

```html
<!-- Injected by your SSR layer (Next.js, Remix, Rails, etc.) -->
<script id="i18n-data" type="application/json">
  {
    "v": 1,
    "profile": "en:prod",
    "chunk": "index",
    "strings": { "user.greeting": "Hello, {{name}}!", "nav.home": "Home" }
  }
</script>
```

loader.js reads this script tag on boot and populates `window.i18n` before any React hydration. Your `ShipEasyI18nProvider` then initializes with `ready: true` and the `t()` function returns real strings on the very first render — matching what the server rendered.

For servers using `@i18n/react` standalone (without `@i18n/next` or `@i18n/remix`), use the `@i18n/core` server helper:

```typescript
// server.ts
import { fetchLabelsForSSR, serializeLabelsToScript } from "@i18n/core/server";

const labels = await fetchLabelsForSSR({
  key: "i18n_pk_abc123",
  profile: "en:prod",
  chunk: "index",
});
// Returns: <script id="i18n-data" type="application/json">{...}</script>
const inlineScript = serializeLabelsToScript(labels);
```

Inject `inlineScript` into your HTML `<head>` before `loader.js`.

### Concurrent Mode Safety

- `t()` is pure and has no side effects — safe to call during interrupted renders.
- `ShipEasyI18nProvider` uses `useState` initializer (runs once) and `useEffect` (runs after commit) — no concurrent-mode hazards.
- No `useLayoutEffect` that would suppress SSR warnings.
- `useMemo` for context value prevents unnecessary child re-renders when unrelated state changes.

### React 18 `startTransition`

Label updates from the editor (`window.i18n.on('update')`) trigger a normal `setState`. If you want label updates to be treated as non-urgent (not block user input), wrap the setter in `startTransition`:

```typescript
import { startTransition } from "react";
// Inside ShipEasyI18nProvider useEffect:
const unsubscribe = window.i18n.on("update", () => {
  startTransition(() => {
    setLocale(window.i18n!.locale);
    setReady((r) => r);
  });
});
```

---

## Usage Examples

### Basic Hook

```tsx
import { useShipEasyI18n } from "@i18n/react";

function WelcomeBanner({ name }: { name: string }) {
  const { t, ready } = useShipEasyI18n();
  return (
    <h1 data-label="user.greeting" data-variables={JSON.stringify({ name })}>
      {t("user.greeting", { name })}
    </h1>
  );
}
```

### Declarative Component

```tsx
import { ShipEasyI18nString } from "@i18n/react";

function NavBar() {
  return (
    <nav>
      <ShipEasyI18nString labelKey="nav.home" desc="Home link in the main navigation" />
      <ShipEasyI18nString labelKey="nav.patients" desc="Patients section link" />
    </nav>
  );
}
```

### App Root

```tsx
import { ShipEasyI18nProvider } from "@i18n/react";

export default function App() {
  return (
    <ShipEasyI18nProvider ssrLocale="en:prod">
      <Router>
        <Routes />
      </Router>
    </ShipEasyI18nProvider>
  );
}
```

### Loading State

```tsx
function MyPage() {
  const { t, ready } = useShipEasyI18n();
  if (!ready) return <Skeleton />;
  return <p>{t("page.title")}</p>;
}
```

---

## Edge Cases

### Labels not loaded on first render (no inline data, cold cache)

Without inline data, `ready` starts `false`. `t()` returns the raw key. Design your UI to show placeholders or accept raw keys as fallback — they are still meaningful text identifiers. Once the CDN fetch completes (<50ms on hit), the provider flips `ready: true` and triggers a re-render.

### Multiple providers

Only mount `ShipEasyI18nProvider` once at the app root. Nested providers are not supported and will create isolated context values that don't reflect the global `window.i18n` state correctly.

### Testing

Mock `window.i18n` in your test setup:

```typescript
// setupTests.ts
global.window.i18n = {
  t: (key, vars) => {
    if (!vars) return key;
    return Object.entries(vars).reduce((s, [k, v]) => s.replace(`{{${k}}}`, String(v)), key);
  },
  ready: (cb) => cb(),
  on: (_event, _cb) => () => {},
  locale: "en:prod",
};
```

### StrictMode double-invocation

React 18 StrictMode runs effects twice in development. The `useEffect` in `ShipEasyI18nProvider` attaches and detaches listeners twice — harmless because `window.i18n.on` returns an unsubscribe function that is called on cleanup.

### Suspense / Error Boundaries

`ShipEasyI18nProvider` does not suspend. Labels load in the background; components render with fallback text (keys) until ready. This keeps SSR streaming working without blocking.

### Dynamic locale switching

If a user switches language at runtime, the loader must re-fetch a new label file and call `window.i18n.on('update')`. `ShipEasyI18nProvider` will pick this up and re-render affected components automatically.

---

## Test Commands

```bash
npm test                          # Jest unit tests
npm run test:e2e                  # Playwright integration
npm run build                     # TypeScript compile check
npx tsc --noEmit                  # Type check only
```

### Unit Test Example

```typescript
import { render, screen } from '@testing-library/react';
import { ShipEasyI18nProvider, ShipEasyI18nString } from '@i18n/react';

describe('ShipEasyI18nString', () => {
  it('renders translated text', () => {
    render(
      <ShipEasyI18nProvider>
        <ShipEasyI18nString labelKey="nav.home" />
      </ShipEasyI18nProvider>
    );
    expect(screen.getByText('nav.home')).toBeInTheDocument(); // fallback key
  });

  it('renders translated text when i18n is ready', () => {
    window.i18n = {
      t: () => 'Home',
      ready: (cb) => cb(),
      on: () => () => {},
      locale: 'en:prod',
    };
    render(
      <ShipEasyI18nProvider>
        <ShipEasyI18nString labelKey="nav.home" />
      </ShipEasyI18nProvider>
    );
    expect(screen.getByText('Home')).toBeInTheDocument();
  });
});
```

---

## End-to-End Example

```
my-react-app/
  index.html            ← script tag + inline i18n-data script
  src/
    main.tsx            ← ReactDOM.createRoot + <ShipEasyI18nProvider>
    App.tsx             ← uses <ShipEasyI18nString> and useShipEasyI18n()
```

`index.html`:

```html
<!DOCTYPE html>
<html>
  <head>
    <script id="i18n-data" type="application/json">
      {
        "v": 1,
        "profile": "en:prod",
        "chunk": "index",
        "strings": { "nav.home": "Home", "user.greeting": "Hello, {{name}}!" }
      }
    </script>
    <script
      src="https://cdn.i18n.shipeasy.ai/loader.js"
      data-key="i18n_pk_abc123"
      data-profile="en:prod"
      async
    ></script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`src/main.tsx`:

```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { ShipEasyI18nProvider } from "@i18n/react";
import App from "./App";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ShipEasyI18nProvider ssrLocale="en:prod">
      <App />
    </ShipEasyI18nProvider>
  </React.StrictMode>,
);
```

`src/App.tsx`:

```tsx
import { useShipEasyI18n, ShipEasyI18nString } from "@i18n/react";

export default function App() {
  const { t } = useShipEasyI18n();
  return (
    <div>
      <h1>{t("user.greeting", { name: "Alice" })}</h1>
      <nav>
        <ShipEasyI18nString labelKey="nav.home" desc="Main nav home link" as="a" href="/" />
      </nav>
    </div>
  );
}
```
