import { Pipe, PipeTransform, inject, ChangeDetectorRef, OnDestroy } from "@angular/core";
import { Subscription } from "rxjs";
import { ShipEasyI18nService } from "./i18n.service";

@Pipe({ name: "i18nTranslate", pure: false, standalone: true })
export class TranslatePipe implements PipeTransform, OnDestroy {
  private readonly i18n = inject(ShipEasyI18nService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly sub: Subscription;

  private lastKey: string | null = null;
  private lastVars: Record<string, string | number> | undefined;
  private lastValue = "";

  constructor() {
    this.sub = this.i18n.ready.subscribe(() => this.cdr.markForCheck());
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }

  transform(key: string, variables?: Record<string, string | number>): string {
    if (key === this.lastKey && variables === this.lastVars) return this.lastValue;
    this.lastKey = key;
    this.lastVars = variables;
    this.lastValue = this.i18n.t(key, variables);
    return this.lastValue;
  }
}
