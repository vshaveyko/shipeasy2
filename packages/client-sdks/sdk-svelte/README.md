# @shipeasy/sdk-svelte

Svelte / SvelteKit integration for ShipEasy feature flags and experimentation.

## Install

```bash
pnpm add @shipeasy/sdk-svelte @shipeasy/sdk
```

## Usage

```ts
// lib/flaglab.ts
import { createFlaglabStore } from "@shipeasy/sdk-svelte";

export const flaglab = createFlaglabStore({ sdkKey: "se_pub_..." });
```

```svelte
<!-- MyComponent.svelte -->
<script lang="ts">
  import { flaglab } from '$lib/flaglab'

  const newDashboard = flaglab.flagStore('new_dashboard')
  const hero = flaglab.experimentStore('hero_cta', { buttonText: 'Get started' })

  flaglab.identify({ user_id: 'u_123', plan: 'pro' })
</script>

{#if $newDashboard}
  <div>New dashboard</div>
{/if}
<button>{$hero.params.buttonText}</button>
```
