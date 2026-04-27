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
import { ShipeasyContext, type ShipeasyContextValue } from "./context";

export interface ShipeasyProviderProps {
  children: ReactNode;
  sdkKey: string;
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
}

export function ShipeasyProvider({
  children,
  sdkKey,
  baseUrl,
  adminUrl,
  devtoolsHotkey,
}: ShipeasyProviderProps) {
  const clientRef = useRef<FlagsClientBrowser | null>(null);
  const [ready, setReady] = useState(false);

  if (!clientRef.current) {
    clientRef.current = new FlagsClientBrowser({ sdkKey, baseUrl });
  }

  // Bridge SDK change events into React renders. The SDK fires its listeners
  // after identify() and on every URL override change.
  const subscribe = useCallback((cb: () => void) => clientRef.current!.subscribe(cb), []);
  const getSnapshot = useCallback(() => clientRef.current!, []);
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  useEffect(() => {
    return attachDevtools(clientRef.current!, {
      hotkey: devtoolsHotkey,
      adminUrl,
      edgeUrl: baseUrl,
    });
  }, [devtoolsHotkey, adminUrl, baseUrl]);

  const identify = useCallback(async (user: User) => {
    await clientRef.current!.identify(user);
    setReady(true);
  }, []);

  const getFlag = useCallback((name: string): boolean => {
    return clientRef.current!.getFlag(name);
  }, []);

  const getConfig = useCallback(
    <T = unknown,>(name: string, decode?: (raw: unknown) => T): T | undefined => {
      return clientRef.current!.getConfig(name, decode);
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
      return clientRef.current!.getExperiment(name, defaultParams, decode, variants);
    },
    [],
  );

  const track = useCallback((event: string, props?: Record<string, unknown>) => {
    clientRef.current!.track(event, props);
  }, []);

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
