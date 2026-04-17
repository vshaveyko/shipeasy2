import { NgModule, ModuleWithProviders } from "@angular/core";
import { CommonModule } from "@angular/common";
import { TranslatePipe } from "./translate.pipe";
import { ShipEasyI18nService } from "./i18n.service";
import { ShipEasyI18n_CONFIG, type ShipEasyI18nConfig } from "./i18n-config";

@NgModule({
  imports: [CommonModule, TranslatePipe],
  exports: [TranslatePipe],
})
export class ShipEasyI18nModule {
  static forRoot(config: ShipEasyI18nConfig): ModuleWithProviders<ShipEasyI18nModule> {
    return {
      ngModule: ShipEasyI18nModule,
      providers: [ShipEasyI18nService, { provide: ShipEasyI18n_CONFIG, useValue: config }],
    };
  }
}
