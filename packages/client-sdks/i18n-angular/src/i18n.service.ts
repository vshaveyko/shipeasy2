import { Injectable, NgZone, inject, OnDestroy } from "@angular/core";
import { BehaviorSubject, Observable, map, distinctUntilChanged } from "rxjs";
import { ShipEasyI18n_CONFIG, type ShipEasyI18nConfig } from "./i18n-config";

declare global {
  interface Window {
    i18n?: {
      t: (key: string, vars?: Record<string, string | number>) => string;
      ready: (cb: () => void) => void;
      on: (event: "update", cb: () => void) => () => void;
      locale: string | null;
    };
  }
}

@Injectable({ providedIn: "root" })
export class ShipEasyI18nService implements OnDestroy {
  private readonly config = inject(ShipEasyI18n_CONFIG, {
    optional: true,
  }) as ShipEasyI18nConfig | null;
  private readonly zone = inject(NgZone);

  private readonly version$ = new BehaviorSubject<number>(0);
  private readonly ready$ = new BehaviorSubject<boolean>(false);
  private readonly locale$ = new BehaviorSubject<string | null>(null);

  private unsubscribe: (() => void) | null = null;

  constructor() {
    this.init();
  }

  private init(): void {
    if (typeof window === "undefined") return;

    if (window.i18n?.locale) {
      this.ready$.next(true);
      this.locale$.next(window.i18n.locale);
    }

    window.i18n?.ready(() => {
      this.zone.run(() => {
        this.ready$.next(true);
        this.locale$.next(window.i18n!.locale);
        this.version$.next(this.version$.value + 1);
      });
    });

    this.unsubscribe =
      window.i18n?.on("update", () => {
        this.zone.run(() => {
          this.locale$.next(window.i18n!.locale);
          this.version$.next(this.version$.value + 1);
        });
      }) ?? null;
  }

  ngOnDestroy(): void {
    this.unsubscribe?.();
  }

  translate(key: string, variables?: Record<string, string | number>): Observable<string> {
    return this.version$.pipe(
      map(() => this.t(key, variables)),
      distinctUntilChanged(),
    );
  }

  t(key: string, variables?: Record<string, string | number>): string {
    if (typeof window !== "undefined" && window.i18n) return window.i18n.t(key, variables);
    return key;
  }

  get ready(): Observable<boolean> {
    return this.ready$.asObservable().pipe(distinctUntilChanged());
  }

  get locale(): Observable<string | null> {
    return this.locale$.asObservable().pipe(distinctUntilChanged());
  }

  get isReady(): boolean {
    return this.ready$.value;
  }
}
