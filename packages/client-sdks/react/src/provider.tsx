"use client";

import {
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  FlagsClientBrowser,
  type User,
  type ExperimentResult,
  attachDevtools,
} from "@shipeasy/sdk/client";
import {
  ShipeasyContext,
  type ShipeasyContextValue,
  type ShipEasyI18nContextValue,
} from "./context";

declare global {
  interface Window {
    i18n?: {
      t: (key: string, vars?: Record<string, string | number>) => string;
      ready: (cb: () => void) => void;
      on: (event: "update", cb: () => void) => () => void;
      locale: string | null;
    };
  }
}

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
  /**
   * Hotkey to open the devtools overlay. Format: modifier keys joined with "+"
   * (e.g. "Shift+Alt+S", the default). The actual key handling lives in the
   * SDK's attachDevtools — this is just the string we pass through.
   */
  devtoolsHotkey?: string;
  /** Initial locale to render under during SSR before window.i18n loads. */
  ssrLocale?: string;
}

export function ShipeasyProvider({
  children,
  sdkKey,
  baseUrl,
  adminUrl,
  devtoolsHotkey,
  ssrLocale,
}: ShipeasyProviderProps) {
  const clientRef = useRef<FlagsClientBrowser | null>(null);
  const [ready, setReady] = useState(false);

  if (sdkKey && !clientRef.current) {
    clientRef.current = new FlagsClientBrowser({ sdkKey, baseUrl });
  }

  // Bridge SDK change events into React renders. Skipped when there's no
  // sdkKey (i18n-only mode); useSyncExternalStore still needs a stable
  // subscribe pair so we hand it no-ops in that case.
  const subscribe = useCallback(
    (cb: () => void) => clientRef.current?.subscribe(cb) ?? (() => {}),
    [],
  );
  const getSnapshot = useCallback(() => clientRef.current, []);
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  useEffect(() => {
    const c = clientRef.current;
    if (!c) return;
    return attachDevtools(c, {
      hotkey: devtoolsHotkey,
      adminUrl,
      edgeUrl: baseUrl,
    });
  }, [devtoolsHotkey, adminUrl, baseUrl]);

  // ---- i18n ----
  const [i18nReady, setI18nReady] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return Boolean(window.i18n?.locale);
  });
  const [locale, setLocale] = useState<string | null>(() => {
    if (typeof window !== "undefined" && window.i18n?.locale) return window.i18n.locale;
    return ssrLocale ?? null;
  });
  const t = useCallback<ShipEasyI18nContextValue["t"]>((key, vars) => {
    if (typeof window !== "undefined" && window.i18n) return window.i18n.t(key, vars);
    return key;
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !window.i18n) return;
    if (window.i18n.locale) {
      setI18nReady(true);
      setLocale(window.i18n.locale);
    }
    window.i18n.ready(() => {
      setI18nReady(true);
      setLocale(window.i18n!.locale);
    });
    return window.i18n.on("update", () => {
      setLocale(window.i18n!.locale);
      setI18nReady((r) => r);
    });
  }, []);

  // ---- callbacks ----
  const identify = useCallback(async (user: User) => {
    if (!clientRef.current) return;
    await clientRef.current.identify(user);
    setReady(true);
  }, []);

  const getFlag = useCallback((name: string): boolean => {
    return clientRef.current?.getFlag(name) ?? false;
  }, []);

  const getConfig = useCallback(
    <T = unknown,>(name: string, decode?: (raw: unknown) => T): T | undefined => {
      return clientRef.current?.getConfig(name, decode);
    },
    [],
  );

  const getExperiment = useCallback(
    <P extends Record<string, unknown>>(
      name: string,
      defaultParams: P,
      decode?: (raw: unknown) => P,
      variants?: Record<string, Partial<P>>,
    ): ExperimentResult<P> => {
      return (
        clientRef.current?.getExperiment(name, defaultParams, decode, variants) ?? {
          inExperiment: false,
          group: "control",
          params: defaultParams,
        }
      );
    },
    [],
  );

  const track = useCallback((event: string, props?: Record<string, unknown>) => {
    clientRef.current?.track(event, props);
  }, []);

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
