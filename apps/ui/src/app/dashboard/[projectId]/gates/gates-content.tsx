"use client";

import { useOptimistic, useState, useTransition } from "react";
import { usePathname } from "next/navigation";
import useSWR from "swr";

import { projectIdFromPathname } from "@/lib/project-path";
import { Search, Shield, MoreHorizontal, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { HeroEmptyState } from "@/components/dashboard/hero-empty-state";
import { Page, PageBody, PageHeader } from "@/components/dashboard/page";
import { Button } from "@/components/ui/button";
import { LinkButton } from "@/components/ui/link-button";
import { ActionForm } from "@/components/ui/action-form";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { IntegrationSnippetButton } from "@/components/integration";
import { deleteGateAction, enableGateAction } from "./actions";

interface GateRow {
  id: string;
  name: string;
  rolloutPct: number;
  rules: unknown;
  enabled: number | boolean;
}

const fetcher = async (url: string): Promise<GateRow[]> => {
  const res = await fetch(url, { credentials: "same-origin" });
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
  // The admin gates list paginates `{ data, next_cursor }`. The dashboard
  // wants the full list, so we drain pages here. Project gate counts are
  // small in practice (tens to low hundreds), so a few sequential calls is
  // fine; SWR caches the union.
  const acc: GateRow[] = [];
  let next: string | null | undefined;
  let page = (await res.json()) as { data?: GateRow[]; next_cursor?: string | null } | GateRow[];
  // Tolerate the legacy array shape while migrations land.
  if (Array.isArray(page)) return page;
  acc.push(...(page.data ?? []));
  next = page.next_cursor ?? null;
  while (next) {
    const r = await fetch(`${url}?cursor=${encodeURIComponent(next)}`, {
      credentials: "same-origin",
    });
    if (!r.ok) break;
    page = (await r.json()) as { data?: GateRow[]; next_cursor?: string | null };
    acc.push(...(page.data ?? []));
    next = page.next_cursor ?? null;
  }
  return acc;
};

export function GatesContent() {
  const pathname = usePathname();
  const projectId = projectIdFromPathname(pathname) ?? "";
  const { data, isLoading, mutate } = useSWR<GateRow[]>("/api/admin/gates", fetcher, {
    dedupingInterval: 0,
  });
  const gates = data ?? [];

  const [optimisticGates, setOptimisticEnabled] = useOptimistic(
    gates,
    (prev, { id, enabled }: { id: string; enabled: boolean }) =>
      prev.map((g) => (g.id === id ? { ...g, enabled } : g)),
  );

  const [, startTransition] = useTransition();

  if (isLoading) {
    return (
      <Page>
        <PageHeader
          title="Gates"
          description="Gates toggle features on and off per user, attribute, or percentage."
        />
        <PageBody>
          <div className="text-muted-foreground text-sm">Loading…</div>
        </PageBody>
      </Page>
    );
  }

  const total = gates.length;
  const enabled = gates.filter((g) => Boolean(g.enabled)).length;
  const paused = total - enabled;

  if (total === 0) {
    return (
      <Page>
        <PageBody>
          <HeroEmptyState kind="gates" ctaHref={`/dashboard/${projectId}/gates/new`} />
        </PageBody>
      </Page>
    );
  }

  return (
    <Page>
      <PageHeader
        kicker={`${total} gate${total === 1 ? "" : "s"} · ${enabled} enabled · ${paused} paused`}
        title="Gates"
        description="Gates toggle features on and off per user, attribute, or percentage. Edge-cached — evaluations run against KV in under 5ms."
        actions={
          <LinkButton size="sm" href={`/dashboard/${projectId}/gates/new`}>
            New gate
          </LinkButton>
        }
      />
      <PageBody>
        <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--se-line)] bg-[var(--se-bg-1)]">
          <div className="flex items-center gap-3 border-b border-[var(--se-line)] px-4 py-3">
            <div className="text-[14px] font-medium">All gates</div>
            <div className="ml-auto flex h-8 w-[220px] items-center gap-2 rounded-[var(--radius-md)] border border-[var(--se-line-2)] bg-[var(--se-bg-2)] px-2.5 text-[13px]">
              <Search className="size-3 text-[var(--se-fg-3)]" />
              <input
                placeholder="Filter gates"
                className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-[var(--se-fg-4)]"
              />
            </div>
          </div>

          <div
            className="grid gap-3 border-b border-[var(--se-line)] px-5 py-2"
            style={{
              gridTemplateColumns: "20px minmax(0,1fr) 120px 90px 120px 60px 28px 32px",
              background: "var(--se-bg-2)",
            }}
          >
            <span />
            <span className="t-caps dim-3">Gate</span>
            <span className="t-caps dim-3">Rollout</span>
            <span className="t-caps dim-3">Rules</span>
            <span className="t-caps dim-3">Status</span>
            <span />
            <span />
            <span />
          </div>
          {optimisticGates.map((gate) => {
            const ruleCount = Array.isArray(gate.rules) ? gate.rules.length : 0;
            const isEnabled = Boolean(gate.enabled);
            const color = isEnabled ? "var(--se-accent)" : "var(--se-fg-4)";
            return (
              <div
                key={gate.id}
                className="grid items-center gap-3 border-b border-[var(--se-line)] px-5 py-3 transition-colors last:border-none hover:bg-[var(--se-bg-2)]"
                style={{
                  gridTemplateColumns: "20px minmax(0,1fr) 120px 90px 120px 60px 28px 32px",
                }}
              >
                <Shield className="size-3.5" style={{ color }} />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <a
                      href={`/dashboard/${projectId}/gates/${gate.id}`}
                      className="truncate font-mono text-[13px] font-medium hover:underline"
                    >
                      {gate.name}
                    </a>
                  </div>
                </div>
                <div
                  className="font-mono text-[11px] text-[var(--se-fg-2)]"
                  style={{ fontVariantNumeric: "tabular-nums" }}
                >
                  {Math.round((gate.rolloutPct ?? 0) / 100)}%
                </div>
                <div className="font-mono text-[11px] text-[var(--se-fg-2)]">
                  {ruleCount} rule{ruleCount === 1 ? "" : "s"}
                </div>
                <div className="flex justify-end">
                  {isEnabled ? (
                    <span className="se-badge se-badge-live">
                      <span className="dot" />
                      ENABLED
                    </span>
                  ) : (
                    <span className="se-badge">
                      <span className="dot" />
                      DISABLED
                    </span>
                  )}
                </div>
                {/* Optimistic toggle */}
                <div className="flex justify-end">
                  <button
                    type="button"
                    aria-label={isEnabled ? "Disable gate" : "Enable gate"}
                    className={`se-toggle ${isEnabled ? "on" : ""}`}
                    onClick={() => {
                      const nextEnabled = !isEnabled;
                      startTransition(async () => {
                        setOptimisticEnabled({ id: gate.id, enabled: nextEnabled });
                        const fd = new FormData();
                        fd.append("id", gate.id);
                        fd.append("enabled", String(nextEnabled));
                        const result = await enableGateAction(fd);
                        if (!result.ok) {
                          toast.error(result.error);
                        } else {
                          await mutate();
                        }
                      });
                    }}
                  />
                </div>
                <IntegrationSnippetButton kind="gate" name={gate.name} stopPropagation />
                <GateRowMenu gate={gate} onDeleted={() => mutate()} />
              </div>
            );
          })}
        </div>
      </PageBody>
    </Page>
  );
}

function GateRowMenu({ gate, onDeleted }: { gate: GateRow; onDeleted: () => void }) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  return (
    <div className="flex justify-end">
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={`Actions for ${gate.name}`}
          className="inline-flex size-7 items-center justify-center rounded-md text-[var(--se-fg-3)] hover:bg-[var(--se-bg-3)] hover:text-[var(--se-fg-1)]"
        >
          <MoreHorizontal className="size-3" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem
            onClick={() => setConfirmOpen(true)}
            className="text-[var(--se-danger)] focus:bg-[var(--se-danger-soft)] focus:text-[var(--se-danger)]"
          >
            <Trash2 className="size-3.5" />
            Delete gate
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete gate?</DialogTitle>
            <DialogDescription>
              <span className="font-mono text-[12px] text-[var(--se-fg-2)]">{gate.name}</span> will
              be permanently removed. SDKs that read this gate will fall back to <code>false</code>.
              This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="ghost" size="sm" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <ActionForm
              action={deleteGateAction}
              loading="Deleting gate…"
              success="Gate deleted"
              onSuccess={() => {
                setConfirmOpen(false);
                onDeleted();
              }}
            >
              <input type="hidden" name="id" value={gate.id} />
              <Button
                type="submit"
                size="sm"
                className="bg-[var(--se-danger)] text-white hover:bg-[var(--se-danger)]/90"
              >
                Delete gate
              </Button>
            </ActionForm>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
