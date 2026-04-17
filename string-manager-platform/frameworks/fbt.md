# Plan: ShipEasyI18n fbt Adapter

**Goal**: Provide a bridge between ShipEasyI18n and Meta's `fbt` (Facebook Translation) library so teams that already use fbt for React component internationalization can source their translations from ShipEasyI18n instead of (or in addition to) static translation JSON files.
**Package**: `@i18n/fbt`
**Key challenge**: fbt requires translations to be registered synchronously before React renders (via `FbtTranslations.registerTranslations()`), but ShipEasyI18n label files are fetched asynchronously. The adapter must perform a synchronous blocking fetch — acceptable only for the editor/preview flow and for SSR — and convert ShipEasyI18n's flat `{ "key": "value" }` format to fbt's nested translation JSON format.

---

## Scope and Limitations

**This adapter is:**

- For teams currently using fbt who want to manage translations in ShipEasyI18n
- React-only (fbt is a React library)
- Useful for gradual migration: existing fbt strings managed in ShipEasyI18n, new strings using plain ShipEasyI18n keys

**This adapter is NOT:**

- A replacement for `@i18n/react` for new projects (use `@i18n/react` directly instead)
- Applicable to non-React fbt usage
- A two-way sync — ShipEasyI18n is the source of truth; fbt is the rendering layer

**Documented limitation:** The synchronous fetch strategy blocks the main thread briefly on the very first uncached load. This is a known tradeoff. The alternative (async) would require React Suspense + a fallback, which defeats the purpose of using fbt's synchronous registration API.

---

## Install

```bash
npm install @i18n/fbt fbt
```

Peer dependencies: `fbt >= 1.0`, `react >= 17`.

---

## Understanding fbt Translation Format

fbt requires translations in a specific nested JSON format:

```json
{
  "fb-locale": "fr_FR",
  "translations": {
    "user.greeting": {
      "tokens": ["name"],
      "types": [3],
      "translations": [
        {
          "translation": "Bonjour, {name}!",
          "variations": {}
        }
      ]
    },
    "nav.home": {
      "tokens": [],
      "types": [],
      "translations": [
        {
          "translation": "Accueil",
          "variations": {}
        }
      ]
    }
  }
}
```

ShipEasyI18n stores translations as flat strings with `{{variable}}` syntax:

```json
{
  "strings": {
    "user.greeting": "Bonjour, {{name}}!",
    "nav.home": "Accueil"
  }
}
```

The adapter converts ShipEasyI18n format → fbt format.

---

## Full Source

### `src/convert.ts`

```typescript
export interface ShipEasyI18nLabelFile {
  v: number;
  profile: string;
  chunk: string;
  strings: Record<string, string>;
}

export interface FbtTranslationEntry {
  tokens: string[];
  types: number[];
  translations: Array<{
    translation: string;
    variations: Record<string, unknown>;
  }>;
}

export interface FbtTranslations {
  "fb-locale": string;
  translations: Record<string, FbtTranslationEntry>;
}

// fbt token type constants
const FBT_TOKEN_TYPE_STRING = 3;

/**
 * Extracts {{variable}} placeholders from an ShipEasyI18n string and converts
 * them to fbt {variable} token syntax.
 *
 * Example:
 *   "Hello, {{name}}!" → "Hello, {name}!"
 *   tokens: ["name"]
 */
function parseString(value: string): { text: string; tokens: string[] } {
  const tokens: string[] = [];
  const tokenPattern = /\{\{(\w+)\}\}/g;

  const text = value.replace(tokenPattern, (_, tokenName) => {
    if (!tokens.includes(tokenName)) {
      tokens.push(tokenName);
    }
    return `{${tokenName}}`;
  });

  return { text, tokens };
}

/**
 * Converts an ShipEasyI18n label file to fbt's translation JSON format.
 *
 * @param labelFile  The ShipEasyI18n label file (from CDN)
 * @param locale     fbt locale string, e.g. "fr_FR" (dash or underscore separated)
 */
export function convertToFbt(labelFile: ShipEasyI18nLabelFile, locale: string): FbtTranslations {
  const translations: Record<string, FbtTranslationEntry> = {};

  for (const [key, value] of Object.entries(labelFile.strings)) {
    const { text, tokens } = parseString(value);

    translations[key] = {
      tokens,
      types: tokens.map(() => FBT_TOKEN_TYPE_STRING),
      translations: [
        {
          translation: text,
          variations: {},
        },
      ],
    };
  }

  return {
    "fb-locale": locale,
    translations,
  };
}
```

### `src/fetch-sync.ts`

```typescript
/**
 * Synchronous fetch using XMLHttpRequest.
 *
 * This blocks the main thread. Acceptable for:
 * - Editor initialization (called once, user already clicked a button)
 * - SSR (Node.js / Worker, where sync XHR doesn't exist — use async fetch there)
 *
 * For production SSR, use fetchLabelsAsync() below.
 */
export function fetchSync(url: string): unknown | null {
  if (typeof XMLHttpRequest === "undefined") {
    throw new Error("[ShipEasyI18n fbt] fetchSync requires XMLHttpRequest (browser only)");
  }

  const xhr = new XMLHttpRequest();
  xhr.open("GET", url, false); // false = synchronous
  xhr.setRequestHeader("Accept", "application/json");

  try {
    xhr.send();
    if (xhr.status === 200) {
      return JSON.parse(xhr.responseText);
    }
    console.error(`[ShipEasyI18n fbt] HTTP ${xhr.status} fetching ${url}`);
    return null;
  } catch (err) {
    console.error("[ShipEasyI18n fbt] Fetch error:", err);
    return null;
  }
}

/**
 * Async fetch for SSR / Node.js environments.
 */
export async function fetchAsync(url: string): Promise<unknown | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.error(`[ShipEasyI18n fbt] HTTP ${res.status} fetching ${url}`);
      return null;
    }
    return res.json();
  } catch (err) {
    console.error("[ShipEasyI18n fbt] Fetch error:", err);
    return null;
  }
}
```

### `src/index.ts`

```typescript
import { FbtTranslations } from "fbt";
import { convertToFbt, type ShipEasyI18nLabelFile } from "./convert";
import { fetchSync, fetchAsync } from "./fetch-sync";

const ShipEasyI18n_CDN = "https://cdn.i18n.shipeasy.ai";

export interface ShipEasyI18nFbtOptions {
  /** ShipEasyI18n public key (i18n_pk_...) */
  i18nKey: string;
  /** ShipEasyI18n profile string, e.g. "en:prod" */
  profile: string;
  /** fbt locale string, e.g. "en_US", "fr_FR" */
  locale: string;
  /** Chunk to load (default: "index") */
  chunk?: string;
}

/**
 * Fetches ShipEasyI18n labels synchronously and registers them with fbt.
 *
 * Call this BEFORE React renders — in your app entry point, before
 * ReactDOM.createRoot() or ReactDOM.render().
 *
 * BLOCKS THE MAIN THREAD. See fetchAndRegisterAsync() for the async alternative.
 *
 * @example
 * import { fetchAndRegister } from '@i18n/fbt';
 * fetchAndRegister({ i18nKey: 'i18n_pk_abc123', profile: 'fr:prod', locale: 'fr_FR' });
 * ReactDOM.createRoot(document.getElementById('root')).render(<App />);
 */
export function fetchAndRegister(opts: ShipEasyI18nFbtOptions): boolean {
  const chunk = opts.chunk ?? "index";

  // 1. Check sessionStorage cache first (installed by loader.js)
  const cachedKey = `i18n_labels_${opts.profile}_${chunk}`;
  const cached = sessionStorage.getItem(cachedKey);
  if (cached) {
    try {
      const labelFile = JSON.parse(cached) as ShipEasyI18nLabelFile;
      const fbtTranslations = convertToFbt(labelFile, opts.locale);
      FbtTranslations.registerTranslations(fbtTranslations);
      return true;
    } catch {
      // Fall through to network fetch
    }
  }

  // 2. Check for inline data injected by the server
  const inlineScript = document.getElementById("i18n-data");
  if (inlineScript) {
    try {
      const labelFile = JSON.parse(inlineScript.textContent ?? "{}") as ShipEasyI18nLabelFile;
      if (labelFile.strings) {
        const fbtTranslations = convertToFbt(labelFile, opts.locale);
        FbtTranslations.registerTranslations(fbtTranslations);
        return true;
      }
    } catch {
      // Fall through to network fetch
    }
  }

  // 3. Synchronous network fetch (last resort — blocks main thread)
  const manifest = fetchSync(
    `${ShipEasyI18n_CDN}/labels/${opts.i18nKey}/${opts.profile}/manifest.json`,
  ) as Record<string, string> | null;
  if (!manifest) return false;

  const fileUrl = manifest[chunk];
  if (!fileUrl) {
    console.error(`[ShipEasyI18n fbt] Chunk "${chunk}" not in manifest`);
    return false;
  }

  const labelFile = fetchSync(fileUrl) as ShipEasyI18nLabelFile | null;
  if (!labelFile) return false;

  const fbtTranslations = convertToFbt(labelFile, opts.locale);
  FbtTranslations.registerTranslations(fbtTranslations);

  // Cache for next time
  sessionStorage.setItem(cachedKey, JSON.stringify(labelFile));

  return true;
}

/**
 * Async version — for use in SSR or when you can await before rendering.
 *
 * @example
 * // SSR (Node.js):
 * const { fbtTranslations } = await fetchAndRegisterAsync({...});
 * FbtTranslations.registerTranslations(fbtTranslations);
 * const html = renderToString(<App />);
 *
 * // Client with Suspense:
 * const translations = use(fetchAndRegisterAsync({...}));
 */
export async function fetchAndRegisterAsync(opts: ShipEasyI18nFbtOptions): Promise<{
  fbtTranslations: ReturnType<typeof convertToFbt> | null;
  registered: boolean;
}> {
  const chunk = opts.chunk ?? "index";

  const manifest = (await fetchAsync(
    `${ShipEasyI18n_CDN}/labels/${opts.i18nKey}/${opts.profile}/manifest.json`,
  )) as Record<string, string> | null;

  if (!manifest) return { fbtTranslations: null, registered: false };

  const fileUrl = manifest[chunk];
  if (!fileUrl) {
    console.error(`[ShipEasyI18n fbt] Chunk "${chunk}" not in manifest`);
    return { fbtTranslations: null, registered: false };
  }

  const labelFile = (await fetchAsync(fileUrl)) as ShipEasyI18nLabelFile | null;
  if (!labelFile) return { fbtTranslations: null, registered: false };

  const fbtTranslations = convertToFbt(labelFile, opts.locale);
  FbtTranslations.registerTranslations(fbtTranslations);

  return { fbtTranslations, registered: true };
}

/**
 * Subscribe to ShipEasyI18n label updates (from in-browser editor).
 * When labels update, re-registers with fbt and calls the onUpdate callback
 * so the caller can re-render (e.g., by incrementing a state counter).
 *
 * Returns an unsubscribe function.
 */
export function subscribeToUpdates(opts: ShipEasyI18nFbtOptions, onUpdate: () => void): () => void {
  if (typeof window === "undefined" || !window.i18n) return () => {};

  return window.i18n.on("update", () => {
    // Re-fetch and re-register asynchronously
    fetchAndRegisterAsync(opts).then(({ registered }) => {
      if (registered) onUpdate();
    });
  });
}

export { convertToFbt } from "./convert";
export type { ShipEasyI18nFbtOptions, ShipEasyI18nLabelFile, FbtTranslations } from "./convert";
```

---

## Script Tag Setup

The ShipEasyI18n loader is still required — it handles `data-label` DOM scanning, the in-browser editor trigger, and sessionStorage caching:

```html
<head>
  <!-- Inline label data (from your SSR layer) -->
  <script id="i18n-data" type="application/json">
    {
      "v": 1,
      "profile": "fr:prod",
      "chunk": "index",
      "strings": { "nav.home": "Accueil", "user.greeting": "Bonjour, {{name}}!" }
    }
  </script>
  <!-- ShipEasyI18n loader — handles DOM, editor, sessionStorage -->
  <script
    src="https://cdn.i18n.shipeasy.ai/loader.js"
    data-key="i18n_pk_abc123"
    data-profile="fr:prod"
    async
  ></script>
</head>
```

---

## Usage Examples

### Browser entry point (synchronous registration)

```typescript
// src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { fetchAndRegister } from '@i18n/fbt';
import App from './App';

// Blocks briefly on first cold load (no inline data, no sessionStorage cache).
// On all subsequent loads: reads sessionStorage or inline data — instant.
fetchAndRegister({
  i18nKey: 'i18n_pk_abc123',
  profile: 'fr:prod',
  locale: 'fr_FR',
});

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
```

### Using fbt in components (unchanged)

```tsx
// components/NavBar.tsx
import { fbt } from "fbt";

export function NavBar() {
  return (
    <nav>
      <a href="/" data-label="nav.home">
        <fbt desc="Home navigation link">
          <fbt:param name="nav.home">{/* key reference */}</fbt:param>
        </fbt>
      </a>
    </nav>
  );
}
```

**Note**: fbt's JSX API (`<fbt>`, `fbt()`) uses its own string extraction and translation lookup. The `@i18n/fbt` adapter populates fbt's translation registry — fbt then serves translations for its own string IDs.

### Direct fbt API with ShipEasyI18n keys

For teams that want to use ShipEasyI18n keys directly in fbt calls:

```tsx
import { fbt } from "fbt";
import { useShipEasyI18n } from "@i18n/react"; // use alongside fbt

function WelcomeBanner({ name }: { name: string }) {
  // Use @i18n/react for ShipEasyI18n-native strings
  const { t } = useShipEasyI18n();

  return (
    <div>
      {/* ShipEasyI18n-native key — data-label enables in-browser editing */}
      <h1 data-label="user.greeting" data-variables={JSON.stringify({ name })}>
        {t("user.greeting", { name })}
      </h1>

      {/* fbt-managed string — sourced from ShipEasyI18n via the adapter */}
      <fbt desc="Navigation label">nav.home</fbt>
    </div>
  );
}
```

### Live updates from in-browser editor

```tsx
// App.tsx
import React, { useState, useEffect } from "react";
import { subscribeToUpdates } from "@i18n/fbt";

function App() {
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const unsub = subscribeToUpdates(
      { i18nKey: "i18n_pk_abc123", profile: "fr:prod", locale: "fr_FR" },
      () => setVersion((v) => v + 1), // re-render triggers fbt re-evaluation
    );
    return unsub;
  }, []);

  // key={version} forces subtree remount when labels update
  return <AppContent key={version} />;
}
```

---

## SSR Usage (Next.js Pages Router)

```typescript
// pages/_app.tsx
import type { AppProps } from 'next/app';
import { FbtTranslations } from 'fbt';
import { fetchAndRegisterAsync, convertToFbt } from '@i18n/fbt';

function App({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}

// On the server: register translations before renderToString
App.getInitialProps = async () => {
  if (typeof window === 'undefined') {
    // SSR: async fetch is fine
    const result = await fetchAndRegisterAsync({
      i18nKey: 'i18n_pk_abc123',
      profile: 'fr:prod',
      locale: 'fr_FR',
    });
    // Pass translations to client via pageProps for re-registration
    return { fbtTranslations: result.fbtTranslations };
  }
  return {};
};

export default App;
```

---

## fbt Hash Key Mapping

fbt identifies strings by their **source string hash** (extracted at build time), not by a developer-defined key. This creates a mapping challenge:

- ShipEasyI18n keys: `"nav.home"`, `"user.greeting"` — human-readable identifiers
- fbt string IDs: MD5 of source string + description — auto-generated

To map ShipEasyI18n keys to fbt string IDs, the adapter takes a pragmatic approach: it uses ShipEasyI18n keys directly as fbt translation hash IDs. This requires:

1. fbt strings in source code to use ShipEasyI18n key as their literal text:
   ```tsx
   <fbt desc="nav home">nav.home</fbt>
   ```
2. fbt extraction generates `"nav.home"` as the hash key.
3. `convertToFbt()` uses the same `"nav.home"` key in the translation registry.

This is a constraint: fbt source strings must literally be ShipEasyI18n key names. This works well for teams building new features with fbt where translations are managed entirely in ShipEasyI18n.

For teams with existing fbt strings using natural language sources (`<fbt desc="home">Home</fbt>`), a key mapping file is needed:

```typescript
// i18n-fbt-key-map.json
{
  "hash_of_home_string": "nav.home",
  "hash_of_greeting_string": "user.greeting"
}
```

The adapter can use this map when converting:

```typescript
export function convertToFbtWithKeyMap(
  labelFile: ShipEasyI18nLabelFile,
  locale: string,
  keyMap: Record<string, string>,
): FbtTranslations {
  const reverseMap = Object.fromEntries(
    Object.entries(keyMap).map(([fbtHash, i18nKey]) => [i18nKey, fbtHash]),
  );

  const translations: Record<string, FbtTranslationEntry> = {};
  for (const [i18nKey, value] of Object.entries(labelFile.strings)) {
    const fbtHash = reverseMap[i18nKey] ?? i18nKey;
    const { text, tokens } = parseString(value);
    translations[fbtHash] = {
      tokens,
      types: tokens.map(() => 3),
      translations: [{ translation: text, variations: {} }],
    };
  }

  return { "fb-locale": locale, translations };
}
```

---

## Variable Syntax Conversion

| ShipEasyI18n syntax | fbt syntax |
| ------------------- | ---------- |
| `{{name}}`          | `{name}`   |
| `{{count}}`         | `{count}`  |

The conversion is handled by `parseString()` in `convert.ts`. fbt's `fbt:param` elements correspond to these tokens.

**Important**: fbt supports pluralization and gender variation. ShipEasyI18n's `{{variable}}` is a simple string substitution. The adapter does not support fbt's plural/gender features — strings using those features cannot be managed via ShipEasyI18n without manual mapping.

---

## Edge Cases

### Synchronous fetch in Safari

Safari restricts synchronous XHR on the main thread in some configurations. If `fetchSync()` throws, `fetchAndRegister()` returns `false` and fbt renders with no translations (source strings). Provide inline label data via SSR to eliminate the synchronous fetch requirement.

### fbt + React 18 concurrent mode

React 18 may call render functions multiple times before committing. `FbtTranslations.registerTranslations()` must be called before the first render starts. Ensure `fetchAndRegister()` completes before `ReactDOM.createRoot().render()`.

### Multiple chunks

Register translations from multiple chunks before rendering:

```typescript
fetchAndRegister({ i18nKey, profile, locale, chunk: "index" });
fetchAndRegister({ i18nKey, profile, locale, chunk: "checkout" });
// Translations from both chunks are now registered
```

Each call merges into fbt's translation registry.

### Testing with fbt

In tests, mock `FbtTranslations.registerTranslations`:

```typescript
jest.mock("fbt", () => ({
  FbtTranslations: {
    registerTranslations: jest.fn(),
  },
  fbt: (str: string) => str,
}));
```

---

## Migration Path from fbt Static Files

If currently using fbt with static JSON translation files:

1. Import your existing translations into ShipEasyI18n (via `i18n import translations.json`).
2. Replace the static `registerTranslations()` call with `fetchAndRegister()`.
3. Add inline data injection to your SSR layer.
4. Remove the static translation JSON files from your build.

```typescript
// Before:
import frTranslations from "./translations/fr_FR.json";
FbtTranslations.registerTranslations(frTranslations);

// After:
import { fetchAndRegister } from "@i18n/fbt";
fetchAndRegister({ i18nKey: "i18n_pk_abc123", profile: "fr:prod", locale: "fr_FR" });
```

---

## Test Commands

```bash
npm test               # Jest
npx tsc --noEmit       # Type check
npm run build          # Compile TypeScript
```

### Unit Test

```typescript
import { convertToFbt } from "@i18n/fbt";

describe("convertToFbt", () => {
  it("converts simple string", () => {
    const result = convertToFbt(
      { v: 1, profile: "fr:prod", chunk: "index", strings: { "nav.home": "Accueil" } },
      "fr_FR",
    );
    expect(result["fb-locale"]).toBe("fr_FR");
    expect(result.translations["nav.home"].translations[0].translation).toBe("Accueil");
    expect(result.translations["nav.home"].tokens).toHaveLength(0);
  });

  it("converts string with variables", () => {
    const result = convertToFbt(
      {
        v: 1,
        profile: "fr:prod",
        chunk: "index",
        strings: { "user.greeting": "Bonjour, {{name}}!" },
      },
      "fr_FR",
    );
    expect(result.translations["user.greeting"].tokens).toEqual(["name"]);
    expect(result.translations["user.greeting"].translations[0].translation).toBe(
      "Bonjour, {name}!",
    );
  });
});
```

---

## End-to-End Example

```
my-fbt-app/
  index.html              ← i18n-data inline script + loader.js
  src/
    main.tsx              ← fetchAndRegister() before ReactDOM.createRoot()
    App.tsx               ← <fbt> elements + data-label for ShipEasyI18n editing
    components/
      NavBar.tsx          ← <fbt desc="nav.home">nav.home</fbt>
      WelcomeBanner.tsx   ← useShipEasyI18n() for ShipEasyI18n-native strings alongside fbt
```
