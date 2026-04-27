# Shipeasy language SDKs — consolidation plan

One SDK per language. Every SDK covers **both** subsystems of shipeasy.ai:

1. **Experimentation** — feature flags, remote configs, A/B experiments, events (from [experiment-platform/12-sdk-reference.md](../../experiment-platform/12-sdk-reference.md)).
2. **String manager / i18n** — label fetch, interpolation, profile switching, loader-request reporting (from [string-manager-platform/frameworks/](../../string-manager-platform/frameworks/)).

Framework-specific UX (React hooks, Vue composables, Angular services, Next.js RSC helpers, Django middleware, Rails helpers, etc.) ships as **sub-entry-points** of the per-language package — **never** as separate packages.

The package is always called `shipeasy` (adjusted to each registry's conventions).

---

## Folder layout

```
packages/language_sdks/
  README.md            ← this file (cross-language plan)
  typescript/          ← npm `shipeasy` — Node, Bun, Deno, browser, React, Next, Vue, Svelte, Angular,
                          Nuxt, Remix, Astro, Qwik, Solid, React Native, FBT
  python/              ← PyPI `shipeasy` — Django, Flask, FastAPI, plain Python
  ruby/                ← RubyGems `shipeasy` — Rails, Sinatra, Rack
  go/                  ← `github.com/shipeasy/shipeasy-go`
  java/                ← Maven `ai.shipeasy:shipeasy` — Spring Boot, Jakarta, plain Java
  php/                 ← Packagist `shipeasy/shipeasy` — Laravel, WordPress, RoadRunner/Swoole
  swift/               ← SwiftPM `Shipeasy` — iOS, macOS, SwiftUI, UIKit
  kotlin/              ← Maven `ai.shipeasy:shipeasy` — Android + JVM Kotlin server
```

Each language directory has its own `README.md` with the full plan, installation steps, quick-start, and sub-entry-point map. Source layout (e.g., `src/`, `Sources/`, `lib/`) is defined in each language's README and follows that ecosystem's conventions.

---

## Universal contract (every SDK, every language)

Every shipeasy SDK implements the same public surface. Names adjust to each language's idioms (`snake_case` in Python/Ruby, `camelCase` in TS/Swift/Kotlin/Go, etc.), but the behaviour is identical.

### Experimentation

```
init()                                  start + background poll of /sdk/flags, /sdk/experiments
initOnce()                              fetch once, no timers (serverless / edge / PHP-FPM)
destroy()                               stop timers (long-running servers, call on shutdown)

getFlag(name, user)                  → bool
getConfig(name, decoder)             → T        (decoder validates runtime shape)
getExperiment(name, defaults, dec)   → { inExperiment, group, params }

track(userId, eventName, props?)     → void     (server — fire-and-forget to /collect)
identify(user)                       → Promise  (client — POST /sdk/evaluate, cache result)
track(eventName, props?)             → void     (client — buffered, auto-flushed)
flush()                              → Promise  (client — force buffer send)
```

### String manager (i18n)

```
loadLabels(profile, chunk?)          → Promise<LabelBundle>     (server — SSR hydration)
t(key, variables?)                   → string                   (sync after load / hydration)
onUpdate(cb)                         → unsubscribe              (client — editor live-preview)
setProfile(profile)                  → Promise<void>            (client — runtime locale switch)
```

### Shared primitives

- **Hashing**: MurmurHash3_x86_32, seed 0, UTF-8 bytes. All 5 cross-language test vectors in [04-evaluation.md](../../experiment-platform/04-evaluation.md) must pass — cross-language CI enforces it.
- **Transport**: HTTP/1.1 or better, `If-None-Match` ETags, server-driven `X-Poll-Interval` header, 304 respected.
- **Auth**: server key (`sdk_server_*`) for server SDKs; client key (`sdk_client_*`, scope `experiments`/`i18n`/both) for browser/mobile SDKs. Validated by [packages/core/src/auth/sdk-key.ts](../core/src/auth/sdk-key.ts).
- **Errors never leak**: missing flag → `false`; missing experiment → `{ inExperiment: false, group: "control", params: defaults }`; decoder failure → fall back to defaults, log warning. `init()` / `initOnce()` may throw so callers can decide to degrade or crash.
- **Never touches D1**. All reads go through the worker's KV-backed hot-path endpoints (`/sdk/flags`, `/sdk/experiments`, `/sdk/i18n/manifest/:projectId`, `/sdk/evaluate`, `/collect`, `/sdk/i18n/collect`).

---

## Framework coverage by language

Framework docs that live under [string-manager-platform/frameworks/](../../string-manager-platform/frameworks/) are absorbed into the matching language SDK as a sub-entry-point. Nothing becomes its own npm/pip/gem/crate.

| Framework doc                         | Absorbed into | Sub-entry-point                       |
| ------------------------------------- | ------------- | ------------------------------------- |
| `react.md`                            | `typescript/` | `shipeasy/react`                      |
| `nextjs.md`                           | `typescript/` | `shipeasy/next`                       |
| `remix.md`                            | `typescript/` | `shipeasy/remix`                      |
| `vue.md`                              | `typescript/` | `shipeasy/vue`                        |
| `nuxt.md`                             | `typescript/` | `shipeasy/nuxt`                       |
| `svelte.md`                           | `typescript/` | `shipeasy/svelte`                     |
| `angular.md`                          | `typescript/` | `shipeasy/angular`                    |
| `astro.md`                            | `typescript/` | `shipeasy/astro`                      |
| `qwik.md`                             | `typescript/` | `shipeasy/qwik`                       |
| `solid.md`                            | `typescript/` | `shipeasy/solid`                      |
| `fbt.md`                              | `typescript/` | `shipeasy/fbt`                        |
| _React Native_ (experiment SDK doc)   | `typescript/` | `shipeasy/react-native`               |
| `django.md`                           | `python/`     | `shipeasy.django`                     |
| _Flask, FastAPI_ (experiment SDK doc) | `python/`     | `shipeasy.flask`, `shipeasy.fastapi`  |
| `rails.md`                            | `ruby/`       | `Shipeasy::Rails`                     |
| `laravel.md`                          | `php/`        | `Shipeasy\Laravel`                    |
| `wordpress.md`                        | `php/`        | `Shipeasy\WordPress`                  |
| _Spring_                              | `java/`       | `ai.shipeasy.spring`                  |
| _Gin / net/http_                      | `go/`         | `github.com/shipeasy/shipeasy-go/gin` |
| _SwiftUI / UIKit_                     | `swift/`      | `ShipeasySwiftUI`, `ShipeasyUIKit`    |
| _Compose / ViewModel_                 | `kotlin/`     | `ai.shipeasy.compose`                 |

---

## Package naming per registry

| Language   | Registry            | Name                              | Import                                                          |
| ---------- | ------------------- | --------------------------------- | --------------------------------------------------------------- |
| TypeScript | npm                 | `shipeasy`                        | `import { … } from "shipeasy"` (and `shipeasy/<framework>`)     |
| Python     | PyPI                | `shipeasy`                        | `from shipeasy import Client` / `from shipeasy.django import …` |
| Ruby       | RubyGems            | `shipeasy`                        | `require "shipeasy"`                                            |
| Go         | Go modules          | `github.com/shipeasy/shipeasy-go` | `import shipeasy "github.com/shipeasy/shipeasy-go"`             |
| Java       | Maven Central       | `ai.shipeasy:shipeasy`            | `import ai.shipeasy.Client;`                                    |
| PHP        | Packagist           | `shipeasy/shipeasy`               | `use Shipeasy\Client;`                                          |
| Swift      | Swift Package Index | `Shipeasy` (SwiftPM product)      | `import Shipeasy`                                               |
| Kotlin     | Maven Central       | `ai.shipeasy:shipeasy`            | `import ai.shipeasy.Client`                                     |

Repo URLs are conventional; the actual publish orgs will be confirmed pre-launch.

---

## Versioning

- Major bump → breaking API change in any sub-entry-point.
- Minor bump → additive change (new sub-entry-point, new optional parameter, new method).
- Patch bump → bug fix, no API change.

Worker API is versioned implicitly via the KV blob `version` field — SDKs don't parse it. MCP server declares the compatible range per language in [10-mcp-server.md](../../experiment-platform/10-mcp-server.md).

---

## Release checklist (per language, per release)

1. All 5 MurmurHash3 vectors pass.
2. `evalGate` + `evalExperiment` unit tests cover: disabled gate, rule mismatch, rollout boundary, targeting miss, holdout hit, allocation boundary, group assignment.
3. Integration test against a live Worker (or fixture) for `/sdk/flags` → `getFlag`, `/sdk/i18n/manifest/:projectId` → `t()`.
4. Cross-language CI compares hash outputs against the shared vector set.
5. SSR-capable languages: hydration test (server render matches client first render).
6. SDK key rotation test: a revoked key returns 401 and the SDK degrades gracefully (returns defaults, does not crash).
7. Playwright/Detox/XCUITest e2e spec for any user-facing surface — same non-negotiable rule as [CLAUDE.md](../../CLAUDE.md).

---

## Why one SDK per language, not one per framework

1. **One hash impl, one event buffer, one ETag cache per app.** Splitting by framework forces every app to bundle duplicated evaluation/transport code.
2. **Cross-subsystem synergy.** `identify()` for experimentation and `t()` for i18n share the same user/device identity, the same SDK key scope logic, and the same background flush hook — collapsing them removes ~60% of duplicated glue.
3. **One upgrade path.** A customer on Next.js + React Native + Rails bumps three packages, not thirty.
4. **Tree-shaking, not splitting.** Modern bundlers drop unused sub-entry-points. `import { t } from "shipeasy/react"` in a Next.js app ships only the React pieces; the Vue tree never reaches the client.

Sub-entry-points keep framework-specific code ergonomic without fragmenting the surface area.

---

## Rollout order

Not all SDKs ship at once. Priority follows customer demand + internal dogfooding:

1. **typescript** — required for `apps/ui`, every demo app, and the editor loader. Ship first, v1.
2. **python** — most common experimentation server runtime. Ship second.
3. **swift** + **kotlin** — mobile launch requirement. Ship in parallel once v1 TS is stable.
4. **go** + **java** — enterprise server runtimes. Ship after mobile.
5. **ruby** + **php** — long-tail server runtimes. Ship last.

Each language README tracks its own phase status.
