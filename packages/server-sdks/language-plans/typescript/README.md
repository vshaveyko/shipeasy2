# `shipeasy` — TypeScript / JavaScript SDK

One npm package that covers **every** JS/TS runtime and framework shipeasy supports:

- Node.js (≥20), Bun, Deno, Cloudflare Workers, Vercel Edge
- Browsers (vanilla + any bundler)
- React, Vue 3, Svelte / SvelteKit, Angular 17+, Solid, Qwik, FBT
- Next.js (App Router + Pages), Nuxt 3, Remix, Astro
- React Native (iOS + Android via Hermes)

No separate `@shipeasy/react`, `@shipeasy/vue`, `@shipeasy/react-native`, etc. Framework ergonomics are sub-entry-points of the single `shipeasy` package. Bundlers tree-shake everything unused.

---

## Installation

```bash
npm install shipeasy
# or
pnpm add shipeasy
# or
bun add shipeasy
```

Optional peer dep: `zod` (used only by the `getConfig(name, zodSchema)` convenience overload). If you don't import the Zod overload, Zod never enters your bundle.

---

## Quick start

### Node.js server (long-running)

```ts
import { Shipeasy } from "shipeasy/server";

const client = new Shipeasy({
  apiKey: process.env.SHIPEASY_SERVER_KEY!,
  baseUrl: process.env.SHIPEASY_BASE_URL, // defaults to https://api.shipeasy.ai
});

await client.init(); // fetches flags + experiments + i18n manifest, starts background poll

const enabled = client.getFlag("new_checkout", { user_id: req.user.id });

const { params } = client.getExperiment("checkout_button_color", { color: "gray" }, (raw) => ({
  color: typeof (raw as any).color === "string" ? (raw as any).color : "gray",
}));

client.track(req.user.id, "purchase_completed", { value: order.total });

// i18n (server-side rendering)
const bundle = await client.loadLabels("en:prod");
const greeting = bundle.t("user.greeting", { name: "Alice" });

process.on("SIGTERM", () => client.destroy());
```

### Serverless / Edge

```ts
import { Shipeasy } from "shipeasy/server";
const client = new Shipeasy({ apiKey: process.env.SHIPEASY_SERVER_KEY! });
await client.initOnce(); // no timers; rules valid for the lifetime of the invocation
```

### Browser

```ts
import { Shipeasy } from "shipeasy/client";

const client = new Shipeasy({
  sdkKey: import.meta.env.VITE_SHIPEASY_CLIENT_KEY,
});

await client.identify({ user_id: session.user.id, plan: session.user.plan });

if (client.getFlag("new_checkout")) {
  /* … */
}
client.track("viewed_checkout", { variant: "new" });
```

---

## Sub-entry-point map

Every sub-entry-point is tree-shakeable and framework-idiomatic. They all delegate networking/evaluation to `shipeasy/client` or `shipeasy/server` — nothing re-implements transport.

| Sub-entry-point         | Purpose                                                                                                               |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `shipeasy/server`       | Long-running server (`init`/`destroy`) + serverless (`initOnce`). Flags, experiments, i18n SSR.                       |
| `shipeasy/client`       | Browser core. `identify`, `track`, `flush`, `t`, SSR bootstrap, `onUpdate`.                                           |
| `shipeasy/edge`         | Cloudflare Workers / Vercel Edge convenience — same as `/server` but wraps `initOnce` with KV-friendly caching hints. |
| `shipeasy/react`        | `ShipeasyProvider`, `useFlag`, `useExperiment`, `useConfig`, `ShipeasyString`, `useT`.                                |
| `shipeasy/next`         | App Router: `ShipeasyInlineData` (RSC), server `t()`, `ShipeasyScriptTag`. Pages Router adapter.                      |
| `shipeasy/remix`        | Loader helpers + `<ShipeasyBootstrap>` for SSR hydration.                                                             |
| `shipeasy/vue`          | `createShipeasy` plugin, `useFlag`, `useExperiment`, `useT` composables.                                              |
| `shipeasy/nuxt`         | Nitro plugin + `<ShipeasyInlineData>` + auto-imports.                                                                 |
| `shipeasy/svelte`       | `createShipeasyStore`, `flagStore`, `experimentStore`, `tStore`.                                                      |
| `shipeasy/angular`      | `provideShipeasy`, `ShipeasyService` (`BehaviorSubject`-backed), pipes.                                               |
| `shipeasy/solid`        | `createShipeasy`, `createFlag`, `createExperiment`, `createT` signals.                                                |
| `shipeasy/qwik`         | `useShipeasy$`, `routeLoader$` helpers, resumability-safe.                                                            |
| `shipeasy/astro`        | Astro integration + middleware for inline data injection.                                                             |
| `shipeasy/fbt`          | Glue between Facebook's FBT runtime and shipeasy's label store.                                                       |
| `shipeasy/react-native` | Full implementation — AsyncStorage, AppState, background-fetch flush.                                                 |

All of them are exported from the same package; `package.json#exports` picks the right bundle per target.

---

## What's in the box (per sub-entry-point)

### `shipeasy/server`

- `new Shipeasy({ apiKey, baseUrl?, pollIntervalMs?, timeoutMs?, fetch? })`
- `init()` / `initOnce()` / `destroy()`
- `getFlag(name, user)` / `getConfig(name, decode)` / `getExperiment(name, defaults, decode)`
- `track(userId, eventName, props?)` (fire-and-forget `/collect`)
- `loadLabels(profile, chunk?)` → `{ t, raw, profile, etag }` (i18n hot-path, cached via ETag)

### `shipeasy/client`

- `new Shipeasy({ sdkKey, baseUrl?, fetch? })`
- `identify(user)` / `track(eventName, props?)` / `flush()`
- `getFlag`, `getConfig`, `getExperiment` (synchronous, read the in-memory cache populated by `identify`)
- `t(key, variables?)` + `onUpdate(cb)` + `setProfile(profile)` (for editor live-preview & runtime locale switching)
- `initFromBootstrap(payload)` for SSR hydration
- Buffering: `beforeunload` + `visibilitychange → hidden` flush hooks. Beacon uses `text/plain` to skip the CORS preflight on mobile Safari.
- Exposure dedup: `Set<string>` persisted to `sessionStorage`.

### `shipeasy/react`

- `<ShipeasyProvider config={...} bootstrap={...}>` (also absorbs i18n bootstrap)
- `useFlag(name): boolean`
- `useExperiment(name, defaults, decode)` → `{ inExperiment, group, params }`
- `useConfig(name, decode)` → `T | null`
- `useT()` → `(key, vars?) => string`
- `<ShipeasyString labelKey="nav.home" />` (declarative, carries `data-label` for the editor)
- `withShipeasy` HOC for class components

### `shipeasy/next`

- `<ShipeasyInlineData key="…" profile="…" chunk="…" />` — server component, emits the inline JSON script for zero-hydration-mismatch SSR.
- `<ShipeasyScriptTag />` — wraps `next/script` with the loader.
- `t` exported from `shipeasy/next/server` — RSC-safe, uses `fetch` with `revalidate`.
- `app/providers.tsx` example uses `shipeasy/react` under the hood.

### `shipeasy/react-native`

- `new Shipeasy({ sdkKey, baseUrl?, storage? })`, default storage is `@react-native-async-storage/async-storage`.
- Replaces browser APIs:
  - `localStorage` → AsyncStorage
  - `sessionStorage` (exposure dedup) → in-memory `Set`
  - `navigator.sendBeacon` → `fetch` + optional `expo-background-fetch` / `react-native-background-fetch` hook
  - `visibilitychange` → `AppState.addEventListener('change', …)`
- `useFlag`, `useExperiment`, `useT` hooks re-render on `onUpdate` events.

---

## Source layout

```
packages/language_sdks/typescript/
  README.md                       ← this file
  package.json
  tsconfig.json
  tsup.config.ts                  ← dual ESM + CJS, one entry per sub-entry-point
  src/
    core/
      hash.ts                     ← murmurhash3_x86_32 (UTF-8), 5-vector test harness
      eval/
        gate.ts
        experiment.ts
      transport/
        http.ts                   ← fetch + ETag + X-Poll-Interval + retry
        beacon.ts                 ← browser sendBeacon, fallback to fetch keepalive
      buffer.ts                   ← event buffer with flush hooks
      i18n/
        bundle.ts                 ← LabelBundle: interpolation, fallback, onUpdate
        loader.ts                 ← manifest fetch + chunk fetch + R2 CDN hit
    server/index.ts
    client/index.ts
    edge/index.ts
    react/{index.ts,provider.tsx,hooks.ts,string.tsx}
    next/{server.ts,client.ts,inline-data.tsx,script-tag.tsx}
    remix/{index.ts,server.ts}
    vue/{index.ts,plugin.ts,composables.ts}
    nuxt/{module.ts,plugin.server.ts,plugin.client.ts}
    svelte/{index.ts,store.ts}
    angular/{index.ts,service.ts,provide.ts,pipes.ts}
    solid/{index.ts,signals.ts}
    qwik/{index.ts,loader.ts}
    astro/{index.ts,integration.ts,middleware.ts}
    fbt/{index.ts,runtime.ts}
    react-native/{index.ts,storage.ts,app-state.ts,background-flush.ts,hooks.ts}
  test/
    vectors/murmur3.test.ts
    eval/*.test.ts
    i18n/*.test.ts
    ssr/hydration.test.tsx
```

Build with `tsup` — one config, one `pnpm build`, dual-format output, per-sub-entry-point chunks.

---

## Implementation status

- Existing [packages/sdk](../../sdk/) contains the v1 experimentation SDK (server + client only). This package is the **v2 consolidation** target — it absorbs `packages/sdk`, adds i18n, adds every framework sub-entry-point, and the old `@shipeasy/sdk` package gets renamed / deprecated.
- React Native, Vue, Svelte, Angular, Solid, Qwik, Astro, FBT sub-entry-points: **new**.
- Hash + eval + transport: lifted from [packages/sdk/src/](../../sdk/src/) with zero behaviour change — all 5 MurmurHash3 vectors continue to pass.

---

## Non-negotiables

- Every sub-entry-point is tree-shakeable (`sideEffects: false` except for `shipeasy/astro` integration).
- Every browser-side sub-entry-point supports SSR bootstrap (`initFromBootstrap`) to avoid hydration mismatches.
- React Native must never reference `window`, `document`, or `localStorage`.
- Mobile Safari beacon path uses `text/plain` blobs (no CORS preflight).
- Every new framework sub-entry-point ships with a smoke test in [apps/ui/e2e/](../../../apps/ui/e2e/) that loads a sample page and asserts `t()` + `getFlag()` both work post-hydration. Required per [CLAUDE.md](../../../CLAUDE.md).
