import { createContext, useContext } from "react";

export interface ShipEasyI18nContextValue {
  t: (key: string, variables?: Record<string, string | number>) => string;
  ready: boolean;
  locale: string | null;
}

export const ShipEasyI18nContext = createContext<ShipEasyI18nContextValue>({
  t: (key) => key,
  ready: false,
  locale: null,
});

export function useShipEasyI18n(): ShipEasyI18nContextValue {
  return useContext(ShipEasyI18nContext);
}
