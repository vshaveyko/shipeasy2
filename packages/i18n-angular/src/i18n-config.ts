import { InjectionToken } from "@angular/core";

export interface ShipEasyI18nConfig {
  i18nKey: string;
  profile: string;
  loaderUrl?: string;
}

export const ShipEasyI18n_CONFIG = new InjectionToken<ShipEasyI18nConfig>("ShipEasyI18n_CONFIG");
