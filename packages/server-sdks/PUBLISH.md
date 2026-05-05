# Server SDK publish plan

This file is the contract for getting the server SDKs out of this monorepo and onto the language registries customers actually install from. The TypeScript SDK and Ruby SDK are already covered by their own upstream repos with their own publish workflows; the rules here mirror that pattern (see [CLAUDE.md](../../CLAUDE.md) → "Upstream SDK packages — DO NOT EDIT IN-TREE").

## Repo split

Each language SDK is published from a dedicated upstream GitHub repo, and the directory in this monorepo is a git submodule pointing at that repo. **No language SDK is published from `vshaveyko/shipeasy2` itself.** This keeps OIDC Trusted Publishing identities clean (npm, PyPI, Packagist, Maven Central, RubyGems all reject token claims that don't match the package's expected repo).

| Local path                                             | Upstream repo            | Registry            | Package id                      |
| ------------------------------------------------------ | ------------------------ | ------------------- | ------------------------------- |
| `packages/ts-sdk` _(existing)_                         | `shipeasy-ai/sdk`        | npm                 | `@shipeasy/sdk`                 |
| `packages/server-sdks/sdk-ruby` _(existing submodule)_ | `shipeasy-ai/sdk-ruby`   | RubyGems            | `shipeasy-sdk`                  |
| `packages/server-sdks/sdk-python`                      | `shipeasy-ai/sdk-python` | PyPI                | `shipeasy`                      |
| `packages/server-sdks/sdk-go`                          | `shipeasy-ai/sdk-go`     | Go modules (proxy)  | `github.com/shipeasy-ai/sdk-go` |
| `packages/server-sdks/sdk-java`                        | `shipeasy-ai/sdk-java`   | Maven Central       | `ai.shipeasy:shipeasy`          |
| `packages/server-sdks/sdk-kotlin`                      | `shipeasy-ai/sdk-kotlin` | Maven Central       | `ai.shipeasy:shipeasy-kotlin`   |
| `packages/server-sdks/sdk-php`                         | `shipeasy-ai/sdk-php`    | Packagist           | `shipeasy/shipeasy`             |
| `packages/server-sdks/sdk-swift`                       | `shipeasy-ai/sdk-swift`  | Swift Package Index | `Shipeasy` (SwiftPM product)    |

Once each upstream repo exists, register the directory as a submodule:

```sh
git rm -r --cached packages/server-sdks/sdk-python
git submodule add git@github.com:shipeasy-ai/sdk-python.git packages/server-sdks/sdk-python
# repeat for sdk-go, sdk-java, sdk-kotlin, sdk-php, sdk-swift
```

## Cross-language hash CI

Every SDK must pass the MurmurHash3 vectors that the Ruby SDK reference impl produces. Each upstream repo runs its own unit test in CI; this monorepo additionally runs `scripts/verify-hash-vectors.mjs` (turbo task `cross-lang-vectors`, see `04-evaluation.md`) which shells out to each language's runtime and compares hashes against the canonical table. **No language SDK ships v0.x → v1.0.0 until the 2 production-format vectors (`exp_001:alloc:user_abc`, `exp_001:group:user_abc`) are filled in and the cross-language CI is green.**

> **Doc discrepancy to resolve before v1.0.0:** the table in `experiment-platform/04-evaluation.md` lists `0xCA27D700` for `"a"`, but the Ruby/Python/Go/Java/Kotlin/PHP/Swift implementations all produce `0x3c2569b2`. The Ruby SDK has been the de-facto reference since it shipped first; the vectors in this directory's tests match it. Either the docs table needs to be regenerated from the reference impl, or the Ruby SDK has a longstanding tail-byte bug that every other SDK now mirrors. Recompute against Aappleby's `MurmurHash3_x86_32` and update whichever side is wrong before tagging v1.0.0.

## HARD REQUIREMENT — never publish manually

**Every release goes through the upstream repo's GitHub Actions workflow. Period.**

- Do not run `pip publish`, `gem push`, `mvn deploy`, `gradle publish`, `composer` upload, `swift package` upload, or any other registry CLI from a developer machine.
- Do not push tags by hand from a developer machine for the purpose of releasing.
- Do not work around the workflow because a secret is missing, the build is red, or the job is slow — fix the workflow.
- The workflow trigger is **`push: branches: [main]`** on every upstream SDK repo. To ship a new version: bump the version field in the manifest (`pyproject.toml`, `pom.xml`, `build.gradle.kts`, `composer.json`, `Package.swift` is implicit, Go uses `VERSION`), commit, push to `main`. The workflow inspects the version, compares it to the registry, and publishes if and only if the version is new. It is idempotent — re-running on a tagged version is a no-op.
- Registry credentials live exclusively in GitHub Actions secrets / OIDC. No developer ever sees them.

If a release needs a hotfix, bump the patch version and push — same path. If the workflow itself is broken, fix the workflow and re-push; never reach around it.

## Per-language publish workflow

All workflows are triggered on **push to `main`** of the upstream repo and use OIDC Trusted Publishing wherever the registry supports it. No long-lived API tokens.

### Python — `shipeasy` on PyPI

- Upstream `.github/workflows/publish.yml`:
  - Trigger: `release: published`
  - Build: `python -m build` (hatch backend, see `pyproject.toml`)
  - Publish: `pypa/gh-action-pypi-publish@release/v1` with `permissions: { id-token: write }`
  - Configure PyPI Trusted Publisher: project `shipeasy`, repo `shipeasy-ai/sdk-python`, workflow `publish.yml`, environment `pypi`.
- Tag → release → wheel + sdist on PyPI within ~2 min.

### Go — `github.com/shipeasy-ai/sdk-go`

- Go modules has no central registry; the proxy (`proxy.golang.org`) caches the tagged commit on first `go get`.
- Workflow: tag the upstream repo `vX.Y.Z` (must match `go.mod` major). After push, run `GOPROXY=proxy.golang.org go list -m github.com/shipeasy-ai/sdk-go@vX.Y.Z` from CI to warm the proxy cache.
- Major version ≥ 2: rename module path to `github.com/shipeasy-ai/sdk-go/v2`. v0.x and v1.x stay at the bare path.

### Java — `ai.shipeasy:shipeasy` on Maven Central

- Use the modern **Central Portal** (not legacy OSSRH) — the new flow accepts uploads via a single POST and supports tokens scoped per namespace.
- Upstream `.github/workflows/publish.yml`:
  - Trigger: `release: published`
  - Build: `./mvnw -B clean verify` (or `mvn` if no wrapper) producing `-sources.jar`, `-javadoc.jar`, `.asc` signatures.
  - Sign with GPG via `crazy-max/ghaction-import-gpg`, key + passphrase as repo secrets.
  - Upload via `central-portal/publish-action` (or curl to `https://central.sonatype.com/api/v1/publisher/upload`) with deployer token from secrets.
- Coordinates locked: `groupId=ai.shipeasy`, `artifactId=shipeasy`. Namespace `ai.shipeasy` must be claimed (DNS TXT record on `shipeasy.ai`).

### Kotlin — `ai.shipeasy:shipeasy-kotlin`

- Same Central Portal flow as Java; Gradle build (`build.gradle.kts`) produces the publication.
- Workflow: `./gradlew publishMavenPublicationToCentralPortalRepository -PsigningKey="$GPG_KEY" -PsigningPassword="$GPG_PASS"`
- Different `artifactId` from the Java SDK so Android consumers can pick the Kotlin-coroutines flavour without pulling Jackson.

### PHP — `shipeasy/shipeasy` on Packagist

- Packagist auto-publishes from GitHub when the repo is registered (one-time setup at packagist.org → Submit Package → `https://github.com/shipeasy-ai/sdk-php`).
- Add the Packagist webhook on the upstream repo so every push/tag triggers a refresh.
- Tag `vX.Y.Z` → Packagist exposes the version within seconds.
- No build step; Composer reads source directly from the tagged tree.

### Swift — `Shipeasy` on Swift Package Index

- SPI auto-indexes any public GitHub repo with a valid `Package.swift`. Submit once at swiftpackageindex.com → Add a Package.
- Tag `X.Y.Z` (no `v` prefix is fine, but pick one and stick with it). SPI re-indexes within ~10 min of a push.
- No publish workflow needed; tags are the contract.

## Version policy

- **Pre-1.0**: every SDK starts at `0.1.0`. Breaking API changes → minor bump (`0.2.0`). Bug fixes → patch (`0.1.1`).
- **1.0.0** ships only after: (a) the 2 production-format hash vectors are filled in and verified, (b) the upstream repo has a passing CI that includes the cross-language vector check, (c) the SDK has been used in `apps/ui` or a Shipeasy demo for ≥ 1 week.
- Post-1.0: semver — major for breaking, minor for additive, patch for fixes. The worker API stays backward-compatible across SDK majors (KV blob `version` field).

## Release checklist (per language, per release)

1. Bump version in the language's manifest (`pyproject.toml`, `go.mod` tag, `pom.xml`, `build.gradle.kts`, `composer.json` is implicit via tag, `Package.swift` is implicit via tag).
2. Update the changelog.
3. All hash vectors pass locally (`go test ./...`, `pytest`, `mvn test`, `./gradlew test`, `phpunit`, `swift test`).
4. Tag and create a GitHub Release on the upstream repo. The publish workflow runs.
5. Smoke-test the published artifact from a fresh project: install, `init()`, `getFlag()` against staging.
6. In this monorepo, bump the submodule pointer (`git -C packages/server-sdks/sdk-<lang> checkout vX.Y.Z`), commit.

## Deferred work

- **i18n surface** in every SDK — out of scope for the initial server SDK release per request. When added, it will be a sub-entry-point in each package (`shipeasy.i18n` in Python, `shipeasy/i18n` in Go, `Shipeasy.I18n` in PHP, etc.). Single API key, one `init()`, framework helpers as sub-entry-points (mirrors the Ruby + TypeScript SDKs).
- **Mobile-client variants** — the Swift package above is server-key only. iOS/Android client-key SDKs (`ShipeasyClient` and `ai.shipeasy:shipeasy-android`) ship under separate package ids so an iOS app cannot accidentally bundle a server key.
- **Framework helpers** — Django/Flask/FastAPI for Python, Spring for Java, Compose for Kotlin, Laravel/WordPress for PHP, SwiftUI/UIKit for Swift. Each lands as a sub-entry-point inside its language SDK, never a separate package (see [language-plans/README.md](language-plans/README.md) for the full matrix).
