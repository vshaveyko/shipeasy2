export { ShipeasyProvider } from "./provider";
export type { ShipeasyProviderProps } from "./provider";
export { ShipeasyContext, useShipeasy, useShipEasyI18n } from "./context";
export type { ShipeasyContextValue, ShipEasyI18nContextValue } from "./context";
export { useFlag, useConfig, useExperiment, useTrack } from "./hooks";

// i18n bindings — the `<ShipeasyProvider>` now owns the i18n context too,
// so these are pure consumers (no separate provider to mount).
export { ShipEasyI18nString } from "./i18n/string";
export { withShipEasyI18n } from "./i18n/hoc";
