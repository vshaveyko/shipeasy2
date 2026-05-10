// Synthetic URLs used as `caches.default` keys for SDK metadata responses.
// The worker stores responses under these URLs; the CF Purge API invalidates
// the same URLs on KV rebuild. Auth headers never participate in the key, so
// every customer in a colo shares one cache entry per (project, variant).

export type SdkCacheKey =
  | { route: "/sdk/flags"; projectId: string; env: string }
  | { route: "/sdk/experiments"; projectId: string }
  | { route: "/sdk/i18n/strings"; projectId: string; profile: string };

export function sdkCachePath(key: SdkCacheKey): string {
  const params = new URLSearchParams();
  params.set("p", key.projectId);
  if (key.route === "/sdk/flags") params.set("env", key.env);
  if (key.route === "/sdk/i18n/strings") params.set("profile", key.profile);
  params.sort();
  return `/__cache${key.route}?${params.toString()}`;
}

export function sdkCacheUrl(host: string, key: SdkCacheKey): string {
  return `https://${host}${sdkCachePath(key)}`;
}
