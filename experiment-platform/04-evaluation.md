# Evaluation Logic

## @flaglab/core eval/ — shared between Worker, server SDK, and Next.js

Must use identical `murmur3` (seed 0) across all SDK languages.
Publish a test vector table alongside the SDK so implementors can verify correctness.

### Hash version dispatch

The `hash_version` field on each experiment config (KV blob + D1) determines which hash implementation to use. This allows bug fixes to be deployed as a new version without reassigning in-flight users.

**Rule:** Never change the hash implementation in-place. If a bug is found:
1. Implement the fix as `murmur3_v2()`
2. Bump `hash_version` to 2 in `plans.yaml` defaults for new experiments
3. In-flight experiments keep `hash_version: 1` — they continue to use the buggy-but-stable implementation until stopped
4. New experiments created after the deploy use v2 automatically

```typescript
// In evalExperiment — dispatch on hash_version from the experiment config
function getHashFn(hashVersion: number): (input: string) => number {
  switch (hashVersion) {
    case 1:  return murmur3_v1   // original implementation
    case 2:  return murmur3_v2   // bug-fixed implementation (future)
    default: return murmur3_v1   // safe fallback — never crash on unknown version
  }
}

export function evalExperiment(exp: Experiment, user: User, ...): ExperimentResult | null {
  const hash = getHashFn(exp.hash_version ?? 1)
  // use hash() instead of murmur3() throughout
  const allocHash = hash(`${exp.salt}:alloc:${uid}`) % 10000
  const groupHash = hash(`${exp.salt}:group:${uid}`) % 10000
  // ...
}
```

The `hash_version` is included in the KV experiments blob so all SDK languages can dispatch without a D1 query. Default is `1`. Add to the blob shape in `02-kv-cache.md` if adding a new version.

### Gate Evaluation

```typescript
export function evalGate(gate: Gate, user: User): boolean {
  if (!gate.enabled) return false
  for (const rule of gate.rules)
    if (!matchRule(rule, user)) return false

  // rolloutPct is stored as integer 0–10000 — pure integer comparison, no float multiply
  const uid = user.user_id ?? user.anonymous_id
  if (!uid) return false  // no identity → fail safe (never hash empty string — deterministic collision)
  const segment = murmur3(`${gate.salt}:${uid}`) % 10000
  return segment < gate.rolloutPct
}
```

### Experiment Evaluation

Three steps, in order: universe holdout check → allocation check → group assignment.
Two independent hashes (alloc + group) prevent correlation between who's in the
experiment and which variant they see.

Universe holdout is hashed on the **universe name**, not the experiment salt — this
guarantees the same user segment is excluded from ALL experiments in that universe,
regardless of which experiment is being evaluated.

```typescript
export function evalExperiment(
  exp: Experiment,
  user: User,
  flags: Record<string, boolean>,
  universeHoldoutRange: [number, number] | null,
): ExperimentResult | null {

  // Targeting gate: user must pass this gate to be eligible
  if (exp.targeting_gate && !flags[exp.targeting_gate]) return null

  const uid = user.user_id ?? user.anonymous_id
  if (!uid) return null  // no identity → not in experiment (never hash empty string — deterministic collision)

  // Universe holdout: fixed segment range excluded from ALL experiments in this universe.
  // Hash on universe name (not experiment salt) → same user always in holdout.
  if (universeHoldoutRange) {
    const holdoutSeg = murmur3(`${exp.universe}:${uid}`) % 10000
    const [lo, hi]   = universeHoldoutRange
    if (holdoutSeg >= lo && holdoutSeg <= hi) return null
  }

  // Allocation: is this user in this specific experiment?
  // allocationPct is stored as integer 0–10000 — pure integer comparison, no float multiply
  const allocHash = murmur3(`${exp.salt}:alloc:${uid}`) % 10000
  if (allocHash >= exp.allocationPct) return null

  // Group assignment: weighted pick using a separate hash
  // group.weight is integer 0–10000; all weights sum to exactly 10000.
  // Pure integer addition — no float precision gap, last-group fallback is now purely defensive.
  //
  // Canonical boundary algorithm (must match across ALL 12 SDK languages):
  //   cumulative[i] = sum(weight[0..i])
  //   assign group i where cumulative[i-1] <= groupHash < cumulative[i]
  //   with cumulative[-1] = 0
  // The last group is guaranteed by the fallback — it catches any rounding/sum imprecision.
  const groupHash = murmur3(`${exp.salt}:group:${uid}`) % 10000
  let cumulative  = 0
  for (let i = 0; i < exp.groups.length; i++) {
    cumulative += exp.groups[i].weight
    if (groupHash < cumulative || i === exp.groups.length - 1)
      return { group: exp.groups[i].name, params: exp.groups[i].params }
  }
  return null  // unreachable — last group always catches
}
```

## Server SDK — packages/sdk-server/

### Three init modes

```typescript
// Long-running server (Node, Go, Java, etc.):
await client.init()          // fetch rules + start background poll

// Serverless (Lambda, Vercel, CF Workers):
await client.initOnce()      // fetch rules once, no background refresh
                             // rules valid for lifetime of this invocation
```

### Full implementation

```typescript
export class FlagsClient {
  private flagsRules: FlagsBlob | null = null
  private expsRules:  ExpsBlob  | null = null
  private flagsEtag:  string | null    = null
  private expsEtag:   string | null    = null
  private flagsTimer: ReturnType<typeof setInterval> | null = null
  private expsTimer:  ReturnType<typeof setInterval> | null = null
  private pollInterval = 30_000  // ms; adjusted by X-Poll-Interval header

  constructor(private apiKey: string, private baseUrl: string) {}

  async init() {
    await Promise.all([this.fetchFlags(), this.fetchExperiments()])
    this.startPolling()
  }

  async initOnce() {
    await Promise.all([this.fetchFlags(), this.fetchExperiments()])
    // No timers — caller's process is short-lived
  }

  private async fetchFlags() {
    const headers: Record<string, string> = { 'X-SDK-Key': this.apiKey }
    if (this.flagsEtag) headers['If-None-Match'] = this.flagsEtag

    const res = await fetch(`${this.baseUrl}/sdk/flags`, { headers })

    // Auto-adjust poll interval from server header
    const serverInterval = parseInt(res.headers.get('X-Poll-Interval') ?? '0') * 1000
    if (serverInterval > 0 && serverInterval !== this.pollInterval) {
      this.pollInterval = serverInterval
      this.restartFlagsPolling()
    }

    if (res.status === 304) return
    if (!res.ok) return
    this.flagsRules = await res.json() as FlagsBlob
    this.flagsEtag  = res.headers.get('ETag') ?? null
  }

  private async fetchExperiments() {
    const headers: Record<string, string> = { 'X-SDK-Key': this.apiKey }
    if (this.expsEtag) headers['If-None-Match'] = this.expsEtag

    const res = await fetch(`${this.baseUrl}/sdk/experiments`, { headers })
    if (res.status === 304) return
    if (!res.ok) return
    this.expsRules = await res.json() as ExpsBlob
    this.expsEtag  = res.headers.get('ETag') ?? null
  }

  private startPolling() {
    this.flagsTimer = setInterval(() => this.fetchFlags().catch(() => {}), this.pollInterval)
    this.expsTimer  = setInterval(() => this.fetchExperiments().catch(() => {}), 600_000)
    if (this.flagsTimer.unref) this.flagsTimer.unref()
    if (this.expsTimer.unref)  this.expsTimer.unref()
  }

  private restartFlagsPolling() {
    if (this.flagsTimer) clearInterval(this.flagsTimer)
    this.flagsTimer = setInterval(() => this.fetchFlags().catch(() => {}), this.pollInterval)
    if (this.flagsTimer.unref) this.flagsTimer.unref()
  }

  destroy() {
    if (this.flagsTimer) clearInterval(this.flagsTimer)
    if (this.expsTimer)  clearInterval(this.expsTimer)
  }

  getFlag(name: string, user: User): boolean {
    if (!this.flagsRules) throw new Error('FlagsClient not ready — call init() first')
    return evalGate(this.flagsRules.gates[name], user)
  }

  // decode is required — bare `as T` is not safe at runtime because KV can hold any shape.
  // Use a Zod schema or inline validation function as the decoder.
  // Throws if the config is missing or if decode() throws — callers should handle this.
  getConfig<T>(name: string, decode: (raw: unknown) => T): T {
    if (!this.flagsRules) throw new Error('FlagsClient not ready')
    const cfg = this.flagsRules.configs[name]
    if (!cfg) throw new Error(`Config '${name}' not found`)
    return decode(cfg.value)
  }

  getExperiment(name: string, user: User): ExperimentResult | null {
    if (!this.flagsRules || !this.expsRules) throw new Error('FlagsClient not ready')
    const exp      = this.expsRules.experiments[name]
    if (!exp) return null

    const universe = this.expsRules.universes[exp.universe]

    // Build complete flags map — evaluate ALL gates, not just the targeting gate.
    // The sparse { [exp.targeting_gate]: evalGate(...) } approach was a bug:
    // (a) other gate references in rules weren't available
    // (b) if targeting_gate is null, the key was the string "undefined"
    const allFlags: Record<string, boolean> = {}
    for (const [gateName, gate] of Object.entries(this.flagsRules.gates)) {
      allFlags[gateName] = evalGate(gate, user)
    }

    return evalExperiment(exp, user, allFlags, universe?.holdout_range ?? null)
  }
}
```

### getExperiment() API — never-null design (preferred over nullable)

The nullable return is error-prone: at 10% allocation, 90% of call sites crash
with `TypeError: Cannot read properties of null` if the developer omits the null check.

**Recommended API** — always returns a result with inExperiment discriminant:

```typescript
// packages/sdk-client/src/client.ts

export type ExperimentResult<P extends Record<string, unknown>> =
  | { inExperiment: true;  group: string; params: P }
  | { inExperiment: false; group: 'control'; params: P }  // params = defaults

getExperiment<P extends Record<string, unknown>>(
  name: string,
  defaultParams: P,
  decode: (raw: unknown) => P,  // required: validates server params shape at runtime
): ExperimentResult<P> {
  const exp = this.result?.experiments[name]
  if (!exp) return { inExperiment: false, group: 'control', params: defaultParams }

  let params: P
  try {
    params = decode(exp.params)  // validate server shape; throws on mismatch
  } catch {
    // Malformed experiment params — treat as not in experiment rather than crash
    console.warn(`[FlagsClient] getExperiment('${name}'): decode() threw. Returning defaults.`)
    return { inExperiment: false, group: 'control', params: defaultParams }
  }

  return { inExperiment: true, group: exp.group, params }
}
```

**Usage — no null check needed:**
```typescript
// Before (buggy — crashes for 90% of users at 10% allocation):
const exp = flags.getExperiment('checkout_exp')
const color = exp.params.color  // TypeError: Cannot read properties of null

// After (safe + validated):
const { inExperiment, params } = flags.getExperiment(
  'checkout_exp',
  { color: 'gray' },             // defaultParams
  (raw) => {                     // decoder — validates server shape
    const r = raw as Record<string, unknown>
    return { color: typeof r.color === 'string' ? r.color : 'gray' }
  }
)
renderButton(params.color)  // always a string, guaranteed
```

The server SDK should adopt the same API. The nullable return is deprecated.

Note: "Using a Zod schema as the decoder is idiomatic: `(raw) => MySchema.parse(raw)`"

## Client SDK (browser/mobile) — packages/sdk-client/

Client SDKs never see rules. They POST user context → receive evaluated flat map.

```typescript
export class FlagsClientBrowser {
  private result: EvalResult | null = null
  private anonId = getOrCreateAnonId()  // persisted in localStorage

  constructor(private config: ClientSDKConfig) {}

  // Call on page load (anonymous) or on login (authenticated)
  async identify(user: User): Promise<void> {
    const res = await fetch(`${this.config.baseUrl}/sdk/evaluate`, {
      method:  'POST',
      headers: { 'X-SDK-Key': this.config.sdkKey, 'Content-Type': 'application/json' },
      body:    JSON.stringify({ user: { ...user, anonymous_id: this.anonId } }),
    })
    this.result = await res.json()
  }

  // Initialise from SSR-injected bootstrap data (zero network)
  initFromBootstrap(data: EvalResult) {
    this.result = data
  }

  getFlag(name: string): boolean {
    return this.result?.flags[name] ?? false
  }

  // decode validates the runtime shape. Required — bare `as T` is not safe.
  getConfig<T>(name: string, decode: (raw: unknown) => T): T {
    const cfg = this.result?.configs[name]
    if (cfg === undefined) throw new Error(`Config '${name}' not found in evaluate result`)
    return decode(cfg)
  }

  getExperiment(name: string): ExperimentResult | null {
    return this.result?.experiments[name] ?? null
  }
}
```

## Identity Stitching in Analysis

When a user logs in (anonymous → authenticated), the client SDK emits a special
`identify` event to `/collect`:

```typescript
// Client SDK: call after authentication
client.identify({
  user_id:      authenticatedUser.id,
  anonymous_id: this.anonId,  // the UUID that was used for experiment bucketing
})
```

The `/collect` handler writes the alias to `user_aliases` (see `03-worker-endpoints.md` § "/collect"). The analysis cron resolves aliases before aggregation — see `06-analysis.md` § "Step 1 — First Exposures". Bucketing is locked at first exposure: when `anon_id` is stitched to `user_id`, the cron uses the original group assignment — the user is NOT re-bucketed.

## MurmurHash3 Cross-Language Consistency

All SDKs MUST use **MurmurHash3_x86_32 with seed 0** and **UTF-8 encoding** for all inputs.
JavaScript must use `TextEncoder` — do NOT pass the native UTF-16 string directly.

### Test vectors (verify every SDK implementation against these)

All vectors use MurmurHash3_x86_32, seed 0, UTF-8 byte encoding.

| Input | Len (bytes) | Tail bytes | Expected u32 (hex) | Expected % 10000 |
|---|---|---|---|---|
| `""` (empty) | 0 | 0 | `0x00000000` | 0 |
| `"a"` | 1 | 1 | `0xCA27D700` | 9728 |
| `"ab"` | 2 | 2 | `0x7FA09EA6` | 6630 |
| `"abc"` | 3 | 3 | `0xB3DD93FA` | 9722 |
| `"aaaa"` | 4 | 0 | `0x5B95936B` | 4459 |
| `"aaaaa"` | 5 | 1 | `0xE898F65B` | 6491 |
| `"Hello, 世界"` | 13 | 1 | `0x3C4FCDA4` | 3252 |
| `"The quick brown fox jumps over the lazy dog"` | 43 | 3 | `0x2E4FF723` | 7971 |
| `"exp_001:alloc:user_abc"` | 22 | 2 | **MUST COMPUTE** — see below | — |
| `"exp_001:group:user_abc"` | 22 | 2 | **MUST COMPUTE** — see below | — |

> **These two vectors MUST be computed before shipping any SDK.** They use the exact
> production input format (salt:alloc/group:user_id) and are the most important vectors
> to verify — an endianness bug in the tail bytes path would pass the 8 vectors above
> but fail here, producing silently wrong bucket assignments in production.
>
> To compute: compile Austin Appleby's reference C implementation from
> https://github.com/aappleby/smhasher (`MurmurHash3_x86_32` function), then run:
> ```c
> uint32_t out;
> MurmurHash3_x86_32("exp_001:alloc:user_abc", 22, 0, &out);
> printf("0x%08X\n", out);  // record this value
> MurmurHash3_x86_32("exp_001:group:user_abc", 22, 0, &out);
> printf("0x%08X\n", out);  // record this value
> ```
> Fill the expected values into this table and into `scripts/verify-hash-vectors.mjs`
> before the first SDK is published. **Do not ship any SDK until these are filled in.**

**Critical divergence points for implementors:**

1. **Tail bytes (length not divisible by 4):** The 1-, 2-, 3-tail vectors above cover every case. If your implementation fails only these, you have an endianness bug in tail processing — tail bytes must be XORed in little-endian order: `k ^= tail[2] << 16; k ^= tail[1] << 8; k ^= tail[0]`.

2. **Unsigned 32-bit overflow:** After every multiply or shift, mask to 32 bits. Java/Kotlin require explicit `& 0xFFFFFFFFL`; JS requires `>>> 0` or use `Uint32Array`. Missing one mask causes wrong results only for inputs where the intermediate value overflows — these bugs are invisible unless tested with inputs that exercise the overflow path.

3. **String encoding:** Always encode to UTF-8 bytes before hashing. The character `世` is 3 UTF-8 bytes (`0xE4 0xB8 0x96`). If you hash the UTF-16 surrogate (Java's default `String.getBytes()` without charset) you get wrong results. Always pass `StandardCharsets.UTF_8` in Java.

4. **Little-endian block reads:** 4-byte blocks are read as little-endian 32-bit integers. Java's `ByteBuffer` defaults to big-endian — call `.order(ByteOrder.LITTLE_ENDIAN)` before reading.

### Required CI job

Without a cross-language test, implementation drift is invisible and produces silent SRM that
the detector cannot catch (group counts are balanced but assignments are wrong).

Add to `turbo.json` as a task named `"cross-lang-vectors"` that blocks all SDK releases.

```javascript
// scripts/verify-hash-vectors.mjs — runs as part of CI
// Each language process is spawned as a subprocess; its stdout must match the expected u32.
// Add new languages to RUNNERS as SDKs are added.
import { execSync } from 'child_process'
import { fileURLToPath } from 'url'
import path from 'path'

const VECTORS = [
  { input: '',               expected: 0x00000000 },
  { input: 'a',              expected: 0xCA27D700 },
  { input: 'ab',             expected: 0x7FA09EA6 },
  { input: 'abc',            expected: 0xB3DD93FA },
  { input: 'aaaa',           expected: 0x5B95936B },
  { input: 'aaaaa',          expected: 0xE898F65B },
  { input: 'Hello, 世界',    expected: 0x3C4FCDA4 },
  { input: 'The quick brown fox jumps over the lazy dog', expected: 0x2E4FF723 },
  { input: 'exp_001:alloc:user_abc', expected: 0x00000000 },  // REPLACE with value from ref C impl
  { input: 'exp_001:group:user_abc', expected: 0x00000000 },  // REPLACE with value from ref C impl
]

const RUNNERS = {
  typescript: (input) => `node -e "
    const { murmur3 } = require('./packages/sdk/src/hash.js')
    process.stdout.write(String(murmur3(${JSON.stringify(input)})))"`,
  python: (input) => `python3 -c "
    from packages.sdk_python.flaglab.hash import murmur3
    print(murmur3(${JSON.stringify(input)}))"`,
  ruby: (input) => `ruby -r ./packages/sdk_ruby/lib/flaglab/hash \
    -e "puts Flaglab::Hash.murmur3(${JSON.stringify(input)})"`,
  go: (input) => `go run ./packages/sdk_go/cmd/hashtest/main.go ${JSON.stringify(input)}`,
  java: (input) => `java -cp packages/sdk_java/build/libs/sdk.jar com.flaglab.HashTest ${JSON.stringify(input)}`,
}

let failures = 0
for (const [lang, runner] of Object.entries(RUNNERS)) {
  for (const { input, expected } of VECTORS) {
    try {
      const result = parseInt(execSync(runner(input), { encoding: 'utf8' }).trim())
      if (result !== expected) {
        console.error(`FAIL [${lang}] input="${input}": got 0x${result.toString(16).toUpperCase().padStart(8,'0')}, expected 0x${expected.toString(16).toUpperCase().padStart(8,'0')}`)
        failures++
      }
    } catch (err) {
      console.error(`ERROR [${lang}] input="${input}": ${err.message}`)
      failures++
    }
  }
}
if (failures > 0) {
  console.error(`\n${failures} hash vector failure(s). Fix SDK implementations before shipping.`)
  process.exit(1)
}
console.log(`All ${Object.keys(RUNNERS).length * VECTORS.length} hash vectors pass.`)
```

Add to `turbo.json`:
```json
{
  "pipeline": {
    "cross-lang-vectors": {
      "dependsOn": ["^build"],
      "outputs": [],
      "cache": false
    }
  }
}
```

Add to CI workflow (runs on every PR that touches any `packages/sdk-*` directory):
```yaml
- name: Verify cross-language hash vectors
  run: node scripts/verify-hash-vectors.mjs
```

Canonical reference: [Austin Appleby's original C implementation](https://github.com/aappleby/smhasher) — `MurmurHash3_x86_32` function.
