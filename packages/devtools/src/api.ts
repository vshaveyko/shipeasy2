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
  ProjectRecord,
  UniverseRecord,
} from "./types";

export class DevtoolsApi {
  constructor(
    readonly adminUrl: string,
    public readonly token: string,
    public readonly projectId: string,
  ) {}

  async project(): Promise<ProjectRecord> {
    const raw = await this.get<{
      id: string;
      name: string;
      domain: string | null;
      moduleTranslations?: boolean | number;
      moduleConfigs?: boolean | number;
      moduleGates?: boolean | number;
      moduleExperiments?: boolean | number;
      moduleFeedback?: boolean | number;
    }>(`/api/admin/projects/${encodeURIComponent(this.projectId)}`);
    const b = (v: boolean | number | undefined): boolean =>
      v === undefined || v === true || v === 1;
    return {
      id: raw.id,
      name: raw.name,
      domain: raw.domain,
      modules: {
        translations: b(raw.moduleTranslations),
        configs: b(raw.moduleConfigs),
        gates: b(raw.moduleGates),
        experiments: b(raw.moduleExperiments),
        feedback: b(raw.moduleFeedback),
      },
    };
  }

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

  private async put<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(`${this.adminUrl}${path}`, {
      method: "PUT",
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

  upsertDraftKey(draftId: string, key: string, value: string): Promise<void> {
    return this.post(`/api/admin/i18n/drafts/${encodeURIComponent(draftId)}/keys`, { key, value });
  }

  updateKeyById(id: string, value: string): Promise<void> {
    return this.put(`/api/admin/i18n/keys/${encodeURIComponent(id)}`, { value });
  }

  async keys(profileId?: string): Promise<KeyRecord[]> {
    // The admin endpoint paginates with a default page size of 200. The
    // devtools panel needs *every* key for the project (we render the full
    // tree client-side), so we page through using the `total` from the first
    // response instead of relying on the backend's default cap.
    const PAGE = 500;
    const params = (offset: number) => {
      const sp = new URLSearchParams();
      if (profileId) sp.set("profile_id", profileId);
      sp.set("limit", String(PAGE));
      sp.set("offset", String(offset));
      return `?${sp.toString()}`;
    };

    const fetchPage = async (offset: number): Promise<{ keys: KeyRecord[]; total: number }> => {
      const body = await this.get<KeyRecord[] | { keys: KeyRecord[]; total?: number }>(
        `/api/admin/i18n/keys${params(offset)}`,
      );
      if (Array.isArray(body)) return { keys: body, total: body.length };
      const keys = (body as { keys?: KeyRecord[] }).keys ?? [];
      const total = (body as { total?: number }).total ?? keys.length;
      return { keys, total };
    };

    const first = await fetchPage(0);
    const all = first.keys.slice();
    while (all.length < first.total && first.keys.length > 0) {
      const next = await fetchPage(all.length);
      if (next.keys.length === 0) break;
      all.push(...next.keys);
    }
    return all;
  }
}
