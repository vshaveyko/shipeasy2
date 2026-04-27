# @shipeasy/sdk-vue

Vue 3 integration for ShipEasy feature flags and experimentation.

## Install

```bash
pnpm add @shipeasy/sdk-vue @shipeasy/sdk
```

## Usage

```ts
// main.ts
import { createApp } from "vue";
import { createFlaglab } from "@shipeasy/sdk-vue";
import App from "./App.vue";

const app = createApp(App);
app.use(createFlaglab({ sdkKey: "se_pub_..." }));
app.mount("#app");
```

```vue
<!-- MyComponent.vue -->
<script setup lang="ts">
import { useFlaglab, useFlag, useExperiment } from "@shipeasy/sdk-vue";

const { identify } = useFlaglab();
const newDashboard = useFlag("new_dashboard");
const hero = useExperiment("hero_cta", { buttonText: "Get started" });

identify({ user_id: "u_123", plan: "pro" });
</script>

<template>
  <div v-if="newDashboard">New dashboard</div>
  <button>{{ hero.params.buttonText }}</button>
</template>
```
