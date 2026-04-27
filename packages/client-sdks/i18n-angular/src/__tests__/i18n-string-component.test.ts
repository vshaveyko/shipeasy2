import { describe, it, expect, vi, afterEach } from "vitest";
import { TestBed, ComponentFixture } from "@angular/core/testing";
import { Component, Input } from "@angular/core";
import { ShipEasyI18nStringComponent } from "../i18n-string.component";
import { ShipEasyI18nService } from "../i18n.service";
import { ShipEasyI18n_CONFIG } from "../i18n-config";

// ── Host component ────────────────────────────────────────────────────────────

@Component({
  standalone: true,
  imports: [ShipEasyI18nStringComponent],
  template: `<i18n-string [key]="key" [variables]="vars" [desc]="desc"></i18n-string>`,
})
class HostComponent {
  @Input() key = "nav.home";
  @Input() vars?: Record<string, string | number>;
  @Input() desc?: string;
}

function buildFixture(
  tFn?: (k: string, v?: Record<string, string | number>) => string,
): ComponentFixture<HostComponent> {
  (globalThis as Record<string, unknown>).window = {
    i18n: {
      t: vi.fn(tFn ?? ((k: string) => `[${k}]`)),
      ready: vi.fn(),
      on: vi.fn(() => vi.fn()),
      locale: "en:prod",
    },
  };

  TestBed.configureTestingModule({
    imports: [HostComponent],
    providers: [
      ShipEasyI18nService,
      { provide: ShipEasyI18n_CONFIG, useValue: { i18nKey: "test", profile: "en:prod" } },
    ],
  });

  const fixture = TestBed.createComponent(HostComponent);
  fixture.detectChanges();
  return fixture;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("ShipEasyI18nStringComponent", () => {
  afterEach(() => {
    TestBed.resetTestingModule();
    delete (globalThis as Record<string, unknown>).window;
    vi.restoreAllMocks();
  });

  it("renders translated text inside a span", async () => {
    const fixture = buildFixture(() => "Home");
    await fixture.whenStable();
    fixture.detectChanges();

    const span = fixture.nativeElement.querySelector("span") as HTMLElement;
    expect(span.textContent?.trim()).toBe("Home");
  });

  it("sets data-label attribute to the key", async () => {
    const fixture = buildFixture();
    await fixture.whenStable();
    fixture.detectChanges();

    const span = fixture.nativeElement.querySelector("span") as HTMLElement;
    expect(span.getAttribute("data-label")).toBe("nav.home");
  });

  it("does not set data-variables when variables are absent", async () => {
    const fixture = buildFixture();
    await fixture.whenStable();
    fixture.detectChanges();

    const span = fixture.nativeElement.querySelector("span") as HTMLElement;
    expect(span.getAttribute("data-variables")).toBeNull();
  });

  it("sets data-variables as JSON when variables are provided", async () => {
    const fixture = buildFixture((k, v) => `Hello ${v?.name}`);
    fixture.componentInstance.key = "greeting";
    fixture.componentInstance.vars = { name: "Alice" };
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const span = fixture.nativeElement.querySelector("span") as HTMLElement;
    expect(span.getAttribute("data-variables")).toBe(JSON.stringify({ name: "Alice" }));
  });

  it("sets data-label-desc when desc is provided", async () => {
    const fixture = buildFixture();
    fixture.componentInstance.desc = "Main nav home";
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const span = fixture.nativeElement.querySelector("span") as HTMLElement;
    expect(span.getAttribute("data-label-desc")).toBe("Main nav home");
  });

  it("re-renders when key binding changes", async () => {
    const tFn = vi.fn((k: string) => (k === "nav.about" ? "About" : `[${k}]`));
    const fixture = buildFixture(tFn);
    await fixture.whenStable();
    fixture.detectChanges();

    fixture.componentInstance.key = "nav.about";
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const span = fixture.nativeElement.querySelector("span") as HTMLElement;
    expect(span.textContent?.trim()).toBe("About");
    expect(span.getAttribute("data-label")).toBe("nav.about");
  });
});
