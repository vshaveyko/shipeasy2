"use client";

import { useEffect, useMemo, type ReactNode } from "react";
import { ShipeasyProvider, useShipeasy } from "@shipeasy/react";

const SDK_KEY = process.env.NEXT_PUBLIC_SHIPEASY_CLIENT_KEY ?? "";
const EDGE_URL = process.env.NEXT_PUBLIC_SHIPEASY_EDGE_URL ?? "https://cdn.shipeasy.ai";
const ADMIN_URL = "https://shipeasy.ai";

/**
 * Shape of the user attributes we forward to the SDK on every page load.
 * `user_id` and `anonymous_id` are the canonical identifiers; everything
 * else is targeting metadata. Fields are optional so an anonymous landing
 * visitor can identify with `{}` and a signed-in dashboard user can pass
 * `{ user_id, email, plan, project_id }`. Custom attributes can be added
 * via the index signature without a type change.
 */
export interface ShipeasyUser {
  user_id?: string;
  email?: string;
  name?: string;
  plan?: string;
  project_id?: string;
  [attr: string]: unknown;
}

/**
 * Mounts on first render and re-runs whenever the JSON-stringified user
 * shape changes. The SDK auto-merges browser context (locale, tz, path,
 * referrer, screen, user_agent) and `anonymous_id` before sending — see
 * collectBrowserAttrs in `@shipeasy/sdk/client`. Caller-supplied fields
 * always win.
 */
function AutoIdentify({ user }: { user: ShipeasyUser }) {
  const { identify } = useShipeasy();
  const userKey = useMemo(() => JSON.stringify(user), [user]);
  useEffect(() => {
    void identify(user).catch(() => {});
    // userKey covers the user content; identify is stable per provider mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userKey]);
  return null;
}

interface ShipeasyClientProvidersProps {
  children: ReactNode;
  /**
   * User attributes to identify with on mount. Omit (or pass `{}`) for
   * anonymous visitors — the SDK will still send `anonymous_id` and
   * auto-collected browser context.
   */
  user?: ShipeasyUser;
}

/**
 * Single React-side entry point for both landing (anonymous) and
 * dashboard (signed-in). Pass `user` from a server component so the
 * SDK identifies with the freshest session info on every navigation.
 */
export function ShipeasyClientProviders({ children, user }: ShipeasyClientProvidersProps) {
  // Provider works with or without an SDK key — i18n stays mounted in both
  // cases. When no key is configured, flag/experiment APIs return defaults.
  return (
    <ShipeasyProvider sdkKey={SDK_KEY || undefined} baseUrl={EDGE_URL} adminUrl={ADMIN_URL}>
      {SDK_KEY ? <AutoIdentify user={user ?? {}} /> : null}
      {children}
    </ShipeasyProvider>
  );
}
