import type {
  AttachmentUploadResult,
  BugCreateInput,
  BugRecord,
  ConfigRecord,
  DraftRecord,
  ExperimentRecord,
  FeatureRequestCreateInput,
  FeatureRequestRecord,
  GateRecord,
  KeyRecord,
  ProfileRecord,
  UniverseRecord,
} from "./types";

export class DevtoolsApi {
  constructor(
    readonly adminUrl: string,
    public readonly token: string,
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

  private async post<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(`${this.adminUrl}${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      let detail = "";
      try {
        const json = (await res.json()) as { error?: string; detail?: string };
        detail = json.detail ?? json.error ?? "";
      } catch {
        try {
          detail = (await res.text()).slice(0, 200);
        } catch {
          /* ignore */
        }
      }
      throw new Error(`${path} → HTTP ${res.status}${detail ? ` — ${detail}` : ""}`);
    }
    return (await res.json()) as T;
  }

  bugs(): Promise<BugRecord[]> {
    return this.get("/api/admin/bugs");
  }

  createBug(input: BugCreateInput): Promise<{ id: string }> {
    return this.post("/api/admin/bugs", input);
  }

  featureRequests(): Promise<FeatureRequestRecord[]> {
    return this.get("/api/admin/feature-requests");
  }

  createFeatureRequest(input: FeatureRequestCreateInput): Promise<{ id: string }> {
    return this.post("/api/admin/feature-requests", input);
  }

  async uploadAttachment(args: {
    reportKind: "bug" | "feature_request";
    reportId: string;
    kind: "screenshot" | "recording" | "file";
    filename: string;
    blob: Blob;
  }): Promise<AttachmentUploadResult> {
    const fd = new FormData();
    fd.append("reportKind", args.reportKind);
    fd.append("reportId", args.reportId);
    fd.append("kind", args.kind);
    fd.append("filename", args.filename);
    fd.append("file", args.blob, args.filename);
    const res = await fetch(`${this.adminUrl}/api/admin/reports/attachments`, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.token}` },
      body: fd,
    });
    if (!res.ok) {
      let detail = "";
      try {
        const json = (await res.json()) as { error?: string };
        detail = json.error ?? "";
      } catch {
        /* ignore */
      }
      throw new Error(`upload failed → HTTP ${res.status}${detail ? ` — ${detail}` : ""}`);
    }
    return (await res.json()) as AttachmentUploadResult;
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
