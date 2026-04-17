import { Provider } from "@angular/core";
import { ShipEasyI18nService } from "./i18n.service";
import { ShipEasyI18n_CONFIG, type ShipEasyI18nConfig } from "./i18n-config";

export function provideShipEasyI18n(config: ShipEasyI18nConfig): Provider[] {
  return [ShipEasyI18nService, { provide: ShipEasyI18n_CONFIG, useValue: config }];
}
