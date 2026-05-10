// GET /sdk/i18n/loader.js   — static loader script (no auth)
// GET /sdk/i18n/strings     — client-key auth; returns profile strings from D1

import { and, eq, isNull } from "drizzle-orm";
import { getDb, getI18nStrings } from "@shipeasy/core";
import { labelKeys, labelProfiles } from "@shipeasy/core/db/schema";
import type { AuthedContext } from "../lib/auth";
import { withEdgeCache } from "../lib/edge-cache";

// The loader script is inlined here so the worker serves it without a separate
// deploy step. It reads data-key / data-profile from its own <script> tag,
// fetches strings from /sdk/i18n/strings, and installs window.i18n.
const LOADER_JS = `(function(){
  var s=document.currentScript;
  if(!s)return;
  var key=s.getAttribute('data-key');
  var profile=s.getAttribute('data-profile');
  if(!key||!profile)return;
  var base=s.src.replace('/sdk/i18n/loader.js','');
  var url=base+'/sdk/i18n/strings?profile='+encodeURIComponent(profile);
  var inlineEl=document.getElementById('i18n-data');
  function install(strings,locale){
    var subs=[];
    window.i18n={
      locale:locale,
      strings:strings,
      t:function(k,vars){
        var v=strings[k];
        if(v===undefined)return k;
        if(vars)Object.keys(vars).forEach(function(n){v=v.replace(new RegExp('\\\\{\\\\{'+n+'\\\\}\\\\}','g'),String(vars[n]));});
        return v;
      },
      ready:function(cb){cb();},
      on:function(ev,cb){if(ev==='update')subs.push(cb);return function(){subs=subs.filter(function(x){return x!==cb;});};},
    };
    window.dispatchEvent(new CustomEvent('se:i18n:ready',{detail:{locale:locale}}));
  }
  if(inlineEl){
    try{var d=JSON.parse(inlineEl.textContent||'{}');if(d.strings)return install(d.strings,d.locale||'en');}catch(e){}
  }
  fetch(url,{headers:{'X-SDK-Key':key}}).then(function(r){return r.ok?r.json():Promise.reject(r.status);}).then(function(d){install(d.strings||{},d.locale||'en');}).catch(function(){});
})();`;

export async function handleI18nLoader(c: AuthedContext) {
  // Loader is a tiny static script identical for every customer. The URL
  // itself is the cache key — no project scoping. Browser cache (immutable)
  // handles the second hit; the colo cache handles the first hit per colo.
  const buildRes = () =>
    new Response(LOADER_JS, {
      headers: {
        "Content-Type": "application/javascript; charset=utf-8",
        "Cache-Control": "public, max-age=31536000, immutable",
        "Access-Control-Allow-Origin": "*",
        "Timing-Allow-Origin": "*",
      },
    });
  const cache =
    typeof caches !== "undefined"
      ? ((caches as unknown as { default?: Cache }).default ?? null)
      : null;
  if (!cache) return buildRes();
  const cacheKey = new Request(c.req.url, { method: "GET" });
  const hit = await cache.match(cacheKey);
  if (hit) {
    const res = new Response(hit.body, hit);
    res.headers.set("X-Edge-Cache", "HIT");
    return res;
  }
  const res = buildRes();
  res.headers.set("X-Edge-Cache", "MISS");
  c.executionCtx.waitUntil(cache.put(cacheKey, res.clone()));
  return res;
}

export async function handleI18nStrings(c: AuthedContext) {
  const key = c.get("key");
  const profile = c.req.query("profile");
  if (!profile) return c.json({ error: "profile query param required" }, 400);

  return withEdgeCache(
    c,
    { route: "/sdk/i18n/strings", projectId: key.project_id, profile },
    async () => {
      const cached = await getI18nStrings(c.env, key.project_id, profile);
      const payload = cached ?? (await loadFromD1(c, key.project_id, profile));

      return new Response(JSON.stringify(payload), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=31536000, immutable",
          ETag: `"${payload.version}"`,
          "Timing-Allow-Origin": "*",
        },
      });
    },
  );
}

async function loadFromD1(
  c: AuthedContext,
  projectId: string,
  profile: string,
): Promise<{ strings: Record<string, string>; locale: string; version: string }> {
  const db = getDb(c.env.DB);

  const profileRows = await db
    .select({ id: labelProfiles.id })
    .from(labelProfiles)
    .where(
      and(
        eq(labelProfiles.projectId, projectId),
        eq(labelProfiles.name, profile),
        isNull(labelProfiles.deletedAt),
      ),
    )
    .limit(1);

  if (profileRows.length === 0) {
    return { strings: {}, locale: "en", version: "0" };
  }

  const rows = await db
    .select({ key: labelKeys.key, value: labelKeys.value, updatedAt: labelKeys.updatedAt })
    .from(labelKeys)
    .where(eq(labelKeys.profileId, profileRows[0].id));

  const strings: Record<string, string> = {};
  let latestTs = "";
  for (const row of rows) {
    strings[row.key] = row.value;
    if (row.updatedAt > latestTs) latestTs = row.updatedAt;
  }
  const version = latestTs ? latestTs.slice(0, 19).replace(/\D/g, "") : "0";
  return { strings, locale: "en", version };
}
