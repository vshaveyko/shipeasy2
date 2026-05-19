import type {
  AttachmentUploadResult,
  BugCreateInput,
  BugDetail,
  BugRecord,
  ConfigRecord,
  DraftRecord,
  ExperimentRecord,
  FeatureRequestCreateInput,
  FeatureRequestDetail,
  FeatureRequestRecord,
  GateRecord,
  KeyRecord,
  ProfileRecord,
  ProjectRecord,
  UniverseRecord,
} from "./types";
import { PERMISSIVE_CONFIG_SCHEMA } from "./types";

/** Event name dispatched on `window` when any admin request returns 401, so
 *  the overlay can drop the cached session and reopen the connect screen. */
export const DEVTOOLS_UNAUTHED_EVENT = "se:devtools-unauthed";

/** Thrown when an admin request returns 401. Distinct from generic `Error`
 *  so callers (and the overlay) can branch on it without string-matching. */
export class AuthError extends Error {
  readonly status = 401;
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}

export class DevtoolsApi {
  // Per-instance memo cache keyed by `${method}:${args}`. List endpoints in
  // the devtools overlay rarely change between tab switches, so caching the
  // promise lets users flip between Gates/Configs/etc. without refetching.
  // Cleared by invalidate(); mutation methods scrub their own keys so the
  // next read picks up fresh data.
  private cache = new Map<string, Promise<unknown>>();

  constructor(
    readonly adminUrl: string,
    public readonly token: string,
    public readonly projectId: string,
    // Mutable so the overlay can refresh the kill-switch flag without
    // discarding the instance's response cache.
    public hideAdminLinks: boolean = false,
  ) {}

  /** Run `fn` once per `key` and cache the resulting promise. Rejections are
   *  evicted so the next call retries instead of replaying the failure. */
  private memo<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const hit = this.cache.get(key) as Promise<T> | undefined;
    if (hit) return hit;
    const p = fn();
    this.cache.set(key, p);
    p.catch(() => {
      if (this.cache.get(key) === p) this.cache.delete(key);
    });
    return p;
  }

  /** Drop all cached responses. Call before re-rendering after the user
   *  hits the panel's refresh button. */
  invalidate(): void {
    this.cache.clear();
  }

  /** Read the response error body for diagnostics. Tries JSON first, then
   *  raw text. Best-effort; never throws. */
  private async readErrorDetail(res: Response): Promise<string> {
    try {
      const body = (await res.json()) as { error?: string; detail?: string };
      return body.detail ?? body.error ?? "";
    } catch {
      try {
        return (await res.text()).slice(0, 200);
      } catch {
        return "";
      }
    }
  }

  /** Build the error to throw for a non-2xx admin response. 401 produces an
   *  `AuthError` and dispatches `DEVTOOLS_UNAUTHED_EVENT` so the overlay can
   *  drop the stale session and reopen the connect screen instead of leaving
   *  the user staring at a red "Failed to load …" message. */
  private async errorForResponse(path: string, res: Response): Promise<Error> {
    const detail = await this.readErrorDetail(res);
    const message = `${path} → HTTP ${res.status}${detail ? ` — ${detail}` : ""}`;
    if (res.status === 401) {
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent(DEVTOOLS_UNAUTHED_EVENT));
      }
      return new AuthError(message);
    }
    return new Error(message);
  }

  project(): Promise<ProjectRecord> {
    return this.memo("project", async () => {
      const raw = await this.get<{
        id: string;
        name: string;
        domain: string | null;
        moduleTranslations?: boolean | number;
        moduleConfigs?: boolean | number;
        moduleGates?: boolean | number;
        moduleExperiments?: boolean | number;
        moduleFeedback?: boolean | number;
        moduleUser?: boolean | number;
        moduleEvents?: boolean | number;
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
          user: b(raw.moduleUser),
          events: b(raw.moduleEvents),
        },
      };
    });
  }

  private async get<T>(path: string): Promise<T> {
    const res = await fetch(`${this.adminUrl}${path}`, {
      headers: { Authorization: `Bearer ${this.token}` },
    });
    if (!res.ok) {
      // Surface the server's detail field (http.ts errorResponse puts the real
      // exception message here) so users don't just see "HTTP 500" with no clue.
      throw await this.errorForResponse(path, res);
    }
    const body = await res.json();
    return (Array.isArray(body) ? body : ((body as { data: T }).data ?? body)) as T;
  }

  /**
   * Drain a paginated `{ data, next_cursor }` list endpoint by walking cursors.
   * Devtools shows the entire list at once; without this, large projects would
   * silently truncate at the first page (limit=100 default).
   */
  private async drainList<T>(basePath: string): Promise<T[]> {
    const sep = basePath.includes("?") ? "&" : "?";
    const out: T[] = [];
    let cursor: string | null = null;
    do {
      const q = `${sep}limit=500${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`;
      const res = await fetch(`${this.adminUrl}${basePath}${q}`, {
        headers: { Authorization: `Bearer ${this.token}` },
      });
      if (!res.ok) throw await this.errorForResponse(basePath, res);
      const body = (await res.json()) as T[] | { data: T[]; next_cursor: string | null };
      if (Array.isArray(body)) return body;
      out.push(...body.data);
      cursor = body.next_cursor;
    } while (cursor);
    return out;
  }

  gates(): Promise<GateRecord[]> {
    return this.memo("gates", () => this.drainList<GateRecord>("/api/admin/gates"));
  }

  configs(): Promise<ConfigRecord[]> {
    return this.memo("configs", async () => {
      // The list endpoint sheds `valueJson` (per-env), so fetch each config's
      // detail and project the active env's value back into `valueJson`.
      // Default env is `prod`.
      const list = await this.drainList<{
        id: string;
        name: string;
        updatedAt: string;
        schema?: Record<string, unknown>;
      }>("/api/admin/configs");
      const env = "prod";
      const details = await Promise.all(
        list.map(async (c) => {
          try {
            const detail = await this.get<{
              values?: Record<string, unknown>;
              valueJson?: unknown;
              schema?: Record<string, unknown>;
            }>(`/api/admin/configs/${c.id}`);
            const valueJson =
              detail.valueJson !== undefined ? detail.valueJson : (detail.values?.[env] ?? {});
            const schema = detail.schema ?? c.schema ?? PERMISSIVE_CONFIG_SCHEMA;
            return {
              id: c.id,
              name: c.name,
              updatedAt: c.updatedAt,
              valueJson,
              schema,
            } as ConfigRecord;
          } catch {
            return {
              id: c.id,
              name: c.name,
              updatedAt: c.updatedAt,
              valueJson: {},
              schema: c.schema ?? PERMISSIVE_CONFIG_SCHEMA,
            } as ConfigRecord;
          }
        }),
      );
      return details;
    });
  }

  experiments(): Promise<ExperimentRecord[]> {
    return this.memo("experiments", () =>
      this.drainList<ExperimentRecord>("/api/admin/experiments"),
    );
  }

  universes(): Promise<UniverseRecord[]> {
    return this.memo("universes", () => this.drainList<UniverseRecord>("/api/admin/universes"));
  }

  profiles(): Promise<ProfileRecord[]> {
    return this.memo("profiles", () => this.get("/api/admin/i18n/profiles"));
  }

  drafts(): Promise<DraftRecord[]> {
    return this.memo("drafts", () => this.get("/api/admin/i18n/drafts"));
  }

  private async patch<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(`${this.adminUrl}${path}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw await this.errorForResponse(path, res);
    return (await res.json()) as T;
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
    if (!res.ok) throw await this.errorForResponse(path, res);
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
    if (!res.ok) throw await this.errorForResponse(path, res);
    return (await res.json()) as T;
  }

  bugs(): Promise<BugRecord[]> {
    return this.memo("bugs", () => this.get("/api/admin/bugs"));
  }

  bug(id: string): Promise<BugDetail> {
    return this.memo(`bug:${id}`, () => this.get(`/api/admin/bugs/${encodeURIComponent(id)}`));
  }

  async createBug(input: BugCreateInput): Promise<{ id: string }> {
    const r = await this.post<{ id: string }>("/api/admin/bugs", input);
    this.cache.delete("bugs");
    return r;
  }

  async updateBug(
    id: string,
    patch: { status?: BugRecord["status"]; priority?: BugRecord["priority"] },
  ): Promise<void> {
    await this.patch(`/api/admin/bugs/${encodeURIComponent(id)}`, patch);
    this.cache.delete("bugs");
    this.cache.delete(`bug:${id}`);
  }

  featureRequests(): Promise<FeatureRequestRecord[]> {
    return this.memo("featureRequests", () => this.get("/api/admin/feature-requests"));
  }

  featureRequest(id: string): Promise<FeatureRequestDetail> {
    return this.memo(`featureRequest:${id}`, () =>
      this.get(`/api/admin/feature-requests/${encodeURIComponent(id)}`),
    );
  }

  async createFeatureRequest(input: FeatureRequestCreateInput): Promise<{ id: string }> {
    const r = await this.post<{ id: string }>("/api/admin/feature-requests", input);
    this.cache.delete("featureRequests");
    return r;
  }

  async updateFeatureRequest(
    id: string,
    patch: {
      status?: FeatureRequestRecord["status"];
      importance?: FeatureRequestRecord["importance"];
    },
  ): Promise<void> {
    await this.patch(`/api/admin/feature-requests/${encodeURIComponent(id)}`, patch);
    this.cache.delete("featureRequests");
    this.cache.delete(`featureRequest:${id}`);
  }

  /** Fetch an attachment file as a Blob via the authenticated stream route.
   * The lightbox needs raw bytes (not a URL) because <img>/<video> can't send
   * the Authorization header — we materialize an object URL on the consumer
   * side and revoke it after preview. */
  async attachmentBlob(id: string): Promise<Blob> {
    const path = `/api/admin/reports/attachments/${encodeURIComponent(id)}`;
    const res = await fetch(`${this.adminUrl}${path}`, {
      headers: { Authorization: `Bearer ${this.token}` },
    });
    if (!res.ok) throw await this.errorForResponse(path, res);
    return res.blob();
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
    const path = "/api/admin/reports/attachments";
    const res = await fetch(`${this.adminUrl}${path}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.token}` },
      body: fd,
    });
    if (!res.ok) throw await this.errorForResponse(path, res);
    return (await res.json()) as AttachmentUploadResult;
  }

  async createDraft(input: { profileId: string; name: string }): Promise<DraftRecord> {
    const r = await this.post<DraftRecord>("/api/admin/i18n/drafts", {
      profile_id: input.profileId,
      name: input.name,
    });
    this.cache.delete("drafts");
    return r;
  }

  async upsertDraftKey(draftId: string, key: string, value: string): Promise<void> {
    await this.post(`/api/admin/i18n/drafts/${encodeURIComponent(draftId)}/keys`, { key, value });
    this.invalidateKeysCache();
  }

  async updateKeyById(id: string, value: string): Promise<void> {
    await this.put(`/api/admin/i18n/keys/${encodeURIComponent(id)}`, { value });
    this.invalidateKeysCache();
  }

  /** Drop every cached `keys(profileId?)` response. We don't track which
   *  profile a single key write affects, so be safe and clear them all. */
  private invalidateKeysCache(): void {
    for (const k of Array.from(this.cache.keys())) {
      if (k.startsWith("keys:")) this.cache.delete(k);
    }
  }

  keys(profileId?: string): Promise<KeyRecord[]> {
    return this.memo(`keys:${profileId ?? ""}`, async () => {
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
    });
  }
}
