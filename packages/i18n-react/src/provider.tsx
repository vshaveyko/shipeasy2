"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef, type ReactNode } from "react";
import { ShipEasyI18nContext, type ShipEasyI18nContextValue } from "./context";

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

interface ShipEasyI18nProviderProps {
  children: ReactNode;
  ssrLocale?: string;
}

export function ShipEasyI18nProvider({ children, ssrLocale }: ShipEasyI18nProviderProps) {
  const [ready, setReady] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return Boolean(window.i18n?.locale);
  });

  const [locale, setLocale] = useState<string | null>(() => {
    if (typeof window !== "undefined" && window.i18n?.locale) return window.i18n.locale;
    return ssrLocale ?? null;
  });

  const tRef = useRef<ShipEasyI18nContextValue["t"]>((key, vars) => {
    if (typeof window !== "undefined" && window.i18n) return window.i18n.t(key, vars);
    return key;
  });

  const t = useCallback<ShipEasyI18nContextValue["t"]>((key, vars) => tRef.current(key, vars), []);

  useEffect(() => {
    if (typeof window === "undefined" || !window.i18n) return;
    if (window.i18n.locale) {
      setReady(true);
      setLocale(window.i18n.locale);
    }
    window.i18n.ready(() => {
      setReady(true);
      setLocale(window.i18n!.locale);
    });
    return window.i18n.on("update", () => {
      setLocale(window.i18n!.locale);
      setReady((r) => r);
    });
  }, []);

  const value = useMemo<ShipEasyI18nContextValue>(() => ({ t, ready, locale }), [t, ready, locale]);

  return <ShipEasyI18nContext.Provider value={value}>{children}</ShipEasyI18nContext.Provider>;
}
