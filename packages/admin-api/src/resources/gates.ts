import {
  gateCreateSchema,
  gateUpdateSchema,
  type GateCreateInput,
  type GateUpdateInput,
} from "@shipeasy/core/schemas/gates";
import type { Transport } from "../transport.js";
import { ApiError } from "../transport.js";

/** Gate row as returned by `GET /api/admin/gates`. Booleans come back as 0/1 from D1. */
export interface Gate {
  id: string;
  name: string;
  enabled: number | boolean;
  killswitch: number | boolean;
  rolloutPct: number;
  rules?: unknown[];
  salt?: string;
  updatedAt: string;
}

export interface GatesClient {
  list(): Promise<Gate[]>;
  /** Server has no GET /:id endpoint — resolved by listing and filtering. */
  getByName(name: string): Promise<Gate>;
  /** Same as getByName but accepts either `id` or `name` (id wins if both match). */
  resolve(idOrName: string): Promise<Gate>;
  create(input: GateCreateInput): Promise<{ id: string; name: string }>;
  update(id: string, input: GateUpdateInput): Promise<{ id: string }>;
  delete(id: string): Promise<{ ok: true }>;
  enable(id: string): Promise<{ id: string; enabled: boolean }>;
  disable(id: string): Promise<{ id: string; enabled: boolean }>;
  /** Convenience: resolve by name, then PATCH rollout_pct. `pct` is 0–100 (decimals OK). */
  setRollout(name: string, pct: number): Promise<{ id: string }>;
}

const BASE = "/api/admin/gates";

export function gatesClient(t: Transport): GatesClient {
  async function list(): Promise<Gate[]> {
    return t.request<Gate[]>("GET", BASE);
  }

  async function resolve(idOrName: string): Promise<Gate> {
    const all = await list();
    const found = all.find((g) => g.id === idOrName) ?? all.find((g) => g.name === idOrName);
    if (!found) throw new ApiError(`Gate '${idOrName}' not found`, 404);
    return found;
  }

  return {
    list,
    resolve,
    getByName: async (name: string) => {
      const found = (await list()).find((g) => g.name === name);
      if (!found) throw new ApiError(`Gate '${name}' not found`, 404);
      return found;
    },
    create: (input: GateCreateInput) =>
      t.request<{ id: string; name: string }>("POST", BASE, gateCreateSchema.parse(input)),
    update: (id: string, input: GateUpdateInput) =>
      t.request<{ id: string }>("PATCH", `${BASE}/${id}`, gateUpdateSchema.parse(input)),
    delete: (id: string) => t.request<{ ok: true }>("DELETE", `${BASE}/${id}`),
    enable: (id: string) =>
      t.request<{ id: string; enabled: boolean }>("POST", `${BASE}/${id}/enable`),
    disable: (id: string) =>
      t.request<{ id: string; enabled: boolean }>("POST", `${BASE}/${id}/disable`),
    setRollout: async (name: string, pct: number) => {
      if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
        throw new ApiError("rollout must be a number between 0 and 100", 400);
      }
      const gate = await resolve(name);
      return t.request<{ id: string }>("PATCH", `${BASE}/${gate.id}`, {
        rollout_pct: Math.round(pct * 100),
      });
    },
  };
}

/**
 * Resource descriptor for the registry. MCP iterates this to auto-generate
 * its tool catalog; CLI iterates it to auto-wire commander subcommands.
 *
 * `inputSchema` fields are zod schemas — convert with `z.toJSONSchema()` for
 * MCP `inputSchema` JSON Schema, parse directly for CLI option validation.
 */
export const gatesResource = {
  name: "gates" as const,
  basePath: BASE,
  describeOne: "feature gate",
  describeMany: "feature gates",
  schemas: {
    create: gateCreateSchema,
    update: gateUpdateSchema,
  },
  /** Custom action endpoints beyond CRUD (POST <basePath>/:id/<action>). */
  actions: [
    { name: "enable", description: "Enable a gate" },
    { name: "disable", description: "Disable a gate (kill switch off, but visible)" },
  ] as const,
} as const;

export type { GateCreateInput, GateUpdateInput };
