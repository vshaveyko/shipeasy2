# Plan: ShipEasyI18n Next.js Integration

**Goal**: Provide a complete ShipEasyI18n integration for both Next.js App Router (React Server Components + streaming SSR) and Pages Router, with zero hydration mismatches and inline label data injection.
**Package**: `@i18n/next`
**Key challenge**: App Router RSCs run on the server with no `window.i18n`, and the streaming HTML must contain the label data before the client JS bundle hydrates so the first React render matches server-rendered HTML exactly.

---

## Install

```bash
npm install @i18n/next @i18n/react
```

`@i18n/next` depends on `@i18n/react` for the client-side provider and hooks.

---

## Package Exports

```
@i18n/next
  /server          — server-only: t(), fetchLabels(), generateInlineScript()
  /client          — 'use client' re-exports from @i18n/react
  ShipEasyI18nScriptTag     — Next.js <Script> wrapper for loader.js
  ShipEasyI18nInlineData    — Server component that renders inline label data script
```

---

## App Router Integration

### 1. Root Layout (`app/layout.tsx`)

```tsx
import Script from "next/script";
import { ShipEasyI18nInlineData } from "@i18n/next";
import { ShipEasyI18nProvider } from "@i18n/next/client";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* 1. Inline label data — must come before loader.js */}
        <ShipEasyI18nInlineData i18nKey="i18n_pk_abc123" profile="en:prod" chunk="index" />

        {/* 2. Loader script — reads the inline data immediately on parse */}
        <Script
          src="https://cdn.i18n.shipeasy.ai/loader.js"
          data-key="i18n_pk_abc123"
          data-profile="en:prod"
          strategy="beforeInteractive"
        />
      </head>
      <body>
        {/* 3. Client provider wraps the whole tree */}
        <ShipEasyI18nProvider ssrLocale="en:prod">{children}</ShipEasyI18nProvider>
      </body>
    </html>
  );
}
```

### 2. Server Component `t()` (App Router only)

In React Server Components you have no browser context. Use the server-side `t()` which fetches labels at request time (with `next: { revalidate: 60 }` cache):

```tsx
// app/dashboard/page.tsx — this is a Server Component
import { t } from "@i18n/next/server";

export default async function DashboardPage() {
  // Translated on the server — no hydration mismatch because
  // the same string is also in the inline data seen by the client.
  const greeting = await t("user.greeting", { name: "Alice" });

  return (
    <main>
      <h1 data-label="user.greeting" data-variables={JSON.stringify({ name: "Alice" })}>
        {greeting}
      </h1>
    </main>
  );
}
```

### 3. Client Component Hook (App Router)

```tsx
// components/NavBar.tsx
"use client";

import { useShipEasyI18n, ShipEasyI18nString } from "@i18n/next/client";

export function NavBar() {
  const { t } = useShipEasyI18n();
  return (
    <nav>
      <ShipEasyI18nString labelKey="nav.home" />
      <span data-label="nav.patients">{t("nav.patients")}</span>
    </nav>
  );
}
```

---

## Pages Router Integration

### `_document.tsx`

```tsx
import { Html, Head, Main, NextScript } from "next/document";
import { getShipEasyI18nInlineDataScript } from "@i18n/next/server";

export default function Document() {
  // This runs on the server for every request in Pages Router.
  // We render the script tag inline so it's in the initial HTML.
  const inlineScript = getShipEasyI18nInlineDataScript({
    i18nKey: "i18n_pk_abc123",
    profile: "en:prod",
    chunk: "index",
  });

  return (
    <Html>
      <Head>
        {/* Inject raw HTML — Next.js dangerouslySetInnerHTML is safe here,
            this is static JSON, not user-generated content */}
        <script
          id="i18n-data"
          type="application/json"
          dangerouslySetInnerHTML={{ __html: inlineScript }}
        />
        <script
          src="https://cdn.i18n.shipeasy.ai/loader.js"
          data-key="i18n_pk_abc123"
          data-profile="en:prod"
        />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
```

### `_app.tsx`

```tsx
import type { AppProps } from "next/app";
import { ShipEasyI18nProvider } from "@i18n/next/client";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ShipEasyI18nProvider ssrLocale={pageProps.i18nLocale ?? "en:prod"}>
      <Component {...pageProps} />
    </ShipEasyI18nProvider>
  );
}
```

### Pages Router `getServerSideProps`

Pass `i18nLocale` as a page prop so the provider initializes with the correct locale:

```typescript
// pages/dashboard.tsx
import { fetchLabels } from '@i18n/next/server';
import { useShipEasyI18n } from '@i18n/next/client';

export async function getServerSideProps() {
  const labels = await fetchLabels({
    i18nKey: 'i18n_pk_abc123',
    profile: 'en:prod',
    chunk: 'index',
  });
  return {
    props: {
      i18nLocale: 'en:prod',
      // Pass labels down if you want SSR-rendered strings without
      // waiting for the client bundle to fetch them.
      initialLabels: labels,
    },
  };
}

export default function DashboardPage({
  initialLabels,
}: {
  initialLabels: Record<string, string>;
}) {
  const { t } = useShipEasyI18n();
  return <h1>{t('user.greeting', { name: 'Alice' })}</h1>;
}
```

---

## Full Source: `@i18n/next`

### `src/server/index.ts`

```typescript
import type { ReactNode } from "react";

const ShipEasyI18n_API_BASE = "https://api.i18n.shipeasy.ai";

export interface FetchLabelsOptions {
  i18nKey: string;
  profile: string;
  chunk?: string;
}

export interface LabelFile {
  v: number;
  profile: string;
  chunk: string;
  strings: Record<string, string>;
}

/**
 * Fetches a label file from the CDN. Uses Next.js fetch with revalidate
 * so the result is cached at the edge and refreshed every 60s.
 */
export async function fetchLabels(opts: FetchLabelsOptions): Promise<LabelFile> {
  // 1. Fetch manifest to get the hashed file URL
  const manifestUrl = `https://cdn.i18n.shipeasy.ai/labels/${opts.i18nKey}/${opts.profile}/manifest.json`;
  const manifest = await fetch(manifestUrl, {
    next: { revalidate: 60 },
  }).then((r) => r.json() as Promise<Record<string, string>>);

  const chunk = opts.chunk ?? "index";
  const fileUrl = manifest[chunk];
  if (!fileUrl) {
    throw new Error(
      `ShipEasyI18n: chunk "${chunk}" not found in manifest for profile "${opts.profile}"`,
    );
  }

  // 2. Fetch the immutable hashed label file
  const labelFile = await fetch(fileUrl, {
    next: { revalidate: 31536000 }, // immutable — content-addressed
  }).then((r) => r.json() as Promise<LabelFile>);

  return labelFile;
}

/**
 * Synchronous translation on the server. Fetches once per request (cached).
 * Uses a module-level cache keyed by profile+chunk so multiple calls in the
 * same RSC tree don't make multiple fetches.
 */
const requestCache = new Map<string, Promise<LabelFile>>();

export async function t(
  key: string,
  variables?: Record<string, string | number>,
  opts?: FetchLabelsOptions,
): Promise<string> {
  const resolvedOpts: FetchLabelsOptions = opts ?? {
    i18nKey: process.env.ShipEasyI18n_KEY!,
    profile: process.env.ShipEasyI18n_PROFILE ?? "en:prod",
    chunk: "index",
  };

  const cacheKey = `${resolvedOpts.profile}:${resolvedOpts.chunk ?? "index"}`;
  if (!requestCache.has(cacheKey)) {
    requestCache.set(cacheKey, fetchLabels(resolvedOpts));
  }

  const labelFile = await requestCache.get(cacheKey)!;
  let value = labelFile.strings[key] ?? key;

  if (variables) {
    value = Object.entries(variables).reduce(
      (s, [k, v]) => s.replace(new RegExp(`{{${k}}}`, "g"), String(v)),
      value,
    );
  }

  return value;
}

/**
 * Returns a JSON string suitable for injection inside a
 * <script id="i18n-data" type="application/json"> tag.
 * Safe: label values are plain strings with no HTML injection risk
 * because they are developer-controlled, not user-generated.
 */
export function getShipEasyI18nInlineDataScript(opts: FetchLabelsOptions): string {
  // This is sync-only for _document.tsx. For async usage (App Router),
  // use <ShipEasyI18nInlineData> server component instead.
  // Returns empty object as placeholder — actual fetching is async.
  // Use ShipEasyI18nInlineData server component in App Router.
  return JSON.stringify({ v: 1, profile: opts.profile, chunk: opts.chunk ?? "index", strings: {} });
}

/**
 * Serializes a LabelFile into the inline script JSON string.
 */
export function serializeLabelsToScript(labelFile: LabelFile): string {
  return JSON.stringify(labelFile);
}
```

### `src/server/ShipEasyI18nInlineData.tsx` (App Router Server Component)

```tsx
// This file has no 'use client' directive — it is a Server Component.
import { fetchLabels, type FetchLabelsOptions } from "./index";

interface ShipEasyI18nInlineDataProps extends FetchLabelsOptions {}

/**
 * Server component that fetches labels and renders them as an inline
 * <script id="i18n-data" type="application/json"> in the <head>.
 *
 * loader.js reads this script tag synchronously on parse, so labels
 * are available before any React hydration runs. This eliminates
 * hydration mismatches.
 */
export async function ShipEasyI18nInlineData(props: ShipEasyI18nInlineDataProps) {
  let labelData = "{}";
  try {
    const labelFile = await fetchLabels(props);
    labelData = JSON.stringify(labelFile);
  } catch (err) {
    // Graceful degradation: if CDN is unreachable, loader.js will
    // fetch normally. No label flash on cache miss — acceptable.
    console.error("[ShipEasyI18n] Failed to fetch labels for SSR:", err);
  }

  return (
    <script
      id="i18n-data"
      type="application/json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: labelData }}
    />
  );
}
```

### `src/client/index.ts`

```typescript
"use client";
// Re-export everything from @i18n/react for use in client components.
export {
  ShipEasyI18nProvider,
  ShipEasyI18nString,
  useShipEasyI18n,
  withShipEasyI18n,
} from "@i18n/react";
export type { ShipEasyI18nContextValue } from "@i18n/react";
```

### `src/ShipEasyI18nScriptTag.tsx`

```tsx
import Script from "next/script";

interface ShipEasyI18nScriptTagProps {
  i18nKey: string;
  profile: string;
  chunk?: string;
  hideUntilReady?: boolean;
}

/**
 * Wraps next/script with the correct ShipEasyI18n attributes.
 * strategy="beforeInteractive" ensures loader.js runs before hydration.
 */
export function ShipEasyI18nScriptTag({
  i18nKey,
  profile,
  chunk,
  hideUntilReady = false,
}: ShipEasyI18nScriptTagProps) {
  return (
    <Script
      src="https://cdn.i18n.shipeasy.ai/loader.js"
      data-key={i18nKey}
      data-profile={profile}
      data-chunk={chunk}
      data-hide-until-ready={hideUntilReady ? "true" : undefined}
      strategy="beforeInteractive"
    />
  );
}
```

### `src/index.ts`

```typescript
export { ShipEasyI18nInlineData } from "./server/ShipEasyI18nInlineData";
export { ShipEasyI18nScriptTag } from "./ShipEasyI18nScriptTag";
export {
  fetchLabels,
  t,
  getShipEasyI18nInlineDataScript,
  serializeLabelsToScript,
} from "./server/index";
export type { FetchLabelsOptions, LabelFile } from "./server/index";
```

---

## Hydration Mismatch Fix

### Root Cause

Server renders `"Hello, {{name}}!"` (raw key or untranslated). Client hydrates with `"Hello, Alice!"` (translated). React sees a mismatch and throws a warning, then re-renders the entire subtree (slow).

### Fix

Three-step fix applied by this package:

1. **`<ShipEasyI18nInlineData>`** fetches labels on the server and embeds them as JSON in `<head>`.
2. **`loader.js`** reads the inline JSON synchronously on parse — before React hydrates.
3. **`ShipEasyI18nProvider`** initializes with `ready: true` (because `window.i18n.locale` is set) and `t()` returns translated strings on the very first render.

The server renders with `await t('user.greeting', { name: 'Alice' })` → `"Hello, Alice!"`.
The client renders `t('user.greeting', { name: 'Alice' })` from the preloaded labels → `"Hello, Alice!"`.
Both sides agree. No mismatch.

### Streaming SSR (App Router)

With streaming, RSCs can be flushed to the browser before the full page is ready. The `<ShipEasyI18nInlineData>` component in `<head>` is in the layout which is part of the initial shell — it is always sent in the first flush. Label data arrives before any content chunks, so hydration is safe.

---

## Environment Variables

```bash
# .env.local
ShipEasyI18n_KEY=i18n_pk_abc123
ShipEasyI18n_PROFILE=en:prod
# Optional: secret token for CI publish steps (never expose to client)
ShipEasyI18n_SECRET_TOKEN=i18n_sk_...
```

The server-side `t()` reads `ShipEasyI18n_KEY` and `ShipEasyI18n_PROFILE` automatically when `opts` is omitted.

---

## Edge Cases

### `next/headers` and per-request locale

For apps with user-specific locales (e.g., a French user sees `fr:prod`):

```tsx
// app/layout.tsx
import { headers } from "next/headers";
import { ShipEasyI18nInlineData } from "@i18n/next";

export default async function RootLayout({ children }) {
  const hdrs = await headers();
  // Your locale detection logic — e.g. Accept-Language or user preference
  const locale = hdrs.get("accept-language")?.startsWith("fr") ? "fr:prod" : "en:prod";

  return (
    <html>
      <head>
        <ShipEasyI18nInlineData i18nKey="i18n_pk_abc123" profile={locale} chunk="index" />
        <ShipEasyI18nScriptTag i18nKey="i18n_pk_abc123" profile={locale} />
      </head>
      <body>
        <ShipEasyI18nProvider ssrLocale={locale}>{children}</ShipEasyI18nProvider>
      </body>
    </html>
  );
}
```

### `next/script` strategy warning

Do not use `strategy="lazyOnload"` for loader.js — it loads after hydration, causing a flash. Always use `strategy="beforeInteractive"` or a plain `<script>` tag in `<head>`.

### Static export (`next export`)

Static export has no server-side fetch. Use the CDN inline data approach at build time:

```typescript
// next.config.mjs
import { fetchLabels } from "@i18n/next/server";

/** Generates inline label data at build time for static export */
export async function generateStaticInlineData() {
  const labels = await fetchLabels({ i18nKey: "...", profile: "en:prod", chunk: "index" });
  return JSON.stringify(labels);
}
```

Or accept the loader.js fetch on first load (CDN hit, ~50ms) — no SSR mismatch risk in static export since there is no server-rendered HTML to mismatch against.

### Multiple chunks per page

For pages that use strings from multiple chunks:

```tsx
<head>
  <ShipEasyI18nInlineData i18nKey="i18n_pk_abc123" profile="en:prod" chunk="index" />
  <ShipEasyI18nInlineData i18nKey="i18n_pk_abc123" profile="en:prod" chunk="checkout" />
</head>
```

loader.js merges multiple `i18n-data` script tags. The second tag uses id `i18n-data-2`, etc.

Actually — simpler approach: use the `index` chunk for above-the-fold strings and let loader.js prefetch additional chunks via `window.i18n.prefetch('checkout')` after mount.

---

## Test Commands

```bash
npm test                          # Jest
npm run test:e2e                  # Playwright — tests hydration in a real browser
npx tsc --noEmit                  # Type check
npm run build                     # Full build check
```

### Hydration Test

```typescript
// tests/hydration.test.ts (Playwright)
import { test, expect } from "@playwright/test";

test("no hydration mismatch on dashboard", async ({ page }) => {
  const warnings: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "warning" && msg.text().includes("Hydration")) {
      warnings.push(msg.text());
    }
  });

  await page.goto("http://localhost:3000/dashboard");
  await page.waitForLoadState("networkidle");

  expect(warnings).toHaveLength(0);
  await expect(page.locator('[data-label="user.greeting"]')).toContainText("Hello");
});
```

---

## End-to-End Example

```
my-next-app/
  .env.local                      ← ShipEasyI18n_KEY, ShipEasyI18n_PROFILE
  app/
    layout.tsx                    ← ShipEasyI18nInlineData + ShipEasyI18nScriptTag + ShipEasyI18nProvider
    dashboard/
      page.tsx                    ← Server Component using await t()
  components/
    NavBar.tsx                    ← 'use client', useShipEasyI18n()
```
