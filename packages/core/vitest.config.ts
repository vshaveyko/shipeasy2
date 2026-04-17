import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: false,
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary"],
      include: ["src/**/*.ts"],
      exclude: ["src/db/**", "src/schemas/**", "src/index.ts", "src/types.ts", "src/env.ts"],
    },
  },
});
