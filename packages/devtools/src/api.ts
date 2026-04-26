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

  configs(): Promise<ConfigRecord[]> {
    return this.get("/api/admin/configs");
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
