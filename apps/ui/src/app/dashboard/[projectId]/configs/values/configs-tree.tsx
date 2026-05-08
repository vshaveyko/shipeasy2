"use client";

import Link from "next/link";
import { useState, useMemo } from "react";
import { usePathname } from "next/navigation";
import { SlidersHorizontal, Search, Plus } from "lucide-react";

import { cn } from "@/lib/utils";
import type { ConfigSummary } from "@/lib/handlers/configs";

type Props = {
  configs: ConfigSummary[];
};

type Grouped = { namespace: string; configs: ConfigSummary[] };

function namespaceOf(name: string): string {
  const i = name.indexOf(".");
  return i === -1 ? "misc" : name.slice(0, i);
}

function draftCount(c: ConfigSummary): number {
  return Object.keys(c.drafts).length;
}

function activeIdFromPath(pathname: string | null): string | undefined {
  if (!pathname) return undefined;
  const m = pathname.match(/\/dashboard\/configs\/values\/([^/]+)$/);
  return m && m[1] !== "new" ? m[1] : undefined;
}

export function ConfigsTree({ configs }: Props) {
  const [query, setQuery] = useState("");
  const pathname = usePathname();
  const activeId = activeIdFromPath(pathname);

  const grouped = useMemo<Grouped[]>(() => {
    const q = query.trim().toLowerCase();
    const filtered = q ? configs.filter((c) => c.name.toLowerCase().includes(q)) : configs;
    const byNs = new Map<string, ConfigSummary[]>();
    for (const c of filtered) {
      const ns = namespaceOf(c.name);
      const list = byNs.get(ns) ?? [];
      list.push(c);
      byNs.set(ns, list);
    }
    const out: Grouped[] = [];
    for (const [ns, list] of byNs) {
      list.sort((a, b) => a.name.localeCompare(b.name));
      out.push({ namespace: ns, configs: list });
    }
    out.sort((a, b) => a.namespace.localeCompare(b.namespace));
    return out;
  }, [configs, query]);

  return (
    <div className="flex h-full w-full flex-col gap-2 p-2">
      <div className="flex items-center gap-2 px-1">
        <div className="flex h-8 flex-1 items-center gap-2 rounded-md border border-[var(--se-line-2)] bg-[var(--se-bg-2)] px-2.5 text-[13px] focus-within:border-[var(--se-fg-3)] focus-within:bg-[var(--se-bg-1)]">
          <Search className="size-3 text-[var(--se-fg-3)]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search configs"
            className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-[var(--se-fg-4)]"
          />
        </div>
        <Link
          href="/dashboard/configs/values/new"
          aria-label="New config"
          className="flex size-8 shrink-0 items-center justify-center rounded-md border border-[var(--se-line-2)] bg-[var(--se-bg-2)] text-[var(--se-fg-2)] hover:bg-[var(--se-bg-3)] hover:text-[var(--se-fg)]"
        >
          <Plus className="size-3.5" />
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto">
        {grouped.length === 0 ? (
          <div className="px-3 py-6 text-[12px] text-[var(--se-fg-3)]">
            {query ? "No matches" : "No configs yet"}
          </div>
        ) : (
          grouped.map((g) => (
            <div key={g.namespace} className="mb-2">
              <div className="t-mono-xs px-2.5 pt-2 pb-1 tracking-[0.08em] uppercase text-[var(--se-fg-4)]">
                {g.namespace}
              </div>
              <ul className="flex flex-col gap-0.5">
                {g.configs.map((c) => {
                  const active = c.id === activeId;
                  const drafts = draftCount(c);
                  return (
                    <li key={c.id}>
                      <Link
                        href={`/dashboard/configs/values/${c.id}`}
                        className={cn(
                          "flex items-center gap-2 rounded-md px-2.5 py-1.5 text-[13px]",
                          active
                            ? "bg-[var(--se-bg-3)] text-foreground"
                            : "text-[var(--se-fg-2)] hover:bg-[var(--se-bg-2)] hover:text-foreground",
                        )}
                      >
                        <SlidersHorizontal
                          className={cn(
                            "size-3 shrink-0",
                            active ? "text-[var(--se-accent)]" : "text-[var(--se-fg-3)]",
                          )}
                        />
                        <span className="t-mono flex-1 truncate text-[12px]">{c.name}</span>
                        {drafts > 0 ? (
                          <span
                            className="size-1.5 rounded-full bg-[var(--se-warn)]"
                            aria-label={`${drafts} unpublished`}
                            title={`${drafts} unpublished`}
                          />
                        ) : null}
                        <span className="t-mono-xs text-[10px] text-[var(--se-fg-4)]">
                          {c.valueType}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
