---
name: ShipeasyProvider fixes
description: Three gaps in @shipeasy/react ShipeasyProvider that required fixing to eliminate shipeasy-providers.tsx
type: project
---

ShipeasyProvider in `packages/client-sdks/react/src/provider.tsx` had three gaps vs the hand-rolled `shipeasy-providers.tsx`:

1. **Missing `i18n.configure({ createElement })`** — without this at module level, `i18n.t()` returns plain text on server but elements on client → React hydration mismatch. Added at module level in provider.tsx.

2. **Broken `useSyncExternalStore` snapshot** — was returning `getShipeasyClient()` (same object reference every render) so React never detected a change. Fixed with a `useRef` version counter incremented in the subscribe callback.

3. **Missing `flags.notifyMounted()`** — the SDK keeps `flags.get()` returning false until this is called, to prevent hydration mismatches on force-static pages. Added in a `useEffect(() => { flags.notifyMounted(); }, [])`.

**Why:** `shipeasy-providers.tsx` was hand-rolling these in the app; the fixes move them into the SDK adapter where they belong.

**How to apply:** If flags aren't appearing after identify(), check that `notifyMounted()` is called. If useSyncExternalStore never re-renders, check the snapshot isn't a stable object reference.
