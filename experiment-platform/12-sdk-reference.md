# SDK Reference — All Languages

Cross-language SDK contracts, installation, initialization patterns, and required implementations.

## SDK Taxonomy

| Package | Runtime | Auth | Receives rules? | Evaluates locally? |
|---|---|---|---|---|
| `sdk-server` | Node.js, Go, Python, Ruby, Java, PHP long-running | server key | Yes (polls `/sdk/flags` + `/sdk/experiments`) | Yes |
| `sdk-client` | Browser (vanilla JS / React / Next.js) | client key | No (POSTs to `/sdk/evaluate`) | No |
| `sdk-vue` | Vue 3 (thin wrapper over `sdk-client`) | client key | No | No |
| `sdk-svelte` | Svelte / SvelteKit (thin wrapper over `sdk-client`) | client key | No | No |
| `sdk-angular` | Angular 17+ (thin wrapper over `sdk-client`) | client key | No | No |
| `sdk-react-native` | React Native (iOS + Android) | client key | No (POSTs to `/sdk/evaluate`) | No |
| `sdk-ios` | Swift / SwiftUI / UIKit | client key | No (POSTs to `/sdk/evaluate`) | No |
| `sdk-android` | Kotlin / Java (Android) | client key | No (POSTs to `/sdk/evaluate`) | No |
| `sdk-edge` | CF Workers, Vercel Edge, Deno Deploy | server key | Yes (via `initOnce()`) | Yes |

**Framework wrappers** (`sdk-vue`, `sdk-svelte`, `sdk-angular`) are thin layers over
`sdk-client` — they do not re-implement networking or evaluation. They only add
reactive primitives (composables, stores, services) so flags integrate with each
framework's reactivity model. No separate backend communication.

**Mobile SDKs** (`sdk-react-native`, `sdk-ios`, `sdk-android`) are full implementations
that mirror `sdk-client` but replace browser APIs: `localStorage` → platform storage,
`navigator.sendBeacon` → background `fetch`/`URLSession`/`OkHttp`, `visibilitychange`
→ `AppState`/`NotificationCenter`/`ProcessLifecycleOwner`.

---

## Universal SDK Contract

Every SDK in every language must implement this interface:

```
init()              → fetch rules + start background poll (long-running servers)
initOnce()          → fetch rules once, no poll (serverless / edge)
destroy()           → stop background timers (long-running servers, call on shutdown)

getFlag(name, user) → bool
getConfig(name, decode) → T   (decode validates runtime type)
getExperiment(name, defaultParams, decode) → { inExperiment, group, params }

track(userId, eventName, value?)   → void  (server SDK)
identify(user)                     → Promise<void>  (client SDK — calls /sdk/evaluate)
track(eventName, props?)           → void  (client SDK — buffered, flushed automatically)
flush()                            → Promise<void>  (client SDK — force-flush buffer)
```

### Hash function requirement

All SDKs MUST use **MurmurHash3_x86_32 with seed 0** and **UTF-8 encoding**. Test vectors and cross-language CI requirements are in `04-evaluation.md`.

---

## TypeScript / JavaScript

### Package: `@flaglab/sdk`

Covers both Node.js (server SDK) and browser (client SDK) in one package.

```bash
npm install @flaglab/sdk
```

#### Server SDK (Node.js / Bun / Deno)

```typescript
import { FlagsClient } from '@flaglab/sdk/server'

// Long-running server (Express, Fastify, Hapi, NestJS, etc.)
const client = new FlagsClient({
  apiKey:  process.env.FLAGLAB_SERVER_KEY!,
  baseUrl: process.env.FLAGLAB_BASE_URL ?? 'https://flags.yourdomain.com',
})
await client.init()   // fetch rules + start background poll (adjusts from X-Poll-Interval header)

// Per-request usage:
const user = { user_id: req.user.id, plan: req.user.plan }

const enabled = client.getFlag('new_checkout', user)

const timeout = client.getConfig<number>('checkout_timeout_ms', (v) => {
  const n = Number(v)
  if (isNaN(n)) throw new Error('checkout_timeout_ms must be a number')
  return n
})

const { inExperiment, group, params } = client.getExperiment(
  'checkout_button_color',
  { color: 'gray' },          // defaultParams — returned when user is not in experiment
  (raw) => {                  // decoder — validates server shape at runtime
    const r = raw as Record<string, unknown>
    return { color: typeof r.color === 'string' ? r.color : 'gray' }
  }
)

// Track a success event (fire-and-forget, does not await)
client.track(req.user.id, 'purchase_completed', { value: order.total })

// Graceful shutdown:
process.on('SIGTERM', () => { client.destroy(); process.exit(0) })
```

#### Serverless / Edge (Lambda, Vercel, CF Workers, PHP-FPM)

```typescript
// Use initOnce() — no background timers, rules valid for lifetime of the invocation
const client = new FlagsClient({ apiKey: process.env.FLAGLAB_SERVER_KEY! })
await client.initOnce()
```

#### Next.js — Server Components + Client SDK

```typescript
// lib/flaglab.server.ts — server-side singleton
import { FlagsClient } from '@flaglab/sdk/server'

let _client: FlagsClient | null = null

export function getServerClient(): FlagsClient {
  if (!_client) {
    _client = new FlagsClient({ apiKey: process.env.FLAGLAB_SERVER_KEY! })
    // Don't await here — lazy init on first use via initOnce()
  }
  return _client
}

// In a Server Component or Route Handler:
const client = getServerClient()
await client.initOnce()
const enabled = client.getFlag('new_checkout', { user_id: session.user.id })
```

```typescript
// lib/flaglab.client.ts — browser singleton (NOT in a useEffect — React StrictMode safe)
import { FlagsClientBrowser } from '@flaglab/sdk/client'

let _client: FlagsClientBrowser | null = null

export function getBrowserClient(): FlagsClientBrowser {
  if (!_client) _client = new FlagsClientBrowser({
    sdkKey:  process.env.NEXT_PUBLIC_FLAGLAB_CLIENT_KEY!,
    baseUrl: process.env.NEXT_PUBLIC_FLAGLAB_BASE_URL ?? 'https://flags.yourdomain.com',
  })
  return _client
}

// In a component (after sign-in or on page load):
const client = getBrowserClient()
await client.identify({ user_id: session.user.id, plan: session.user.plan })

// Gate check (returns false if identify() hasn't been called yet):
const enabled = client.getFlag('new_checkout')

// Experiment:
const { inExperiment, params } = client.getExperiment(
  'checkout_button_color',
  { color: 'gray' },
  (raw) => ({ color: typeof (raw as any).color === 'string' ? (raw as any).color : 'gray' })
)

// Track:
client.track('purchase_completed', { value: order.total })

// SSR bootstrap (zero network round-trip on hydration):
// In layout.tsx server-side:
//   const flags = await serverClient.evaluate(user)
//   <script>window.__FLAGLAB_FLAGS__ = ${JSON.stringify(flags)}</script>
// In client layout component:
//   getBrowserClient().initFromBootstrap(window.__FLAGLAB_FLAGS__)
```

#### React hook

```typescript
// hooks/useExperiment.ts
import { useEffect, useState } from 'react'
import { getBrowserClient } from '@/lib/flaglab.client'

export function useExperiment<P extends Record<string, unknown>>(
  name: string,
  defaultParams: P,
  decode: (raw: unknown) => P,
) {
  const [result, setResult] = useState(() =>
    getBrowserClient().getExperiment(name, defaultParams, decode)
  )

  useEffect(() => {
    // Re-evaluate when client updates (after identify())
    setResult(getBrowserClient().getExperiment(name, defaultParams, decode))
  }, [name])

  return result
}

// Usage:
const { inExperiment, params } = useExperiment(
  'checkout_button_color',
  { color: 'gray' },
  (raw) => ({ color: typeof (raw as any).color === 'string' ? (raw as any).color : 'gray' })
)
```

---

## Vue 3

### Package: `@flaglab/sdk-vue`

Thin wrapper over `@flaglab/sdk/client`. Adds composables that are reactive to `identify()` completion. Does not re-implement networking.

```bash
npm install @flaglab/sdk @flaglab/sdk-vue
```

#### Plugin setup

```typescript
// plugins/flaglab.ts
import { createFlaglab } from '@flaglab/sdk-vue'

export const flaglab = createFlaglab({
  sdkKey:  import.meta.env.VITE_FLAGLAB_CLIENT_KEY,
  baseUrl: import.meta.env.VITE_FLAGLAB_BASE_URL ?? 'https://flags.yourdomain.com',
})

// main.ts
import { createApp } from 'vue'
import { flaglab } from './plugins/flaglab'
import App from './App.vue'

const app = createApp(App)
app.use(flaglab)  // installs provide() for useFlag / useExperiment / useFlaglab
app.mount('#app')
```

#### Composables

```typescript
// Internally, createFlaglab wraps FlagsClientBrowser in a Vue plugin that:
// 1. Creates the client singleton
// 2. Exposes a shallowRef<EvalResult | null> that updates after each identify()
// 3. Provides composables that derive from that ref

// composables/useFlag.ts (generated by the plugin)
import { computed }   from 'vue'
import { useFlaglab }  from '@flaglab/sdk-vue'

export function useFlag(name: string) {
  const { client } = useFlaglab()
  // computed re-evaluates whenever the client's result ref updates
  return computed(() => client.getFlag(name))
}

export function useExperiment<P extends Record<string, unknown>>(
  name: string,
  defaultParams: P,
  decode: (raw: unknown) => P,
) {
  const { client } = useFlaglab()
  return computed(() => client.getExperiment(name, defaultParams, decode))
}

export function useConfig<T>(name: string, decode: (raw: unknown) => T) {
  const { client } = useFlaglab()
  return computed(() => {
    try { return client.getConfig(name, decode) } catch { return null }
  })
}
```

#### Usage in a component

```vue
<!-- CheckoutButton.vue -->
<script setup lang="ts">
import { useFlag, useExperiment } from '@flaglab/sdk-vue'

const newCheckout = useFlag('new_checkout')

const { inExperiment, params } = useExperiment(
  'checkout_button_color',
  { color: 'gray' },
  (raw: any) => ({ color: typeof raw?.color === 'string' ? raw.color : 'gray' }),
).value  // unwrap the computed ref inline, or use .value in the template
</script>

<template>
  <button v-if="newCheckout" :style="{ background: params.color }">
    Buy now
  </button>
  <button v-else>Buy now (old)</button>
</template>
```

#### Calling identify (e.g. after login)

```typescript
// In a composable or router guard:
import { useFlaglab } from '@flaglab/sdk-vue'

const { client } = useFlaglab()
await client.identify({ user_id: authStore.userId, plan: authStore.plan })
// All useFlag / useExperiment computed refs automatically re-evaluate
```

#### SvelteKit SSR (Nuxt equivalent)

```typescript
// server/plugins/flaglab.ts (Nuxt 3)
import { createFlaglabServer } from '@flaglab/sdk/server'

export default defineNitroPlugin(async (nitro) => {
  const serverClient = createFlaglabServer({ apiKey: process.env.FLAGLAB_SERVER_KEY! })
  await serverClient.initOnce()
  nitro.hooks.hook('request', (event) => {
    event.context.flags = serverClient
  })
})

// In a page component (server-side evaluate for SSR bootstrap):
const { data: flagsBootstrap } = await useFetch('/api/flags/bootstrap')
// Inject into HTML for client hydration — same pattern as Next.js
```

---

## Svelte / SvelteKit

### Package: `@flaglab/sdk-svelte`

Wraps `@flaglab/sdk/client` in a Svelte readable store. Reactive updates flow automatically via Svelte's store contract.

```bash
npm install @flaglab/sdk @flaglab/sdk-svelte
```

#### Store setup

```typescript
// lib/flaglab.ts
import { createFlaglabStore } from '@flaglab/sdk-svelte'

// createFlaglabStore returns { identify, flagStore, experimentStore, configStore, track }
// flagStore is a Svelte readable<EvalResult | null> that updates after each identify()
export const flaglab = createFlaglabStore({
  sdkKey:  import.meta.env.PUBLIC_FLAGLAB_CLIENT_KEY,
  baseUrl: import.meta.env.PUBLIC_FLAGLAB_BASE_URL ?? 'https://flags.yourdomain.com',
})
```

#### Derived stores

```typescript
// lib/flaglab.ts (continued)
import { derived } from 'svelte/store'

// Derive per-flag stores from the central result store
export function flagStore(name: string) {
  return derived(flaglab.resultStore, ($result) => $result?.flags[name] ?? false)
}

export function experimentStore<P extends Record<string, unknown>>(
  name: string,
  defaultParams: P,
  decode: (raw: unknown) => P,
) {
  return derived(flaglab.resultStore, ($result) => {
    if (!$result) return { inExperiment: false as const, group: 'control', params: defaultParams }
    const exp = $result.experiments[name]
    if (!exp) return { inExperiment: false as const, group: 'control', params: defaultParams }
    try {
      return { inExperiment: true as const, group: exp.group, params: decode(exp.params) }
    } catch {
      return { inExperiment: false as const, group: 'control', params: defaultParams }
    }
  })
}
```

#### Usage in a Svelte component

```svelte
<!-- CheckoutButton.svelte -->
<script lang="ts">
  import { flaglab, flagStore, experimentStore } from '$lib/flaglab'

  const newCheckout = flagStore('new_checkout')

  const checkoutExp = experimentStore(
    'checkout_button_color',
    { color: 'gray' },
    (raw: any) => ({ color: typeof raw?.color === 'string' ? raw.color : 'gray' }),
  )
</script>

{#if $newCheckout}
  <button style="background: {$checkoutExp.params.color}">Buy now</button>
{:else}
  <button>Buy now (old)</button>
{/if}
```

#### Identify on login

```typescript
// +page.ts or a layout load function
import { flaglab } from '$lib/flaglab'
import { browser } from '$app/environment'

export async function load({ data }) {
  if (browser && data.user) {
    await flaglab.identify({ user_id: data.user.id, plan: data.user.plan })
  }
}
```

#### SvelteKit SSR bootstrap

```typescript
// hooks.server.ts — evaluate server-side and pass to client
import { createFlaglabServer } from '@flaglab/sdk/server'

const serverClient = createFlaglabServer({ apiKey: process.env.FLAGLAB_SERVER_KEY! })
await serverClient.initOnce()

export async function handle({ event, resolve }) {
  if (event.locals.user) {
    event.locals.flagsBootstrap = await serverClient.evaluate(event.locals.user)
  }
  return resolve(event)
}

// +layout.server.ts
export function load({ locals }) {
  return { flagsBootstrap: locals.flagsBootstrap ?? null }
}

// +layout.svelte
<script>
  import { flaglab } from '$lib/flaglab'
  export let data
  if (data.flagsBootstrap) flaglab.initFromBootstrap(data.flagsBootstrap)
</script>
```

---

## Angular

### Package: `@flaglab/sdk-angular`

Wraps `@flaglab/sdk/client` in an Angular `Injectable` service backed by `BehaviorSubject`. Exposes `Observable`-based APIs compatible with `AsyncPipe` and `RxJS` pipelines.

```bash
npm install @flaglab/sdk @flaglab/sdk-angular
```

#### Module / standalone setup

```typescript
// app.config.ts (Angular 17+ standalone)
import { ApplicationConfig }  from '@angular/core'
import { provideFlaglab }      from '@flaglab/sdk-angular'

export const appConfig: ApplicationConfig = {
  providers: [
    provideFlaglab({
      sdkKey:  import.meta.env['NG_APP_FLAGLAB_CLIENT_KEY'],
      baseUrl: import.meta.env['NG_APP_FLAGLAB_BASE_URL'] ?? 'https://flags.yourdomain.com',
    }),
  ],
}
```

#### FlaglabService

```typescript
// Provided by @flaglab/sdk-angular — shown here for reference
@Injectable({ providedIn: 'root' })
export class FlaglabService implements OnDestroy {
  private client: FlagsClientBrowser
  private result$ = new BehaviorSubject<EvalResult | null>(null)

  constructor(@Inject(FLAGLAB_CONFIG) config: FlaglabConfig) {
    this.client = getBrowserClient(config)  // singleton
  }

  async identify(user: User): Promise<void> {
    await this.client.identify(user)
    // Emit new result — all subscribed components update via AsyncPipe
    this.result$.next((this.client as any).result)
  }

  getFlag(name: string): Observable<boolean> {
    return this.result$.pipe(
      map(r => r?.flags[name] ?? false),
      distinctUntilChanged(),
    )
  }

  getExperiment<P extends Record<string, unknown>>(
    name: string,
    defaultParams: P,
    decode: (raw: unknown) => P,
  ): Observable<ExperimentResult<P>> {
    return this.result$.pipe(
      map(r => {
        const exp = r?.experiments[name]
        if (!exp) return { inExperiment: false as const, group: 'control', params: defaultParams }
        try   { return { inExperiment: true as const, group: exp.group, params: decode(exp.params) } }
        catch { return { inExperiment: false as const, group: 'control', params: defaultParams } }
      }),
      distinctUntilChanged((a, b) => a.group === b.group),
    )
  }

  track(eventName: string, props?: Record<string, unknown>): void {
    this.client.track(eventName, props)
  }

  ngOnDestroy() { this.client.flush() }
}
```

#### Usage in a component

```typescript
@Component({
  selector: 'app-checkout-button',
  standalone: true,
  imports: [AsyncPipe, NgIf, NgStyle],
  template: `
    <button *ngIf="newCheckout$ | async" [ngStyle]="{ background: (expParams$ | async)?.color }">
      Buy now
    </button>
    <button *ngIf="!(newCheckout$ | async)">Buy now (old)</button>
  `,
})
export class CheckoutButtonComponent {
  newCheckout$ = inject(FlaglabService).getFlag('new_checkout')

  expParams$ = inject(FlaglabService)
    .getExperiment(
      'checkout_button_color',
      { color: 'gray' },
      (raw: any) => ({ color: typeof raw?.color === 'string' ? raw.color : 'gray' }),
    )
    .pipe(map(r => r.params))
}
```

#### Calling identify (e.g. in an auth guard or APP_INITIALIZER)

```typescript
// Identify on app startup if user is already signed in
export function initFlaglab(auth: AuthService, flaglab: FlaglabService): () => Promise<void> {
  return async () => {
    const user = await auth.getCurrentUser()
    if (user) await flaglab.identify({ user_id: user.id, plan: user.plan })
  }
}

// app.config.ts
providers: [
  provideAppInitializer(() => {
    const auth    = inject(AuthService)
    const flaglab  = inject(FlaglabService)
    return initFlaglab(auth, flaglab)()
  }),
]
```

---

## React Native

### Package: `@flaglab/sdk-react-native`

Full implementation — not a wrapper over `sdk-client`. Replaces every browser API with React Native equivalents.

```bash
npm install @flaglab/sdk-react-native
```

| Browser API | React Native replacement |
|---|---|
| `localStorage` (anon ID) | `@react-native-async-storage/async-storage` |
| `sessionStorage` (exposure dedup) | In-memory `Set` (acceptable — session ends on app kill) |
| `navigator.sendBeacon` | `fetch` with `keepalive: false` + background task |
| `visibilitychange` event | `AppState.addEventListener('change', ...)` |
| `beforeunload` event | `AppState` → `background`/`inactive` transition |
| `window` check | Not needed — RN always has a JS runtime |

#### Initialization

```typescript
// lib/flaglab.ts
import { FlagsClientRN } from '@flaglab/sdk-react-native'

// Module-level singleton — safe across React re-renders and navigation
let _client: FlagsClientRN | null = null

export function getClient(): FlagsClientRN {
  if (!_client) _client = new FlagsClientRN({
    sdkKey:  process.env.EXPO_PUBLIC_FLAGLAB_CLIENT_KEY!,
    baseUrl: process.env.EXPO_PUBLIC_FLAGLAB_BASE_URL ?? 'https://flags.yourdomain.com',
  })
  return _client
}
```

#### AppState flush hook (replaces visibilitychange)

```typescript
// lib/flaglab.ts (continued)
import { AppState, AppStateStatus } from 'react-native'

// Call once at app root — flushes event buffer when app goes to background
export function registerFlaglabFlushHook(): () => void {
  const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
    if (state === 'background' || state === 'inactive') {
      getClient().flush()  // best-effort; RN gives ~5s before JS engine suspends
    }
  })
  return () => sub.remove()
}
```

#### Root component setup

```typescript
// App.tsx
import { useEffect } from 'react'
import { getClient, registerFlaglabFlushHook } from './lib/flaglab'

export default function App() {
  useEffect(() => {
    // Identify anonymous user immediately (anon_id from AsyncStorage)
    getClient().identify({})

    // Flush on background
    const unregister = registerFlaglabFlushHook()
    return unregister
  }, [])

  // After login:
  // getClient().identify({ user_id: user.id, plan: user.plan })

  return <RootNavigator />
}
```

#### React hooks

```typescript
// hooks/useFlag.ts
import { useEffect, useState } from 'react'
import { getClient } from '@/lib/flaglab'

export function useFlag(name: string): boolean {
  const [value, setValue] = useState(() => getClient().getFlag(name))

  useEffect(() => {
    // Re-evaluate after identify() resolves — client emits an event
    const unsub = getClient().onUpdate(() => setValue(getClient().getFlag(name)))
    return unsub
  }, [name])

  return value
}

export function useExperiment<P extends Record<string, unknown>>(
  name: string,
  defaultParams: P,
  decode: (raw: unknown) => P,
) {
  const [result, setResult] = useState(() =>
    getClient().getExperiment(name, defaultParams, decode)
  )

  useEffect(() => {
    const unsub = getClient().onUpdate(() =>
      setResult(getClient().getExperiment(name, defaultParams, decode))
    )
    return unsub
  }, [name])

  return result
}
```

#### Async storage for anonymous ID

```typescript
// Inside FlagsClientRN constructor (implementation detail):
import AsyncStorage from '@react-native-async-storage/async-storage'

async function getOrCreateAnonId(): Promise<string> {
  const stored = await AsyncStorage.getItem('@flaglab/anon_id')
  if (stored) return stored
  const id = crypto.randomUUID()  // available in RN 0.73+ / Hermes
  await AsyncStorage.setItem('@flaglab/anon_id', id)
  return id
}
```

#### Event flush — background fetch (iOS Background Fetch + Android WorkManager)

For high-reliability event delivery when the app is killed before `flush()` runs:

```typescript
// Register a background task (Expo TaskManager or react-native-background-fetch)
import * as TaskManager from 'expo-task-manager'
import * as BackgroundFetch from 'expo-background-fetch'

const TASK = 'flaglab-flush'

TaskManager.defineTask(TASK, async () => {
  await getClient().flush()
  return BackgroundFetch.BackgroundFetchResult.NewData
})

// Register once at startup:
await BackgroundFetch.registerTaskAsync(TASK, { minimumInterval: 60, stopOnTerminate: false })
```

---

## Swift / iOS

### Package: `FlaglabSDK` (Swift Package Manager)

```swift
// Package.swift dependency:
.package(url: "https://github.com/flaglab/sdk-ios", from: "1.0.0")
```

#### Key API differences from browser SDK

| Browser concept | iOS replacement |
|---|---|
| `localStorage` (anon ID) | `UserDefaults.standard` |
| `sessionStorage` (dedup) | In-memory `Set<String>` |
| `navigator.sendBeacon` | `URLSession.shared.dataTask` in `beginBackgroundTask` |
| `visibilitychange` | `UIApplication.didEnterBackgroundNotification` |
| `fetch` | `URLSession` with `URLRequest` |

#### Initialization

```swift
// AppDelegate.swift or App.swift (SwiftUI)
import FlaglabSDK

@main
struct MyApp: App {
    init() {
        FlaglabClient.configure(
            sdkKey: Bundle.main.object(forInfoDictionaryKey: "FLAGLAB_CLIENT_KEY") as! String,
            baseURL: URL(string: "https://flags.yourdomain.com")!
        )
        // Identify anonymous user immediately
        FlaglabClient.shared.identify(FlaglabUser())
    }

    var body: some Scene {
        WindowGroup { ContentView() }
    }
}
```

#### Background flush via NotificationCenter

```swift
// In FlaglabClient.init():
NotificationCenter.default.addObserver(
    self,
    selector: #selector(flushOnBackground),
    name: UIApplication.didEnterBackgroundNotification,
    object: nil
)

@objc private func flushOnBackground() {
    let taskID = UIApplication.shared.beginBackgroundTask(withName: "flaglab-flush") {
        // Expiry handler — called if time runs out
        UIApplication.shared.endBackgroundTask(self.bgTaskID)
    }
    self.bgTaskID = taskID
    flush {
        UIApplication.shared.endBackgroundTask(taskID)
    }
}
```

#### Per-screen usage (SwiftUI)

```swift
struct CheckoutView: View {
    @StateObject private var flags = FlaglabFlags()  // ObservableObject wrapper

    var body: some View {
        VStack {
            if flags.getFlag("new_checkout") {
                NewCheckoutView(color: flags.experiment("checkout_button_color", default: "gray"))
            } else {
                OldCheckoutView()
            }
        }
        .onAppear {
            FlaglabClient.shared.track("checkout_viewed")
        }
    }
}

// FlaglabFlags.swift — ObservableObject that re-publishes when identify() completes
class FlaglabFlags: ObservableObject {
    private var cancellable: AnyCancellable?

    init() {
        cancellable = FlaglabClient.shared.resultPublisher
            .receive(on: RunLoop.main)
            .sink { [weak self] _ in self?.objectWillChange.send() }
    }

    func getFlag(_ name: String) -> Bool {
        FlaglabClient.shared.getFlag(name)
    }

    func experiment<T: Decodable>(_ name: String, default defaultValue: T) -> T {
        FlaglabClient.shared.getExperiment(name, default: defaultValue)
    }
}
```

#### Murmur3 implementation note

Swift does not have a standard MurmurHash3 library. Implement from scratch and verify against all 5 test vectors. Encode strings as UTF-8 bytes via `String.utf8` before hashing — do not pass `String` directly (Swift strings are Unicode scalars, not UTF-8 natively).

```swift
// Verify in unit tests:
XCTAssertEqual(murmur3("Hello, 世界"), 0x3C4FCDA4)  // the critical multi-byte vector
```

---

## Kotlin / Android

### Package: `com.flaglab:sdk-android`

```gradle
// build.gradle (app)
implementation 'com.flaglab:sdk-android:1.0.0'
```

#### Key API differences from browser SDK

| Browser concept | Android replacement |
|---|---|
| `localStorage` (anon ID) | `SharedPreferences` |
| `sessionStorage` (dedup) | In-memory `HashSet<String>` |
| `navigator.sendBeacon` | `OkHttp` + `WorkManager` for reliable delivery |
| `visibilitychange` | `ProcessLifecycleOwner` (app foreground/background) |
| `fetch` | `OkHttp` or `Retrofit` |

#### Initialization

```kotlin
// MyApplication.kt
class MyApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        FlaglabClient.configure(
            context  = this,
            sdkKey   = BuildConfig.FLAGLAB_CLIENT_KEY,
            baseUrl  = "https://flags.yourdomain.com",
        )
        // Identify anonymous user immediately
        FlaglabClient.getInstance().identify(FlaglabUser())
    }
}
```

#### Background flush via ProcessLifecycleOwner

```kotlin
// In FlaglabClient.configure():
ProcessLifecycleOwner.get().lifecycle.addObserver(object : DefaultLifecycleObserver {
    override fun onStop(owner: LifecycleOwner) {
        // App going to background — flush event buffer
        FlaglabClient.getInstance().flush()
    }
})
```

#### WorkManager for guaranteed event delivery

```kotlin
// For events that must survive process kill (purchases, key conversions):
class FlaglabFlushWorker(ctx: Context, params: WorkerParameters) : CoroutineWorker(ctx, params) {
    override suspend fun doWork(): Result {
        FlaglabClient.getInstance().flush()
        return Result.success()
    }
}

// Schedule on important track() calls:
fun trackWithGuarantee(eventName: String, value: Double? = null) {
    track(eventName, value)  // buffered as normal
    WorkManager.getInstance(context).enqueue(
        OneTimeWorkRequestBuilder<FlaglabFlushWorker>()
            .setConstraints(Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build())
            .build()
    )
}
```

#### Jetpack Compose usage

```kotlin
// FlaglabViewModel.kt
@HiltViewModel
class FlaglabViewModel @Inject constructor() : ViewModel() {
    private val _result = MutableStateFlow<EvalResult?>(null)
    val result: StateFlow<EvalResult?> = _result

    init {
        FlaglabClient.getInstance().addResultListener { result ->
            _result.value = result
        }
    }

    fun identify(user: FlaglabUser) {
        viewModelScope.launch {
            FlaglabClient.getInstance().identify(user)
        }
    }
}

// In a Composable:
@Composable
fun CheckoutButton(viewModel: FlaglabViewModel = hiltViewModel()) {
    val result by viewModel.result.collectAsState()

    val newCheckout = result?.flags?.get("new_checkout") ?: false
    val color = result?.experiments?.get("checkout_button_color")?.params
        ?.get("color") as? String ?: "gray"

    if (newCheckout) {
        Button(
            onClick = { FlaglabClient.getInstance().track("button_clicked") },
            colors  = ButtonDefaults.buttonColors(containerColor = Color.parseColor(color))
        ) { Text("Buy now") }
    } else {
        Button(onClick = {}) { Text("Buy now (old)") }
    }
}
```

#### Murmur3 implementation note

Use the `Guava` library (`com.google.guava:guava`) which includes `Hashing.murmur3_32_fixed()`. Verify the seed is 0 and input is UTF-8 encoded bytes, not the raw `String`.

```kotlin
// Verify in unit tests:
assertEquals(0x3C4FCDA4L, murmur3("Hello, 世界"))  // critical multi-byte vector
```

---

## Frontend SDK Implementation Checklist

Additional checklist items specific to framework wrappers and mobile SDKs (extends the base checklist):

### Framework wrappers (Vue / Svelte / Angular)

- [ ] Does not re-implement networking — delegates all HTTP to `sdk-client`
- [ ] Singleton pattern: one `FlagsClientBrowser` instance per app, not per component
- [ ] Reactive primitives update automatically after `identify()` resolves
- [ ] SSR bootstrap (`initFromBootstrap`) supported for frameworks with server rendering
- [ ] `identify()` is async — UI shows defaults until the Promise resolves (not loading spinners)
- [ ] Tree-shakable: importing `useFlag` does not pull in unused methods

### React Native

- [ ] `AsyncStorage` used for anon ID persistence (not `localStorage`)
- [ ] `AppState` listener flushes buffer on `background`/`inactive` transitions
- [ ] No `window` or `document` references — pure RN APIs
- [ ] Hermes JS engine compatible (use `crypto.randomUUID()` only on RN 0.73+, polyfill for older)
- [ ] Expo and bare RN workflows both tested
- [ ] `onUpdate` event emitter allows hooks to re-render after `identify()`

### Swift / iOS

- [ ] `UserDefaults` for anon ID (not Keychain — flags are not secrets)
- [ ] `beginBackgroundTask` / `endBackgroundTask` wraps flush on `didEnterBackgroundNotification`
- [ ] `Combine` `Publisher` or `async/await` API for SwiftUI integration
- [ ] All 5 murmur3 test vectors pass with UTF-8 encoded bytes
- [ ] Minimum deployment target: iOS 15 (URLSession async/await, Combine)
- [ ] Thread-safe: `identify()` and `getFlag()` callable from any thread

### Kotlin / Android

- [ ] `SharedPreferences` for anon ID
- [ ] `ProcessLifecycleOwner` flush hook registered in `Application.onCreate`
- [ ] `WorkManager` available for guaranteed flush on critical events
- [ ] All 5 murmur3 test vectors pass (use Guava or manual impl with UTF-8 bytes)
- [ ] `StateFlow` / `LiveData` integration for Jetpack Compose and XML layouts
- [ ] ProGuard / R8 rules included in the AAR to prevent obfuscation of SDK classes

---

## Python

### Package: `flaglab-sdk`

```bash
pip install flaglab-sdk
# or
poetry add flaglab-sdk
```

#### Server SDK (Django, Flask, FastAPI)

```python
import os
from flaglab import FlagsClient

# Module-level singleton — init once at app startup
flags = FlagsClient(
    api_key=os.environ['FLAGLAB_SERVER_KEY'],
    base_url=os.environ.get('FLAGLAB_BASE_URL', 'https://flags.yourdomain.com'),
)

# Long-running WSGI/ASGI server:
flags.init()        # starts background poll thread (daemon=True, doesn't block shutdown)

# Serverless / per-request (Lambda, Cloud Functions):
flags.init_once()   # fetch rules once, no background thread
```

```python
# Per-request usage:
user = {'user_id': str(request.user.id), 'plan': request.user.plan}

enabled = flags.get_flag('new_checkout', user)  # → bool

timeout_ms = flags.get_config('checkout_timeout_ms', int)  # second arg is a type or callable

result = flags.get_experiment(
    'checkout_button_color',
    default_params={'color': 'gray'},
    decode=lambda raw: {'color': raw.get('color', 'gray') if isinstance(raw, dict) else 'gray'},
)
# result.in_experiment → bool
# result.group         → 'control' | 'test'
# result.params        → {'color': 'gray'}

# Track:
flags.track(str(request.user.id), 'purchase_completed', value=order.total)

# On shutdown (gunicorn post_worker_exit or Django AppConfig.ready teardown):
flags.destroy()
```

#### Django middleware example

```python
# myapp/middleware.py
from flaglab import FlagsClient
import os

_client: FlagsClient | None = None

def get_client() -> FlagsClient:
    global _client
    if _client is None:
        _client = FlagsClient(api_key=os.environ['FLAGLAB_SERVER_KEY'])
        _client.init()
    return _client

class FlaglabMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response
        get_client()  # warm up on first request

    def __call__(self, request):
        request.flags = get_client()
        request.flags_user = {'user_id': str(request.user.pk)} if request.user.is_authenticated else {}
        return self.get_response(request)

# Usage in views:
# if request.flags.get_flag('new_checkout', request.flags_user): ...
```

#### FastAPI lifespan

```python
from contextlib import asynccontextmanager
from fastapi import FastAPI
from flaglab import FlagsClient
import os

flags = FlagsClient(api_key=os.environ['FLAGLAB_SERVER_KEY'])

@asynccontextmanager
async def lifespan(app: FastAPI):
    await flags.async_init()   # async variant starts a background asyncio task
    yield
    flags.destroy()

app = FastAPI(lifespan=lifespan)
```

---

## Ruby

### Package: `flaglab-sdk`

```ruby
# Gemfile
gem 'flaglab-sdk'
```

```bash
bundle install
```

#### Rails initializer

```ruby
# config/initializers/flaglab.rb
require 'flaglab'

FLAGLAB = Flaglab::FlagsClient.new(
  api_key:  ENV.fetch('FLAGLAB_SERVER_KEY'),
  base_url: ENV.fetch('FLAGLAB_BASE_URL', 'https://flags.yourdomain.com'),
)
FLAGLAB.init   # starts background poll thread

# Puma on_restart / shutdown hook:
at_exit { FLAGLAB.destroy }
```

#### ApplicationController helper

```ruby
# app/controllers/application_controller.rb
def flaglab_user
  return {} unless current_user
  { user_id: current_user.id.to_s, plan: current_user.plan }
end
helper_method :flaglab_user

# Usage in controllers and helpers:
if FLAGLAB.get_flag('new_checkout', flaglab_user)
  # new behaviour
end

result = FLAGLAB.get_experiment(
  'checkout_button_color',
  default_params: { color: 'gray' },
  decode: ->(raw) { { color: raw.fetch('color', 'gray') } }
)
# result.in_experiment → bool
# result.group         → 'control' | 'test'
# result.params        → { color: 'gray' }

FLAGLAB.track(current_user.id.to_s, 'purchase_completed', value: order.total)
```

#### Rack middleware (for non-Rails apps)

```ruby
# config.ru
require 'flaglab'

FLAGLAB = Flaglab::FlagsClient.new(api_key: ENV['FLAGLAB_SERVER_KEY'])
FLAGLAB.init

use Rack::FlaglabContext, client: FLAGLAB, user_proc: ->(env) {
  session = env['rack.session']
  { user_id: session[:user_id].to_s }
}

run MyApp
```

#### Sidekiq / background jobs

```ruby
# For serverless-style workers: call init_once per job, or share the constant
# FLAGLAB is safe for concurrent access — underlying HTTP client is thread-safe
FLAGLAB.get_flag('feature_flag', { user_id: user_id.to_s })
```

---

## Go

### Package: `github.com/flaglab/sdk-go`

```bash
go get github.com/flaglab/sdk-go
```

#### Server initialization

```go
package main

import (
    "context"
    "log"
    "os"
    "os/signal"
    "syscall"

    flaglab "github.com/flaglab/sdk-go"
)

var flags *flaglab.FlagsClient

func init() {
    var err error
    flags, err = flaglab.NewFlagsClient(flaglab.Config{
        APIKey:  os.Getenv("FLAGLAB_SERVER_KEY"),
        BaseURL: getEnvOrDefault("FLAGLAB_BASE_URL", "https://flags.yourdomain.com"),
    })
    if err != nil {
        log.Fatalf("flaglab: init failed: %v", err)
    }
    if err := flags.Init(context.Background()); err != nil {
        log.Fatalf("flaglab: initial fetch failed: %v", err)
    }
}

func main() {
    // ... start server ...

    // Graceful shutdown:
    quit := make(chan os.Signal, 1)
    signal.Notify(quit, syscall.SIGTERM, syscall.SIGINT)
    <-quit
    flags.Destroy()
}
```

#### Per-request usage

```go
user := flaglab.User{
    UserID: r.Context().Value("user_id").(string),
    Attrs:  map[string]any{"plan": currentUser.Plan},
}

// Gate:
if flags.GetFlag("new_checkout", user) {
    // new behaviour
}

// Config (decode validates type):
timeout, err := flags.GetConfig("checkout_timeout_ms", func(v any) (int, error) {
    n, ok := v.(float64)  // JSON numbers are float64
    if !ok {
        return 0, fmt.Errorf("expected number, got %T", v)
    }
    return int(n), nil
})
if err != nil {
    timeout = 5000  // fallback
}

// Experiment:
type CheckoutParams struct{ Color string }
result, err := flags.GetExperiment("checkout_button_color", CheckoutParams{Color: "gray"},
    func(raw any) (CheckoutParams, error) {
        m, ok := raw.(map[string]any)
        if !ok {
            return CheckoutParams{Color: "gray"}, nil
        }
        color, _ := m["color"].(string)
        if color == "" { color = "gray" }
        return CheckoutParams{Color: color}, nil
    },
)
// result.InExperiment bool
// result.Group        string
// result.Params       CheckoutParams

// Track:
flags.Track(userID, "purchase_completed", flaglab.TrackOpts{Value: order.Total})
```

#### Lambda / Cloud Functions (initOnce)

```go
func handler(ctx context.Context, event events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
    c, _ := flaglab.NewFlagsClient(flaglab.Config{APIKey: os.Getenv("FLAGLAB_SERVER_KEY")})
    if err := c.InitOnce(ctx); err != nil {
        // fallback: all flags return false
    }
    // use c ...
}
```

---

## Java

### Package: `com.flaglab:sdk`

```xml
<!-- Maven pom.xml -->
<dependency>
  <groupId>com.flaglab</groupId>
  <artifactId>sdk</artifactId>
  <version>1.0.0</version>
</dependency>
```

```gradle
// Gradle
implementation 'com.flaglab:sdk:1.0.0'
```

#### Spring Boot integration

```java
// FlaglabConfig.java
@Configuration
public class FlaglabConfig {

    @Value("${flaglab.server-key}")
    private String apiKey;

    @Value("${flaglab.base-url:https://flags.yourdomain.com}")
    private String baseUrl;

    @Bean(destroyMethod = "destroy")
    public FlagsClient flagsClient() throws Exception {
        FlagsClient client = new FlagsClient(apiKey, baseUrl);
        client.init();  // starts background poll thread
        return client;
    }
}
```

```java
// Usage in a controller or service:
@Autowired
private FlagsClient flags;

public ResponseEntity<String> checkout(HttpServletRequest request) {
    Map<String, Object> user = Map.of(
        "user_id", currentUser.getId().toString(),
        "plan",    currentUser.getPlan()
    );

    if (flags.getFlag("new_checkout", user)) {
        return newCheckout(request);
    }
    return oldCheckout(request);
}

// Experiment:
ExperimentResult<CheckoutParams> result = flags.getExperiment(
    "checkout_button_color",
    new CheckoutParams("gray"),   // defaultParams
    raw -> {                      // decoder — raw is a Map<String,Object>
        @SuppressWarnings("unchecked")
        Map<String, Object> m = (Map<String, Object>) raw;
        String color = (String) m.getOrDefault("color", "gray");
        return new CheckoutParams(color);
    }
);
// result.isInExperiment()  → boolean
// result.getGroup()        → "control" | "test"
// result.getParams()       → CheckoutParams

// Track:
flags.track(currentUser.getId().toString(), "purchase_completed", Map.of("value", order.getTotal()));
```

#### Serverless (AWS Lambda, Google Cloud Functions)

```java
public class Handler implements RequestHandler<Map<String, Object>, String> {
    public String handleRequest(Map<String, Object> event, Context context) {
        FlagsClient flags = new FlagsClient(System.getenv("FLAGLAB_SERVER_KEY"));
        try {
            flags.initOnce();  // fetch once, no background thread
            // use flags ...
        } catch (Exception e) {
            // degraded mode: flags return defaults
        }
        return "ok";
    }
}
```

---

## PHP

### Package: `flaglab/sdk`

```bash
composer require flaglab/sdk
```

#### Laravel service provider

```php
// app/Providers/FlaglabServiceProvider.php
namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Flaglab\FlagsClient;

class FlaglabServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(FlagsClient::class, function () {
            $client = new FlagsClient([
                'api_key'  => config('flaglab.server_key'),
                'base_url' => config('flaglab.base_url', 'https://flags.yourdomain.com'),
            ]);
            // PHP is typically stateless per request — use initOnce.
            // For long-running PHP (RoadRunner, Swoole, FrankenPHP): use init().
            $client->initOnce();
            return $client;
        });
    }
}
```

```php
// config/flaglab.php
return [
    'server_key' => env('FLAGLAB_SERVER_KEY'),
    'base_url'   => env('FLAGLAB_BASE_URL', 'https://flags.yourdomain.com'),
];
```

```php
// Usage in a controller:
use Flaglab\FlagsClient;
use Illuminate\Http\Request;

class CheckoutController extends Controller
{
    public function __construct(private FlagsClient $flags) {}

    public function index(Request $request)
    {
        $user = [
            'user_id' => (string) auth()->id(),
            'plan'    => auth()->user()->plan,
        ];

        if ($this->flags->getFlag('new_checkout', $user)) {
            return view('checkout.new');
        }

        $result = $this->flags->getExperiment(
            'checkout_button_color',
            ['color' => 'gray'],                        // defaultParams
            fn($raw) => ['color' => $raw['color'] ?? 'gray'],  // decoder
        );
        // $result->inExperiment → bool
        // $result->group        → 'control' | 'test'
        // $result->params       → ['color' => 'gray']

        $this->flags->track((string) auth()->id(), 'purchase_completed', ['value' => $order->total]);

        return view('checkout.index', ['color' => $result->params['color']]);
    }
}
```

#### WordPress / plain PHP

```php
<?php
require_once 'vendor/autoload.php';

use Flaglab\FlagsClient;

$flags = new FlagsClient(['api_key' => getenv('FLAGLAB_SERVER_KEY')]);
$flags->initOnce();  // stateless PHP — one fetch per request

$user = ['user_id' => (string) get_current_user_id()];

if ($flags->getFlag('new_checkout', $user)) {
    // new checkout template
}

$timeout = $flags->getConfig('checkout_timeout_ms', fn($v) => (int) $v);
```

#### RoadRunner / Swoole (long-running PHP)

```php
// worker.php — for long-running PHP workers
$flags = new FlagsClient(['api_key' => getenv('FLAGLAB_SERVER_KEY')]);
$flags->init();   // starts background poll (pcntl_fork or Swoole coroutine timer)

while ($request = $worker->waitRequest()) {
    // $flags is shared across all requests in this worker process
    $enabled = $flags->getFlag('new_checkout', $user);
    // ...
}
$flags->destroy();
```

---

## Implementation Checklist (per SDK)

Every SDK implementation must pass this checklist before release:

### Hashing

- [ ] Uses MurmurHash3_x86_32 with seed 0
- [ ] Encodes input as UTF-8 before hashing (critical for non-ASCII)
- [ ] Passes all 5 test vectors from `04-evaluation.md`
- [ ] CI job runs cross-language vector comparison

### Evaluation logic

- [ ] `evalGate`: disabled gate → false; rules evaluated in order; rollout via `murmur3(salt:uid) % 10000`
- [ ] `evalExperiment`: targeting gate → holdout → allocation → group assignment (three separate hashes)
- [ ] Universe holdout uses universe name as hash input, not experiment salt
- [ ] `getExperiment` returns `{ inExperiment: false, group: 'control', params: defaultParams }` when user is not allocated — never null
- [ ] `decode()` failure falls back to `{ inExperiment: false, ... }` with a warning log, never throws to caller
- [ ] `getConfig` accepts a decoder; bare cast is not acceptable

### Networking

- [ ] `init()` fetches both `/sdk/flags` and `/sdk/experiments` concurrently
- [ ] ETag / `If-None-Match` sent on every poll — returns 304 on no change
- [ ] `X-Poll-Interval` response header used to adjust poll frequency
- [ ] `initOnce()` available and documented for serverless contexts
- [ ] Network errors during background poll are swallowed (log + continue) — never crash the host process
- [ ] `destroy()` clears all timers

### Event buffering (client SDK only)

- [ ] Module-level singleton — not re-created on React re-renders / Vue unmounts / Angular DI cycles
- [ ] Browser: `beforeunload` + `visibilitychange → hidden` flush hooks
- [ ] Browser: beacon flush uses `text/plain` blob to avoid CORS preflight on mobile Safari
- [ ] Mobile: `AppState` (RN) / `didEnterBackgroundNotification` (iOS) / `ProcessLifecycleOwner` (Android) flush hooks
- [ ] Exposure dedup within session: `Set<string>` persisted to `sessionStorage` (browser) or in-memory (mobile — session ends on app kill)
- [ ] `flush()` returns a Promise/async; resolves when batch is sent or times out

### Error handling

- [ ] Missing flag: `getFlag` returns `false`, never throws
- [ ] Missing config: `getConfig` throws or returns fallback — document which
- [ ] Missing experiment: `getExperiment` returns `{ inExperiment: false, ... }`, never throws
- [ ] `init()` throws if initial fetch fails (caller decides whether to degrade or crash)
- [ ] `initOnce()` same — document that callers should wrap in try/catch for resilient degradation

### Testing

- [ ] Unit tests for all 5 murmur3 vectors
- [ ] Unit tests for `evalGate` with: disabled gate, rules mismatch, rollout boundary (rolloutPct=0, rolloutPct=10000)
- [ ] Unit tests for `evalExperiment` with: targeting gate miss, holdout hit, allocation boundary, group assignment
- [ ] Integration test against a real Worker (or recorded fixture) for `/sdk/flags` → `getFlag` round-trip
- [ ] Cross-language CI job: all SDKs assert identical hash outputs for the 5 vectors

---

## SDK Versioning

SDKs version independently of the Worker API. Compatibility:

```
SDK major version → breaking API change (rename, remove, or add required param)
SDK minor version → backward-compatible addition (new optional param, new method)
SDK patch version → bug fix, no API change
```

Worker API is versioned implicitly by the KV blob `version` field. SDKs do not
need to parse the version — they receive the full blob on cache miss.

MCP server declares compatible SDK versions per language (see `10-mcp-server.md`).
If the installed SDK version is outside the compatible range, `detect_project`
emits a `template_warning` and the AI prompts the user to update.

---

## SDK Package Names

| Language / Framework | Package name | Registry |
|---|---|---|
| TypeScript / JavaScript (browser + Node.js) | `@flaglab/sdk` | npm |
| Vue 3 | `@flaglab/sdk-vue` | npm |
| Svelte / SvelteKit | `@flaglab/sdk-svelte` | npm |
| Angular 17+ | `@flaglab/sdk-angular` | npm |
| React Native | `@flaglab/sdk-react-native` | npm |
| Swift / iOS | `FlaglabSDK` | Swift Package Index |
| Kotlin / Android | `com.flaglab:sdk-android` | Maven Central |
| Python | `flaglab-sdk` | PyPI |
| Ruby | `flaglab-sdk` | RubyGems |
| Go | `github.com/flaglab/sdk-go` | pkg.go.dev |
| Java | `com.flaglab:sdk` | Maven Central |
| PHP | `flaglab/sdk` | Packagist |

Monorepo structure and repo-split rationale are in `packages.md`.
