import { derived, writable, type Readable } from "svelte/store";
import { FlagsClientBrowser, type ExperimentResult, type User } from "@shipeasy/sdk/client";

export type { ExperimentResult, User };

interface FlaglabStoreOptions {
  sdkKey: string;
  baseUrl?: string;
  autoGuardrails?: boolean;
}

interface FlaglabStore {
  client: FlagsClientBrowser;
  identify: (user: User) => Promise<void>;
  flagStore: (name: string) => Readable<boolean>;
  experimentStore: <P extends Record<string, unknown>>(
    name: string,
    defaultParams: P,
    decode?: (raw: unknown) => P,
  ) => Readable<ExperimentResult<P>>;
  configStore: <T = unknown>(name: string, decode?: (raw: unknown) => T) => Readable<T | undefined>;
}

export function createFlaglabStore(options: FlaglabStoreOptions): FlaglabStore {
  const client = new FlagsClientBrowser(options);
  const version = writable(0);

  async function identify(user: User): Promise<void> {
    await client.identify(user);
    version.update((v) => v + 1);
  }

  function flagStore(name: string): Readable<boolean> {
    return derived(version, () => client.getFlag(name));
  }

  function experimentStore<P extends Record<string, unknown>>(
    name: string,
    defaultParams: P,
    decode?: (raw: unknown) => P,
  ): Readable<ExperimentResult<P>> {
    return derived(version, () => client.getExperiment(name, defaultParams, decode));
  }

  function configStore<T = unknown>(
    name: string,
    decode?: (raw: unknown) => T,
  ): Readable<T | undefined> {
    return derived(version, () => client.getConfig(name, decode));
  }

  return { client, identify, flagStore, experimentStore, configStore };
}
