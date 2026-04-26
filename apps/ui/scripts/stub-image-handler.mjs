#!/usr/bin/env node
/**
 * Replace OpenNext's generated `.open-next/cloudflare/images.js` with a
 * tiny stub so wrangler doesn't bundle resvg.wasm (~1.4 MiB) and
 * @vercel/og's heavy peer code with the deployed worker.
 *
 * The shipeasy UI doesn't use `next/image` or `next/og`, but Next still
 * pulls them into the chunk graph. With them included the worker is just
 * over the 3 MiB free-plan ceiling; stubbed, we land near 2.4 MiB.
 *
 * Both exported handlers just return 404 — paths under `/cdn-cgi/image/`
 * never reach a deployed worker (Cloudflare intercepts them upstream),
 * and we don't render `<Image>` so `/_next/image` is never requested.
 */
import { writeFileSync, existsSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const target = resolve(__dirname, "..", ".open-next", "cloudflare", "images.js");

if (!existsSync(target)) {
  console.warn(`[stub-image-handler] ${target} not found — did opennextjs-cloudflare build run?`);
  process.exit(0);
}

const stub = `// Stubbed by apps/ui/scripts/stub-image-handler.mjs to keep the worker
// under Cloudflare's 3 MiB free-plan size limit. The shipeasy UI doesn't
// render next/image or next/og, so neither handler is ever invoked.
export function handleCdnCgiImageRequest() {
  return new Response("image optimization disabled", { status: 404 });
}
export function handleImageRequest() {
  return new Response("image optimization disabled", { status: 404 });
}
`;

writeFileSync(target, stub);
console.log(`[stub-image-handler] replaced ${target} (${stub.length} bytes)`);

/*
  Wrangler also walks @vercel/og's dynamic import in handler.mjs and pulls
  in resvg.wasm (~1.4 MiB) + yoga.wasm (~70 KiB) — the worker still ships
  with both even after stubbing the cloudflare/images.js entry. We don't
  call ImageResponse anywhere, so the dynamic import is effectively dead.
  Rewriting the literal target string to a non-existent module path makes
  wrangler skip the bundle without changing the runtime semantics: the
  surrounding try/catch swallows the resolution failure, and we never hit
  that code path anyway.
*/
const handler = resolve(
  __dirname,
  "..",
  ".open-next",
  "server-functions",
  "default",
  "apps",
  "ui",
  "handler.mjs",
);
if (existsSync(handler)) {
  const original = readFileSync(handler, "utf-8");
  const patched = original
    .replace(
      /"next\/dist\/compiled\/@vercel\/og\/index\.edge\.js"/g,
      '"next/dist/compiled/@vercel/og/__shipeasy_omit__.js"',
    )
    .replace(
      /"next\/dist\/compiled\/@vercel\/og\/index\.node\.js"/g,
      '"next/dist/compiled/@vercel/og/__shipeasy_omit__.js"',
    );
  if (patched !== original) {
    writeFileSync(handler, patched);
    console.log("[stub-image-handler] redirected @vercel/og dynamic imports to a no-op path");
  }
}

/*
  Wrangler also walks node_modules/@vercel/og and bundles its WebAssembly
  blobs (resvg.wasm ~1.4 MiB, yoga.wasm ~70 KiB) because Next generates an
  unconditional dynamic import for ImageResponse. The shipeasy UI never
  renders an ImageResponse, but those wasms still tip the worker over the
  3 MiB free-plan limit. We replace them with minimal valid wasm modules
  so wrangler keeps its module graph happy without shipping megabytes of
  dead weight.
*/
import { readdirSync, statSync } from "node:fs";

// Smallest valid wasm module: magic header + version, no sections.
const EMPTY_WASM = Buffer.from([0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00]);

function findWasmInNodeModules(root) {
  const out = [];
  function walk(dir) {
    let entries;
    try {
      entries = readdirSync(dir);
    } catch {
      return;
    }
    for (const entry of entries) {
      const p = `${dir}/${entry}`;
      let st;
      try {
        st = statSync(p);
      } catch {
        continue;
      }
      if (st.isDirectory()) {
        walk(p);
      } else if (
        entry.endsWith(".wasm") &&
        (entry.includes("resvg") || entry.includes("yoga") || p.includes("@vercel/og"))
      ) {
        out.push(p);
      }
    }
  }
  walk(root);
  return out;
}

const ogDir = resolve(__dirname, "..", ".open-next", "server-functions", "default", "node_modules");
const wasms = existsSync(ogDir) ? findWasmInNodeModules(ogDir) : [];
for (const w of wasms) {
  writeFileSync(w, EMPTY_WASM);
  console.log(`[stub-image-handler] stubbed wasm ${w}`);
}
