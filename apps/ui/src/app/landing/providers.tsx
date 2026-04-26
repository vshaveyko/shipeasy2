"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { ShipeasyProvider, ShipEasyI18nProvider, useShipeasy } from "@shipeasy/react";

const DEFAULT_EDGE = "https://edge.shipeasy.dev";
const DEFAULT_ADMIN =
  typeof window !== "undefined" ? window.location.origin : "https://app.shipeasy.dev";

interface Props {
  children: ReactNode;
  sdkKey: string;
  edgeUrl?: string;
  adminUrl?: string;
}

/**
 * Client wrapper for the public landing page. Mounts the ShipEasy SDK
 * provider + i18n provider so nested client components (nav, pricing,
 * mobile-variant copy, killswitch) can call hooks.
 *
 * Anonymous visitors are identified with a best-effort stable id so
 * targeting + experiment bucketing work without a login.
 */
export function LandingProviders({ children, sdkKey, edgeUrl, adminUrl }: Props) {
  return (
    <ShipeasyProvider
      sdkKey={sdkKey}
      baseUrl={edgeUrl ?? DEFAULT_EDGE}
      adminUrl={adminUrl ?? DEFAULT_ADMIN}
    >
      <ShipEasyI18nProvider>
        <AnonymousIdentify />
        {children}
      </ShipEasyI18nProvider>
    </ShipeasyProvider>
  );
}

function AnonymousIdentify() {
  const { identify } = useShipeasy();
  const did = useRef(false);
  useEffect(() => {
    if (did.current) return;
    did.current = true;
    let id = "";
    try {
      id = localStorage.getItem("se_anon_id") ?? "";
      if (!id) {
        id = `anon_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`;
        localStorage.setItem("se_anon_id", id);
      }
    } catch {
      id = `anon_${Math.random().toString(36).slice(2)}`;
    }
    // SDK User type uses snake_case (user_id / anonymous_id) — see @shipeasy/sdk/client.
    identify({ user_id: id, anonymous_id: id } as never).catch(() => {});
  }, [identify]);
  return null;
}
