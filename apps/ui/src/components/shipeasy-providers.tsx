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

// Initialize the SDK at module evaluation time so _client exists before any
// child component effects run (React fires child effects before parent effects).
if (typeof window !== "undefined" && SDK_KEY) {
  configureShipeasy({ sdkKey: SDK_KEY, baseUrl: EDGE_URL });
}

export interface ShipeasyUser {
  user_id?: string;
  email?: string;
  name?: string;
  plan?: string;
  project_id?: string;
  [attr: string]: unknown;
}

// Version counter for FlagsBoundary — increments on every flag update so the
// boundary sees a changed snapshot and re-renders its subtree once.
let _flagsVersion = 0;

function subscribeToFlags(cb: () => void): () => void {
  return flags.subscribe(() => {
    _flagsVersion++;
    cb();
  });
}

function getFlagsSnapshot(): number {
  return _flagsVersion;
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

// Re-renders the whole subtree once when flag evaluations arrive so components
// that call flags.get() / flags.getConfig() directly get the correct values
// without needing per-component subscription hooks.
function FlagsBoundary({ children }: { children: ReactNode }) {
  useSyncExternalStore(subscribeToFlags, getFlagsSnapshot, () => 0);
  return <>{children}</>;
}

// Re-renders when translations arrive.
function I18nBoundary({ children }: { children: ReactNode }) {
  useSyncExternalStore(subscribeToI18n, getLocaleSnapshot, getLocaleServerSnapshot);
  return <>{children}</>;
}

export function ShipeasyClientProviders({ children, user }: ShipeasyClientProvidersProps) {
  return (
    <FlagsBoundary>
      <I18nBoundary>
        {SDK_KEY ? <AutoIdentify user={user ?? {}} /> : null}
        {children}
      </I18nBoundary>
    </FlagsBoundary>
  );
}
