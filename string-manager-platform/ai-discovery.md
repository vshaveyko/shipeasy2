> **Historical design doc** (pre-shipeasy-unification, 2026-04-13). Written when i18n was the whole product; now it's one subapp of the unified shipeasy.ai Next.js app. Branding and domain references may be out of date. See [TODO.md](../TODO.md) for current architecture.

# Plan: ShipEasyI18n AI Discovery — "Translate my website using <url>"

**Goal**: When a user types `translate my website using https://myapp.com` into Claude Code (or any MCP-enabled AI assistant), the agent fetches the URL, discovers everything it needs autonomously, and completes the full translation onboarding flow without further prompting.

**Key insight**: The page itself cannot contain secrets or repo credentials — those live in the user's environment. What the page provides is a machine-readable _discovery manifest_ that tells the AI what the site is, what translations it needs, and how to proceed. The AI combines this with the local environment (CLI credentials, git repo) to execute the full flow.

---

## What the AI needs to complete the full flow

```
1. Identify the site → public key (which ShipEasyI18n account)
2. Understand current state → which profiles exist, what's translated
3. Know the framework → which codemod to run
4. Know translation targets → which languages to add
5. Have glossary context → what terms must not be translated
6. Execute → codemod → push → translate → publish → validate
```

---

## Discovery mechanism — two layers

### Layer 1: HTML meta tags (fast, always fetchable)

Minimal signal embedded in the page `<head>`. Claude reads these first from a single HTTP fetch:

```html
<!-- Required: identifies the ShipEasyI18n account -->
<link rel="i18n-config" href="/.well-known/i18n.json" />
<meta name="i18n:key" content="i18n_pk_abc123" />

<!-- Recommended: helps AI understand current state without a second fetch -->
<meta name="i18n:source-profile" content="en:prod" />
<meta name="i18n:framework" content="nextjs" />

<!-- Optional: script tag presence tells AI onboarding is already done -->
<script
  src="https://cdn.i18n.shipeasy.ai/loader.js"
  data-key="i18n_pk_abc123"
  data-profile="en:prod"
  async
></script>
```

If `<link rel="i18n-config">` is present → fetch the manifest. If the ShipEasyI18n script tag is already present → onboarding already done, AI skips to coverage/translation check.

---

### Layer 2: `/.well-known/i18n.json` (full discovery manifest)

Served at a standard well-known URL. Public, no auth required. Contains everything the AI needs to plan and execute the full flow:

```json
{
  "version": 1,
  "key": "i18n_pk_abc123",

  "profiles": {
    "source": "en:prod",
    "existing": ["en:prod"],
    "targets": ["fr:prod", "de:prod", "es:prod"],
    "pending": ["fr:prod"]
  },

  "framework": "nextjs",
  "frameworkVersion": "14",
  "srcDir": "src/",
  "scriptTagPlacement": "app/layout.tsx",

  "chunks": {
    "index": ["nav.*", "common.*", "footer.*"],
    "checkout": ["checkout.*", "payment.*"],
    "account": ["account.*", "profile.*"]
  },

  "coverage": {
    "en:prod": 1.0,
    "fr:prod": 0.43,
    "de:prod": 0.0,
    "es:prod": 0.0
  },

  "glossary": ["Dashboard", "Analytics", "Workspace"],

  "instructions": "This is a Next.js 14 App Router application. Source language is English (en:prod). Translate to French, German, and Spanish. The Checkout flow is highest priority. Preserve all {{variable}} tokens exactly. Do not translate brand names or glossary terms.",

  "onboarding": {
    "scriptTagInstalled": false,
    "keysExist": false,
    "codemodRun": false
  },

  "i18nVersion": "1"
}
```

---

## Field reference

| Field                | Required | Purpose                                                      |
| -------------------- | -------- | ------------------------------------------------------------ |
| `version`            | Yes      | Manifest schema version                                      |
| `key`                | Yes      | Public key — identifies account, used by CLI + MCP           |
| `profiles.source`    | Yes      | Which profile holds the source (original) strings            |
| `profiles.existing`  | Yes      | Profiles already in ShipEasyI18n                             |
| `profiles.targets`   | Yes      | Profiles the site owner wants to add                         |
| `profiles.pending`   | No       | Targets started but not complete                             |
| `framework`          | Yes      | Which codemod to run                                         |
| `frameworkVersion`   | No       | Helps AI pick the right adapter                              |
| `srcDir`             | No       | Where to run the codemod (default: `src/`)                   |
| `scriptTagPlacement` | No       | Exact file where AI should add the script tag                |
| `chunks`             | No       | Chunk definitions — AI can infer but this avoids guessing    |
| `coverage`           | No       | % translated per profile — AI uses this to prioritize        |
| `glossary`           | No       | Terms that must never be translated                          |
| `instructions`       | No       | Free-text instructions for the AI — highest priority context |
| `onboarding.*`       | No       | State flags so AI knows what's already done                  |

---

## Full autonomous flow the AI executes

```
User: "translate my website using https://myapp.com"

Step 1: Fetch https://myapp.com
  → read <meta name="i18n:key"> → i18n_pk_abc123
  → read <link rel="i18n-config"> → /.well-known/i18n.json
  → check: is ShipEasyI18n script tag already present?

Step 2: Fetch https://myapp.com/.well-known/i18n.json
  → parse framework: "nextjs"
  → parse source: "en:prod"
  → parse targets: ["fr:prod", "de:prod", "es:prod"]
  → parse coverage: fr:prod=43%, de:prod=0%, es:prod=0%
  → parse instructions: "Checkout flow is highest priority..."
  → parse onboarding: scriptTagInstalled=false, keysExist=false

Step 3: Plan — report to user before acting
  "I found your ShipEasyI18n config. Here's what I'll do:
   1. Run i18n codemod nextjs (src/ not yet labeled)
   2. Push 0 existing keys to ShipEasyI18n
   3. Add script tag to app/layout.tsx
   4. Translate en:prod → fr:prod (57% missing), de:prod (100% missing), es:prod (100% missing)
   5. Publish all profiles
   Estimated: ~N strings to translate. Proceed?"

Step 4: Execute (on confirmation)
  $ i18n codemod nextjs --path src/
  → 2-pass: detect common strings, transform files, write i18n-codemod-review.json

  $ i18n push
  → creates all discovered keys in ShipEasyI18n under en:prod

  [add script tag to app/layout.tsx]
  → inserts <script> tag in the correct location for nextjs App Router

  $ i18n translate --from en:prod --to fr:prod --missing-only
  $ i18n translate --from en:prod --to de:prod --missing-only
  $ i18n translate --from en:prod --to es:prod --missing-only
  → creates drafts for each target profile

  $ i18n draft publish  (for each draft)
  → publishes all three translations

  $ i18n publish --profile en:prod
  → publishes source profile

  $ i18n validate
  → confirms all keys in code exist in ShipEasyI18n

Step 5: Report
  "Done. Your site is now translated into French, German, and Spanish.
   - 142 strings translated across 3 languages
   - 23 strings skipped (see i18n-codemod-review.json for manual review)
   - Script tag added to app/layout.tsx
   - All profiles published to CDN

   Visit https://myapp.com?i18n_edit=1 to preview translations in-browser."
```

---

## What generates `/.well-known/i18n.json`

The manifest is **auto-generated by ShipEasyI18n** and served from the management API — customers never write it manually.

When a customer sets up their account in the dashboard:

1. They configure profiles, targets, framework, chunks, glossary
2. ShipEasyI18n generates the manifest automatically
3. ShipEasyI18n serves it at `https://api.i18n.shipeasy.ai/sites/i18n_pk_abc123/manifest.json`

The customer just adds one thing to their server config — a proxy rule:

```nginx
# nginx
location /.well-known/i18n.json {
  proxy_pass https://api.i18n.shipeasy.ai/sites/i18n_pk_abc123/manifest.json;
}
```

```js
// next.config.mjs
async rewrites() {
  return [{ source: '/.well-known/i18n.json', destination: 'https://api.i18n.shipeasy.ai/sites/i18n_pk_abc123/manifest.json' }]
}
```

```ruby
# Rails routes.rb
get '/.well-known/i18n.json', to: redirect('https://api.i18n.shipeasy.ai/sites/i18n_pk_abc123/manifest.json')
```

ShipEasyI18n keeps the manifest fresh — coverage percentages update on every publish, `onboarding.*` flags update as the customer completes steps.

---

## Skill file for Claude Code (`packages/cli/skills/i18n-from-url.md`)

Installed by `i18n init --skills`. Tells Claude Code how to handle the URL pattern:

```markdown
---
name: i18n-from-url
description: Complete ShipEasyI18n translation onboarding from a website URL
trigger: user provides a URL and asks to translate/localize/internationalize the site
---

WORKFLOW:

1. Extract URL from user message
2. Fetch the URL with WebFetch
3. Check <head> for:
   - <meta name="i18n:key"> → extract public key
   - <link rel="i18n-config"> → fetch /.well-known/i18n.json
   - existing <script src="cdn.i18n.shipeasy.ai/loader.js"> → onboarding already done
4. If no i18n:key meta tag → site is not configured for ShipEasyI18n yet
   → instruct user to sign up at app.i18n.shipeasy.ai and add the meta tag first
5. Fetch /.well-known/i18n.json
6. Read onboarding state:
   - scriptTagInstalled: false → codemod + push + add script tag needed
   - keysExist: false → push needed
   - coverage[target] < 1.0 → translation needed
7. Present plan to user BEFORE executing anything
8. On confirmation, run MCP tools in order:
   i18n_scan_code → i18n_create_key (for each) → [add script tag] →
   i18n_translate_all → i18n_draft_publish → i18n_publish
9. Run i18n_validate to confirm
10. Report: strings translated, skipped, profiles published, preview URL
```

---

## Edge cases

**Site has no `/.well-known/i18n.json`**
→ AI falls back to reading HTML meta tags only. If no `i18n:key` either → tell user "I couldn't find ShipEasyI18n configuration on this site. Add `<meta name=\"i18n:key\" content=\"i18n_pk_...\">` to your `<head>`, or visit app.i18n.shipeasy.ai to get your key."

**Site already has ShipEasyI18n installed (script tag present)**
→ Skip codemod and push. Go straight to coverage check → translate missing → publish.

**Framework not specified in manifest**
→ AI attempts detection: check HTML for Next.js meta tags (`__NEXT_DATA__`), Vue comments, Angular attributes, Rails CSRF meta. Falls back to `html` codemod if uncertain.

**`scriptTagPlacement` not specified**
→ AI detects entry point by framework: `app/layout.tsx` (Next.js App Router), `pages/_document.tsx` (Next.js Pages), `index.html` (Vite/CRA), `app/views/layouts/application.html.erb` (Rails).

**Large codebase — codemod takes a long time**
→ AI informs user upfront: "Found 847 files to scan. This may take a few minutes." Runs codemod with progress output.

**Translation API errors**
→ AI creates the draft with successfully translated strings, reports which keys failed, suggests retry.

**Manifest coverage data is stale**
→ AI runs `i18n coverage --all` via CLI to get fresh numbers before planning.

---

## API endpoint: `GET /sites/:key/manifest.json`

New endpoint in `packages/api/src/routes/sites.ts`:

```typescript
import { Hono } from "hono";
import { Env } from "../index";

const sites = new Hono<{ Bindings: Env }>();

// Public — no auth. Returns machine-readable discovery manifest.
sites.get("/:key/manifest.json", async (c) => {
  const publicKey = c.req.param("key");

  // Validate key exists
  const kvData = (await c.env.KV_KEYS.get(publicKey, "json")) as { accountId: string } | null;
  if (!kvData) return c.json({ error: "Unknown key" }, 404);

  const accountId = kvData.accountId;
  const db = c.env.DB;

  const [account, profiles, chunks, keys, seats] = await Promise.all([
    db.prepare("SELECT name FROM accounts WHERE id = ?").bind(accountId).first<any>(),
    db.prepare("SELECT * FROM label_profiles WHERE account_id = ?").bind(accountId).all(),
    db
      .prepare(
        "SELECT lc.*, lp.name as profile_name FROM label_chunks lc JOIN label_profiles lp ON lp.id = lc.profile_id WHERE lp.account_id = ?",
      )
      .bind(accountId)
      .all(),
    db
      .prepare(
        "SELECT profile_id, COUNT(*) as total FROM label_keys WHERE profile_id IN (SELECT id FROM label_profiles WHERE account_id = ?) GROUP BY profile_id",
      )
      .bind(accountId)
      .all(),
    db
      .prepare(
        "SELECT COUNT(*) as count FROM developer_seats WHERE account_id = ? AND last_active_at > datetime('now', '-30 days')",
      )
      .bind(accountId)
      .first<{ count: number }>(),
  ]);

  // Fetch account config (framework, targets, glossary, instructions, onboarding state)
  const config = await db
    .prepare("SELECT * FROM account_i18n_config WHERE account_id = ?")
    .bind(accountId)
    .first<any>();

  // Build coverage map
  const keysByProfile = new Map<string, number>();
  for (const k of keys.results as any[]) keysByProfile.set(k.profile_id, k.total);

  const profileList = profiles.results as any[];
  const sourceProfileName = config?.source_profile ?? profileList[0]?.name;
  const sourceProfile = profileList.find((p) => p.name === sourceProfileName);
  const sourceKeyCount = sourceProfile ? (keysByProfile.get(sourceProfile.id) ?? 0) : 0;

  const coverage: Record<string, number> = {};
  for (const p of profileList) {
    const count = keysByProfile.get(p.id) ?? 0;
    coverage[p.name] = sourceKeyCount > 0 ? Math.round((count / sourceKeyCount) * 100) / 100 : 0;
  }

  // Build chunk map
  const chunkMap: Record<string, string[]> = {};
  for (const ch of chunks.results as any[]) {
    // chunk patterns stored as JSON in account_i18n_config
    chunkMap[ch.name] = JSON.parse(config?.chunk_patterns ?? "{}")[ch.name] ?? [];
  }

  const manifest = {
    version: 1,
    key: publicKey,
    profiles: {
      source: sourceProfileName,
      existing: profileList.map((p) => p.name),
      targets: JSON.parse(config?.target_profiles ?? "[]"),
      pending: profileList
        .filter((p) => (coverage[p.name] ?? 0) < 1 && p.name !== sourceProfileName)
        .map((p) => p.name),
    },
    framework: config?.framework ?? null,
    frameworkVersion: config?.framework_version ?? null,
    srcDir: config?.src_dir ?? "src/",
    scriptTagPlacement: config?.script_tag_placement ?? null,
    chunks: chunkMap,
    coverage,
    glossary: JSON.parse(config?.glossary ?? "[]"),
    instructions: config?.ai_instructions ?? null,
    onboarding: {
      scriptTagInstalled: config?.script_tag_installed ?? false,
      keysExist: sourceKeyCount > 0,
      codemodRun: config?.codemod_run ?? false,
    },
    i18nVersion: "1",
  };

  return c.json(manifest, 200, {
    "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
    "Access-Control-Allow-Origin": "*",
  });
});

export { sites as sitesRoutes };
```

---

## Dashboard: AI Discovery settings page

New section in account settings where customers configure what the manifest exposes:

```
/settings/ai-discovery

  Framework          [Next.js 14 ▼]
  Source directory   [src/        ]
  Script tag file    [app/layout.tsx]

  Translation targets
    [+ Add language]
    ✓ French (fr:prod)
    ✓ German (de:prod)
    ✓ Spanish (es:prod)

  Glossary terms (never translated)
    Dashboard, Analytics, Workspace
    [+ Add term]

  AI instructions (optional)
    Free text hints for the AI agent, e.g. which flows are highest priority,
    naming conventions, tone.
    [                                        ]

  Onboarding status
    ✓ Script tag installed
    ✓ Keys pushed (142 keys)
    ✗ Codemod not run — run `i18n codemod nextjs`

  Discovery URL
    /.well-known/i18n.json  [Copy proxy snippet ▼]
    [Test manifest →]
```

`[Test manifest →]` opens `https://api.i18n.shipeasy.ai/sites/i18n_pk_abc123/manifest.json` in a new tab so the customer can see exactly what the AI will read.

---

## Schema addition `shared/schema/007_ai_discovery.sql`

```sql
CREATE TABLE account_i18n_config (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL UNIQUE REFERENCES accounts(id),
  framework TEXT,
  framework_version TEXT,
  src_dir TEXT DEFAULT 'src/',
  script_tag_placement TEXT,
  source_profile TEXT,
  target_profiles TEXT DEFAULT '[]',      -- JSON array of profile names
  chunk_patterns TEXT DEFAULT '{}',       -- JSON map chunk → key patterns
  glossary TEXT DEFAULT '[]',             -- JSON array of terms
  ai_instructions TEXT,
  script_tag_installed INTEGER DEFAULT 0,
  codemod_run INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```
