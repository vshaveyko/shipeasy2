import type {
  ConfigRecord,
  DraftRecord,
  ExperimentRecord,
  GateRecord,
  KeyRecord,
  ProfileRecord,
  UniverseRecord,
} from "./types";

export class DevtoolsApi {
  constructor(
    readonly adminUrl: string,
    private readonly token: string,
  ) {}

  private async get<T>(path: string): Promise<T> {
    const res = await fetch(`${this.adminUrl}${path}`, {
      headers: { Authorization: `Bearer ${this.token}` },
    });
    if (!res.ok) {
      // Surface the server's detail field (http.ts errorResponse puts the real
      // exception message here) so users don't just see "HTTP 500" with no clue.
      let detail = "";
      try {
        const body = (await res.json()) as { error?: string; detail?: string };
        detail = body.detail ?? body.error ?? "";
      } catch {
        try {
          detail = (await res.text()).slice(0, 200);
        } catch {
          /* ignore */
        }
      }
      throw new Error(`${path} → HTTP ${res.status}${detail ? ` — ${detail}` : ""}`);
    }
    const body = await res.json();
    return (Array.isArray(body) ? body : ((body as { data: T }).data ?? body)) as T;
  }

  gates(): Promise<GateRecord[]> {
    return this.get("/api/admin/gates");
  }

  async configs(): Promise<ConfigRecord[]> {
    // The list endpoint shed `valueJson` when configs went per-env (migration
    // 0004). Fetch the per-id detail and project the active env's value back
    // into `valueJson` so the panel stays untouched. Default env is `prod`.
    const list =
      await this.get<Array<ConfigRecord & { envs?: Record<string, unknown> }>>(
        "/api/admin/configs",
      );
    const env = "prod";
    const details = await Promise.all(
      list.map(async (c) => {
        try {
          const detail = await this.get<{
            values?: Record<string, unknown>;
            valueJson?: unknown;
          }>(`/api/admin/configs/${c.id}`);
          const valueJson =
            detail.valueJson !== undefined ? detail.valueJson : (detail.values?.[env] ?? null);
          return { ...c, valueJson } as ConfigRecord;
        } catch {
          return { ...c, valueJson: null } as ConfigRecord;
        }
      }),
    );
    return details;
  }

  experiments(): Promise<ExperimentRecord[]> {
    return this.get("/api/admin/experiments");
  }

  universes(): Promise<UniverseRecord[]> {
    return this.get("/api/admin/universes");
  }

  profiles(): Promise<ProfileRecord[]> {
    return this.get("/api/admin/i18n/profiles");
  }

  drafts(): Promise<DraftRecord[]> {
    return this.get("/api/admin/i18n/drafts");
  }

  async keys(profileId?: string): Promise<KeyRecord[]> {
    const qs = profileId ? `?profile_id=${encodeURIComponent(profileId)}` : "";
    // /api/admin/i18n/keys returns `{ keys, total }` (paginated shape) — unwrap.
    // get() only auto-extracts arrays or `{data: …}`, so we handle this one
    // explicitly here rather than complicating the generic unwrapper.
    const body = await this.get<KeyRecord[] | { keys: KeyRecord[] }>(`/api/admin/i18n/keys${qs}`);
    if (Array.isArray(body)) return body;
    if (body && Array.isArray((body as { keys?: KeyRecord[] }).keys)) {
      return (body as { keys: KeyRecord[] }).keys;
    }
    return [];
  }
}
