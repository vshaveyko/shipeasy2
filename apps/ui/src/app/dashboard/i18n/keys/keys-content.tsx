"use client";

import useSWR from "swr";
import { Languages } from "lucide-react";

import { EmptyState } from "@/components/dashboard/empty-state";
import { PageHeader } from "@/components/dashboard/page-header";
import { LinkButton } from "@/components/ui/link-button";
import { KeysTable } from "./_components/keys-table";
import type { DraftKeyRow } from "@/lib/handlers/i18n";

interface Profile {
  id: string;
  name: string;
}
interface Draft {
  id: string;
  name: string;
  profileId: string;
  status: string;
}

const fetcher = async <T,>(url: string): Promise<T> => {
  const res = await fetch(url, { credentials: "same-origin" });
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
  return (await res.json()) as T;
};

export function KeysContent() {
  const swrOpts = { dedupingInterval: 0 };
  const profilesQ = useSWR<Profile[]>("/api/admin/i18n/profiles", fetcher, swrOpts);
  const draftsQ = useSWR<Draft[]>("/api/admin/i18n/drafts", fetcher, swrOpts);

  const profiles = profilesQ.data ?? [];
  const drafts = draftsQ.data ?? [];
  const openDrafts = drafts.filter((d) => d.status === "open");

  // Fan out to fetch each open draft's keys. Using a single SWR key keeps
  // the cache stable across re-renders; the value is a record keyed by id.
  const draftKeysQ = useSWR<Record<string, DraftKeyRow[]>>(
    openDrafts.length ? ["i18n-draft-keys", openDrafts.map((d) => d.id).join(",")] : null,
    async () => {
      const entries = await Promise.all(
        openDrafts.map(async (d) => {
          const rows = await fetcher<DraftKeyRow[]>(`/api/admin/i18n/drafts/${d.id}/keys`).catch(
            () => [] as DraftKeyRow[],
          );
          return [d.id, rows] as const;
        }),
      );
      return Object.fromEntries(entries);
    },
  );

  const draftKeysByDraft = draftKeysQ.data ?? {};
  const totalDraftKeys = Object.values(draftKeysByDraft).reduce((acc, arr) => acc + arr.length, 0);

  if (profilesQ.isLoading || draftsQ.isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Label keys"
          description="Manage translation keys across profiles and drafts."
        />
        <div className="text-muted-foreground text-sm">Loading…</div>
      </div>
    );
  }

  if (profiles.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Label keys"
          description="Manage your translation keys across profiles and drafts."
          actions={
            <LinkButton size="sm" href="/dashboard/i18n/profiles/new">
              New profile
            </LinkButton>
          }
        />
        <EmptyState
          icon={Languages}
          title="No profiles yet"
          description="Create a profile (e.g. en:prod) before pushing keys. Use the CLI or MCP tool to scan your codebase."
          action={
            <LinkButton size="sm" href="/dashboard/i18n/profiles/new">
              New profile
            </LinkButton>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        kicker={`${profiles.length} profile${profiles.length === 1 ? "" : "s"} · ${openDrafts.length} open draft${openDrafts.length === 1 ? "" : "s"} · ${totalDraftKeys} pending key${totalDraftKeys === 1 ? "" : "s"}`}
        title="Label keys"
        description="Manage translation keys across profiles and drafts. Click any value to edit inline."
        actions={
          <LinkButton size="sm" href="/dashboard/i18n/drafts/new">
            New draft
          </LinkButton>
        }
      />
      <KeysTable profiles={profiles} drafts={openDrafts} draftKeysByDraft={draftKeysByDraft} />
    </div>
  );
}
