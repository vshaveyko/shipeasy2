"use client";

import { type ReactNode, useCallback, useEffect, useState, useSyncExternalStore } from "react";
import {
  attachDevtools,
  configureShipeasy,
  flags,
  getShipeasyClient,
  i18n,
  type ExperimentResult,
  type User,
} from "@shipeasy/sdk/client";
import {
  ShipeasyContext,
  type ShipeasyContextValue,
  type ShipEasyI18nContextValue,
} from "./context";

export interface ShipeasyProviderProps {
  children: ReactNode;
  /**
   * Public (client) SDK key. Optional — omit to mount the provider in
   * i18n-only mode (no flags/experiments network traffic). Useful for
   * unconfigured environments where you still want translations.
   */
  sdkKey?: string;
  /** Edge worker URL. Defaults to https://edge.shipeasy.dev */
  baseUrl?: string;
  /** Admin dashboard URL for devtools. Defaults to https://app.shipeasy.dev */
  adminUrl?: string;
  /** Hotkey to open the devtools overlay. Defaults to "Shift+Alt+S". */
  devtoolsHotkey?: string;
  /** Initial locale to render under during SSR before window.i18n loads. */
  ssrLocale?: string;
}

/**
 * Configures the @shipeasy/sdk/client singleton on mount and exposes a
 * React context that re-renders on identify() and locale changes. The
 * provider is here for reactivity — for static / one-shot lookups, just
 * `import { flags, i18n } from "@shipeasy/sdk/client"` directly. There
 * is no React-only re-export of the singletons by design.
 */
export function ShipeasyProvider({
  children,
  sdkKey,
  baseUrl,
  adminUrl,
  devtoolsHotkey,
  ssrLocale,
}: ShipeasyProviderProps) {
  const [ready, setReady] = useState(false);

  if (sdkKey && !getShipeasyClient()) {
    configureShipeasy({ sdkKey, baseUrl });
  }

  // Bridge SDK change events into React renders.
  const subscribe = useCallback((cb: () => void) => flags.subscribe(cb), []);
  const getSnapshot = useCallback(() => getShipeasyClient(), []);
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  useEffect(() => {
    const c = getShipeasyClient();
    if (!c) return;
    return attachDevtools(c, { hotkey: devtoolsHotkey, adminUrl, edgeUrl: baseUrl });
  }, [devtoolsHotkey, adminUrl, baseUrl]);

  // ---- i18n ----
  const [i18nReady, setI18nReady] = useState<boolean>(() => i18n.ready);
  const [locale, setLocale] = useState<string | null>(() => i18n.locale ?? ssrLocale ?? null);
  const t = useCallback<ShipEasyI18nContextValue["t"]>((key, vars) => i18n.t(key, vars), []);

  useEffect(() => {
    if (i18n.ready) {
      setI18nReady(true);
      setLocale(i18n.locale);
    }
    void i18n.whenReady().then(() => {
      setI18nReady(true);
      setLocale(i18n.locale);
    });
    return i18n.onUpdate(() => {
      setLocale(i18n.locale);
      setI18nReady((r) => r);
    });
  }, []);

  const identify = useCallback(async (user: User) => {
    if (!getShipeasyClient()) return;
    await flags.identify(user);
    setReady(true);
  }, []);

  const getFlag = useCallback((name: string): boolean => flags.get(name), []);
  const getConfig = useCallback(
    <T = unknown,>(name: string, decode?: (raw: unknown) => T): T | undefined =>
      flags.getConfig<T>(name, decode),
    [],
  );
  const getExperiment = useCallback(
    <P extends Record<string, unknown>>(
      name: string,
      defaultParams: P,
      decode?: (raw: unknown) => P,
      variants?: Record<string, Partial<P>>,
    ): ExperimentResult<P> => flags.getExperiment(name, defaultParams, decode, variants),
    [],
  );
  const track = useCallback(
    (event: string, props?: Record<string, unknown>) => flags.track(event, props),
    [],
  );

  const ctx: ShipeasyContextValue = {
    ready,
    identify,
    getFlag,
    getConfig,
    getExperiment,
    track,
    i18n: { t, ready: i18nReady, locale },
  };

  return <ShipeasyContext.Provider value={ctx}>{children}</ShipeasyContext.Provider>;
}
