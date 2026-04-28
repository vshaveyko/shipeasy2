import {
  ref,
  readonly,
  computed,
  inject,
  provide,
  onMounted,
  onUnmounted,
  type App,
  type InjectionKey,
  type ComputedRef,
  type Plugin,
} from "vue";
export { labelAttrs } from "@shipeasy/i18n-core";
export type { LabelAttrs } from "@shipeasy/i18n-core";

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

interface ShipEasyI18nState {
  t: (key: string, variables?: Record<string, string | number>) => string;
  ready: boolean;
  locale: string | null;
}

const I18N_KEY: InjectionKey<{
  version: ReturnType<typeof ref<number>>;
  locale: ReturnType<typeof ref<string | null>>;
  ready: ReturnType<typeof ref<boolean>>;
}> = Symbol("i18n");

export interface ShipEasyI18nPluginOptions {
  ssrLocale?: string;
}

export const ShipEasyI18nPlugin: Plugin = {
  install(app: App, options: ShipEasyI18nPluginOptions = {}) {
    const version = ref(0);
    const ready = ref(typeof window !== "undefined" ? Boolean(window.i18n?.locale) : false);
    const locale = ref<string | null>(
      typeof window !== "undefined" && window.i18n?.locale
        ? window.i18n.locale
        : (options.ssrLocale ?? null),
    );

    if (typeof window !== "undefined") {
      window.i18n?.ready(() => {
        ready.value = true;
        locale.value = window.i18n!.locale;
        version.value++;
      });
      const unsub = window.i18n?.on("update", () => {
        locale.value = window.i18n!.locale;
        version.value++;
      });
      if (unsub)
        app.unmount = new Proxy(app.unmount, {
          apply(target, thisArg, args) {
            unsub();
            return Reflect.apply(target, thisArg, args);
          },
        });
    }

    app.provide(I18N_KEY, { version, locale, ready });
  },
};

function useI18nContext() {
  const ctx = inject(I18N_KEY);
  if (!ctx) throw new Error("[shipeasy-i18n] ShipEasyI18nPlugin not installed");
  return ctx;
}

export function useShipEasyI18n() {
  const { version, locale, ready } = useI18nContext();

  function t(key: string, variables?: Record<string, string | number>): string {
    void version.value; // track reactivity
    if (typeof window !== "undefined" && window.i18n) return window.i18n.t(key, variables);
    return key;
  }

  return { t, ready: readonly(ready), locale: readonly(locale) };
}

export function useI18nString(
  labelKey: string,
  variables?: Record<string, string | number>,
): ComputedRef<string> {
  const { version } = useI18nContext();
  return computed(() => {
    void version.value;
    if (typeof window !== "undefined" && window.i18n) return window.i18n.t(labelKey, variables);
    return labelKey;
  });
}
