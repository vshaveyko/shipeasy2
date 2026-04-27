import { createContext, useContext } from "react";
import type { ExperimentResult, User } from "@shipeasy/sdk/client";

export interface ShipeasyContextValue {
  ready: boolean;
  identify(user: User): Promise<void>;
  getFlag(name: string): boolean;
  getConfig<T = unknown>(name: string, decode?: (raw: unknown) => T): T | undefined;
  getExperiment<P extends Record<string, unknown>>(
    name: string,
    defaultParams: P,
    decode?: (raw: unknown) => P,
    variants?: Record<string, Partial<P>>,
  ): ExperimentResult<P>;
  track(event: string, props?: Record<string, unknown>): void;
}

const noop = () => {};

const defaultCtx: ShipeasyContextValue = {
  ready: false,
  identify: async () => {},
  getFlag: () => false,
  getConfig: () => undefined,
  getExperiment: (_n, def, _d, _v) => ({ inExperiment: false, group: "control", params: def }),
  track: noop,
};

export const ShipeasyContext = createContext<ShipeasyContextValue>(defaultCtx);

export function useShipeasy(): ShipeasyContextValue {
  return useContext(ShipeasyContext);
}
