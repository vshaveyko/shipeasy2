import { z } from "zod";
import {
  configCreateSchema,
  configUpdateSchema,
  configDraftUpsertSchema,
  configPublishSchema,
} from "@shipeasy/core/schemas/configs";
import type { Page, PageQuery } from "@shipeasy/core/pagination";
import type { Transport } from "../transport.js";
import { ApiError } from "../transport.js";

/** Use input types so callers can omit fields the server defaults. */
export type ConfigCreateInput = z.input<typeof configCreateSchema>;
export type ConfigUpdateInput = z.input<typeof configUpdateSchema>;
export type ConfigDraftUpsertInput = z.input<typeof configDraftUpsertSchema>;
export type ConfigPublishInput = z.input<typeof configPublishSchema>;

export interface Config {
  id: string;
  name: string;
  description?: string | null;
  schema: Record<string, unknown>;
  values?: Record<string, unknown>;
  drafts?: Record<string, unknown>;
  updatedAt: string;
}

export interface ConfigActivityEntry {
  id: string;
  action: string;
  env?: string | null;
  actor?: string | null;
  payload?: unknown;
  createdAt: string;
}

export interface ConfigsClient {
  list(opts?: Partial<PageQuery>): Promise<Page<Config>>;
  listAll(): Promise<Config[]>;
  get(id: string): Promise<Config>;
  resolve(idOrName: string): Promise<Config>;
  create(input: ConfigCreateInput): Promise<Config>;
  update(id: string, input: ConfigUpdateInput): Promise<Config>;
  delete(id: string): Promise<{ ok: true }>;
  /** Save a draft value for the given env (PUT /:id/drafts). */
  saveDraft(id: string, input: ConfigDraftUpsertInput): Promise<unknown>;
  /** Discard a draft for the given env (DELETE /:id/drafts with body). */
  discardDraft(id: string, input: ConfigPublishInput): Promise<unknown>;
  /** Publish a previously saved draft (POST /:id/publish). */
  publish(id: string, input: ConfigPublishInput): Promise<unknown>;
  activity(id: string, limit?: number): Promise<ConfigActivityEntry[]>;
}

const BASE = "/api/admin/configs";

export function configsClient(t: Transport): ConfigsClient {
  async function list(opts: Partial<PageQuery> = {}): Promise<Page<Config>> {
    const query: Record<string, string> = {};
    if (opts.limit !== undefined) query.limit = String(opts.limit);
    if (opts.cursor) query.cursor = opts.cursor;
    return t.request<Page<Config>>("GET", BASE, undefined, query);
  }
  async function listAll(): Promise<Config[]> {
    const out: Config[] = [];
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
      return await t.request<Config>("GET", `${BASE}/${idOrName}`);
    } catch (err) {
      if (!(err instanceof ApiError) || err.status !== 404) throw err;
    }
    const all = await listAll();
    const found = all.find((c) => c.name === idOrName);
    if (!found) throw new ApiError(`Config '${idOrName}' not found`, 404);
    return found;
  }

  return {
    list,
    listAll,
    resolve,
    get: (id) => t.request<Config>("GET", `${BASE}/${id}`),
    create: (input) => t.request<Config>("POST", BASE, configCreateSchema.parse(input)),
    update: (id, input) =>
      t.request<Config>("PATCH", `${BASE}/${id}`, configUpdateSchema.parse(input)),
    delete: (id) => t.request<{ ok: true }>("DELETE", `${BASE}/${id}`),
    saveDraft: (id, input) =>
      t.request("PUT", `${BASE}/${id}/drafts`, configDraftUpsertSchema.parse(input)),
    discardDraft: (id, input) =>
      t.request("DELETE", `${BASE}/${id}/drafts`, configPublishSchema.parse(input)),
    publish: (id, input) =>
      t.request("POST", `${BASE}/${id}/publish`, configPublishSchema.parse(input)),
    activity: (id, limit) =>
      t.request<ConfigActivityEntry[]>(
        "GET",
        `${BASE}/${id}/activity`,
        undefined,
        limit ? { limit: String(limit) } : undefined,
      ),
  };
}

export const configsResource = {
  name: "configs" as const,
  basePath: BASE,
  describeOne: "config",
  describeMany: "configs",
  schemas: {
    create: configCreateSchema,
    update: configUpdateSchema,
    saveDraft: configDraftUpsertSchema,
    publish: configPublishSchema,
  },
  actions: [
    { name: "publish", description: "Publish a config draft for an env" },
    { name: "saveDraft", description: "Save a draft value for an env" },
    { name: "discardDraft", description: "Discard a draft for an env" },
  ] as const,
} as const;
