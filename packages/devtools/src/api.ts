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
    private readonly adminUrl: string,
    private readonly token: string,
  ) {}

  private async get<T>(path: string): Promise<T> {
    const res = await fetch(`${this.adminUrl}${path}`, {
      headers: { Authorization: `Bearer ${this.token}` },
    });
    if (!res.ok) throw new Error(`${path} → HTTP ${res.status}`);
    const body = await res.json();
    // Unwrap {data:[...]} or plain array
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

  keys(profileId?: string): Promise<KeyRecord[]> {
    const qs = profileId ? `?profile_id=${encodeURIComponent(profileId)}` : "";
    return this.get(`/api/admin/i18n/keys${qs}`);
  }
}
