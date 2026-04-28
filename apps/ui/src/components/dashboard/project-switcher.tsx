"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Plus, Check } from "lucide-react";
import { toast } from "sonner";
import { switchProjectAction } from "@/app/dashboard/projects/actions";

interface Project {
  id: string;
  name: string;
  domain: string | null;
}

interface ProjectSwitcherProps {
  projects: Project[];
  activeProjectId: string;
  planLabel?: string;
}

function colorForId(id: string): string {
  const COLORS = ["#7c5cff", "#22a06b", "#f5a623", "#3b82f6", "#ec4899", "#06b6d4"];
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return COLORS[h % COLORS.length]!;
}

function initials(name: string): string {
  const parts = name
    .replace(/[^a-zA-Z0-9 ]/g, "")
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length >= 2) return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
  return (parts[0] ?? "P").slice(0, 2).toUpperCase();
}

export function ProjectSwitcher({ projects, activeProjectId, planLabel }: ProjectSwitcherProps) {
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const active = projects.find((p) => p.id === activeProjectId) ?? projects[0];
  const displayName = active?.domain ?? active?.name ?? "Project";
  const color = active ? colorForId(active.id) : "var(--se-accent)";

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClickOutside);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClickOutside);
    };
  }, []);

  function switchTo(projectId: string) {
    setOpen(false);
    if (projectId === activeProjectId) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.append("projectId", projectId);
      const result = await switchProjectAction(fd);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left transition-colors hover:bg-[var(--se-bg-2)]"
      >
        <div
          className="grid size-6 shrink-0 place-items-center rounded-md font-mono text-[10px] font-bold"
          style={{ background: color, color: "#fff" }}
        >
          {active ? initials(active.name) : "?"}
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-[12.5px] font-medium leading-tight">{displayName}</span>
          {planLabel && (
            <span className="truncate font-mono text-[10.5px] leading-tight text-muted-foreground">
              {planLabel}
            </span>
          )}
        </div>
        <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
      </button>

      {open && (
        <div className="absolute bottom-full left-0 z-50 mb-1 w-full min-w-[200px] overflow-hidden rounded-[var(--radius-md)] border border-[var(--se-line)] bg-[var(--se-bg-1)] shadow-lg">
          <div className="px-2.5 pb-1 pt-2.5 font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--se-fg-4)]">
            Projects
          </div>
          <ul role="listbox" className="flex flex-col gap-0.5 p-1">
            {projects.map((p) => {
              const isCurrent = p.id === activeProjectId;
              const c = colorForId(p.id);
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={isCurrent}
                    onClick={() => switchTo(p.id)}
                    className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-[13px] transition-colors hover:bg-[var(--se-bg-2)]"
                  >
                    <div
                      className="grid size-5 shrink-0 place-items-center rounded-[5px] font-mono text-[9px] font-bold text-white"
                      style={{ background: c }}
                    >
                      {initials(p.name)}
                    </div>
                    <span className="min-w-0 flex-1 truncate font-medium">
                      {p.domain ?? p.name}
                    </span>
                    {isCurrent && <Check className="size-3 shrink-0 text-[var(--se-accent)]" />}
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="border-t border-[var(--se-line)] p-1">
            <a
              href="/dashboard/projects/new"
              onClick={() => setOpen(false)}
              className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-[13px] text-[var(--se-fg-2)] transition-colors hover:bg-[var(--se-bg-2)]"
            >
              <div className="grid size-5 shrink-0 place-items-center rounded-[5px] border border-dashed border-[var(--se-line-2)]">
                <Plus className="size-3" />
              </div>
              New project
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
