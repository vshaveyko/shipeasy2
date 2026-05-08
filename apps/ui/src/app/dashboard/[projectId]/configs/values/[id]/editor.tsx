"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, GitBranch, BookOpen, Code2, Check, Trash2 } from "lucide-react";

import type { ConfigActivity, ConfigDetail } from "@/lib/handlers/configs";
import type { ConfigEnv } from "@shipeasy/core";
import { EnvTabs, CONFIG_ENVS } from "@/components/dashboard/env-tabs";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "./format-time";

type Props = {
  initial: ConfigDetail;
  initialActivity: ConfigActivity[];
};

function formatValue(value: unknown): string {
  if (value === undefined) return "";
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function parseValue(text: string): { ok: true; value: unknown } | { ok: false; error: string } {
  const trimmed = text.trim();
  if (trimmed === "") return { ok: true, value: null };
  try {
    return { ok: true, value: JSON.parse(trimmed) };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

function deepEqual(a: unknown, b: unknown): boolean {
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return a === b;
  }
}

function countDiffLines(baseText: string, draftText: string): number {
  const baseLines = baseText.split("\n");
  const draftLines = draftText.split("\n");
  let diff = 0;
  const max = Math.max(baseLines.length, draftLines.length);
  for (let i = 0; i < max; i++) {
    if ((baseLines[i] ?? "") !== (draftLines[i] ?? "")) diff++;
  }
  return diff;
}

/** Minimal JSON tokenizer for syntax-highlighted read-only display. */
function highlightJson(text: string): { cls: string; text: string }[] {
  const out: { cls: string; text: string }[] = [];
  const tokenPattern =
    /("(?:\\.|[^"\\])*")(\s*:)?|(-?\d+(?:\.\d+)?(?:e[+-]?\d+)?)|(true|false|null)|([{}\[\],])|(\s+)|([^\s]+)/gi;
  let m: RegExpExecArray | null;
  while ((m = tokenPattern.exec(text))) {
    if (m[1] !== undefined) {
      // Strings: keys (":") vs values
      out.push({ cls: m[2] ? "k" : "s", text: m[1] + (m[2] ?? "") });
    } else if (m[3] !== undefined) {
      out.push({ cls: "n", text: m[3] });
    } else if (m[4] !== undefined) {
      out.push({ cls: "b", text: m[4] });
    } else if (m[5] !== undefined) {
      out.push({ cls: "", text: m[5] });
    } else if (m[6] !== undefined) {
      out.push({ cls: "", text: m[6] });
    } else if (m[7] !== undefined) {
      out.push({ cls: "c", text: m[7] });
    }
  }
  return out;
}

function JsonView({ text }: { text: string }) {
  const tokens = useMemo(() => highlightJson(text), [text]);
  return (
    <pre className="se-json">
      {tokens.map((t, i) =>
        t.cls ? (
          <span key={i} className={t.cls}>
            {t.text}
          </span>
        ) : (
          t.text
        ),
      )}
    </pre>
  );
}

function actionLabel(action: string): string {
  switch (action) {
    case "config.create":
      return "created";
    case "config.publish":
      return "published";
    case "config.update":
      return "edited";
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

  const publishedValue = detail.values[selectedEnv];
  const publishedText = formatValue(publishedValue);
  const draftExists = Boolean(detail.drafts[selectedEnv]);
  const initialDraftText = draftExists
    ? formatValue(detail.draftValues[selectedEnv])
    : publishedText;

  const [draftTextByEnv, setDraftTextByEnv] = useState<Partial<Record<ConfigEnv, string>>>({
    [selectedEnv]: initialDraftText,
  });
  const draftText = draftTextByEnv[selectedEnv] ?? initialDraftText;

  const parsed = useMemo(() => parseValue(draftText), [draftText]);
  const hasChanges = useMemo(() => {
    if (!parsed.ok) return false;
    return !deepEqual(parsed.value, publishedValue ?? null);
  }, [parsed, publishedValue]);
  const diffLines = useMemo(
    () => countDiffLines(publishedText, draftText),
    [publishedText, draftText],
  );

  const version = detail.envs[selectedEnv]?.version ?? 0;
  const draftInfo = detail.drafts[selectedEnv];

  const handleEnvChange = (env: ConfigEnv) => {
    setSelectedEnv(env);
    if (!(env in draftTextByEnv)) {
      const pub = formatValue(detail.values[env]);
      const d = detail.drafts[env] ? formatValue(detail.draftValues[env]) : pub;
      setDraftTextByEnv((s) => ({ ...s, [env]: d }));
    }
    setError(null);
    setNotice(null);
  };

  const handleDraftChange = (text: string) => {
    setDraftTextByEnv((s) => ({ ...s, [selectedEnv]: text }));
    setError(null);
    setNotice(null);
  };

  const resetToPublished = () => {
    setDraftTextByEnv((s) => ({ ...s, [selectedEnv]: publishedText }));
    setError(null);
    setNotice(null);
  };

  const saveDraft = () => {
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }
    startTransition(async () => {
      const res = await fetch(`/api/admin/configs/${detail.id}/drafts`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ env: selectedEnv, value: parsed.value }),
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
      resetToPublished();
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
      resetToPublished();
      setNotice("Draft discarded");
    });
  };

  const publishDraft = () => {
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }
    startTransition(async () => {
      if (!deepEqual(parsed.value, detail.draftValues[selectedEnv])) {
        const saveRes = await fetch(`/api/admin/configs/${detail.id}/drafts`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ env: selectedEnv, value: parsed.value }),
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
      const updated: Partial<Record<ConfigEnv, string>> = {};
      for (const envName of CONFIG_ENVS) {
        if (fresh.drafts[envName]) {
          updated[envName] = formatValue(fresh.draftValues[envName]);
        } else {
          updated[envName] = formatValue(fresh.values[envName]);
        }
      }
      setDraftTextByEnv(updated);
    }
    if (activityRes.ok) {
      const fresh = (await activityRes.json()) as ConfigActivity[];
      setActivity(fresh);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-[var(--se-line)] bg-[var(--se-bg-1)] px-6 py-3">
        <div className="crumbs flex items-center gap-2 font-mono text-[13px] text-[var(--se-fg-3)]">
          <span>Configs</span>
          <span className="text-[var(--se-fg-4)]">/</span>
          <span className="text-foreground">{detail.name}</span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <EnvTabs value={selectedEnv} onChange={handleEnvChange} />
          <Button variant="secondary" size="sm" disabled>
            <Sparkles className="size-3" /> Ask Claude
          </Button>
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
            {diffLines > 0 ? (
              <span className="ml-1 text-[11px] opacity-80">· {diffLines} changes</span>
            ) : null}
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-6 p-6">
        <PageHeader
          kicker={`${detail.valueType} · last updated ${formatDistanceToNow(detail.updatedAt)}`}
          title={detail.name}
          description={
            detail.description ??
            "Runtime-editable configuration with typed schema, live validation, and per-environment overrides."
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
              {diffLines > 0 ? `${diffLines} UNPUBLISHED` : "DRAFT"}
            </span>
          ) : null}
          <div className="ml-auto flex gap-2">
            <Button variant="ghost" size="sm" disabled>
              <BookOpen className="size-3" /> Schema
            </Button>
            <Button variant="ghost" size="sm" disabled>
              <Code2 className="size-3" /> Usage
            </Button>
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

        <div className="flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--se-line)] bg-[var(--se-bg-2)] px-4 py-2.5">
          <Sparkles className="size-3.5 text-[var(--se-accent)]" />
          <div className="text-[13px] flex-1">
            <b>Claude suggestions</b>{" "}
            <span className="text-muted-foreground">
              aren't wired up yet — will surface here once the assist channel ships.
            </span>
          </div>
        </div>

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
          <div>
            <div className="t-caps dim-2 mb-2 flex items-center justify-between">
              <span>Draft · {selectedEnv}</span>
              <span className="text-[var(--se-fg-4)]">
                {hasChanges
                  ? `${diffLines} line${diffLines === 1 ? "" : "s"} changed`
                  : "no changes"}
              </span>
            </div>
            <textarea
              value={draftText}
              onChange={(e) => handleDraftChange(e.target.value)}
              className={cn(
                "se-json w-full min-h-[280px] resize-y",
                !parsed.ok && "border-[var(--se-danger)]",
              )}
              style={{ whiteSpace: "pre", color: "var(--se-fg)" }}
              spellCheck={false}
            />
            <div className="mt-2 flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={saveDraft}
                disabled={pending || !parsed.ok || !hasChanges}
              >
                Save draft
              </Button>
              <Button variant="ghost" size="sm" onClick={resetToPublished} disabled={pending}>
                Revert
              </Button>
              {!parsed.ok ? (
                <span className="text-[12px] text-[var(--se-danger)]">{parsed.error}</span>
              ) : null}
            </div>
          </div>

          <div>
            <div className="t-caps dim-2 mb-2">Published · v{version}</div>
            <JsonView text={publishedText || "null"} />
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
