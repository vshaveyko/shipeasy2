import { App, computed, inject, type InjectionKey, shallowRef, type Ref, type Plugin } from "vue";
import { FlagsClientBrowser, type ExperimentResult, type User } from "@shipeasy/sdk/client";

export type { ExperimentResult, User };

interface FlaglabVueOptions {
  sdkKey: string;
  baseUrl?: string;
  autoGuardrails?: boolean;
}

interface FlaglabContext {
  client: FlagsClientBrowser;
  version: Ref<number>;
}

const FLAGLAB_KEY: InjectionKey<FlaglabContext> = Symbol("flaglab");

export function createFlaglab(options: FlaglabVueOptions): Plugin {
  const client = new FlagsClientBrowser(options);
  const version = shallowRef(0);

  return {
    install(app: App) {
      app.provide(FLAGLAB_KEY, { client, version });
    },
  };
}

function useFlaglabContext(): FlaglabContext {
  const ctx = inject(FLAGLAB_KEY);
  if (!ctx) throw new Error("[shipeasy] createFlaglab() plugin not installed");
  return ctx;
}

export function useFlaglab() {
  const { client, version } = useFlaglabContext();

  async function identify(user: User): Promise<void> {
    await client.identify(user);
    version.value++;
  }

  return { client, identify, version };
}

export function useFlag(name: string) {
  const { client, version } = useFlaglabContext();
  return computed(() => {
    void version.value; // track dependency
    return client.getFlag(name);
  });
}

export function useExperiment<P extends Record<string, unknown>>(
  name: string,
  defaultParams: P,
  decode?: (raw: unknown) => P,
) {
  const { client, version } = useFlaglabContext();
  return computed<ExperimentResult<P>>(() => {
    void version.value; // track dependency
    return client.getExperiment(name, defaultParams, decode);
  });
}

export function useConfig<T = unknown>(name: string, decode?: (raw: unknown) => T) {
  const { client, version } = useFlaglabContext();
  return computed<T | undefined>(() => {
    void version.value; // track dependency
    return client.getConfig(name, decode);
  });
}
