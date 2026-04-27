# Client SDKs

SDKs that ship inside browsers, mobile apps, or other untrusted runtimes.
These authenticate with **client (public)** keys and are restricted to
`POST /sdk/evaluate` and `POST /collect` — they cannot pull the full
gates/experiments blobs.

| Package                                     | Runtime                                          |
| ------------------------------------------- | ------------------------------------------------ |
| `sdk-vue`                                   | Vue 3 — composables over `@shipeasy/sdk/client`  |
| `sdk-svelte`                                | Svelte / SvelteKit — readable stores             |
| `sdk-angular`                               | Angular 17+ — `Injectable` + `Observable`        |
| `react`                                     | React + Next.js — published from a separate repo |
| `i18n-core`                                 | Framework-agnostic i18n runtime + types          |
| `i18n-vue` / `i18n-svelte` / `i18n-angular` | Reactive bindings for the string manager         |

The dual-build TypeScript SDK (`@shipeasy/sdk`) lives at
[`packages/ts-sdk`](../ts-sdk) at the top of `packages/` because it ships
both server and browser entry points from a single package via conditional
exports.
