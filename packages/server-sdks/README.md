# Server SDKs

SDKs that run on trusted backends. These authenticate with **server
(private)** keys and have full access to `/sdk/flags`, `/sdk/experiments`,
and `/sdk/bootstrap` so they can poll the rule blobs and evaluate locally.
They must never be embedded in browser bundles.

| Package           | Runtime                                                                                                                                                                                                                                           |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sdk-ruby`        | Ruby — published as `shipeasy-sdk`. Bundles experimentation **and** the Rails i18n view helpers in one gem with a single `Shipeasy.configure` block. The Rails surface is loaded only when `::Rails` is defined; plain Ruby callers never see it. |
| `language-plans/` | README-only design notes for upcoming SDKs (Go, Java, Kotlin, PHP, Python, Swift, TypeScript). Not published.                                                                                                                                     |

The dual-build TypeScript SDK (`@shipeasy/sdk`) lives at
[`packages/ts-sdk`](../ts-sdk) at the top of `packages/` because it covers
both server and browser via conditional exports.
