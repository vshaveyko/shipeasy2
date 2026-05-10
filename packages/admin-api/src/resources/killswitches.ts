import { z } from "zod";
import {
  killswitchCreateSchema,
  killswitchUpdateSchema,
  killswitchSwitchSetSchema,
  killswitchSwitchUnsetSchema,
} from "@shipeasy/core/schemas/killswitches";
import type { Page, PageQuery } from "@shipeasy/core/pagination";
import type { Transport } from "../transport.js";
import { ApiError } from "../transport.js";

export type KillswitchCreateInput = z.input<typeof killswitchCreateSchema>;
export type KillswitchUpdateInput = z.input<typeof killswitchUpdateSchema>;
export type KillswitchSwitchSetInput = z.input<typeof killswitchSwitchSetSchema>;
export type KillswitchSwitchUnsetInput = z.input<typeof killswitchSwitchUnsetSchema>;

export interface Killswitch {
  id: string;
  name: string;
  description: string | null;
  updatedAt: string;
  envs: Record<
    string,
    { value: boolean; switches?: Record<string, boolean>; version: number; publishedAt: string }
  >;
}

export interface KillswitchesClient {
  list(opts?: Partial<PageQuery>): Promise<Page<Killswitch>>;
  listAll(): Promise<Killswitch[]>;
  get(id: string): Promise<Killswitch>;
  resolve(idOrName: string): Promise<Killswitch>;
  create(input: KillswitchCreateInput): Promise<{ id: string; name: string }>;
  update(id: string, input: KillswitchUpdateInput): Promise<{ id: string }>;
  delete(id: string): Promise<{ ok: true }>;
  setSwitch(id: string, input: KillswitchSwitchSetInput): Promise<unknown>;
  unsetSwitch(id: string, input: KillswitchSwitchUnsetInput): Promise<unknown>;
}

const BASE = "/api/admin/killswitches";

export function killswitchesClient(t: Transport): KillswitchesClient {
  async function list(opts: Partial<PageQuery> = {}): Promise<Page<Killswitch>> {
    const query: Record<string, string> = {};
    if (opts.limit !== undefined) query.limit = String(opts.limit);
    if (opts.cursor) query.cursor = opts.cursor;
    return t.request<Page<Killswitch>>("GET", BASE, undefined, query);
  }
  async function listAll(): Promise<Killswitch[]> {
    const out: Killswitch[] = [];
    let cursor: string | undefined;
    do {
      const page = await list({ limit: 500, cursor });
      out.push(...page.data);
      cursor = page.next_cursor ?? undefined;
    } while (cursor);
    return out;
  }
  async function resolve(idOrName: string) {
    try {
      return await t.request<Killswitch>("GET", `${BASE}/${idOrName}`);
    } catch (err) {
      if (!(err instanceof ApiError) || err.status !== 404) throw err;
    }
    const all = await listAll();
    const found = all.find((k) => k.name === idOrName);
    if (!found) throw new ApiError(`Killswitch '${idOrName}' not found`, 404);
    return found;
  }
  return {
    list,
    listAll,
    resolve,
    get: (id) => t.request<Killswitch>("GET", `${BASE}/${id}`),
    create: (input) =>
      t.request<{ id: string; name: string }>("POST", BASE, killswitchCreateSchema.parse(input)),
    update: (id, input) =>
      t.request<{ id: string }>("PATCH", `${BASE}/${id}`, killswitchUpdateSchema.parse(input)),
    delete: (id) => t.request<{ ok: true }>("DELETE", `${BASE}/${id}`),
    setSwitch: (id, input) =>
      t.request("PUT", `${BASE}/${id}/switch`, killswitchSwitchSetSchema.parse(input)),
    unsetSwitch: (id, input) =>
      t.request("DELETE", `${BASE}/${id}/switch`, killswitchSwitchUnsetSchema.parse(input)),
  };
}

export const killswitchesResource = {
  name: "killswitches" as const,
  basePath: BASE,
  describeOne: "killswitch",
  describeMany: "killswitches",
  schemas: {
    create: killswitchCreateSchema,
    update: killswitchUpdateSchema,
    setSwitch: killswitchSwitchSetSchema,
    unsetSwitch: killswitchSwitchUnsetSchema,
  },
  actions: [
    { name: "setSwitch", description: "Set or update one switch entry on one env" },
    { name: "unsetSwitch", description: "Remove one switch entry from one env" },
  ] as const,
} as const;
