---
name: SDK submodule edits acceptable
description: Despite CLAUDE.md warning, editing submodule packages in this repo is acceptable per user practice
type: feedback
---

CLAUDE.md warns not to edit files in `packages/ts-sdk`, `packages/client-sdks/react`, etc. because they're git submodules. However, the user has edited and published from these paths (e.g. published @shipeasy/sdk 2.0.3 from packages/ts-sdk, edited packages/client-sdks/react/src/provider.tsx).

**Why:** The submodule sync warning is about drift, but in practice the user treats these as in-repo packages during active development.

**How to apply:** Edit submodule packages when needed (e.g. to fix SDK bugs affecting the app), but note changes need to be pushed upstream eventually. Always rebuild after edits (`pnpm --filter @shipeasy/react build`).
