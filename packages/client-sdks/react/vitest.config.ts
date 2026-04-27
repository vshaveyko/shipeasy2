import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: false,
    include: ["src/**/__tests__/**/*.test.{ts,tsx}", "src/**/*.test.{ts,tsx}"],
    // jsdom defaults to about:blank, which makes replaceState() to a real
    // URL throw SecurityError; pinning the starting URL lets the override
    // tests rewrite ?search via history.replaceState without surprises.
    environmentOptions: {
      jsdom: { url: "https://example.com/" },
    },
  },
  esbuild: {
    jsx: "automatic",
  },
});
