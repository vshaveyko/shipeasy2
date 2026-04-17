import { describe, it, expect, vi, afterEach } from "vitest";
import { TestBed } from "@angular/core/testing";
import { Component } from "@angular/core";
import { ComponentFixture } from "@angular/core/testing";
import { TranslatePipe } from "../translate.pipe";
import { ShipEasyI18nService } from "../i18n.service";
import { ShipEasyI18n_CONFIG } from "../i18n-config";

// ── Host component that exercises the pipe in a real template ─────────────────

@Component({
  standalone: true,
  imports: [TranslatePipe],
  template: `<span id="out">{{ key | i18nTranslate }}</span>`,
})
class TestHostComponent {
  key = "nav.home";
}

function buildFixture(): {
  fixture: ComponentFixture<TestHostComponent>;
  tFn: ReturnType<typeof vi.fn>;
} {
  const tFn = vi.fn((k: string) => `[${k}]`);

  (globalThis as Record<string, unknown>).window = {
    i18n: {
      t: tFn,
      ready: vi.fn(),
      on: vi.fn(() => vi.fn()),
      locale: "en:prod",
    },
  };

  TestBed.configureTestingModule({
    imports: [TestHostComponent],
    providers: [
      ShipEasyI18nService,
      { provide: ShipEasyI18n_CONFIG, useValue: { i18nKey: "test", profile: "en:prod" } },
    ],
  });

  const fixture = TestBed.createComponent(TestHostComponent);
  fixture.detectChanges();
  return { fixture, tFn };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("TranslatePipe", () => {
  afterEach(() => {
    TestBed.resetTestingModule();
    delete (globalThis as Record<string, unknown>).window;
    vi.restoreAllMocks();
  });

  it("renders translated text in template", () => {
    const { fixture } = buildFixture();
    const el = fixture.nativeElement.querySelector("#out") as HTMLElement;
    expect(el.textContent).toBe("[nav.home]");
  });

  it("re-renders when key binding changes", () => {
    const { fixture, tFn } = buildFixture();
    tFn.mockImplementation((k: string) => (k === "nav.about" ? "About" : `[${k}]`));

    fixture.componentInstance.key = "nav.about";
    fixture.detectChanges();

    const el = fixture.nativeElement.querySelector("#out") as HTMLElement;
    expect(el.textContent).toBe("About");
  });

  it("caches result when key and vars are unchanged", () => {
    const { fixture, tFn } = buildFixture();
    fixture.detectChanges(); // second CD cycle
    fixture.detectChanges(); // third CD cycle

    // The pipe is impure, so transform() runs on each cycle;
    // but the key hasn't changed so lastValue is reused, not re-calling t().
    // t() is called once on first transform, not on subsequent unchanged calls.
    const calls = tFn.mock.calls.filter(([k]: [string]) => k === "nav.home").length;
    expect(calls).toBe(1);
  });
});

// ── Standalone pipe transform unit test (no template) ────────────────────────

describe("TranslatePipe.transform() unit", () => {
  afterEach(() => {
    TestBed.resetTestingModule();
    delete (globalThis as Record<string, unknown>).window;
    vi.restoreAllMocks();
  });

  it("returns key fallback when window.i18n is absent", () => {
    TestBed.configureTestingModule({
      providers: [
        ShipEasyI18nService,
        { provide: ShipEasyI18n_CONFIG, useValue: { i18nKey: "t", profile: "en:prod" } },
        TranslatePipe,
        // ChangeDetectorRef stub
        { provide: "ChangeDetectorRef", useValue: { markForCheck: vi.fn() } },
      ],
    });

    // Without window.i18n, service.t() returns the key
    const svc = TestBed.inject(ShipEasyI18nService);
    expect(svc.t("nav.home")).toBe("nav.home");
  });
});
