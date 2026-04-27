import { Injectable, InjectionToken, inject, type Provider, OnDestroy } from "@angular/core";
import { BehaviorSubject, Observable, map, distinctUntilChanged } from "rxjs";
import { FlagsClientBrowser, type ExperimentResult, type User } from "@shipeasy/sdk/client";

export type { ExperimentResult, User };

export interface FlaglabConfig {
  sdkKey: string;
  baseUrl?: string;
  autoGuardrails?: boolean;
}

export const FLAGLAB_CONFIG = new InjectionToken<FlaglabConfig>("FLAGLAB_CONFIG");

@Injectable()
export class FlaglabService implements OnDestroy {
  private readonly config = inject(FLAGLAB_CONFIG);
  private readonly client: FlagsClientBrowser;
  private readonly result$ = new BehaviorSubject<number>(0);

  constructor() {
    this.client = new FlagsClientBrowser(this.config);
  }

  async identify(user: User): Promise<void> {
    await this.client.identify(user);
    this.result$.next(this.result$.value + 1);
  }

  initFromBootstrap(data: Parameters<FlagsClientBrowser["initFromBootstrap"]>[0]): void {
    this.client.initFromBootstrap(data);
    this.result$.next(this.result$.value + 1);
  }

  getFlag(name: string): Observable<boolean> {
    return this.result$.pipe(
      map(() => this.client.getFlag(name)),
      distinctUntilChanged(),
    );
  }

  getExperiment<P extends Record<string, unknown>>(
    name: string,
    defaultParams: P,
    decode?: (raw: unknown) => P,
  ): Observable<ExperimentResult<P>> {
    return this.result$.pipe(
      map(() => this.client.getExperiment(name, defaultParams, decode)),
      distinctUntilChanged((a, b) => a.group === b.group && a.inExperiment === b.inExperiment),
    );
  }

  getConfig<T = unknown>(name: string, decode?: (raw: unknown) => T): Observable<T | undefined> {
    return this.result$.pipe(
      map(() => this.client.getConfig(name, decode)),
      distinctUntilChanged(),
    );
  }

  track(eventName: string, props?: Record<string, unknown>): void {
    this.client.track(eventName, props);
  }

  async flush(): Promise<void> {
    await this.client.flush();
  }

  ngOnDestroy(): void {
    this.client.destroy();
  }
}

export function provideFlaglab(config: FlaglabConfig): Provider[] {
  return [FlaglabService, { provide: FLAGLAB_CONFIG, useValue: config }];
}
