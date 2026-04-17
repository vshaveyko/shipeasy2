# Plan: ShipEasyI18n Angular Integration

**Goal**: Provide an Angular module with an injectable `ShipEasyI18nService` (Observable-based), a `TranslatePipe` for templates, and correct change detection wiring so label updates from the in-browser editor propagate through Angular's zone-based change detection.
**Package**: `@i18n/angular`
**Key challenge**: Angular's default change detection runs inside Zone.js. `window.i18n.on('update')` fires outside Angular's zone, so naive subscriptions will not trigger view updates. The service must `zone.run()` state changes to re-enter Angular's zone.

---

## Install

```bash
npm install @i18n/angular
```

Peer dependencies: `@angular/core >= 15`, `@angular/common >= 15`, `rxjs >= 7`.

---

## Package Exports

```
@i18n/angular
  ShipEasyI18nModule              — NgModule with declarations and providers
  ShipEasyI18nService             — injectable service (Observable<string> for each key)
  TranslatePipe          — async-capable pipe: {{ 'key' | i18nTranslate }}
  ShipEasyI18nStringComponent     — component: <i18n-string key="nav.home" />
  provideShipEasyI18n             — standalone API: provide in bootstrapApplication()
  ShipEasyI18n_CONFIG             — InjectionToken for config
```

---

## Full Source

### `src/i18n-config.ts`

```typescript
import { InjectionToken } from "@angular/core";

export interface ShipEasyI18nConfig {
  /** Public key (i18n_pk_...) */
  i18nKey: string;
  /** Profile string e.g. "en:prod" */
  profile: string;
  /** loader.js CDN URL */
  loaderUrl?: string;
}

export const ShipEasyI18n_CONFIG = new InjectionToken<ShipEasyI18nConfig>("ShipEasyI18n_CONFIG");
```

### `src/i18n.service.ts`

```typescript
import { Injectable, NgZone, inject, OnDestroy } from "@angular/core";
import { BehaviorSubject, Observable, map, distinctUntilChanged } from "rxjs";
import { ShipEasyI18n_CONFIG, type ShipEasyI18nConfig } from "./i18n-config";

// Extend global window type
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
  }) satisfies ShipEasyI18nConfig | null;
  private readonly zone = inject(NgZone);

  /** Emits a version counter — increments whenever labels update */
  private readonly version$ = new BehaviorSubject<number>(0);

  /** True once the label file has been applied */
  private readonly ready$ = new BehaviorSubject<boolean>(false);

  /** Current locale string */
  private readonly locale$ = new BehaviorSubject<string | null>(null);

  private unsubscribe: (() => void) | null = null;

  constructor() {
    this.init();
  }

  private init(): void {
    if (typeof window === "undefined") return; // SSR guard

    // If loader.js already ran (inline data), initialize immediately
    if (window.i18n?.locale) {
      this.ready$.next(true);
      this.locale$.next(window.i18n.locale);
    }

    // Wait for labels to load
    window.i18n?.ready(() => {
      // Run inside Angular zone to trigger change detection
      this.zone.run(() => {
        this.ready$.next(true);
        this.locale$.next(window.i18n!.locale);
        this.version$.next(this.version$.value + 1);
      });
    });

    // Subscribe to live updates (editor preview)
    this.unsubscribe =
      window.i18n?.on("update", () => {
        this.zone.run(() => {
          this.locale$.next(window.i18n!.locale);
          // Increment version to invalidate translate() memoization
          this.version$.next(this.version$.value + 1);
        });
      }) ?? null;
  }

  ngOnDestroy(): void {
    this.unsubscribe?.();
  }

  /**
   * Returns an Observable that emits the translated string for `key` and
   * re-emits whenever labels update.
   *
   * @example
   * this.i18n.translate('user.greeting', { name: 'Alice' })
   *   .subscribe(text => this.greeting = text);
   */
  translate(key: string, variables?: Record<string, string | number>): Observable<string> {
    return this.version$.pipe(
      map(() => this.t(key, variables)),
      distinctUntilChanged(),
    );
  }

  /**
   * Synchronous translation. Safe to call in templates when using OnPush
   * change detection — combine with the `version$` observable to know when
   * to re-evaluate.
   */
  t(key: string, variables?: Record<string, string | number>): string {
    if (typeof window !== "undefined" && window.i18n) {
      return window.i18n.t(key, variables);
    }
    return key;
  }

  /** Observable that emits true when labels are loaded */
  get ready(): Observable<boolean> {
    return this.ready$.asObservable().pipe(distinctUntilChanged());
  }

  /** Observable that emits the current locale string */
  get locale(): Observable<string | null> {
    return this.locale$.asObservable().pipe(distinctUntilChanged());
  }

  /** Snapshot: is ShipEasyI18n ready right now? */
  get isReady(): boolean {
    return this.ready$.value;
  }
}
```

### `src/translate.pipe.ts`

```typescript
import { Pipe, PipeTransform, inject, ChangeDetectorRef, OnDestroy } from "@angular/core";
import { Subscription } from "rxjs";
import { ShipEasyI18nService } from "./i18n.service";

/**
 * Angular pipe that translates an ShipEasyI18n key.
 *
 * Usage:
 *   {{ 'user.greeting' | i18nTranslate }}
 *   {{ 'user.greeting' | i18nTranslate:{ name: userName } }}
 *
 * The pipe is impure (marked pure: false) so Angular re-evaluates it
 * on every change detection cycle when labels update. For high-performance
 * apps, use the Observable API with the async pipe instead.
 *
 * Alternative: use the Observable API:
 *   {{ i18n.translate('user.greeting', { name }) | async }}
 */
@Pipe({
  name: "i18nTranslate",
  pure: false, // Must be impure to react to label updates
  standalone: true,
})
export class TranslatePipe implements PipeTransform, OnDestroy {
  private readonly i18n = inject(ShipEasyI18nService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly sub: Subscription;

  private lastKey: string | null = null;
  private lastVars: Record<string, string | number> | undefined;
  private lastValue: string = "";

  constructor() {
    // Re-trigger change detection when labels update
    this.sub = this.i18n.ready.subscribe(() => {
      this.cdr.markForCheck();
    });
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }

  transform(key: string, variables?: Record<string, string | number>): string {
    if (key === this.lastKey && variables === this.lastVars) {
      return this.lastValue;
    }
    this.lastKey = key;
    this.lastVars = variables;
    this.lastValue = this.i18n.t(key, variables);
    return this.lastValue;
  }
}
```

### `src/i18n-string.component.ts`

```typescript
import {
  Component,
  Input,
  OnChanges,
  SimpleChanges,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  inject,
  OnDestroy,
  OnInit,
} from "@angular/core";
import { AsyncPipe } from "@angular/common";
import { Observable, Subscription } from "rxjs";
import { ShipEasyI18nService } from "./i18n.service";

@Component({
  selector: "i18n-string",
  standalone: true,
  imports: [AsyncPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span
      [attr.data-label]="key"
      [attr.data-variables]="variables ? toJson(variables) : null"
      [attr.data-label-desc]="desc"
      >{{ translated$ | async }}</span
    >
  `,
})
export class ShipEasyI18nStringComponent implements OnInit, OnChanges, OnDestroy {
  @Input({ required: true }) key!: string;
  @Input() variables?: Record<string, string | number>;
  @Input() desc?: string;

  protected translated$!: Observable<string>;

  private readonly i18n = inject(ShipEasyI18nService);
  private sub: Subscription | null = null;

  ngOnInit(): void {
    this.buildObservable();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes["key"] || changes["variables"]) {
      this.buildObservable();
    }
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  private buildObservable(): void {
    this.translated$ = this.i18n.translate(this.key, this.variables);
  }

  protected toJson(v: Record<string, string | number>): string {
    return JSON.stringify(v);
  }
}
```

### `src/i18n.module.ts`

```typescript
import { NgModule, ModuleWithProviders } from "@angular/core";
import { CommonModule } from "@angular/common";
import { TranslatePipe } from "./translate.pipe";
import { ShipEasyI18nStringComponent } from "./i18n-string.component";
import { ShipEasyI18nService } from "./i18n.service";
import { ShipEasyI18n_CONFIG, type ShipEasyI18nConfig } from "./i18n-config";

@NgModule({
  imports: [CommonModule, TranslatePipe, ShipEasyI18nStringComponent],
  exports: [TranslatePipe, ShipEasyI18nStringComponent],
})
export class ShipEasyI18nModule {
  static forRoot(config: ShipEasyI18nConfig): ModuleWithProviders<ShipEasyI18nModule> {
    return {
      ngModule: ShipEasyI18nModule,
      providers: [ShipEasyI18nService, { provide: ShipEasyI18n_CONFIG, useValue: config }],
    };
  }
}
```

### `src/provide-i18n.ts` (Standalone API)

```typescript
import { Provider } from "@angular/core";
import { ShipEasyI18nService } from "./i18n.service";
import { ShipEasyI18n_CONFIG, type ShipEasyI18nConfig } from "./i18n-config";

/**
 * For standalone Angular apps (bootstrapApplication).
 *
 * @example
 * bootstrapApplication(AppComponent, {
 *   providers: [provideShipEasyI18n({ i18nKey: 'i18n_pk_abc123', profile: 'en:prod' })],
 * });
 */
export function provideShipEasyI18n(config: ShipEasyI18nConfig): Provider[] {
  return [ShipEasyI18nService, { provide: ShipEasyI18n_CONFIG, useValue: config }];
}
```

### `src/public-api.ts`

```typescript
export { ShipEasyI18nModule } from "./i18n.module";
export { ShipEasyI18nService } from "./i18n.service";
export { TranslatePipe } from "./translate.pipe";
export { ShipEasyI18nStringComponent } from "./i18n-string.component";
export { provideShipEasyI18n } from "./provide-i18n";
export { ShipEasyI18n_CONFIG } from "./i18n-config";
export type { ShipEasyI18nConfig } from "./i18n-config";
```

---

## Script Tag Setup

Add loader.js to `index.html`:

```html
<!-- src/index.html -->
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>My App</title>
    <script
      src="https://cdn.i18n.shipeasy.ai/loader.js"
      data-key="i18n_pk_abc123"
      data-profile="en:prod"
      async
    ></script>
  </head>
  <body>
    <app-root></app-root>
  </body>
</html>
```

For Angular Universal (SSR), also inject inline label data — see SSR section.

---

## App Setup

### Module-based (AppModule)

```typescript
// app.module.ts
import { NgModule } from "@angular/core";
import { BrowserModule } from "@angular/platform-browser";
import { ShipEasyI18nModule } from "@i18n/angular";
import { AppComponent } from "./app.component";

@NgModule({
  declarations: [AppComponent],
  imports: [
    BrowserModule,
    ShipEasyI18nModule.forRoot({
      i18nKey: "i18n_pk_abc123",
      profile: "en:prod",
    }),
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
```

### Standalone (Angular 14+)

```typescript
// main.ts
import { bootstrapApplication } from "@angular/platform-browser";
import { AppComponent } from "./app/app.component";
import { provideShipEasyI18n } from "@i18n/angular";

bootstrapApplication(AppComponent, {
  providers: [provideShipEasyI18n({ i18nKey: "i18n_pk_abc123", profile: "en:prod" })],
});
```

---

## Usage Examples

### Template with pipe

```html
<!-- dashboard.component.html -->
<h1 data-label="user.greeting">{{ 'user.greeting' | i18nTranslate:{ name: userName } }}</h1>
<p>{{ 'nav.home' | i18nTranslate }}</p>
```

### Template with async pipe (OnPush-safe)

```typescript
// dashboard.component.ts
@Component({
  selector: "app-dashboard",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1 data-label="user.greeting">
      {{ greeting$ | async }}
    </h1>
  `,
})
export class DashboardComponent implements OnInit {
  private readonly i18n = inject(ShipEasyI18nService);
  protected greeting$!: Observable<string>;

  ngOnInit() {
    // userName$ is an observable from your store
    this.greeting$ = combineLatest([this.userName$, this.i18n.ready]).pipe(
      switchMap(([name]) => this.i18n.translate("user.greeting", { name })),
    );
  }
}
```

### ShipEasyI18n String Component

```html
<i18n-string key="nav.home" desc="Main navigation home link"></i18n-string>
<i18n-string key="user.greeting" [variables]="{ name: userName }"></i18n-string>
```

### Injecting in a service

```typescript
@Injectable({ providedIn: "root" })
export class NotificationService {
  private readonly i18n = inject(ShipEasyI18nService);

  showSuccess(keyName: string): void {
    const message = this.i18n.t(keyName);
    this.snackBar.open(message, undefined, { duration: 3000 });
  }
}
```

---

## Change Detection Deep Dive

### Default (Zone.js) change detection

`window.i18n.on('update')` fires asynchronously outside Angular's zone. Without `zone.run()`, Angular will not detect the state change. `ShipEasyI18nService` wraps all callbacks in `this.zone.run(() => { ... })` which re-enters the zone and schedules a change detection cycle.

### OnPush change detection

With `ChangeDetectionStrategy.OnPush`, Angular only checks the component when:

1. Input references change
2. An event fires from within the component
3. An async pipe receives a new emission
4. `ChangeDetectorRef.markForCheck()` is called

Use the Observable API (`i18n.translate(key).pipe(...)` with `async` pipe) for full OnPush compatibility. This is the recommended pattern for performance-sensitive apps.

The `TranslatePipe` is `pure: false` — Angular re-evaluates impure pipes on every CD cycle, which is safe but slightly less optimal than the async pipe approach.

### `zone: 'noop'` (Zoneless Angular)

Angular 17+ supports zoneless change detection. In this mode, `zone.run()` is a no-op. Instead, use `ApplicationRef.tick()` or signals:

```typescript
// i18n.service.ts for zoneless apps
import { ApplicationRef, signal } from "@angular/core";

@Injectable({ providedIn: "root" })
export class ShipEasyI18nService {
  private readonly appRef = inject(ApplicationRef);
  readonly version = signal(0);

  private init() {
    window.i18n?.on("update", () => {
      this.version.update((v) => v + 1);
      this.appRef.tick(); // manually trigger CD in zoneless mode
    });
  }
}
```

---

## SSR with Angular Universal

For Angular Universal (server-side rendering):

1. In `server.ts`, fetch labels before rendering:

```typescript
// server.ts
import { fetchLabels } from "./i18n-fetch"; // your helper

app.get("*", async (req, res) => {
  const labels = await fetchLabels({ i18nKey: "i18n_pk_abc123", profile: "en:prod" });
  const inlineScript = `<script id="i18n-data" type="application/json">${JSON.stringify(labels)}</script>`;

  const { AppServerModule } = await import("./dist/server/main");
  const html = await renderModule(AppServerModule, {
    document: fs
      .readFileSync("./dist/browser/index.html", "utf-8")
      .replace("</head>", `${inlineScript}</head>`),
    url: req.url,
  });
  res.send(html);
});
```

2. `ShipEasyI18nService.init()` is guarded with `if (typeof window === 'undefined') return` — no errors on server.

3. The service's `t()` returns the key on the server (no translation). For server-side translation in Universal, pass the fetched labels through a `TRANSFER_STATE` token:

```typescript
// Server: set transfer state
const transferState = inject(TransferState);
transferState.set(makeStateKey<LabelFile>("i18nLabels"), labelFile);

// Client: read transfer state
const transferState = inject(TransferState);
const preloadedLabels = transferState.get(makeStateKey<LabelFile>("i18nLabels"), null);
```

---

## Edge Cases

### `ERROR Error: ExpressionChangedAfterItHasBeenCheckedError`

Occurs when `t()` returns a different value during the same CD cycle. Avoid calling `t()` in `ngOnInit` lifecycle hooks that run after CD. Use the async pipe (`translate(key) | async`) instead.

### Multiple `ShipEasyI18nModule.forRoot()` calls

Only call `forRoot()` in the root module. Feature modules should import `ShipEasyI18nModule` without `forRoot()` to avoid duplicate service instances:

```typescript
// feature.module.ts
@NgModule({
  imports: [ShipEasyI18nModule], // Not forRoot()
})
export class FeatureModule {}
```

### Lazy-loaded modules

ShipEasyI18n labels load globally via `window.i18n`. Lazy-loaded Angular modules inherit the same service instance — no special handling needed.

### Angular animations

If translations are used in animation states, ensure they are Observable-based so Angular can detect the change. String pipe values in animation triggers may not update correctly.

---

## Test Commands

```bash
npm test               # Karma + Jasmine (or Jest with @angular-builders/jest)
ng build               # Build check
ng build --configuration production  # Production AOT
npx ng lint            # ESLint
```

### Unit Test

```typescript
import { TestBed } from "@angular/core/testing";
import { ShipEasyI18nService } from "@i18n/angular";
import { ShipEasyI18n_CONFIG } from "@i18n/angular";

describe("ShipEasyI18nService", () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ShipEasyI18nService,
        {
          provide: ShipEasyI18n_CONFIG,
          useValue: { i18nKey: "test", profile: "en:prod" },
        },
      ],
    });
  });

  it("returns key as fallback when not ready", () => {
    const service = TestBed.inject(ShipEasyI18nService);
    expect(service.t("nav.home")).toBe("nav.home");
  });

  it("translates when window.i18n is mocked", () => {
    (window as any).i18n = {
      t: () => "Home",
      ready: (cb: () => void) => cb(),
      on: () => () => {},
      locale: "en:prod",
    };
    const service = TestBed.inject(ShipEasyI18nService);
    expect(service.t("nav.home")).toBe("Home");
  });
});
```

---

## End-to-End Example

```
my-angular-app/
  src/
    index.html          ← loader.js script tag
    main.ts             ← bootstrapApplication + provideShipEasyI18n()
    app/
      app.component.ts  ← imports TranslatePipe, ShipEasyI18nStringComponent
      app.component.html← {{ 'key' | i18nTranslate }}
      dashboard/
        dashboard.component.ts  ← inject(ShipEasyI18nService), translate() Observable
```
