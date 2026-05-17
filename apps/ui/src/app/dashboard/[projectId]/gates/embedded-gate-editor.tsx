"use client";

import useSWR from "swr";

import { GateEditorBody } from "./[id]/gate-editor-client";
import { Skeleton } from "@/components/ui/skeleton";

type Op = "eq" | "neq" | "in" | "not_in" | "gt" | "gte" | "lt" | "lte" | "contains" | "regex";

export interface EmbeddedGateRow {
  id: string;
  name: string;
  rolloutPct: number;
  rules: unknown;
  enabled: number | boolean;
  title?: string | null;
  folder?: string | null;
  groupName?: string | null;
  ownerEmail?: string | null;
  description?: string | null;
  stack?: unknown;
}

interface AttributeRow {
  id?: string;
  name: string;
  example?: string | null;
}

const attrFetcher = async (url: string): Promise<AttributeRow[]> => {
  const res = await fetch(url, { credentials: "same-origin" });
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
  const acc: AttributeRow[] = [];
  let page = (await res.json()) as
    | { data?: AttributeRow[]; next_cursor?: string | null }
    | AttributeRow[];
  if (Array.isArray(page)) return page;
  acc.push(...(page.data ?? []));
  let next = page.next_cursor ?? null;
  while (next) {
    const r = await fetch(`${url}?cursor=${encodeURIComponent(next)}`, {
      credentials: "same-origin",
    });
    if (!r.ok) break;
    page = (await r.json()) as { data?: AttributeRow[]; next_cursor?: string | null };
    acc.push(...(page.data ?? []));
    next = page.next_cursor ?? null;
  }
  return acc;
};

/**
 * Renders the full gatekeeper editor inline (no page chrome). Used by the
 * gates UnifiedList detail pane so the editor shows up next to the rail
 * instead of forcing a navigation to /gates/[id]. Attributes load via SWR
 * because the gates list fetch doesn't include them.
 */
export function EmbeddedGateEditor({ gate }: { gate: EmbeddedGateRow }) {
  const { data: attributes, isLoading } = useSWR<AttributeRow[]>(
    "/api/admin/attributes",
    attrFetcher,
  );

  if (isLoading || !attributes) {
    return (
      <div className="flex flex-col gap-3 p-6">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-[160px] w-full" />
        <Skeleton className="h-[200px] w-full" />
      </div>
    );
  }

  const rawRules = (gate.rules ?? []) as Array<{ attr: string; op: string; value: unknown }>;
  const initialRules = rawRules.map((r) => ({
    attr: r.attr,
    op: (r.op as Op) ?? "eq",
    value: typeof r.value === "string" ? r.value : String(r.value ?? ""),
  }));

  // 0–10000 basis points → 0–100 UI scale (mirrors the /gates/[id] page).
  const rolloutPctUi = Math.round((gate.rolloutPct ?? 0) / 100);

  const initialDetails = {
    title: gate.title ?? gate.name,
    key: gate.name,
    keyLocked: true,
    folder: gate.folder ?? "",
    group: gate.groupName ?? "",
    description: gate.description ?? "",
    owner: gate.ownerEmail ?? "",
  };

  return (
    <div className="min-w-0 px-6 py-5">
      <GateEditorBody
        gateId={gate.id}
        gateName={gate.name}
        initialRules={initialRules}
        initialRolloutPct={rolloutPctUi}
        attributes={attributes.map((a) => ({ k: a.name, ex: a.example ?? "" }))}
        initialDetails={initialDetails}
        initialStack={
          gate.stack ? (gate.stack as Parameters<typeof GateEditorBody>[0]["initialStack"]) : null
        }
      />
    </div>
  );
}
