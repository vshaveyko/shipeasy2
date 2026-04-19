import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: ["src/index.ts"],
    format: ["esm", "cjs"],
    dts: true,
    clean: true,
    target: "es2020",
  },
  {
    // Self-executing browser bundle for <script src="/se-devtools.js"> usage.
    // Runs loadOnTrigger() automatically — no JS setup required in the host app.
    entry: { devtools: "src/auto.ts" },
    format: ["iife"],
    outDir: "dist",
    target: "es2020",
    minify: true,
  },
]);
