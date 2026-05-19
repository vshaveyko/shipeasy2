"use client";

import { useState } from "react";
import {
  ArrowRight,
  BookOpen,
  ListFilter,
  MoreHorizontal,
  Plus,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import { ActionForm } from "@/components/ui/action-form";
import { Input } from "@/components/ui/input";
import { Button, buttonVariants } from "@/components/ui/button";
import { projectLabel } from "@/lib/project-label";
import type { ActionResult } from "@/lib/action-result";

export type ProjectRow = {
  id: string;
  name: string;
  domain: string | null;
  plan: string;
  planLabel: string;
  updatedAt: string;
  color: string;
  mark: string;
  description: string;
  gateCount: number;
  expRunning: number;
  members: string[];
  memberCount: number;
  isActive: boolean;
};

type CreateAction = (formData: FormData) => Promise<ActionResult>;
type SelectAction = (formData: FormData) => Promise<void>;

const AVATAR_COLORS = ["#7c5cff", "#22a06b", "#f5a623", "#3b82f6", "#ec4899", "#06b6d4"];

function timeAgo(iso: string): string {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "—";
  const sec = Math.max(1, Math.round((Date.now() - t) / 1000));
  if (sec < 60) return `${sec}s ago`;
  if (sec < 3600) return `${Math.round(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.round(sec / 3600)}h ago`;
  return `${Math.round(sec / 86400)}d ago`;
}

export function ProjectsHeaderActions({ createProject }: { createProject: CreateAction }) {
  const [creating, setCreating] = useState(false);
  return (
    <>
      <a
        href="https://docs.shipeasy.ai"
        target="_blank"
        rel="noreferrer"
        className={buttonVariants({ variant: "secondary", size: "sm" })}
      >
        <BookOpen className="size-3" /> Docs
      </a>
      <Button size="sm" onClick={() => setCreating(true)}>
        <Plus className="size-3" /> New project
      </Button>
      {creating && (
        <CreateProjectModal onClose={() => setCreating(false)} createProject={createProject} />
      )}
    </>
  );
}

export function ProjectsGrid({
  items,
  selectAndOpenProject,
  createProject,
}: {
  items: ProjectRow[];
  selectAndOpenProject: SelectAction;
  createProject: CreateAction;
}) {
  const [creating, setCreating] = useState(false);
  const [query, setQuery] = useState("");

  const q = query.trim().toLowerCase();
  const filtered = q
    ? items.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.domain ?? "").toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q),
      )
    : items;

  return (
    <div className="space-y-6">
      {items.length > 0 && (
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-[240px] items-center gap-2 rounded-[var(--radius-md)] border border-[var(--se-line-2)] bg-[var(--se-bg-2)] px-2.5 text-[13px]">
            <Search className="size-3 text-[var(--se-fg-3)]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Find a project"
              className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-[var(--se-fg-4)]"
            />
          </div>
          <Button size="sm" variant="ghost" className="text-[var(--se-fg-3)]">
            <ListFilter className="size-3" /> Sort: Recent
          </Button>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((p) => (
          <ProjectCard key={p.id} project={p} selectAndOpenProject={selectAndOpenProject} />
        ))}

        <button
          type="button"
          onClick={() => setCreating(true)}
          className="grid min-h-[220px] cursor-pointer place-items-center rounded-[var(--radius-lg)] border border-dashed border-[var(--se-line-3)] bg-[var(--se-bg-2)] text-center text-[var(--se-fg-3)] transition-colors hover:border-[var(--se-accent)] hover:bg-[var(--se-bg-1)] hover:text-foreground"
        >
          <div className="flex flex-col items-center gap-1.5">
            <div className="grid size-10 place-items-center rounded-[10px] border border-[var(--se-line-2)] bg-[var(--se-bg-1)]">
              <Plus className="size-4" />
            </div>
            <div className="text-[14px] font-medium text-foreground">New project</div>
            <div className="text-[12px]">Start fresh, or import from an existing codebase</div>
          </div>
        </button>
      </div>

      {creating && (
        <CreateProjectModal onClose={() => setCreating(false)} createProject={createProject} />
      )}
    </div>
  );
}

function ProjectCard({
  project: p,
  selectAndOpenProject,
}: {
  project: ProjectRow;
  selectAndOpenProject: SelectAction;
}) {
  return (
    <form action={selectAndOpenProject} className="contents">
      <input type="hidden" name="projectId" value={p.id} />
      <button
        type="submit"
        className="group relative flex w-full cursor-pointer flex-col gap-3.5 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--se-line)] bg-[var(--se-bg-1)] p-5 text-left transition-colors hover:border-[var(--se-line-3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span
          aria-hidden
          className="absolute inset-y-0 left-0 w-[3px] opacity-70"
          style={{ background: p.color }}
        />
        <header className="flex items-center gap-2.5">
          <div
            className="grid size-8 place-items-center rounded-[8px] border border-[var(--se-line-2)] bg-[var(--se-bg-2)] font-mono text-[13px] font-semibold"
            style={{ color: p.color }}
          >
            {p.mark}
          </div>
          <div className="min-w-0 flex-1">
            <h3
              className="m-0 truncate text-[15px] font-medium tracking-[-0.01em]"
              title={projectLabel(p.name, p.domain)}
            >
              {projectLabel(p.name, p.domain)}
            </h3>
            <div className="mt-0.5 t-mono-xs dim-2">
              {p.planLabel} · updated {timeAgo(p.updatedAt)}
            </div>
          </div>
          {p.isActive ? (
            <span className="se-badge se-badge-live">
              <span className="dot" />
              CURRENT
            </span>
          ) : (
            <span
              aria-hidden
              className="grid size-6 place-items-center rounded-md text-[var(--se-fg-3)] opacity-0 transition-opacity group-hover:opacity-100"
            >
              <MoreHorizontal className="size-3" />
            </span>
          )}
        </header>

        <p className="line-clamp-2 text-[12.5px] leading-[1.5] text-[var(--se-fg-3)]">
          {p.description}
        </p>

        <div className="grid w-full grid-cols-3 gap-2.5 border-t border-[var(--se-line)] pt-3.5">
          <Stat v={String(p.expRunning)} k="Active exps" accent />
          <Stat v={String(p.gateCount)} k="Gates" />
          <Stat v={p.plan.toUpperCase()} k="Plan" />
        </div>

        <footer className="flex w-full items-center gap-2 text-[12px] text-[var(--se-fg-3)]">
          {p.members.length > 0 ? (
            <div className="flex">
              {p.members.slice(0, 4).map((a, i) => (
                <div
                  key={i}
                  className="-ml-1.5 grid size-[22px] place-items-center rounded-full border-2 border-[var(--se-bg-1)] text-[10px] font-semibold text-white first:ml-0"
                  style={{ background: AVATAR_COLORS[i % AVATAR_COLORS.length] }}
                >
                  {a}
                </div>
              ))}
            </div>
          ) : null}
          <span className="t-mono-xs dim-2">
            {p.memberCount} member{p.memberCount === 1 ? "" : "s"}
          </span>
          <span className="ml-auto inline-flex items-center gap-1 text-[12px] text-[var(--se-fg-3)] transition-colors group-hover:text-foreground">
            Open <ArrowRight className="size-3" />
          </span>
        </footer>
      </button>
    </form>
  );
}

function Stat({ v, k, accent }: { v: string; k: string; accent?: boolean }) {
  return (
    <div>
      <div
        className="font-mono text-[14px] font-semibold tabular-nums"
        style={{ color: accent ? "var(--se-accent)" : undefined }}
      >
        {v}
      </div>
      <div className="t-caps dim-3 mt-0.5 text-[10px]">{k}</div>
    </div>
  );
}

function toSlugPreview(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function CreateProjectModal({
  onClose,
  createProject,
}: {
  onClose: () => void;
  createProject: CreateAction;
}) {
  const [nameDraft, setNameDraft] = useState("");
  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      className="fixed inset-0 z-[60] grid place-items-center bg-black/50 backdrop-blur-[6px]"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-[560px] overflow-hidden rounded-[var(--radius-lg)] border border-[var(--se-line-2)] bg-[var(--se-bg-1)] shadow-lg"
      >
        <div className="flex items-center gap-2.5 border-b border-[var(--se-line)] px-6 py-5">
          <Plus className="size-4" />
          <h3 className="m-0 text-[17px] font-medium">New project</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="ml-auto grid size-6 place-items-center rounded-md text-[var(--se-fg-3)] hover:bg-[var(--se-bg-2)] hover:text-foreground"
          >
            <X className="size-3" />
          </button>
        </div>

        <ActionForm action={createProject} loading="Creating project…" success="Project created">
          <div className="flex flex-col gap-3.5 px-6 py-6">
            <div>
              <div className="t-caps dim-2 mb-1.5">Display name</div>
              <Input
                name="name"
                placeholder="My app"
                required
                autoFocus
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
              />
              <div className="t-mono-xs dim-2 mt-1">
                Shown in the sidebar and across the dashboard.
                {nameDraft.trim().length > 0 && (
                  <>
                    {" · slug "}
                    <code className="font-mono text-[var(--se-fg-2)]">
                      {toSlugPreview(nameDraft) || "—"}
                    </code>
                  </>
                )}
              </div>
            </div>
            <div>
              <div className="t-caps dim-2 mb-1.5">Domain</div>
              <Input name="domain" placeholder="https://app.example.com" required />
              <div className="t-mono-xs dim-2 mt-1">
                Full URL with http:// or https://. Use * to allow any origin.
              </div>
            </div>
            <div className="flex items-start gap-2.5 rounded-[var(--radius-md)] border border-[var(--se-line)] bg-[var(--se-bg-2)] px-3.5 py-3">
              <Sparkles className="mt-0.5 size-3 text-[var(--se-accent)]" />
              <div>
                <div className="text-[13px] font-medium">Claude will scaffold for you</div>
                <div className="mt-0.5 text-[13px] leading-[1.5] text-[var(--se-fg-3)]">
                  After creating, ask Claude to install the SDK in your codebase — it&apos;ll add
                  the import, wrap your root, and ship a sample experiment.
                </div>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 border-t border-[var(--se-line)] bg-[var(--se-bg-2)] px-6 py-3.5">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" size="sm">
              <ArrowRight className="size-3" /> Create project
            </Button>
          </div>
        </ActionForm>
      </div>
    </div>
  );
}
