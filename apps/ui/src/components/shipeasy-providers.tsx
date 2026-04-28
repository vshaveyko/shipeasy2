"use client";

import { createElement, useEffect, useMemo, useSyncExternalStore, type ReactNode } from "react";
import { configureShipeasy, flags, i18n } from "@shipeasy/sdk/client";

// Wire React's createElement into the i18n singleton once — this is the only
// React-specific coupling in the entire SDK surface.
if (typeof window !== "undefined") {
  i18n.configure({
    createElement: createElement as Parameters<typeof i18n.configure>[0]["createElement"],
  });
}

const SDK_KEY = process.env.NEXT_PUBLIC_SHIPEASY_CLIENT_KEY ?? "";
const EDGE_URL = process.env.NEXT_PUBLIC_SHIPEASY_EDGE_URL ?? "https://cdn.shipeasy.ai";

export interface ShipeasyUser {
  user_id?: string;
  email?: string;
  name?: string;
  plan?: string;
  project_id?: string;
  [attr: string]: unknown;
}

/** Subscribe to flag/config/experiment evaluation updates for useSyncExternalStore. */
function subscribeToFlags(cb: () => void): () => void {
  return flags.subscribe(cb);
}

/** Subscribe to i18n locale/translation updates for useSyncExternalStore. */
function subscribeToI18n(cb: () => void): () => void {
  return i18n.onUpdate(cb);
}

function getLocaleSnapshot(): string | null {
  return i18n.locale;
}

function getLocaleServerSnapshot(): string | null {
  return null;
}

/**
 * React hook that re-renders the component whenever the i18n locale changes.
 * Used inside components that call i18n.t() / i18n.tEl() so they get fresh
 * translations when the CDN loader finishes its profile fetch.
 */
export function useI18nLocale(): string | null {
  return useSyncExternalStore(subscribeToI18n, getLocaleSnapshot, getLocaleServerSnapshot);
}

/**
 * React hook that re-renders the component whenever flag/config evaluations
 * update (e.g. after flags.identify() completes).
 */
export function useFlags(): void {
  useSyncExternalStore(
    subscribeToFlags,
    () => flags.ready,
    () => false,
  );
}

function AutoIdentify({ user }: { user: ShipeasyUser }) {
  const userKey = useMemo(() => JSON.stringify(user), [user]);
  useEffect(() => {
    void flags.identify(user).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userKey]);
  return null;
}

interface ShipeasyClientProvidersProps {
  children: ReactNode;
  user?: ShipeasyUser;
}

function I18nSubscriber() {
  // Re-render the full subtree when translations arrive from the CDN.
  // useSyncExternalStore is the correct React 18 primitive for external stores.
  useSyncExternalStore(subscribeToI18n, getLocaleSnapshot, getLocaleServerSnapshot);
  return null;
}

export function ShipeasyClientProviders({ children, user }: ShipeasyClientProvidersProps) {
  // Configure SDK once per client session. configureShipeasy is idempotent.
  useEffect(() => {
    if (SDK_KEY) configureShipeasy({ sdkKey: SDK_KEY, baseUrl: EDGE_URL });
  }, []);

  return (
    <>
      <I18nSubscriber />
      {SDK_KEY ? <AutoIdentify user={user ?? {}} /> : null}
      {children}
    </>
  );
}
