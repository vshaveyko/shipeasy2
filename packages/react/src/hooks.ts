import { useCallback } from "react";
import type { ExperimentResult } from "@shipeasy/sdk/client";
import { useShipeasy } from "./context";

/** Returns the boolean value of a feature gate, respecting devtools overrides. */
export function useFlag(name: string): boolean {
  return useShipeasy().getFlag(name);
}

/**
 * Returns the current value of a remote config, respecting devtools overrides.
 * Pass a `decode` function to transform + validate the raw JSON value.
 */
export function useConfig<T = unknown>(name: string, decode?: (raw: unknown) => T): T | undefined {
  return useShipeasy().getConfig(name, decode);
}

/**
 * Returns the experiment result for the current user, respecting devtools overrides.
 * Automatically records an exposure event.
 */
export function useExperiment<P extends Record<string, unknown>>(
  name: string,
  defaultParams: P,
  decode?: (raw: unknown) => P,
): ExperimentResult<P> {
  return useShipeasy().getExperiment(name, defaultParams, decode);
}

/** Returns a stable `track` function bound to the current SDK client. */
export function useTrack(): (event: string, props?: Record<string, unknown>) => void {
  const { track } = useShipeasy();
  return useCallback(track, [track]);
}
