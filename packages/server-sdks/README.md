# Server SDKs

SDKs that run on trusted backends. They authenticate with **server (private)**
keys and have full access to `/sdk/flags`, `/sdk/experiments`, and
`/collect`. They must never be embedded in browser bundles.

The published TypeScript SDK lives at [`packages/ts-sdk`](../ts-sdk) (separate
because it covers both server and browser via conditional exports).

| Package      | Registry            | Surface                                           | Status               |
| ------------ | ------------------- | ------------------------------------------------- | -------------------- |
| `sdk-ruby`   | RubyGems            | flags, configs, experiments, metrics + Rails i18n | submodule, published |
| `sdk-python` | PyPI                | flags, configs, experiments, metrics              | scaffold (this PR)   |
| `sdk-go`     | Go modules          | flags, configs, experiments, metrics              | scaffold (this PR)   |
| `sdk-java`   | Maven Central       | flags, configs, experiments, metrics              | scaffold (this PR)   |
| `sdk-kotlin` | Maven Central       | flags, configs, experiments, metrics              | scaffold (this PR)   |
| `sdk-php`    | Packagist           | flags, configs, experiments, metrics              | scaffold (this PR)   |
| `sdk-swift`  | Swift Package Index | flags, configs, experiments, metrics              | scaffold (this PR)   |

**No i18n in the new scaffolds yet** — string-manager support lands per-language as
a sub-entry-point in a follow-up (mirrors how the Ruby SDK exposes
`Shipeasy::I18n` only when `::Rails` is defined). See
[language-plans/README.md](language-plans/README.md) for the full universal
contract and the framework-coverage matrix.

See [PUBLISH.md](PUBLISH.md) for the per-language release pipeline (one upstream
GitHub repo per SDK, Trusted Publishing where supported, no publish workflows
in this monorepo).
