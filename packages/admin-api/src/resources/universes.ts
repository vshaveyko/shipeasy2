import {
  universeCreateSchema,
  universeUpdateSchema,
  type UniverseCreateInput,
  type UniverseUpdateInput,
} from "@shipeasy/core/schemas/universes";
import type { Transport } from "../transport.js";
import { ApiError } from "../transport.js";

export interface Universe {
  id: string;
  name: string;
  unitType: string;
  holdoutRange: [number, number] | null;
  allocationPct?: number;
  holdoutPct?: number;
  updatedAt?: string;
}

export interface UniversesClient {
  list(): Promise<Universe[]>;
  resolve(idOrName: string): Promise<Universe>;
  create(input: UniverseCreateInput): Promise<Universe>;
  update(id: string, input: UniverseUpdateInput): Promise<Universe>;
  delete(id: string): Promise<{ ok: true }>;
}

const BASE = "/api/admin/universes";

export function universesClient(t: Transport): UniversesClient {
  async function list() {
    return t.request<Universe[]>("GET", BASE);
  }
  async function resolve(idOrName: string) {
    const all = await list();
    const found = all.find((u) => u.id === idOrName) ?? all.find((u) => u.name === idOrName);
    if (!found) throw new ApiError(`Universe '${idOrName}' not found`, 404);
    return found;
  }

  return {
    list,
    resolve,
    create: (input) => t.request<Universe>("POST", BASE, universeCreateSchema.parse(input)),
    update: (id, input) =>
      t.request<Universe>("PATCH", `${BASE}/${id}`, universeUpdateSchema.parse(input)),
    delete: (id) => t.request<{ ok: true }>("DELETE", `${BASE}/${id}`),
  };
}

export const universesResource = {
  name: "universes" as const,
  basePath: BASE,
  describeOne: "universe",
  describeMany: "universes",
  schemas: {
    create: universeCreateSchema,
    update: universeUpdateSchema,
  },
  actions: [] as const,
} as const;

export type { UniverseCreateInput, UniverseUpdateInput };
