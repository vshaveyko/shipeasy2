import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  css: {
    postcss: { plugins: [] },
  },
  test: {
    environment: "node",
    globals: true,
    include: ["src/**/__tests__/**/*.test.ts", "src/**/*.test.ts"],
    css: false,
    coverage: {
      provider: "v8",
      include: ["src/app/api/admin/**/*.ts", "src/lib/handlers/**/*.ts"],
      exclude: ["**/__tests__/**", "**/*.test.ts"],
      reporter: ["text", "json-summary"],
      reportsDirectory: "./coverage",
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
