"use client";

import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { FlagsClientBrowser, type User, type ExperimentResult } from "@shipeasy/sdk/client";
import { ShipeasyContext, type ShipeasyContextValue } from "./context";
import {
  initFromUrl,
  isDevtoolsRequested,
  getGateOverride,
  getConfigOverride,
  getExpOverride,
} from "./overrides";
import type { ShipeasySdkBridge } from "./types";

export interface ShipeasyProviderProps {
  children: ReactNode;
  sdkKey: string;
  /** Edge worker URL. Defaults to https://edge.shipeasy.dev */
  baseUrl?: string;
  /** Admin dashboard URL for devtools. Defaults to https://app.shipeasy.dev */
  adminUrl?: string;
  /**
   * Hotkey to open the devtools overlay.
   * Format: modifier keys joined with "+", e.g. "Shift+Alt+S" (default).
   */
  devtoolsHotkey?: string;
}

const DEFAULT_HOTKEY = "Shift+Alt+S";

export function ShipeasyProvider({
  children,
  sdkKey,
  baseUrl,
  adminUrl,
  devtoolsHotkey = DEFAULT_HOTKEY,
}: ShipeasyProviderProps) {
  const clientRef = useRef<FlagsClientBrowser | null>(null);
  const [ready, setReady] = useState(false);
  // Increment to force re-render when overrides change
  const [overrideSeed, setOverrideSeed] = useState(0);

  // Create client once
  if (!clientRef.current) {
    clientRef.current = new FlagsClientBrowser({ sdkKey, baseUrl });
  }

  // On mount: process URL params and optionally trigger devtools
  useEffect(() => {
    initFromUrl();
    if (isDevtoolsRequested()) {
      loadDevtools(adminUrl, baseUrl).catch(() => {});
    }
  }, []); // intentional: run once on mount

  // Hotkey listener — always active so devtools can be opened at any time
  useEffect(() => {
    const parts = devtoolsHotkey.split("+");
    const key = parts[parts.length - 1];
    const shift = parts.includes("Shift");
    const alt = parts.includes("Alt");
    const ctrl = parts.includes("Ctrl") || parts.includes("Control");
    const meta = parts.includes("Meta") || parts.includes("Cmd");

    let loaded = false;

    function onKeyDown(e: KeyboardEvent) {
      if (
        e.key === key &&
        e.shiftKey === shift &&
        e.altKey === alt &&
        e.ctrlKey === ctrl &&
        e.metaKey === meta
      ) {
        if (!loaded) {
          loaded = true;
          loadDevtools(adminUrl, baseUrl).catch(() => {});
        } else {
          // Toggle visibility by calling the exposed toggle API
          (
            window as unknown as { __shipeasy_devtools?: { toggle: () => void } }
          ).__shipeasy_devtools?.toggle();
        }
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [devtoolsHotkey, adminUrl, baseUrl]);

  // Override change listener → re-render so hooks pick up new values
  useEffect(() => {
    function onOverride() {
      setOverrideSeed((s) => s + 1);
      publishBridgeState();
    }
    window.addEventListener("se:override:change", onOverride);
    return () => window.removeEventListener("se:override:change", onOverride);
  }, []);

  const identify = useCallback(async (user: User) => {
    await clientRef.current!.identify(user);
    setReady(true);
    publishBridgeState();
  }, []);

  const getFlag = useCallback(
    (name: string): boolean => {
      void overrideSeed; // track dependency
      const ov = getGateOverride(name);
      return ov !== null ? ov : (clientRef.current?.getFlag(name) ?? false);
    },
    [overrideSeed],
  );

  const getConfig = useCallback(
    <T = unknown,>(name: string, decode?: (raw: unknown) => T): T | undefined => {
      void overrideSeed;
      const ov = getConfigOverride(name);
      if (ov !== undefined) {
        return decode ? decode(ov) : (ov as T);
      }
      return clientRef.current?.getConfig(name, decode);
    },
    [overrideSeed],
  );

  const getExperiment = useCallback(
    <P extends Record<string, unknown>>(
      name: string,
      defaultParams: P,
      decode?: (raw: unknown) => P,
    ): ExperimentResult<P> => {
      void overrideSeed;
      const ov = getExpOverride(name);
      if (ov !== null) {
        return { inExperiment: true, group: ov, params: defaultParams };
      }
      return (
        clientRef.current?.getExperiment(name, defaultParams, decode) ?? {
          inExperiment: false,
          group: "control",
          params: defaultParams,
        }
      );
    },
    [overrideSeed],
  );

  const track = useCallback((event: string, props?: Record<string, unknown>) => {
    clientRef.current?.track(event, props);
  }, []);

  function publishBridgeState() {
    const client = clientRef.current;
    if (!client) return;
    const bridge: ShipeasySdkBridge = {
      getFlag: (name) => client.getFlag(name),
      getExperiment: (name) => {
        const r = client.getExperiment(name, {});
        return { inExperiment: r.inExperiment, group: r.group };
      },
      getConfig: (name) => client.getConfig(name),
    };
    (window as unknown as { __shipeasy?: ShipeasySdkBridge }).__shipeasy = bridge;
    window.dispatchEvent(new CustomEvent("se:state:update"));
  }

  const ctx: ShipeasyContextValue = {
    ready,
    identify,
    getFlag,
    getConfig,
    getExperiment,
    track,
  };

  return <ShipeasyContext.Provider value={ctx}>{children}</ShipeasyContext.Provider>;
}

interface DevtoolsMod {
  init(opts: { adminUrl?: string; edgeUrl?: string }): void;
  destroy(): void;
}

async function loadDevtools(adminUrl?: string, baseUrl?: string): Promise<void> {
  // Runtime specifier prevents bundlers from statically resolving + inlining devtools.
  const id = "@shipeasy/devtools";
   
  const mod = (await import(/* @vite-ignore */ id)) as DevtoolsMod;
  mod.init({ adminUrl, edgeUrl: baseUrl });

  // Expose toggle so the hotkey can show/hide after first load
  const w = window as unknown as { __shipeasy_devtools?: { toggle: () => void } };
  if (!w.__shipeasy_devtools) {
    let visible = true;
    w.__shipeasy_devtools = {
      toggle() {
        if (visible) {
          mod.destroy();
          visible = false;
        } else {
          mod.init({ adminUrl, edgeUrl: baseUrl });
          visible = true;
        }
      },
    };
  }
}
