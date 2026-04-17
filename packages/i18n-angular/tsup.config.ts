import { defineConfig } from "tsup";

export default defineConfig({
  entry: { index: "src/public-api.ts" },
  outDir: "dist",
  format: ["esm"],
  dts: true,
  clean: true,
  external: ["@angular/core", "@angular/common", "rxjs"],
});
