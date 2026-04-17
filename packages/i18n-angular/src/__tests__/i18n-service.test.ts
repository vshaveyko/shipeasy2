import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { TestBed } from "@angular/core/testing";
import { NgZone } from "@angular/core";
import { firstValueFrom, take, toArray } from "rxjs";
import { ShipEasyI18nService } from "../i18n.service";
import { ShipEasyI18n_CONFIG } from "../i18n-config";

// ── Helpers ───────────────────────────────────────────────────────────────────

type I18nWindow = {
  t: ReturnType<typeof vi.fn>;
  ready: ReturnType<typeof vi.fn>;
  on: ReturnType<typeof vi.fn>;
  locale: string | null;
};

function mockI18n(overrides?: Partial<I18nWindow>): I18nWindow {
  return {
    t: vi.fn((key: string) => `[${key}]`),
    ready: vi.fn(),
    on: vi.fn(() => vi.fn()), // returns unsubscribe fn
    locale: "en:prod",
    ...overrides,
  };
}

function buildService(i18nWindow?: I18nWindow | null): ShipEasyI18nService {
  if (i18nWindow !== undefined) {
    (globalThis as Record<string, unknown>).window = {
      ...(globalThis as Record<string, unknown>).window,
      i18n: i18nWindow ?? undefined,
    };
  }

  TestBed.configureTestingModule({
    providers: [
      ShipEasyI18nService,
      { provide: ShipEasyI18n_CONFIG, useValue: { i18nKey: "test", profile: "en:prod" } },
    ],
  });

  return TestBed.inject(ShipEasyI18nService);
}

// ── t() — synchronous translation ────────────────────────────────────────────

describe("ShipEasyI18nService.t()", () => {
  afterEach(() => {
    TestBed.resetTestingModule();
    delete (globalThis as Record<string, unknown>).window;
  });

  it("returns key as fallback when window.i18n is absent", () => {
    const svc = buildService(null);
    expect(svc.t("nav.home")).toBe("nav.home");
  });

  it("delegates to window.i18n.t when present", () => {
    const i18n = mockI18n({ t: vi.fn(() => "Home") });
    const svc = buildService(i18n);
    expect(svc.t("nav.home")).toBe("Home");
    expect(i18n.t).toHaveBeenCalledWith("nav.home", undefined);
  });

  it("passes variables through to window.i18n.t", () => {
    const i18n = mockI18n({ t: vi.fn(() => "Hello, Alice") });
    const svc = buildService(i18n);
    svc.t("greeting", { name: "Alice" });
    expect(i18n.t).toHaveBeenCalledWith("greeting", { name: "Alice" });
  });
});

// ── isReady / ready$ ──────────────────────────────────────────────────────────

describe("ShipEasyI18nService.isReady", () => {
  afterEach(() => {
    TestBed.resetTestingModule();
    delete (globalThis as Record<string, unknown>).window;
  });

  it("is false when window.i18n is absent", () => {
    const svc = buildService(null);
    expect(svc.isReady).toBe(false);
  });

  it("is true immediately when window.i18n.locale is already set", () => {
    const i18n = mockI18n({ locale: "en:prod" });
    const svc = buildService(i18n);
    expect(svc.isReady).toBe(true);
  });

  it("becomes true when window.i18n.ready fires", async () => {
    let readyCb: (() => void) | null = null;
    const i18n = mockI18n({
      locale: null,
      ready: vi.fn((cb: () => void) => {
        readyCb = cb;
      }),
    });
    const svc = buildService(i18n);

    expect(svc.isReady).toBe(false);

    // Trigger the ready callback inside NgZone (as the real code does)
    TestBed.inject(NgZone).run(() => readyCb?.());

    expect(svc.isReady).toBe(true);
  });
});

// ── translate() Observable ────────────────────────────────────────────────────

describe("ShipEasyI18nService.translate()", () => {
  afterEach(() => {
    TestBed.resetTestingModule();
    delete (globalThis as Record<string, unknown>).window;
  });

  it("emits the translated string immediately", async () => {
    const i18n = mockI18n({ t: vi.fn(() => "Home") });
    const svc = buildService(i18n);
    const value = await firstValueFrom(svc.translate("nav.home"));
    expect(value).toBe("Home");
  });

  it("emits key fallback when no window.i18n", async () => {
    const svc = buildService(null);
    const value = await firstValueFrom(svc.translate("nav.home"));
    expect(value).toBe("nav.home");
  });

  it("re-emits when 'update' event fires", async () => {
    let updateCb: (() => void) | null = null;
    let callCount = 0;
    const i18n = mockI18n({
      t: vi.fn(() => {
        callCount++;
        return callCount === 1 ? "v1" : "v2";
      }),
      on: vi.fn((_event: string, cb: () => void) => {
        updateCb = cb;
        return vi.fn();
      }),
    });
    const svc = buildService(i18n);

    // Collect 2 emissions
    const emissionsPromise = firstValueFrom(svc.translate("key").pipe(take(2), toArray()));

    // Trigger an update inside NgZone
    TestBed.inject(NgZone).run(() => updateCb?.());

    const emissions = await emissionsPromise;
    expect(emissions).toEqual(["v1", "v2"]);
  });

  it("does not re-emit if translated value is unchanged (distinctUntilChanged)", async () => {
    let updateCb: (() => void) | null = null;
    const i18n = mockI18n({
      t: vi.fn(() => "same"),
      on: vi.fn((_event: string, cb: () => void) => {
        updateCb = cb;
        return vi.fn();
      }),
    });
    const svc = buildService(i18n);

    const emissions: string[] = [];
    const sub = svc.translate("key").subscribe((v) => emissions.push(v));

    // Trigger two updates — same translation value should be suppressed
    TestBed.inject(NgZone).run(() => updateCb?.());
    TestBed.inject(NgZone).run(() => updateCb?.());

    sub.unsubscribe();

    // Only the initial emission, no duplicate
    expect(emissions).toEqual(["same"]);
  });
});

// ── locale Observable ─────────────────────────────────────────────────────────

describe("ShipEasyI18nService.locale", () => {
  afterEach(() => {
    TestBed.resetTestingModule();
    delete (globalThis as Record<string, unknown>).window;
  });

  it("emits null initially when locale is not set", async () => {
    const i18n = mockI18n({ locale: null });
    const svc = buildService(i18n);
    const value = await firstValueFrom(svc.locale);
    expect(value).toBeNull();
  });

  it("emits locale string when already set", async () => {
    const svc = buildService(mockI18n({ locale: "fr:prod" }));
    const value = await firstValueFrom(svc.locale);
    expect(value).toBe("fr:prod");
  });
});

// ── ngOnDestroy — unsubscribes from window.i18n.on ───────────────────────────

describe("ShipEasyI18nService.ngOnDestroy()", () => {
  afterEach(() => {
    TestBed.resetTestingModule();
    delete (globalThis as Record<string, unknown>).window;
  });

  it("calls the unsubscribe function returned by window.i18n.on", () => {
    const unsubscribeFn = vi.fn();
    const i18n = mockI18n({
      on: vi.fn(() => unsubscribeFn),
    });
    const svc = buildService(i18n);
    svc.ngOnDestroy();
    expect(unsubscribeFn).toHaveBeenCalledTimes(1);
  });

  it("does not throw when window.i18n is absent", () => {
    const svc = buildService(null);
    expect(() => svc.ngOnDestroy()).not.toThrow();
  });
});

// ── Zone.js wiring ────────────────────────────────────────────────────────────

describe("ShipEasyI18nService zone wiring", () => {
  afterEach(() => {
    TestBed.resetTestingModule();
    delete (globalThis as Record<string, unknown>).window;
  });

  it("ready callback runs via NgZone.run()", () => {
    let readyCb: (() => void) | null = null;
    const i18n = mockI18n({
      locale: null,
      ready: vi.fn((cb: () => void) => {
        readyCb = cb;
      }),
    });
    const svc = buildService(i18n);
    const zone = TestBed.inject(NgZone);
    const runSpy = vi.spyOn(zone, "run");

    // Simulate the ready callback arriving from outside Angular's zone
    readyCb?.();

    // zone.run should have been called (the service wires it)
    expect(runSpy).toHaveBeenCalled();
    expect(svc.isReady).toBe(true);
  });

  it("update callback increments version via NgZone.run()", () => {
    let updateCb: (() => void) | null = null;
    const i18n = mockI18n({
      on: vi.fn((_event: string, cb: () => void) => {
        updateCb = cb;
        return vi.fn();
      }),
    });
    const svc = buildService(i18n);
    const zone = TestBed.inject(NgZone);
    const runSpy = vi.spyOn(zone, "run");

    updateCb?.();

    expect(runSpy).toHaveBeenCalled();
    // version incremented — translate observable will re-evaluate
    expect((svc as unknown as { version$: { value: number } }).version$.value).toBe(1);
  });
});

// ── SSR guard ─────────────────────────────────────────────────────────────────

describe("ShipEasyI18nService SSR guard", () => {
  afterEach(() => {
    TestBed.resetTestingModule();
    vi.restoreAllMocks();
  });

  it("does not throw when window is undefined (SSR)", () => {
    // Temporarily remove window from globalThis to simulate Node/SSR
    const originalWindow = globalThis.window;
    // @ts-expect-error intentional
    delete globalThis.window;

    expect(() => {
      TestBed.configureTestingModule({
        providers: [
          ShipEasyI18nService,
          { provide: ShipEasyI18n_CONFIG, useValue: { i18nKey: "t", profile: "en:prod" } },
        ],
      });
      TestBed.inject(ShipEasyI18nService);
    }).not.toThrow();

    globalThis.window = originalWindow;
    TestBed.resetTestingModule();
  });
});
