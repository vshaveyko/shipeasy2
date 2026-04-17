> **Historical design doc** (pre-shipeasy-unification, 2026-04-13). The `start.i18n.shipeasy.ai` subdomain collapses into a route under the unified `shipeasy.ai` app (likely `/i18n/start` or `/start`). Flow + prompts still apply. See [TODO.md](../TODO.md) for current architecture.

# Plan: start.i18n.shipeasy.ai — AI Onboarding Page

**Goal**: A page at `start.i18n.shipeasy.ai` that when fetched by Claude Code (or any AI agent) contains complete, unambiguous instructions to fully install and configure ShipEasyI18n within the user's current project — zero prior knowledge required.

**URL**: `start.i18n.shipeasy.ai`
**Package**: `packages/landing` (new route) or dedicated `packages/start`
**Deployed**: Cloudflare Pages

---

## How it's used

```
User types in Claude Code:
  "set up translations for this project using start.i18n.shipeasy.ai"
  "translate this app — follow start.i18n.shipeasy.ai"
  "go to start.i18n.shipeasy.ai and do what it says"

Claude:
  1. Fetches https://start.i18n.shipeasy.ai
  2. Reads the AI instructions section
  3. Executes the full setup flow autonomously within the current working directory
  4. Reports back when done
```

No user website URL needed. Claude works on the **current local project**.

---

## Page structure

The page serves two audiences simultaneously:

- **Humans** — clean marketing/onboarding page explaining ShipEasyI18n
- **AI agents** — structured instruction block Claude reads and follows literally

The AI instruction block is demarcated clearly so Claude can find it instantly without parsing marketing copy.

---

## Full page content (`packages/landing/app/start/page.tsx`)

```tsx
export const metadata = {
  title: 'Get started with ShipEasyI18n — Label Rewrite Service',
  description: 'Add translations to any web app in minutes.',
}

export default function StartPage() {
  return (
    <>
      {/* ── Human-facing section ───────────────────────────── */}
      <main className="max-w-2xl mx-auto px-6 py-16 font-sans">
        <div className="mb-12">
          <img src="/logo.svg" alt="ShipEasyI18n" className="h-8 mb-8" />
          <h1 className="text-4xl font-bold tracking-tight mb-4">
            Translate any web app.<br />Without touching your code.
          </h1>
          <p className="text-lg text-gray-500">
            ShipEasyI18n lets you manage and override UI strings on any website via a script tag.
            Add translations, run A/B tests on copy, and update text without deployments.
          </p>
        </div>

        <div className="space-y-6 mb-12">
          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center text-sm font-bold shrink-0">1</div>
            <div>
              <div className="font-semibold">Sign up at app.i18n.shipeasy.ai</div>
              <div className="text-gray-500 text-sm">Create your account and get your public key</div>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center text-sm font-bold shrink-0">2</div>
            <div>
              <div className="font-semibold">Run the installer</div>
              <div className="text-gray-500 text-sm">One command sets up everything in your project</div>
              <pre className="mt-2 bg-gray-50 rounded px-3 py-2 text-sm font-mono">npx i18n-cli init</pre>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center text-sm font-bold shrink-0">3</div>
            <div>
              <div className="font-semibold">Extract and translate</div>
              <div className="text-gray-500 text-sm">The codemod finds all your strings automatically</div>
              <pre className="mt-2 bg-gray-50 rounded px-3 py-2 text-sm font-mono">npx i18n-cli codemod auto</pre>
            </div>
          </div>
        </div>

        <div className="border rounded-xl p-6 bg-gray-50">
          <div className="text-sm font-medium text-gray-500 mb-2">Or let your AI assistant do it</div>
          <p className="text-gray-700">
            If you're using Claude Code, Cursor, or another AI assistant with web access,
            just say: <span className="font-mono bg-white border rounded px-2 py-0.5 text-sm">"set up translations using start.i18n.shipeasy.ai"</span> — your AI will read this page and complete the full setup automatically.
          </p>
        </div>
      </main>

      {/* ── AI instruction block ───────────────────────────── */}
      {/*
        This section is written for AI agents (Claude Code, Cursor, Copilot, etc.)
        It is intentionally verbose, precise, and assumes zero prior context.
        Humans can ignore everything below this comment.
      */}
      <section
        id="ai-agent-instructions"
        aria-label="AI agent instructions"
        style={{ display: 'none' }}
        data-for="ai-agents"
      >
        <h2>INSTRUCTIONS FOR AI AGENTS</h2>
        <p>
          You are about to set up the Label Rewrite Service (ShipEasyI18n) in the user's current project.
          ShipEasyI18n allows UI strings to be managed and translated without code changes.
          Follow every step below in order. Do not skip steps. Do not ask the user for information
          that can be inferred from the project. Only ask when you are genuinely blocked.
        </p>

        <h3>WHAT YOU WILL DO</h3>
        <ol>
          <li>Check prerequisites</li>
          <li>Detect the project framework</li>
          <li>Install the ShipEasyI18n CLI</li>
          <li>Authenticate with ShipEasyI18n</li>
          <li>Initialize ShipEasyI18n in the project</li>
          <li>Run the codemod to extract strings</li>
          <li>Add the ShipEasyI18n script tag</li>
          <li>Push strings to ShipEasyI18n</li>
          <li>Configure translation targets</li>
          <li>Translate and publish</li>
          <li>Validate and report</li>
        </ol>

        <h3>STEP 1 — CHECK PREREQUISITES</h3>
        <p>Run these checks before doing anything else:</p>
        <pre>
node --version   # Must be >= 18
git status       # Must be inside a git repo (warn if not, but continue)
cat i18n.config.json 2>/dev/null && echo "ShipEasyI18n_ALREADY_INIT" || echo "ShipEasyI18n_NOT_INIT"
        </pre>
        <p>
          If i18n.config.json already exists: ShipEasyI18n is already initialized.
          Skip to STEP 6 (codemod) if strings not yet extracted, or STEP 8 (push) if codemod already run.
          Read i18n.config.json to understand current state before proceeding.
        </p>

        <h3>STEP 2 — DETECT PROJECT FRAMEWORK</h3>
        <p>Read these files to detect the framework. Check in order — stop at first match:</p>
        <pre>
# Check package.json for dependencies
cat package.json 2>/dev/null

# Framework detection rules:
# "next" in dependencies → FRAMEWORK=nextjs
# "nuxt" in dependencies → FRAMEWORK=nuxt
# "@remix-run" in dependencies → FRAMEWORK=remix
# "vue" in dependencies (no "nuxt") → FRAMEWORK=vue
# "@angular/core" in dependencies → FRAMEWORK=angular
# "svelte" in dependencies (no "nuxt") → FRAMEWORK=svelte
# "@builder.io/qwik" in dependencies → FRAMEWORK=qwik
# "solid-js" in dependencies → FRAMEWORK=solid
# "astro" in dependencies → FRAMEWORK=astro

# If no package.json, check for server-side frameworks:
ls Gemfile 2>/dev/null && echo "FRAMEWORK=rails"
ls manage.py 2>/dev/null && echo "FRAMEWORK=django"
ls artisan 2>/dev/null && echo "FRAMEWORK=laravel"
ls wp-config.php 2>/dev/null && echo "FRAMEWORK=wordpress"

# If still unknown → FRAMEWORK=html (generic)
        </pre>
        <p>
          Also detect the source directory:
          Check for src/, app/, pages/, components/ in that order.
          Use the first one that exists and contains code files.
          For Rails: app/views/. For Django: templates/. For Laravel: resources/views/.
        </p>

        <h3>STEP 3 — INSTALL ShipEasyI18n CLI</h3>
        <pre>
# Check if already installed
npx i18n-cli --version 2>/dev/null && echo "CLI_INSTALLED" || echo "CLI_NOT_INSTALLED"

# Install as dev dependency (preferred — reproducible)
npm install --save-dev i18n-cli
# or if yarn:
yarn add --dev i18n-cli
# or if pnpm:
pnpm add --save-dev i18n-cli

# Verify installation
npx i18n-cli --version
        </pre>

        <h3>STEP 4 — AUTHENTICATE WITH ShipEasyI18n</h3>
        <pre>
# Check if already authenticated
npx i18n-cli whoami 2>/dev/null && echo "AUTH_OK" || echo "AUTH_NEEDED"
        </pre>
        <p>
          If not authenticated: tell the user exactly this message:
          "I need to log you into ShipEasyI18n. I'll open the browser — please sign in with Google, GitHub, or your email.
          If you don't have an account yet, sign up at app.i18n.shipeasy.ai (it's free). I'll wait."
          Then run:
        </p>
        <pre>
npx i18n-cli login
# This opens a browser. Wait for the user to complete login.
# Verify: npx i18n-cli whoami
        </pre>

        <h3>STEP 5 — INITIALIZE ShipEasyI18n IN THE PROJECT</h3>
        <pre>
npx i18n-cli init --framework {DETECTED_FRAMEWORK} --yes
        </pre>
        <p>
          This creates i18n.config.json, installs the pre-commit hook, and copies skill files.
          After running, read i18n.config.json and show the user what was configured.
          Ask the user ONE question: "Which languages do you want to translate into?
          (e.g. French, Spanish, German — or press Enter to skip for now)"
          If they provide languages, add them as target profiles in i18n.config.json:
          e.g. "fr:prod", "es:prod", "de:prod"
        </p>

        <h3>STEP 6 — RUN THE CODEMOD</h3>
        <p>
          The codemod scans the project and adds data-label attributes to all translatable strings.
          It runs in two passes: first to detect common strings (Cancel, Save, etc.), then to transform.
        </p>
        <pre>
npx i18n-cli codemod {DETECTED_FRAMEWORK} --dry-run
        </pre>
        <p>
          Show the user the dry-run summary. Explain what will be changed.
          If 0 strings found: the project may already use a translation library, or strings may be
          in an unusual format. Tell the user and ask how to proceed.
          If strings found, proceed:
        </p>
        <pre>
npx i18n-cli codemod {DETECTED_FRAMEWORK}
        </pre>
        <p>
          After the codemod completes:
          - Read i18n-codemod-review.json
          - Tell the user how many strings were transformed and how many were skipped
          - If skipped > 0: briefly explain the top 3 skip reasons
          - Do NOT ask the user to review every skipped string — just note the file exists for later
        </p>

        <h3>STEP 7 — ADD THE SCRIPT TAG</h3>
        <p>
          Add the ShipEasyI18n loader script tag to the project's HTML head.
          Read i18n.config.json to get the public key and default profile.
          Detect the correct entry point file by framework:
        </p>
        <pre>
# Entry point per framework:
# nextjs (App Router)  → app/layout.tsx or src/app/layout.tsx
# nextjs (Pages)       → pages/_document.tsx or src/pages/_document.tsx
# nuxt               → app.vue or layouts/default.vue
# remix              → app/root.tsx
# angular            → src/index.html
# vue (Vite)         → index.html
# svelte (SvelteKit) → src/app.html
# solid              → src/root.tsx or index.html
# qwik               → src/root.tsx
# astro              → src/layouts/Layout.astro or src/pages/index.astro
# rails              → app/views/layouts/application.html.erb
# django             → templates/base.html (or most-used base template)
# laravel            → resources/views/layouts/app.blade.php
# wordpress          → header.php in active theme, or functions.php with wp_head hook
# html               → index.html
        </pre>
        <p>
          Read the detected entry point file and add the script tag in the head section.
          Use the public key from i18n.config.json.
          The script tag must go BEFORE any framework scripts, as early in head as possible:
        </p>
        <pre>
&lt;script
  src="https://cdn.i18n.shipeasy.ai/loader.js"
  data-key="{PUBLIC_KEY}"
  data-profile="{DEFAULT_PROFILE}"
  async
&gt;&lt;/script&gt;
        </pre>
        <p>
          Special cases:
          - Next.js App Router: use next/script component with strategy="beforeInteractive" inside the head tag
          - Rails ERB: add &lt;%= i18n_inline_data %&gt; after the script tag if i18n-rails gem is installed
          - WordPress: add via wp_enqueue_script in functions.php OR wp_head hook
          After adding, show the user the diff of what changed.
        </p>

        <h3>STEP 8 — PUSH STRINGS TO ShipEasyI18n</h3>
        <pre>
npx i18n-cli push
        </pre>
        <p>
          This creates all discovered label keys in ShipEasyI18n.
          Show the user: "Pushed N keys to ShipEasyI18n under profile {DEFAULT_PROFILE}"
        </p>
        <pre>
npx i18n-cli publish
        </pre>
        <p>
          This regenerates the label files in the CDN.
          Show the user: "Published {DEFAULT_PROFILE} — your site is now connected to ShipEasyI18n."
        </p>

        <h3>STEP 9 — CONFIGURE TRANSLATION TARGETS</h3>
        <p>
          If the user specified target languages in STEP 5, create profiles for them now.
          For each target language (e.g. "French" → "fr:prod"):
        </p>
        <pre>
npx i18n-cli profile create fr:prod
npx i18n-cli profile create de:prod
npx i18n-cli profile create es:prod
        </pre>

        <h3>STEP 10 — TRANSLATE AND PUBLISH</h3>
        <p>
          If target profiles were configured, translate now using AI translation.
          This creates drafts — human review happens in the browser editor before publishing.
        </p>
        <pre>
# Translate to each target profile
npx i18n-cli translate --from {DEFAULT_PROFILE} --to fr:prod
npx i18n-cli translate --from {DEFAULT_PROFILE} --to de:prod
npx i18n-cli translate --from {DEFAULT_PROFILE} --to es:prod

# Publish drafts
npx i18n-cli draft publish --all
        </pre>
        <p>
          If no target profiles: skip this step. Tell the user they can add languages later
          from the dashboard at app.i18n.shipeasy.ai or by running: npx i18n-cli translate --to {language}
        </p>

        <h3>STEP 11 — VALIDATE AND REPORT</h3>
        <pre>
npx i18n-cli validate
        </pre>
        <p>
          If validation passes: report success.
          If validation fails: show which keys are missing and fix them with: npx i18n-cli push
        </p>
        <p>
          Final report to show the user — include ALL of these:
          1. How many strings were extracted (N keys)
          2. How many common strings went to the common chunk
          3. How many strings were skipped (with file reference)
          4. Which profiles are now live
          5. Translation coverage per profile (if translations were run)
          6. The script tag file that was modified
          7. The dashboard URL: app.i18n.shipeasy.ai
          8. How to preview the in-browser editor: visit the app and press Alt+Shift+E
          9. The pre-commit hook is now active — i18n validate runs before every commit
          10. Next steps:
              - Review skipped strings: cat i18n-codemod-review.json
              - Edit translations: app.i18n.shipeasy.ai or press Alt+Shift+E on your site
              - Add more languages: npx i18n-cli translate --to {language}
        </p>

        <h3>IMPORTANT RULES — READ BEFORE STARTING</h3>
        <ul>
          <li>NEVER modify node_modules, dist, .next, .nuxt, build, or out directories</li>
          <li>NEVER commit changes without asking the user first</li>
          <li>NEVER run i18n-cli commands that delete data (there are none, but do not improvise)</li>
          <li>If any step fails, diagnose the error before retrying. Do not retry blindly.</li>
          <li>If i18n.config.json already exists, READ IT before running init — do not overwrite existing config</li>
          <li>If the script tag already exists in the entry point file, do not add it again</li>
          <li>If data-label attributes already exist in the codebase, skip the codemod — strings are already labeled</li>
          <li>Show the user meaningful progress updates after each major step</li>
          <li>The total process should take 2–5 minutes for a typical project</li>
        </ul>

        <h3>TROUBLESHOOTING</h3>
        <pre>
# Auth fails → user needs to create an account first
open https://app.i18n.shipeasy.ai

# CLI not found after install → use full path
./node_modules/.bin/i18n-cli

# Codemod finds 0 strings in a JSX project
# → Check if JSX plugin is needed: the project may use .js files with JSX
# → Run: npx i18n-cli codemod react --path src/ (explicit path)

# Push fails with "invalid key"
# → Run: npx i18n-cli whoami (check auth)
# → Run: cat i18n.config.json (check key format — must start with i18n_pk_)

# Script tag entry point not found
# → Ask the user: "Where is your HTML head? Which file should I add the script tag to?"

# Translate fails (no AI translation on free plan)
# → Tell user: "AI translation requires Pro plan. You can translate manually at app.i18n.shipeasy.ai"
        </pre>

        <h3>CONTEXT FOR AI AGENTS</h3>
        <p>
          ShipEasyI18n (Label Rewrite Service) is a SaaS platform.
          Public keys (i18n_pk_...) are safe to embed in HTML — they are not secrets.
          Secret tokens (i18n_at_...) must never be committed to git or added to any file.
          The pre-commit hook (i18n validate) is safe — it only reads, never modifies files.
          The codemod is non-destructive — it adds attributes to existing elements, never removes content.
          All label files are served from cdn.i18n.shipeasy.ai — no infrastructure setup is required.
          This page was last updated: 2026-04-11.
          For questions: docs.i18n.shipeasy.ai
        </p>
      </section>
    </>
  )
}
```

---

## Why `style={{ display: 'none' }}` on the AI section

The AI instruction block must be:

- **Present in the HTML source** — Claude fetches raw HTML, not rendered DOM. `display:none` still appears in source.
- **Hidden from humans** — prevents confusing wall of text for real visitors
- **Clearly marked** — `id="ai-agent-instructions"` + `data-for="ai-agents"` + `aria-label` give Claude unambiguous signal

Claude's WebFetch reads raw HTML. The instruction block will be fully visible in the fetched content even though it's hidden visually.

---

## Alternative: plain text endpoint at `/start.txt`

Some AI tools fetch plain text better than HTML. Also expose:

```
GET https://start.i18n.shipeasy.ai/start.txt
Content-Type: text/plain

ShipEasyI18n SETUP INSTRUCTIONS FOR AI AGENTS
=====================================
[same content as the hidden section, plain text format]
```

Claude Code's WebFetch handles both HTML and plain text — expose both. Add a `<link>` in the page head:

```html
<link rel="alternate" type="text/plain" href="/start.txt" title="AI agent instructions" />
```

---

## Route in Next.js landing package

**Files:**

- `packages/landing/app/start/page.tsx` — the page above
- `packages/landing/app/start/route.ts` — plain text endpoint
- `packages/landing/app/start/layout.tsx` — minimal layout (no nav/footer)

```typescript
// packages/landing/app/start/route.ts
export async function GET() {
  const text = `
ShipEasyI18n SETUP INSTRUCTIONS FOR AI AGENTS
=====================================
Fetched from: https://start.i18n.shipeasy.ai
Last updated: 2026-04-11

You are setting up ShipEasyI18n (Label Rewrite Service) in the user's current project.
Follow all steps in order. See https://start.i18n.shipeasy.ai for full HTML version with structured steps.

QUICK REFERENCE
---------------
Install:    npm install --save-dev i18n-cli
Auth:       npx i18n-cli login
Init:       npx i18n-cli init --yes
Codemod:    npx i18n-cli codemod auto
Push:       npx i18n-cli push
Publish:    npx i18n-cli publish
Validate:   npx i18n-cli validate

FULL STEPS
----------
[... identical to the HTML section, plain text ...]
`.trim();

  return new Response(text, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
```

---

## DNS and deployment

```bash
# Cloudflare Pages: add custom domain
# Project: i18n-landing → Custom domains → Add → start.i18n.shipeasy.ai

# Or: deploy as standalone Pages project
cd packages/landing && pnpm build
wrangler pages deploy out --project-name i18n-start
# Add custom domain start.i18n.shipeasy.ai in Cloudflare dashboard
```

---

## `i18n codemod auto` — framework autodetect command

The page references `npx i18n-cli codemod auto` — a convenience command that autodetects the framework and runs the right codemod. Add to the CLI:

```typescript
// packages/cli/src/commands/codemod.ts — add 'auto' as special framework value
if (framework === "auto") {
  framework = await detectFramework(); // reads package.json, file structure
  console.log(chalk.gray(`  Detected framework: ${framework}\n`));
}
```

```typescript
// packages/cli/src/lib/detectFramework.ts
import { readFile, access } from "fs/promises";

export async function detectFramework(): Promise<string> {
  try {
    const pkg = JSON.parse(await readFile("package.json", "utf8"));
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    if (deps["next"]) return "react"; // Next.js uses React codemod
    if (deps["nuxt"]) return "vue"; // Nuxt uses Vue codemod
    if (deps["@remix-run/react"]) return "react";
    if (deps["@angular/core"]) return "angular";
    if (deps["svelte"]) return "svelte";
    if (deps["@builder.io/qwik"]) return "qwik";
    if (deps["solid-js"]) return "solid";
    if (deps["astro"]) return "html";
    if (deps["vue"]) return "vue";
    if (deps["react"]) return "react";
  } catch {}

  // No package.json — check server frameworks
  try {
    await access("Gemfile");
    return "rails";
  } catch {}
  try {
    await access("manage.py");
    return "django";
  } catch {}
  try {
    await access("artisan");
    return "laravel";
  } catch {}
  try {
    await access("wp-config.php");
    return "wordpress";
  } catch {}

  return "html"; // fallback
}
```

---

## Skill file `packages/cli/skills/i18n-start-page.md`

Installed by `i18n init --skills`. Tells Claude Code to recognize the start.i18n.shipeasy.ai pattern:

```markdown
---
name: i18n-start-page
description: Set up ShipEasyI18n in the current project by following start.i18n.shipeasy.ai instructions
trigger: user mentions start.i18n.shipeasy.ai, or asks to set up/install ShipEasyI18n, or asks to add translations to the current project
---

WORKFLOW:

1. Fetch https://start.i18n.shipeasy.ai using WebFetch
2. Find the section with id="ai-agent-instructions" or data-for="ai-agents"
3. Read all steps inside that section
4. Follow them exactly, in order
5. Use the current working directory as the project root
6. Do not ask the user for information the steps say can be inferred

If WebFetch fails: use the plain text version at https://start.i18n.shipeasy.ai/start.txt
If both fail: tell the user and direct them to docs.i18n.shipeasy.ai/getting-started
```

---

## What this enables

```
# All of these phrases trigger the same autonomous flow:

"set up translations using start.i18n.shipeasy.ai"
"translate this app — follow start.i18n.shipeasy.ai"
"go to start.i18n.shipeasy.ai and set up ShipEasyI18n"
"add i18n to this project with start.i18n.shipeasy.ai"
"i18n.shipeasy.ai/start this codebase"

# Claude fetches the page, reads the instructions, and:
# → detects Next.js from package.json
# → installs i18n-cli
# → logs in (browser popup)
# → runs codemod (finds 142 strings)
# → adds script tag to app/layout.tsx
# → pushes 142 keys
# → translates to French and German (user specified in step 5)
# → publishes
# → validates
# → reports: "Done. 142 strings extracted, 2 languages live. Press Alt+Shift+E to preview."
```
