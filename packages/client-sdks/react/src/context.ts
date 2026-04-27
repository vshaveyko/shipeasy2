import { createContext, useContext } from "react";
import type { ExperimentResult, User } from "@shipeasy/sdk/client";

export interface ShipEasyI18nContextValue {
  t: (key: string, variables?: Record<string, string | number>) => string;
  ready: boolean;
  locale: string | null;
}

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
  /**
   * String-manager binding. Driven by the `window.i18n` global the loader
   * script installs; if the loader isn't on the page, `t(key)` returns the
   * key itself and `ready` stays false. Lives on the same context as flags
   * so customers only mount one provider.
   */
  i18n: ShipEasyI18nContextValue;
}

const noop = () => {};

const defaultI18n: ShipEasyI18nContextValue = {
  t: (key) => key,
  ready: false,
  locale: null,
};

const defaultCtx: ShipeasyContextValue = {
  ready: false,
  identify: async () => {},
  getFlag: () => false,
  getConfig: () => undefined,
  getExperiment: (_n, def, _d, _v) => ({ inExperiment: false, group: "control", params: def }),
  track: noop,
  i18n: defaultI18n,
};

export const ShipeasyContext = createContext<ShipeasyContextValue>(defaultCtx);

export function useShipeasy(): ShipeasyContextValue {
  return useContext(ShipeasyContext);
}

/** Backwards-compatible selector for code that only cares about i18n. */
export function useShipEasyI18n(): ShipEasyI18nContextValue {
  return useContext(ShipeasyContext).i18n;
}
