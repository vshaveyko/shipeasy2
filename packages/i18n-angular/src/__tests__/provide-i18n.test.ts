import { describe, it, expect, afterEach } from "vitest";
import { TestBed } from "@angular/core/testing";
import { provideShipEasyI18n } from "../provide-i18n";
import { ShipEasyI18nService } from "../i18n.service";
import { ShipEasyI18n_CONFIG } from "../i18n-config";

describe("provideShipEasyI18n()", () => {
  afterEach(() => {
    TestBed.resetTestingModule();
    delete (globalThis as Record<string, unknown>).window;
  });

  it("returns a provider array containing ShipEasyI18nService and config token", () => {
    const providers = provideShipEasyI18n({ i18nKey: "i18n_pk_abc", profile: "en:prod" });
    expect(Array.isArray(providers)).toBe(true);
    expect(providers).toHaveLength(2);
  });

  it("injects ShipEasyI18nService when registered via provideShipEasyI18n", () => {
    TestBed.configureTestingModule({
      providers: provideShipEasyI18n({ i18nKey: "i18n_pk_abc", profile: "en:prod" }),
    });
    const svc = TestBed.inject(ShipEasyI18nService);
    expect(svc).toBeDefined();
  });

  it("makes config token available for injection", () => {
    TestBed.configureTestingModule({
      providers: provideShipEasyI18n({ i18nKey: "i18n_pk_xyz", profile: "fr:staging" }),
    });
    const config = TestBed.inject(ShipEasyI18n_CONFIG);
    expect(config.i18nKey).toBe("i18n_pk_xyz");
    expect(config.profile).toBe("fr:staging");
  });
});
