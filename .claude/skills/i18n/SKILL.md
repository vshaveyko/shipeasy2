---
name: i18n
description: Add translatable text to Shipeasy UI components — wrapping hardcoded strings with t(), creating keys in the backend, and publishing them to CDN. Triggers for "translate", "i18n", "add a key", "make this translatable", or any request involving landing page copy or text changes.
user-invocable: true
---

# Adding Translatable Text to Shipeasy UI

This project uses Shipeasy's own i18n system. All user-visible copy in `apps/ui/src/app/landing/` should be translatable. Here is the complete workflow.

## Current Project State

Run these to understand what's already translated and what profiles exist:

```bash
!`pnpm --filter @shipeasy/mcp-server exec node dist/index.js list_resources 2>/dev/null | head -40`
```

## The Pattern

Every piece of user-visible text in a client component becomes a `t()` call:

```tsx
import { i18n } from "@shipeasy/sdk/client";

// Before (hardcoded):
<button>Install with Claude</button>

// After (translatable):
<button>{i18n.t("landing.nav.cta", "Install with Claude")}</button>
```

### `t()` signature

```ts
i18n.t(
  key: string,       // dot-separated key, e.g. "landing.hero.badge"
  fallback: string,  // shown when translation isn't loaded yet
  variables?: Record<string, string | number>,  // for {{interpolation}}
  description?: string,  // optional context for translators
)
```

### Key naming convention

`<chunk>.<component>.<element>`

- **chunk** — groups related keys (e.g. `landing`, `pricing`, `auth`)
- **component** — the component or section (e.g. `hero`, `nav`, `footer`)
- **element** — the specific piece (e.g. `cta`, `title`, `badge`)

Examples: `landing.nav.cta`, `landing.hero.title_suffix`, `landing.pricing.toggle_monthly`

### Variables / interpolation

```tsx
{
  i18n.t("landing.hero.meta_install", "{{seconds}}s install", { seconds: "8" });
}
```

The translation value stored in the backend would be `"{{seconds}}s install"`.

## Step-by-step workflow

### 1. Identify text to translate

Find hardcoded strings in the target component. For landing page components they live in:

- `apps/ui/src/app/landing/hero.tsx`
- `apps/ui/src/app/landing/nav.tsx`
- `apps/ui/src/app/landing/pricing.tsx`
- `apps/ui/src/app/landing/testimonials-gate.tsx`
- `apps/ui/src/app/landing/announcement-bar.tsx`

### 2. Wrap strings with `t()`

Import `i18n` from `@shipeasy/sdk/client` and replace each string. Keep the original text as the `fallback` — it renders until the CDN profile loads.

```tsx
"use client";
import { i18n } from "@shipeasy/sdk/client";

// Wrap inline text:
{
  i18n.t("landing.hero.badge", "Shipeasy speaks MCP — installs in Claude in 12 seconds");
}

// Wrap with a description for translators:
{
  i18n.t(
    "landing.hero.title_suffix",
    "faster, just by asking Claude.",
    undefined,
    "Hero headline suffix after '10×'",
  );
}

// With interpolated variables:
{
  i18n.t("landing.hero.meta_install", "{{seconds}}s install", { seconds: "<8ms" });
}
```

### 3. Create the keys in the Shipeasy backend

Use the MCP tool for each new key. The `chunk` groups related keys for efficient loading:

```
mcp__shipeasy__i18n_create_key({
  key: "landing.hero.badge",
  default_value: "Shipeasy speaks MCP — installs in Claude in 12 seconds",
  chunk: "landing",
  profile: "en:prod"
})
```

Repeat for every new key. Each call returns `{ upserted: 1 }` on success.

### 4. Publish the chunk to CDN

After creating all keys, push them to the CDN so the loader can fetch them:

```
mcp__shipeasy__i18n_publish_profile({
  profile: "en:prod",
  chunk: "landing"
})
```

This rebuilds the KV manifest and purges the CDN cache. Returns `{ ok: true, published_at: "..." }`.

### 5. Verify in the browser

Open `http://localhost:3000/?se=1` and check the devtools panel — the Translations tab should list all keys in the chunk. With `?se=1&se_edit_labels=1` you get inline edit mode where all translatable text is highlighted.

## Chunks

| Chunk       | When to use                                                                  |
| ----------- | ---------------------------------------------------------------------------- |
| `landing`   | All landing page components (`hero`, `nav`, `pricing`, `testimonials`, etc.) |
| `auth`      | Sign-in, sign-up, OAuth prompts                                              |
| `dashboard` | App interior — flags list, experiment editor, settings                       |

Use the same chunk for all keys on a given page or section so they load in a single CDN fetch.

## Complete example

Adding two new keys to the hero section:

**1. Edit `apps/ui/src/app/landing/hero.tsx`:**

```tsx
// Before:
<p className="lp-hero-sub">
  Ship faster with AI-native tools.
</p>

// After:
<p className="lp-hero-sub">
  {i18n.t("landing.hero.sub", "Ship faster with AI-native tools.", undefined, "Hero subheading")}
</p>
```

**2. Create the key:**

```
mcp__shipeasy__i18n_create_key({
  key: "landing.hero.sub",
  default_value: "Ship faster with AI-native tools.",
  chunk: "landing",
  profile: "en:prod"
})
```

**3. Publish:**

```
mcp__shipeasy__i18n_publish_profile({ profile: "en:prod", chunk: "landing" })
```

## Rules

- **Never** call `i18nClient.init()`, `fetchLabels()`, or any separate i18n configuration. The SDK initialises itself via `shipeasy()` in `layout.tsx`.
- **Always** use `i18n` from `@shipeasy/sdk/client` (not `@shipeasy/react` hooks) to keep it vanilla-JS-compatible.
- **Always** use the same `profile` (`en:prod`) and the appropriate `chunk`.
- **Never** create keys without publishing — unpublished keys fall back to the hardcoded string, which is fine, but the devtools panel won't list them.
- **Publish once** after creating all keys for a given chunk, not after each individual key.
