"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { GitBranch, Check, Trash2, AlertTriangle } from "lucide-react";
import { Validator } from "@cfworker/json-schema";

import type { ConfigActivity, ConfigDetail } from "@/lib/handlers/configs";
import type { ConfigEnv, JsonSchema } from "@shipeasy/core";
import { EnvTabs, CONFIG_ENVS } from "@/components/dashboard/env-tabs";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { SchemaBuilder } from "@/components/configs/schema-builder";
import { ValueForm } from "@/components/configs/value-form";
import { updateConfigSchema as updateConfigSchemaAction } from "@/actions/configs";
import { formatDistanceToNow } from "./format-time";

type Props = {
  initial: ConfigDetail;
  initialActivity: ConfigActivity[];
};

function deepEqual(a: unknown, b: unknown): boolean {
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return a === b;
  }
}

function actionLabel(action: string): string {
  switch (action) {
    case "config.create":
      return "created";
    case "config.publish":
      return "published";
    case "config.update":
      return "edited";
    case "config.schema.update":
      return "updated the schema";
    case "config.draft.save":
      return "saved a draft";
    case "config.draft.discard":
      return "discarded a draft";
    case "config.delete":
      return "deleted";
    default:
      return action.replace(/^config\./, "");
  }
}

function validateValue(value: unknown, schema: JsonSchema): string | null {
  try {
    const v = new Validator(schema as object, "2020-12", false);
    const result = v.validate(value ?? {});
    if (result.valid) return null;
    return result.errors
      .slice(0, 3)
      .map((e) => `${e.instanceLocation || "/"}: ${e.error}`)
      .join("; ");
  } catch (err) {
    return (err as Error).message;
  }
}

export function ConfigEditor({ initial, initialActivity }: Props) {
  const router = useRouter();
  const [selectedEnv, setSelectedEnv] = useState<ConfigEnv>(
    initial.envs.prod ? "prod" : initial.envs.staging ? "staging" : "dev",
  );
  const [detail, setDetail] = useState<ConfigDetail>(initial);
  const [activity, setActivity] = useState<ConfigActivity[]>(initialActivity);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [schemaDraft, setSchemaDraft] = useState<JsonSchema>(detail.schema);
  const schemaDirty = useMemo(
    () => !deepEqual(schemaDraft, detail.schema),
    [schemaDraft, detail.schema],
  );

  const initialValueByEnv: Partial<Record<ConfigEnv, unknown>> = {};
  for (const e of CONFIG_ENVS) {
    initialValueByEnv[e] = detail.drafts[e]
      ? (detail.draftValues[e] ?? {})
      : (detail.values[e] ?? {});
  }
  const [valueByEnv, setValueByEnv] =
    useState<Partial<Record<ConfigEnv, unknown>>>(initialValueByEnv);

  const publishedValue = detail.values[selectedEnv] ?? null;
  const draftExists = Boolean(detail.drafts[selectedEnv]);
  const currentValue = valueByEnv[selectedEnv] ?? {};
  const hasChanges = !deepEqual(currentValue, publishedValue);
  const version = detail.envs[selectedEnv]?.version ?? 0;
  const draftInfo = detail.drafts[selectedEnv];

  const envsFailingValidation = useMemo(() => {
    const failing: ConfigEnv[] = [];
    for (const e of CONFIG_ENVS) {
      const v = detail.values[e];
      if (v === undefined) continue;
      if (validateValue(v, detail.schema) !== null) failing.push(e);
    }
    return failing;
  }, [detail.values, detail.schema]);

  const handleEnvChange = (env: ConfigEnv) => {
    setSelectedEnv(env);
    setError(null);
    setNotice(null);
  };

  const handleValueChange = (next: unknown) => {
    setValueByEnv((s) => ({ ...s, [selectedEnv]: next }));
    setError(null);
    setNotice(null);
  };

  const resetValueToPublished = () => {
    setValueByEnv((s) => ({ ...s, [selectedEnv]: publishedValue ?? {} }));
    setError(null);
    setNotice(null);
  };

  const saveSchema = () => {
    startTransition(async () => {
      try {
        await updateConfigSchemaAction(detail.id, schemaDraft);
        setDetail((d) => ({ ...d, schema: schemaDraft }));
        setNotice("Schema saved");
      } catch (err) {
        setError((err as Error).message);
      }
    });
  };

  const resetSchema = () => {
    setSchemaDraft(detail.schema);
  };

  const saveDraft = () => {
    startTransition(async () => {
      const res = await fetch(`/api/admin/configs/${detail.id}/drafts`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ env: selectedEnv, value: currentValue }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? `Failed to save draft (${res.status})`);
        return;
      }
      await refreshDetail();
      setNotice("Draft saved");
    });
  };

  const discardDraft = () => {
    if (!draftExists) {
      resetValueToPublished();
      return;
    }
    startTransition(async () => {
      const res = await fetch(`/api/admin/configs/${detail.id}/drafts`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ env: selectedEnv }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? `Failed to discard (${res.status})`);
        return;
      }
      await refreshDetail();
      resetValueToPublished();
      setNotice("Draft discarded");
    });
  };

  const publishDraft = () => {
    startTransition(async () => {
      if (!deepEqual(currentValue, detail.draftValues[selectedEnv])) {
        const saveRes = await fetch(`/api/admin/configs/${detail.id}/drafts`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ env: selectedEnv, value: currentValue }),
        });
        if (!saveRes.ok) {
          const body = (await saveRes.json().catch(() => ({}))) as { error?: string };
          setError(body.error ?? `Failed to save draft (${saveRes.status})`);
          return;
        }
      }
      const res = await fetch(`/api/admin/configs/${detail.id}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ env: selectedEnv }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? `Failed to publish (${res.status})`);
        return;
      }
      await refreshDetail();
      setNotice(`Published to ${selectedEnv}`);
      router.refresh();
    });
  };

  const handleDelete = () => {
    startTransition(async () => {
      const res = await fetch(`/api/admin/configs/${detail.id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? `Failed to delete (${res.status})`);
        setConfirmDelete(false);
        return;
      }
      router.push("/dashboard/configs/values");
      router.refresh();
    });
  };

  async function refreshDetail(): Promise<void> {
    const [detailRes, activityRes] = await Promise.all([
      fetch(`/api/admin/configs/${detail.id}`, { cache: "no-store" }),
      fetch(`/api/admin/configs/${detail.id}/activity`, { cache: "no-store" }),
    ]);
    if (detailRes.ok) {
      const fresh = (await detailRes.json()) as ConfigDetail;
      setDetail(fresh);
      const updated: Partial<Record<ConfigEnv, unknown>> = {};
      for (const envName of CONFIG_ENVS) {
        updated[envName] = fresh.drafts[envName]
          ? (fresh.draftValues[envName] ?? {})
          : (fresh.values[envName] ?? {});
      }
      setValueByEnv(updated);
    }
    if (activityRes.ok) {
      const fresh = (await activityRes.json()) as ConfigActivity[];
      setActivity(fresh);
    }
  }

  const fieldCount = Object.keys(
    (detail.schema.properties as Record<string, unknown> | undefined) ?? {},
  ).length;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center gap-3 border-b border-[var(--se-line)] bg-[var(--se-bg-1)] px-6 py-3">
        <div className="crumbs flex items-center gap-2 font-mono text-[13px] text-[var(--se-fg-3)]">
          <span>Configs</span>
          <span className="text-[var(--se-fg-4)]">/</span>
          <span className="text-foreground">{detail.name}</span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <EnvTabs value={selectedEnv} onChange={handleEnvChange} />
          <Button
            variant="ghost"
            size="sm"
            onClick={discardDraft}
            disabled={pending || (!hasChanges && !draftExists)}
          >
            Discard
          </Button>
          <Button
            size="sm"
            onClick={publishDraft}
            disabled={pending || (!hasChanges && !draftExists)}
            data-testid="publish-button"
          >
            <Check className="size-3" />
            Publish
          </Button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto p-6">
        <PageHeader
          kicker={`${fieldCount} ${
            fieldCount === 1 ? "field" : "fields"
          } · last updated ${formatDistanceToNow(detail.updatedAt)}`}
          title={detail.name}
          description={
            detail.description ??
            "Schema-driven configuration with per-environment publishing. Edit the schema on the left, the value on the right."
          }
        />

        <div className="flex flex-wrap items-end gap-3">
          <div>
            <div className="t-mono-xs text-[var(--se-fg-3)]">config key</div>
            <div className="font-mono text-[18px] font-medium mt-1">{detail.name}</div>
          </div>
          <span className="se-badge">v{version}</span>
          {draftExists ? (
            <span
              className="se-badge se-badge-paused"
              title={`Draft by ${draftInfo?.authorEmail ?? "unknown"}`}
            >
              <span className="dot" />
              DRAFT
            </span>
          ) : null}
          <div className="ml-auto flex gap-2">
            <Button variant="ghost" size="sm" disabled>
              <GitBranch className="size-3" /> History
            </Button>
            {confirmDelete ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setConfirmDelete(false)}
                  disabled={pending}
                >
                  Cancel
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDelete}
                  disabled={pending}
                  className="text-[var(--se-danger)] hover:bg-[var(--se-danger-soft)]"
                >
                  Confirm delete
                </Button>
              </>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setConfirmDelete(true)}
                disabled={pending}
                className="text-[var(--se-danger)] hover:bg-[var(--se-danger-soft)]"
                aria-label="Delete config"
              >
                <Trash2 className="size-3" /> Delete
              </Button>
            )}
          </div>
        </div>

        {envsFailingValidation.length > 0 ? (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-[var(--radius-md)] border border-[color-mix(in_oklab,var(--se-warn)_30%,transparent)] bg-[var(--se-warn-soft)] px-4 py-2.5 text-[13px] text-[var(--se-warn)]"
          >
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
            <div>
              Published values for {envsFailingValidation.join(", ")} no longer match the current
              schema. The SDK will keep serving them until you publish an update.
            </div>
          </div>
        ) : null}

        {error ? (
          <div className="rounded-[var(--radius-md)] border border-[color-mix(in_oklab,var(--se-danger)_30%,transparent)] bg-[var(--se-danger-soft)] px-4 py-2 text-[13px] text-[var(--se-danger)]">
            {error}
          </div>
        ) : null}
        {notice ? (
          <div className="rounded-[var(--radius-md)] border border-[color-mix(in_oklab,var(--se-accent)_30%,transparent)] bg-[var(--se-accent-soft)] px-4 py-2 text-[13px] text-[var(--se-accent)]">
            {notice}
          </div>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="flex flex-col gap-3 rounded-[var(--radius-md)] border border-[var(--se-line)] bg-[var(--se-bg-2)] p-4">
            <div className="flex items-center justify-between">
              <div className="t-caps dim-2">Schema</div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetSchema}
                  disabled={pending || !schemaDirty}
                >
                  Revert
                </Button>
                <Button
                  size="sm"
                  onClick={saveSchema}
                  disabled={pending || !schemaDirty}
                  data-testid="save-schema-button"
                >
                  Save schema
                </Button>
              </div>
            </div>
            <SchemaBuilder value={schemaDraft} onChange={setSchemaDraft} />
          </div>

          <div className="flex flex-col gap-3 rounded-[var(--radius-md)] border border-[var(--se-line)] bg-[var(--se-bg-2)] p-4">
            <div className="flex items-center justify-between">
              <div className="t-caps dim-2">
                Value · {selectedEnv}{" "}
                <span className="text-[var(--se-fg-4)]">
                  {hasChanges ? "(unsaved)" : "(in sync)"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetValueToPublished}
                  disabled={pending || !hasChanges}
                >
                  Revert
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={saveDraft}
                  disabled={pending || !hasChanges}
                >
                  Save draft
                </Button>
              </div>
            </div>
            <ValueForm
              key={`${detail.id}-${selectedEnv}-${JSON.stringify(detail.schema)}`}
              schema={detail.schema}
              value={currentValue}
              onChange={handleValueChange}
              disabled={pending}
            />
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div>
            <div className="t-caps dim-2 mb-2">Recent activity</div>
            {activity.length === 0 ? (
              <div className="text-[12px] text-[var(--se-fg-3)]">No activity yet.</div>
            ) : (
              <div className="flex flex-col">
                {activity.map((a) => (
                  <div
                    key={a.id}
                    className="flex gap-3 border-b border-dashed border-[var(--se-line)] py-2.5 text-[12.5px] last:border-none"
                  >
                    <span className="w-[80px] font-mono text-[10.5px] text-[var(--se-fg-4)]">
                      {formatDistanceToNow(a.createdAt)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <b>{a.actorEmail === "cli" ? "CLI" : a.actorEmail.split("@")[0]}</b>{" "}
                      <span className="dim">{actionLabel(a.action)}</span>
                      {extractEnvFromPayload(a.payload) ? (
                        <span className="ml-1.5 font-mono text-[11px] text-[var(--se-fg-3)]">
                          ({extractEnvFromPayload(a.payload)})
                        </span>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="t-caps dim-2 mb-2">Environment diff</div>
            <div className="flex flex-col gap-2 rounded-[var(--radius-md)] border border-[var(--se-line)] bg-[var(--se-bg-2)] px-4 py-3">
              {CONFIG_ENVS.map((e) => {
                const envInfo = detail.envs[e];
                const pendingDraft = Boolean(detail.drafts[e]);
                return (
                  <div key={e} className="flex items-center justify-between gap-2 text-[12.5px]">
                    <span className="font-mono">{e}</span>
                    <span className="flex items-center gap-2 text-[var(--se-fg-3)]">
                      {envInfo ? (
                        <>
                          <span className="font-mono">v{envInfo.version}</span>
                          <span className="text-[var(--se-fg-4)]">
                            · {formatDistanceToNow(envInfo.publishedAt)}
                          </span>
                        </>
                      ) : (
                        <span className="text-[var(--se-fg-4)]">not published</span>
                      )}
                      {pendingDraft ? (
                        <span className="se-badge se-badge-paused ml-1">
                          <span className="dot" />
                          DRAFT
                        </span>
                      ) : null}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function extractEnvFromPayload(p: unknown): string | null {
  if (p && typeof p === "object" && "env" in p) {
    const env = (p as { env?: unknown }).env;
    if (typeof env === "string") return env;
  }
  return null;
}
