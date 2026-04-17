# Landing page concepts

Five static HTML landing-page directions for shipeasy, built side-by-side so you can compare and pick a tone before we port the winner (or a Frankenstein) to Next.js.

## How to view

Everything is plain HTML/CSS/JS with no build step. Two options:

```bash
# Option A — open directly
open landing-concepts/index.html

# Option B — serve (recommended; avoids file:// quirks)
cd landing-concepts && python3 -m http.server 5173
# then visit http://localhost:5173
```

The gallery at `index.html` links to each concept.

## The pitch

All five concepts lead with the same core positioning:

> **Don't just let AI ship code. Let it ship experiments.**
>
> ShipEasy is the experimentation backend for AI agents. Claude, Cursor, and the `shipeasy` CLI can create flags, launch A/B experiments, roll out translations, and read statistically defensible verdicts — through 9 MCP tools, 12 Claude Code skills, and a deterministic CLI. Humans can still click a dashboard. Agents don't have to.

The variation across concepts is in **audience** and **voice**, not in the pitch:

| #   | File                         | Audience                                      | AI-first angle                                                     |
| --- | ---------------------------- | --------------------------------------------- | ------------------------------------------------------------------ |
| 1   | `concept-01-terminal.html`   | HN / staff eng shipping with Claude Code      | Hero is a live agent session calling MCP tools                     |
| 2   | `concept-02-data.html`       | PMs / eng leads worried about agent output    | Dashboard shows experiment "created by @claude-agent"              |
| 3   | `concept-03-editorial.html`  | Brand-conscious founders, design-aware buyers | Manifesto on AI accountability; tenets reframed around agent loops |
| 4   | `concept-04-playful.html`    | Solo indie hackers vibe-coding with Claude    | "You vibe-code. Claude ships. We run the A/Bs."                    |
| 5   | `concept-05-enterprise.html` | Platform teams running agent-assisted eng     | Scoped MCP tokens · SIEM-exported agent audit trail                |

Each concept covers the same story arc:

1. Nav + locale switcher
2. Hero with primary value prop + CTA
3. Visual proof (code, dashboard, diagram, or toggle card depending on concept)
4. Social proof (logos, testimonials, or editorial pull-quote)
5. Features / capabilities
6. Stats, SLAs, or comparison
7. Final CTA + footer

## i18n / string-manager module

All five concepts load the same tiny runtime in `_shared/i18n.js` to demonstrate the pattern the real app should adopt.

### What the runtime does

- Every visible string has a stable key (e.g. `hero.title`, `cta.primary`).
- Strings live in a `CONCEPT_TRANSLATIONS` map per locale, never in markup.
- Locale switch is instant, no reload — ready for the Next.js App Router flow.
- Graceful fallback to `en` when a key is missing in the active locale.

### Features supported

| Feature               | Markup                                           | Runtime behavior                                         |
| --------------------- | ------------------------------------------------ | -------------------------------------------------------- |
| Basic lookup          | `<h1 data-i18n="hero.title">`                    | Replaces `textContent`                                   |
| HTML content          | `<p data-i18n="hero.sub" data-i18n-html="true">` | Replaces `innerHTML` (use sparingly, sanitize on ingest) |
| Interpolation         | `data-i18n-vars='{"name":"Alex","count":12}'`    | `{{name}}` → value                                       |
| Pluralization         | `data-i18n-plural="5"`                           | Picks `one` / `other` (and `zero`) from entry object     |
| Attribute translation | `data-i18n-attr="placeholder:form.email"`        | Sets `placeholder` attribute from key                    |
| Locale switcher       | `<button data-locale-switch="ja">JA</button>`    | Persists in `localStorage`, updates `html[lang]`         |
| Designer QA overlay   | `⌘/Ctrl + Shift + K`                             | Overlays translation keys next to every translated node  |

### Locales bundled

Each concept ships with `en`, `es`, `de`, `ja` inline in its `<script>` block. The four were chosen to stress layout:

- **en** — baseline
- **de** — long compound words break narrow columns (good stress test for hero headlines)
- **es** — slightly longer than `en`, plus non-ASCII (¿, ñ)
- **ja** — no spaces between tokens, CJK metrics, validates line-heights & logical properties

### Why translations are inline (and not in `locales/*.json`)

`fetch()` doesn't work against `file://`. Inlining keeps the concepts viewable by double-clicking. In the real Next.js app, translations should live in `packages/i18n/locales/{en,es,de,ja}/*.json`, keyed by namespace (e.g. `landing.json`, `dashboard.json`), and be loaded via the Next.js App Router's `generateStaticParams` over `[locale]/`.

### Proposed production architecture

```
packages/
  i18n/                    @shipeasy/i18n (new)
    src/
      index.ts             t(), useT(), setLocale()
      format.ts            ICU MessageFormat, plurals, gender, dates
      memory.ts            Translation memory / version pinning
      locales/
        en/landing.json
        en/dashboard.json
        en/emails.json
        es/landing.json
        ...
    schema.ts              Zod schema for validating locale files in CI
```

Because `@shipeasy/core` already exposes plan-scoped KV helpers, the production i18n layer should treat a translation key as a special kind of **flag**:

- A `type: "i18n_string"` flag stores a locale → string map in KV
- SDK evaluation returns the right locale based on user context
- This unlocks A/B-testing copy with the same statistical engine used for feature experiments
- The editorial (concept 3) and enterprise (concept 5) pages both call this out explicitly

See `experiment-platform/README.md` §copy experiments for the existing design-doc sketch that slots in here.

## File layout

```
landing-concepts/
├── README.md                       # this file
├── index.html                      # gallery — start here
├── _shared/
│   ├── i18n.js                     # 100-line i18n runtime
│   └── reset.css                   # minimal reset + shared utilities
├── concept-01-terminal.html        # dev-first dark
├── concept-02-data.html            # chart / numbers
├── concept-03-editorial.html       # bold typography
├── concept-04-playful.html         # gradients / glass
└── concept-05-enterprise.html      # architecture / compliance
```

## Picking a direction

For the expected shipeasy buyer (technical founder / staff eng at a team that cares about statistical rigor), concepts **1 (terminal)** and **2 (data lab)** are the closest shots. Concept 3 (editorial) could work as the `/manifesto` page even if we don't pick it for the homepage — the voice is strong and differentiated.

For sales-led motion into regulated orgs, concept 5 is the only one that treats compliance as a first-class citizen.

Concept 4 is the safest choice for broad top-of-funnel reach but feels a half-step off-brand for a rigor-forward product — it leans warmer than the platform actually is.
