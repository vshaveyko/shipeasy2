# Plan: ShipEasyI18n Remix Integration

**Goal**: Integrate ShipEasyI18n with Remix's loader/action model, injecting label data server-side through the root loader so every page render — including streamed responses — ships labels inline and avoids hydration mismatches.
**Package**: `@i18n/remix`
**Key challenge**: Remix has a single root loader that provides context to all nested routes; label data must be included there and passed to the client via `useLoaderData`, then surfaced through a React context that avoids the hydration mismatch between server-rendered translated strings and the client's initial render.

---

## Install

```bash
npm install @i18n/remix @i18n/react
```

---

## Package Exports

```
@i18n/remix
  i18nLoader          — root loader helper: fetches labels, merges into loader data
  getShipEasyI18nLoaderData   — extracts ShipEasyI18n data from root loader data (type helper)
  ShipEasyI18nRemixProvider   — wraps ShipEasyI18nProvider, seeds it from useLoaderData
  useShipEasyI18n             — re-export from @i18n/react
  ShipEasyI18nString          — re-export from @i18n/react
  injectShipEasyI18nScript    — generates <script> tags for root.tsx
```

---

## Full Source

### `src/server.ts`

```typescript
import type { LoaderFunctionArgs } from "@remix-run/node";

export interface LabelFile {
  v: number;
  profile: string;
  chunk: string;
  strings: Record<string, string>;
}

export interface ShipEasyI18nLoaderData {
  i18nLabels: LabelFile | null;
  i18nProfile: string;
}

const ShipEasyI18n_CDN = "https://cdn.i18n.shipeasy.ai";

async function fetchManifest(i18nKey: string, profile: string): Promise<Record<string, string>> {
  const url = `${ShipEasyI18n_CDN}/labels/${i18nKey}/${profile}/manifest.json`;
  const res = await fetch(url, {
    headers: { "Cache-Control": "max-age=60" },
  });
  if (!res.ok) throw new Error(`ShipEasyI18n manifest fetch failed: ${res.status}`);
  return res.json();
}

async function fetchChunk(url: string): Promise<LabelFile> {
  const res = await fetch(url, {
    headers: { "Cache-Control": "max-age=31536000" },
  });
  if (!res.ok) throw new Error(`ShipEasyI18n chunk fetch failed: ${res.status}`);
  return res.json();
}

/**
 * Fetches ShipEasyI18n labels for the given profile and chunk.
 * Call this inside your root loader and merge the result with your
 * existing loader data.
 *
 * @example
 * export async function loader({ request }: LoaderFunctionArgs) {
 *   const i18nData = await fetchShipEasyI18nLabels({ i18nKey: 'i18n_pk_abc123', profile: 'en:prod' });
 *   return json({ ...i18nData, user: await getUser(request) });
 * }
 */
export async function fetchShipEasyI18nLabels(opts: {
  i18nKey: string;
  profile: string;
  chunk?: string;
}): Promise<ShipEasyI18nLoaderData> {
  const chunk = opts.chunk ?? "index";
  try {
    const manifest = await fetchManifest(opts.i18nKey, opts.profile);
    const chunkUrl = manifest[chunk];
    if (!chunkUrl) {
      console.error(`[ShipEasyI18n] Chunk "${chunk}" not in manifest`);
      return { i18nLabels: null, i18nProfile: opts.profile };
    }
    const labelFile = await fetchChunk(chunkUrl);
    return { i18nLabels: labelFile, i18nProfile: opts.profile };
  } catch (err) {
    // Graceful degradation — missing labels are not a fatal error.
    console.error("[ShipEasyI18n] Failed to fetch labels:", err);
    return { i18nLabels: null, i18nProfile: opts.profile };
  }
}

/**
 * Server-side t() for use in loaders and actions.
 * Translates a key using a fetched LabelFile.
 */
export function translateServer(
  labelFile: LabelFile | null,
  key: string,
  variables?: Record<string, string | number>,
): string {
  if (!labelFile) return key;
  let value = labelFile.strings[key] ?? key;
  if (variables) {
    value = Object.entries(variables).reduce(
      (s, [k, v]) => s.replace(new RegExp(`{{${k}}}`, "g"), String(v)),
      value,
    );
  }
  return value;
}
```

### `src/ShipEasyI18nRemixProvider.tsx`

```tsx
"use client"; // Remix v2 with React Server Components uses this; v1 ignores it

import React, { useMemo } from "react";
import { useRouteLoaderData } from "@remix-run/react";
import { ShipEasyI18nProvider } from "@i18n/react";
import type { ShipEasyI18nLoaderData, LabelFile } from "./server";

interface ShipEasyI18nRemixProviderProps {
  children: React.ReactNode;
  /**
   * The route ID that contains ShipEasyI18n loader data.
   * Defaults to "root" (the root.tsx route).
   */
  routeId?: string;
}

/**
 * Wraps @i18n/react's ShipEasyI18nProvider and seeds it with label data fetched
 * in the root loader. Place this in your root.tsx around the <Outlet />.
 */
export function ShipEasyI18nRemixProvider({
  children,
  routeId = "root",
}: ShipEasyI18nRemixProviderProps) {
  const data = useRouteLoaderData<ShipEasyI18nLoaderData>(routeId);
  const ssrLocale = data?.i18nProfile ?? undefined;

  return <ShipEasyI18nProvider ssrLocale={ssrLocale}>{children}</ShipEasyI18nProvider>;
}
```

### `src/InlineData.tsx`

```tsx
import type { LabelFile } from "./server";

interface InlineDataProps {
  labelFile: LabelFile | null;
}

/**
 * Renders <script id="i18n-data" type="application/json"> inline so
 * loader.js can read labels before any client JS runs.
 *
 * Place this inside the <head> in root.tsx.
 */
export function ShipEasyI18nInlineData({ labelFile }: InlineDataProps) {
  if (!labelFile) return null;
  return (
    <script
      id="i18n-data"
      type="application/json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(labelFile) }}
    />
  );
}
```

### `src/index.ts`

```typescript
export { fetchShipEasyI18nLabels, translateServer } from "./server";
export type { LabelFile, ShipEasyI18nLoaderData } from "./server";
export { ShipEasyI18nRemixProvider } from "./ShipEasyI18nRemixProvider";
export { ShipEasyI18nInlineData } from "./InlineData";
export { useShipEasyI18n, ShipEasyI18nString, withShipEasyI18n } from "@i18n/react";
export type { ShipEasyI18nContextValue } from "@i18n/react";
```

---

## Remix Integration: `root.tsx`

```tsx
import { Links, Meta, Outlet, Scripts, ScrollRestoration } from "@remix-run/react";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import {
  fetchShipEasyI18nLabels,
  ShipEasyI18nRemixProvider,
  ShipEasyI18nInlineData,
} from "@i18n/remix";

export async function loader({ request }: LoaderFunctionArgs) {
  // Detect locale if needed (e.g., from cookie or Accept-Language)
  const profile = "en:prod";

  const i18nData = await fetchShipEasyI18nLabels({
    i18nKey: "i18n_pk_abc123",
    profile,
    chunk: "index",
  });

  return json({
    ...i18nData,
    // your other root loader data
  });
}

export default function App() {
  return (
    <html lang="en">
      <head>
        <Meta />
        <Links />
        {/* Inline label data — before loader.js so it reads them synchronously */}
        <ShipEasyI18nInlineData />
      </head>
      <body>
        <ShipEasyI18nRemixProvider>
          <Outlet />
        </ShipEasyI18nRemixProvider>
        <ScrollRestoration />
        {/* ShipEasyI18n loader script — reads the inline data on parse */}
        <script
          src="https://cdn.i18n.shipeasy.ai/loader.js"
          data-key="i18n_pk_abc123"
          data-profile="en:prod"
        />
        <Scripts />
      </body>
    </html>
  );
}
```

`ShipEasyI18nInlineData` with no props reads from `useRouteLoaderData('root')` internally:

```tsx
// Updated ShipEasyI18nInlineData.tsx for Remix — reads from loader data automatically
import { useRouteLoaderData } from "@remix-run/react";
import type { ShipEasyI18nLoaderData } from "./server";

export function ShipEasyI18nInlineData({ routeId = "root" }: { routeId?: string }) {
  const data = useRouteLoaderData<ShipEasyI18nLoaderData>(routeId);
  if (!data?.i18nLabels) return null;

  // dangerouslySetInnerHTML is safe — i18nLabels is developer-controlled JSON
  return (
    <script
      id="i18n-data"
      type="application/json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data.i18nLabels) }}
    />
  );
}
```

---

## Route-Level Usage

### In a loader (server-side translation)

```typescript
// routes/dashboard.tsx
import type { LoaderFunctionArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { translateServer } from '@i18n/remix';

export async function loader({ request }: LoaderFunctionArgs) {
  // Access root labels via context (advanced) or re-fetch for this chunk
  // For now, use the root loader data via useRouteLoaderData in the component
  const user = await getUser(request);
  return json({ userName: user.name });
}

export default function DashboardPage() {
  const { userName } = useLoaderData<typeof loader>();
  const { t } = useShipEasyI18n();

  return (
    <h1 data-label="user.greeting" data-variables={JSON.stringify({ name: userName })}>
      {t('user.greeting', { name: userName })}
    </h1>
  );
}
```

### Chunk-specific loaders

For pages that need a non-index chunk (e.g., checkout page needing `checkout` strings):

```typescript
// routes/checkout.tsx
import { fetchShipEasyI18nLabels } from "@i18n/remix";

export async function loader() {
  const { i18nLabels } = await fetchShipEasyI18nLabels({
    i18nKey: "i18n_pk_abc123",
    profile: "en:prod",
    chunk: "checkout",
  });
  // window.i18n.prefetch('checkout') will be called client-side via:
  // loader.js reads the inline data tag with chunk="checkout"
  return json({ checkoutLabels: i18nLabels });
}
```

Alternatively, call `window.i18n.prefetch('checkout')` on mount:

```tsx
import { useEffect } from "react";

export default function CheckoutPage() {
  useEffect(() => {
    window.i18n?.prefetch("checkout");
  }, []);
  // ...
}
```

---

## Hydration Mismatch Fix

### Root Cause

Remix server-renders the page with labels translated (if using `translateServer`), but the client rehydrates before loader.js has applied labels from the CDN fetch. If the server-side translation and client-side first render disagree, React logs a hydration error.

### Fix

1. **Root loader** fetches labels and includes them in loader data.
2. **`<ShipEasyI18nInlineData>`** renders them as a JSON script tag in `<head>`.
3. **`loader.js`** reads the inline script on parse (before client JS bundle executes) and populates `window.i18n`.
4. **`ShipEasyI18nProvider`** (via `ShipEasyI18nRemixProvider`) initializes with `ready: true` and returns real translated strings on the first render.

With this setup:

- Server renders `t('user.greeting')` → `"Hello, Alice!"`
- `loader.js` reads inline data → `window.i18n` ready with `"Hello, Alice!"`
- Client first render: `t('user.greeting')` → `"Hello, Alice!"`
- React: no mismatch. ✓

---

## Streaming SSR with `defer`

When using Remix's `defer` for deferred data, the initial HTML shell is sent immediately. Ensure ShipEasyI18n label data is in the non-deferred part of the root loader return value:

```typescript
// root.tsx loader
export async function loader({ request }: LoaderFunctionArgs) {
  // ShipEasyI18n labels are NOT deferred — must be in the initial shell
  const i18nData = await fetchShipEasyI18nLabels({ i18nKey: "i18n_pk_abc123", profile: "en:prod" });

  return defer({
    ...i18nData, // synchronous
    heavyData: getHeavyData(), // deferred — returns a Promise
  });
}
```

This ensures labels are in the first HTML flush so the inline script is available before streaming chunks render their strings.

---

## Edge Cases

### Remix v1 vs v2

- Remix v1: `useLoaderData` returns the root loader data in `_app`-equivalent files. Use `useRouteLoaderData('root')` for accessing root data in child components.
- Remix v2 + React Server Components (experimental): use `fetchShipEasyI18nLabels` in server components, then pass data to `ShipEasyI18nInlineData` directly without `useRouteLoaderData`.

### `fetchShipEasyI18nLabels` timeout

Add a timeout to avoid slow CDN responses blocking SSR:

```typescript
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 1000); // 1s max
try {
  const res = await fetch(url, { signal: controller.signal });
  // ...
} finally {
  clearTimeout(timeout);
}
```

### Locale per user session

Read locale from a cookie in the root loader:

```typescript
export async function loader({ request }: LoaderFunctionArgs) {
  const cookieHeader = request.headers.get("Cookie");
  const localeCookie = await localeCookieParser.parse(cookieHeader);
  const profile = localeCookie?.locale ?? "en:prod";

  const i18nData = await fetchShipEasyI18nLabels({ i18nKey: "i18n_pk_abc123", profile });
  return json(i18nData);
}
```

---

## Test Commands

```bash
npm test                     # Vitest unit tests
npm run test:e2e             # Playwright
npx tsc --noEmit             # TypeScript check
```

### Hydration Test

```typescript
test("no hydration mismatch", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.text().includes("Hydration")) errors.push(msg.text());
  });
  await page.goto("/dashboard");
  await page.waitForLoadState("networkidle");
  expect(errors).toHaveLength(0);
});
```

---

## End-to-End Example

```
my-remix-app/
  app/
    root.tsx          ← loader + ShipEasyI18nInlineData + ShipEasyI18nRemixProvider
    routes/
      dashboard.tsx   ← useShipEasyI18n() hook
      checkout.tsx    ← prefetch checkout chunk
  .env               ← ShipEasyI18n_KEY=i18n_pk_abc123
```
