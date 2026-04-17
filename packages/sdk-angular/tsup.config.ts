import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["cjs", "esm"],
  dts: true,
  clean: true,
  external: ["@angular/core", "rxjs", "rxjs/operators", "@shipeasy/sdk"],
});
